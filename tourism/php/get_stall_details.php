<?php
// tourism/php/get_stall_details.php

session_start();                       // <- needed so we know current user
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

require '../db.php';
$host = $_SERVER['HTTP_HOST'] ?? '';
$isHosted = stripos($host, 'free.nf') !== false || stripos($host, 'infinityfreeapp.com') !== false;
$usersDb = getenv('DB_NAME_USERS') ?: ($isHosted ? 'if0_41601200_lokal_users' : 'lokal_users');
$usersTable = $usersDb . '.users';

$stall_id = isset($_GET['stall_id']) ? (int)$_GET['stall_id'] : 0;
if ($stall_id <= 0) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Invalid stall_id'
    ]);
    exit;
}

// current user (0 if guest)
$user_id = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

/*
 * 1) Latest APPROVED application for this stall
 *    (gives stall name, image, product type, vendor_id)
 */
$sqlApp = "
    SELECT 
        sa.id          AS application_id,
        sa.stall_id,
        sa.vendor_id,
        sa.stall_name,
        sa.product_type,
        sa.stall_image
    FROM stall_applications AS sa
    WHERE sa.stall_id = ?
      AND sa.status   = 'approved'
    ORDER BY sa.applied_at DESC
    LIMIT 1
";

$stmt = $conn->prepare($sqlApp);
$stmt->bind_param('i', $stall_id);
$stmt->execute();
$appRes = $stmt->get_result();
$appRow = $appRes->fetch_assoc();
$stmt->close();

if (!$appRow) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'No approved application for this stall.'
    ]);
    exit;
}

$vendor_id = (int)$appRow['vendor_id'];

// Fetch vendor name (for LGU / map displays)
$vendor_name = '';
if ($vendor_id > 0) {
    $vendorStmt = $conn->prepare("SELECT full_name FROM {$usersTable} WHERE id = ?");
    if ($vendorStmt) {
        $vendorStmt->bind_param('i', $vendor_id);
        $vendorStmt->execute();
        $vendorStmt->bind_result($vendor_name);
        $vendorStmt->fetch();
        $vendorStmt->close();
    }
}

/*
 * 2) Stall-level analytics (using your stalls table +
 *    stall_favorites / stall_ratings for THIS user)
 */
$sqlStallStats = "
    SELECT
        s.views,
        s.favorites_count,
        s.ratings_count,
        s.avg_rating,
        IF(sf.id IS NULL, 0, 1) AS is_favorite,
        sr.rating               AS my_rating
    FROM stalls s
    LEFT JOIN stall_favorites sf
      ON sf.stall_id = s.id AND sf.user_id = ?
    LEFT JOIN stall_ratings sr
      ON sr.stall_id = s.id AND sr.user_id = ?
    WHERE s.id = ?
    LIMIT 1
";

$statsStmt = $conn->prepare($sqlStallStats);
$statsStmt->bind_param('iii', $user_id, $user_id, $stall_id);
$statsStmt->execute();
$statsRes   = $statsStmt->get_result();
$stallStats = $statsRes->fetch_assoc() ?: [];
$statsStmt->close();

/*
 * 3) Products for this vendor + analytics + this user's state
 *    (uses your vendor_products + product_favorites/product_ratings)
 */
$sqlProd = "
    SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.category,
        p.image,
        p.views,
        p.favorites_count,
        p.ratings_count,
        p.avg_rating,
        IF(pf.id IS NULL, 0, 1) AS is_favorite,
        pr.rating               AS my_rating
    FROM vendor_products p
    LEFT JOIN product_favorites pf
      ON pf.product_id = p.id AND pf.user_id = ?
    LEFT JOIN product_ratings pr
      ON pr.product_id = p.id AND pr.user_id = ?
    WHERE p.vendor_id = ?
    ORDER BY p.created_at DESC
";

$stmt2 = $conn->prepare($sqlProd);
$stmt2->bind_param('iii', $user_id, $user_id, $vendor_id);
$stmt2->execute();
$prodRes = $stmt2->get_result();

$products = [];
while ($row = $prodRes->fetch_assoc()) {
    // cast numeric fields so JSON is clean
    $row['views']           = (int)$row['views'];
    $row['favorites_count'] = (int)$row['favorites_count'];
    $row['ratings_count']   = (int)$row['ratings_count'];
    $row['avg_rating']      = $row['avg_rating'] !== null ? (float)$row['avg_rating'] : 0;
    $row['is_favorite']     = (bool)$row['is_favorite'];
    $row['my_rating']       = $row['my_rating'] !== null ? (int)$row['my_rating'] : 0;

    $products[] = $row;
}
$stmt2->close();

/*
 * Filter products to match this stall's configured product_type.
 * Reason: A vendor can own multiple stalls; we only want the products
 * relevant to the stall (foods / beverages / merchandise / others),
 * not every product of the vendor.
 */
