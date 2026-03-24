<?php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'vendor') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Vendor only']);
    exit;
}

$vendor_id = (int)($_SESSION['user_id'] ?? 0);
$stall_id = (int)($_GET['stall_id'] ?? 0);
if ($vendor_id <= 0 || $stall_id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid vendor/stall']);
    exit;
}

require '../db.php';

$checkSql = "
    SELECT sa.stall_name, sa.stall_image
    FROM stall_applications sa
    WHERE sa.stall_id = ?
      AND sa.vendor_id = ?
      AND sa.status = 'approved'
    ORDER BY sa.applied_at DESC
    LIMIT 1
";
$stmt = $conn->prepare($checkSql);
$stmt->bind_param('ii', $stall_id, $vendor_id);
$stmt->execute();
$meta = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$meta) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Stall not found / not approved']);
    exit;
}

$sql = "
    SELECT
        p.id,
        p.name,
        p.price,
        p.image,
        p.category,
        COALESCE(sp.stock, 0) AS stock,
        COALESCE(sp.total_sold, 0) AS total_sold,
        COALESCE(sp.total_sales, 0) AS total_sales
    FROM stall_products sp
    JOIN vendor_products p
      ON p.id = sp.product_id
    WHERE sp.stall_id = ?
      AND p.vendor_id = ?
    ORDER BY sp.created_at DESC
";
$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $stall_id, $vendor_id);
$stmt->execute();
$res = $stmt->get_result();

$products = [];
while ($row = $res->fetch_assoc()) {
    $row['stock'] = (int)$row['stock'];
    $row['price'] = (float)$row['price'];
    $row['total_sold'] = (int)$row['total_sold'];
    $row['total_sales'] = (float)$row['total_sales'];
    $products[] = $row;
}
$stmt->close();

echo json_encode([
    'status' => 'success',
    'stall' => [
        'id' => $stall_id,
        'name' => $meta['stall_name'] ?? 'Stall',
        'image' => $meta['stall_image'] ?? ''
    ],
    'products' => $products
]);

$conn->close();
