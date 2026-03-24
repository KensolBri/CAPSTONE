<?php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'vendor') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Vendor only']);
    exit;
}

$vendor_id = (int)($_SESSION['user_id'] ?? 0);
$stall_id = (int)($_POST['stall_id'] ?? 0);
$product_id = (int)($_POST['product_id'] ?? 0);
$stock = (int)($_POST['stock'] ?? -1);

if ($vendor_id <= 0 || $stall_id <= 0 || $product_id <= 0 || $stock < 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid input']);
    exit;
}

require '../db.php';

$sql = "
    SELECT sp.id, sp.stock, sp.total_sold, sp.total_sales, p.price
    FROM stall_products sp
    JOIN vendor_products p ON p.id = sp.product_id
    JOIN stall_applications sa ON sa.stall_id = sp.stall_id
    WHERE sp.stall_id = ?
      AND sp.product_id = ?
      AND p.vendor_id = ?
      AND sa.vendor_id = ?
      AND sa.status = 'approved'
    ORDER BY sa.applied_at DESC
    LIMIT 1
";
$stmt = $conn->prepare($sql);
$stmt->bind_param('iiii', $stall_id, $product_id, $vendor_id, $vendor_id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Stall product not found']);
    exit;
}

$oldStock = (int)$row['stock'];
$oldSold = (int)$row['total_sold'];
$oldSales = (float)$row['total_sales'];
$price = (float)$row['price'];

$delta = $oldStock - $stock; // decrease in stock = sold
$newSold = $oldSold;
$newSales = $oldSales;
if ($delta > 0) {
    $newSold += $delta;
    $newSales += ($delta * $price);
}

$up = $conn->prepare("
    UPDATE stall_products
    SET stock = ?, total_sold = ?, total_sales = ?
    WHERE stall_id = ? AND product_id = ?
");
$up->bind_param('iidii', $stock, $newSold, $newSales, $stall_id, $product_id);
$ok = $up->execute();
$up->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Update failed']);
    exit;
}

echo json_encode([
    'status' => 'success',
    'data' => [
        'stock' => $stock,
        'total_sold' => $newSold,
        'total_sales' => $newSales
    ]
]);

$conn->close();
