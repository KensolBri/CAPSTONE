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

if ($vendor_id <= 0 || $stall_id <= 0 || $product_id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid input']);
    exit;
}

require '../db.php';

$check = $conn->prepare("
    SELECT sa.id
    FROM stall_applications sa
    WHERE sa.stall_id = ?
      AND sa.vendor_id = ?
      AND sa.status = 'approved'
    ORDER BY sa.applied_at DESC
    LIMIT 1
");
$check->bind_param('ii', $stall_id, $vendor_id);
$check->execute();
$okStall = $check->get_result()->fetch_assoc();
$check->close();

if (!$okStall) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Stall not found / not approved']);
    exit;
}

$del = $conn->prepare("
    DELETE sp
    FROM stall_products sp
    JOIN vendor_products p ON p.id = sp.product_id
    WHERE sp.stall_id = ?
      AND sp.product_id = ?
      AND p.vendor_id = ?
");
$del->bind_param('iii', $stall_id, $product_id, $vendor_id);
$ok = $del->execute();
$del->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to detach product']);
    exit;
}

echo json_encode(['status' => 'success']);
$conn->close();
