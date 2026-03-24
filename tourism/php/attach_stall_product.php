<?php
// tourism/php/attach_stall_product.php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'vendor') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Vendor only']);
    exit;
}

$vendor_id = (int)($_SESSION['user_id'] ?? 0);
if ($vendor_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing vendor id']);
    exit;
}

require '../db.php';

$stall_id   = isset($_POST['stall_id']) ? (int)$_POST['stall_id'] : 0;
$product_id = isset($_POST['product_id']) ? (int)$_POST['product_id'] : 0;

if ($stall_id <= 0 || $product_id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid stall_id or product_id']);
    exit;
}

// Only allow attaching to your APPROVED stall (current vendor)
$sqlStall = "
    SELECT id
    FROM stall_applications
    WHERE stall_id = ?
      AND vendor_id = ?
      AND status = 'approved'
    ORDER BY applied_at DESC
    LIMIT 1
";
$stmt = $conn->prepare($sqlStall);
$stmt->bind_param('ii', $stall_id, $vendor_id);
$stmt->execute();
$app = $stmt->get_result();
$appRow = $app ? $app->fetch_assoc() : null;
$stmt->close();

if (!$appRow) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Stall not found / not approved']);
    exit;
}

// Ensure product belongs to this vendor
$sqlProd = "
    SELECT id
    FROM vendor_products
    WHERE id = ?
      AND vendor_id = ?
    LIMIT 1
";
$stmt = $conn->prepare($sqlProd);
$stmt->bind_param('ii', $product_id, $vendor_id);
$stmt->execute();
$prod = $stmt->get_result();
$prodRow = $prod ? $prod->fetch_assoc() : null;
$stmt->close();

if (!$prodRow) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Product not found']);
    exit;
}

// Insert into junction table; initialize per-stall stock from vendor product stock.
$sqlInsert = "
    INSERT INTO stall_products (stall_id, product_id, stock)
    SELECT ?, ?, COALESCE(vp.stock, 0)
    FROM vendor_products vp
    WHERE vp.id = ? AND vp.vendor_id = ?
    ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)
";

$stmt = $conn->prepare($sqlInsert);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'DB insert prepare failed']);
    exit;
}

$stmt->bind_param('iiii', $stall_id, $product_id, $product_id, $vendor_id);
$ok = $stmt->execute();
$stmt->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $conn->error]);
    exit;
}

echo json_encode(['status' => 'success']);
$conn->close();

