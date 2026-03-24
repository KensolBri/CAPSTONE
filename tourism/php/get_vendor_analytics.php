<?php
// tourism/php/get_vendor_analytics.php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'vendor') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Vendor only']);
    exit;
}

$vendor_id = (int) ($_SESSION['user_id'] ?? 0);
if ($vendor_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing vendor id']);
    exit;
}

require '../db.php';

/* =========================================================
 * 1) STALL ANALYTICS for this vendor (ALL stalls)
 *   – uses stall_applications to find all approved stalls
 *   – uses columns on stalls: views, favorites_count,
 *     ratings_count, avg_rating
 * ======================================================= */

$stalls = [];

$stallSql = "
    SELECT 
        s.id,
        s.status,
        s.views,
        s.favorites_count,
        s.ratings_count,
        s.avg_rating,
        sa.stall_name,
        sa.product_type,
        sa.applied_at
    FROM stall_applications AS sa
    JOIN stalls AS s
      ON s.id = sa.stall_id
    WHERE sa.vendor_id = ?
      AND sa.status = 'approved'
    ORDER BY sa.applied_at DESC
";
if ($stmt = $conn->prepare($stallSql)) {
    $stmt->bind_param('i', $vendor_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        // cast numeric fields
        $row['stall_id'] = (int)$row['id'];
        $row['views']          = (int) $row['views'];
        $row['favorites_count']= (int) $row['favorites_count'];
        $row['ratings_count']  = (int) $row['ratings_count'];
        $row['avg_rating']     = (float) $row['avg_rating'];
        $stalls[] = $row;
    }
    $stmt->close();
}

/* =========================================================
 * 2) PRODUCT ANALYTICS
 *   – uses stall->attached products (stall_products junction)
 *   – falls back to vendor_products.category vs stall.product_type
 *     only when a stall has no attachments yet (backward compatibility)
 * ======================================================= */
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
    return 'others';
}

// Load vendor products once for fallback filtering.
$vendorProducts = [];
$prodBaseSql = "
    SELECT
        id,
        name,
        description,
        price,
        stock,
        category,
        image,
        views,
        favorites_count,
        ratings_count,
        avg_rating,
        total_sold,
        total_sales
    FROM vendor_products
    WHERE vendor_id = ?
    ORDER BY created_at DESC
";
$ps = $conn->prepare($prodBaseSql);
if ($ps) {
    $ps->bind_param('i', $vendor_id);
    $ps->execute();
    $res = $ps->get_result();
    while ($row = $res->fetch_assoc()) {
        $row['price']          = (float)$row['price'];
        $row['stock']          = (int)$row['stock'];
        $row['views']          = (int)$row['views'];
        $row['favorites_count']= (int)$row['favorites_count'];
        $row['ratings_count']  = (int)$row['ratings_count'];
        $row['avg_rating']     = $row['avg_rating'] !== null ? (float)$row['avg_rating'] : 0.0;
        $row['total_sold']     = (int)$row['total_sold'];
        $row['total_sales']    = (float)$row['total_sales'];
        $vendorProducts[] = $row;
    }
    $ps->close();
}

$productsByStall = [];

// For each approved stall:
//  - use stall_products attachments if available
//  - otherwise fallback to category matching (existing behavior)
$sqlAttach = "
    SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.category,
        p.image,
        sp.stock,
        sp.views,
        sp.favorites_count,
        sp.ratings_count,
        sp.avg_rating,
        sp.total_sold,
        sp.total_sales
    FROM stall_products sp
    JOIN vendor_products p
      ON p.id = sp.product_id
    WHERE sp.stall_id = ?
      AND p.vendor_id = ?
    ORDER BY sp.created_at DESC
";

foreach ($stalls as $stall) {
    $stallId = (int)($stall['stall_id'] ?? $stall['id'] ?? 0);
    if ($stallId <= 0) continue;

    $attachedProducts = [];
    $stmtAttach = $conn->prepare($sqlAttach);
    if ($stmtAttach) {
        $stmtAttach->bind_param('ii', $stallId, $vendor_id);
        $stmtAttach->execute();
        $attachRes = $stmtAttach->get_result();
        while ($row = $attachRes->fetch_assoc()) {
            $row['price']          = (float)$row['price'];
            $row['stock']          = (int)$row['stock'];
            $row['views']          = (int)$row['views'];
            $row['favorites_count']= (int)$row['favorites_count'];
            $row['ratings_count']  = (int)$row['ratings_count'];
            $row['avg_rating']     = $row['avg_rating'] !== null ? (float)$row['avg_rating'] : 0.0;
            $row['total_sold']     = (int)($row['total_sold'] ?? 0);
            $row['total_sales']    = (float)($row['total_sales'] ?? 0);
            $attachedProducts[] = $row;
        }
        $stmtAttach->close();
    }

    if (!empty($attachedProducts)) {
        $productsByStall[(string)$stallId] = $attachedProducts;
        continue;
    }

    // Requirement: stall analytics should reflect ONLY attached products.
    // If nothing is attached yet, return an empty list for this stall.
    $productsByStall[(string)$stallId] = [];
}

echo json_encode([
    'status'         => 'success',
    'stalls'         => $stalls, // empty if vendor has no approved stall
    'productsByStall'=> $productsByStall
]);

$conn->close();