function normalizeProductType($raw) {
    $t = strtolower(trim((string)$raw));
    if ($t === '') return 'others';
    if (str_contains($t, 'bever') || str_contains($t, 'milk') || str_contains($t, 'tea') || str_contains($t, 'coffee') || str_contains($t, 'drink')) {
        return 'beverages';
    }
    if (str_contains($t, 'food') || str_contains($t, 'soup') || str_contains($t, 'pancit') || str_contains($t, 'rice') || str_contains($t, 'noodle') || str_contains($t, 'meal') || str_contains($t, 'pasta')) {
        return 'foods';
    }
    if (str_contains($t, 'merch') || str_contains($t, 'souvenir') || str_contains($t, 'shop') || str_contains($t, 'goods')) {
        return 'merchandise';
    }
    if ($t === 'foods' || $t === 'beverages' || $t === 'merchandise' || $t === 'others') {
        return $t;
    }
    // fallback
    return 'others';
}

$desiredType = normalizeProductType($appRow['product_type'] ?? 'others');

// Prefer explicitly attached products for this stall (if any exist).
// If `stall_products` has entries, we skip category filtering and return attachments directly.
$useAttachments = false;
$sqlAttach = "
    SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        COALESCE(sp.stock, p.stock) AS stock,
        p.category,
        p.image,
        sp.views            AS views,
        sp.favorites_count AS favorites_count,
        sp.ratings_count   AS ratings_count,
        sp.avg_rating      AS avg_rating,
        IF(spf.id IS NULL, 0, 1) AS is_favorite,
        spr.rating         AS my_rating
    FROM stall_products sp
    JOIN vendor_products p
      ON p.id = sp.product_id
    LEFT JOIN stall_product_favorites spf
      ON spf.stall_id = sp.stall_id
     AND spf.product_id = sp.product_id
     AND spf.user_id = ?
    LEFT JOIN stall_product_ratings spr
      ON spr.stall_id = sp.stall_id
     AND spr.product_id = sp.product_id
     AND spr.user_id = ?
    WHERE sp.stall_id = ?
      AND p.vendor_id = ?
    ORDER BY sp.created_at DESC
";

$stmtAttach = $conn->prepare($sqlAttach);
if ($stmtAttach) {
    $stmtAttach->bind_param('iiii', $user_id, $user_id, $stall_id, $vendor_id);
    $stmtAttach->execute();
    $attachRes = $stmtAttach->get_result();
    $attachedProducts = [];
    while ($row = $attachRes->fetch_assoc()) {
        $row['views']           = (int)$row['views'];
        $row['favorites_count'] = (int)$row['favorites_count'];
        $row['ratings_count']   = (int)$row['ratings_count'];
        $row['avg_rating']      = $row['avg_rating'] !== null ? (float)$row['avg_rating'] : 0;
        $row['is_favorite']     = (bool)$row['is_favorite'];
        $row['my_rating']       = $row['my_rating'] !== null ? (int)$row['my_rating'] : 0;
        $attachedProducts[] = $row;
    }
    $stmtAttach->close();

    if (!empty($attachedProducts)) {
        $products = $attachedProducts;
        $useAttachments = true;
    }
}

// Requirement: tourist pins + sheets must reflect ONLY attached products.
// If nothing is attached to this stall yet, return an empty products list.
if (!$useAttachments) {
    $products = [];
}

if (!$useAttachments && !empty($products) && in_array($desiredType, ['foods','beverages','merchandise','others'], true)) {
    $filtered = array_values(array_filter($products, function ($p) use ($desiredType) {
        return normalizeProductType($p['category'] ?? '') === $desiredType;
    }));

    // If nothing matches, don't break the UI; fall back to all vendor products.
    if (!empty($filtered)) {
        $products = $filtered;
    }
}

/*
 * 4) Build stall object for JSON
 */
$stall = [
    'application_id'  => (int)$appRow['application_id'],
    'stall_id'        => $stall_id,
    'stall_name'      => $appRow['stall_name'],
    'product_type'    => $appRow['product_type'],
    'stall_image'     => $appRow['stall_image'],
    'vendor_name'     => $vendor_name,
    'views'           => isset($stallStats['views'])           ? (int)$stallStats['views'] : 0,
    'favorites_count' => isset($stallStats['favorites_count']) ? (int)$stallStats['favorites_count'] : 0,
    'ratings_count'   => isset($stallStats['ratings_count'])   ? (int)$stallStats['ratings_count'] : 0,
    'avg_rating'      => isset($stallStats['avg_rating']) && $stallStats['avg_rating'] !== null
                            ? (float)$stallStats['avg_rating'] : 0,
    'is_favorite'     => !empty($stallStats['is_favorite']),
    'my_rating'       => isset($stallStats['my_rating']) && $stallStats['my_rating'] !== null
                            ? (int)$stallStats['my_rating'] : 0,
];

$conn->close();

/*
 * 5) Final JSON
 */
echo json_encode([
    'status'   => 'success',
    'stall'    => $stall,
    'products' => $products
]);
