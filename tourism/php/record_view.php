<?php
// tourism/php/record_view.php
// tourism/php/record_view.php
session_start();
require '../db.php';
header('Content-Type: application/json');

$item_type = $_POST['item_type'] ?? '';
$item_id   = (int) ($_POST['item_id'] ?? 0);
$stall_id  = (int) ($_POST['stall_id'] ?? 0);

if (!in_array($item_type, ['stall','product'], true) || $item_id <= 0) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'Invalid data']);
    exit;
}

if ($item_type === 'stall') {
    $sql = "UPDATE stalls SET views = views + 1 WHERE id = ?";
} else {
    // If we know the stall, increment stall-specific product views.
    if ($stall_id > 0) {
        $sql = "UPDATE stall_products SET views = views + 1 WHERE stall_id = ? AND product_id = ?";
    } else {
        $sql = "UPDATE vendor_products SET views = views + 1 WHERE id = ?";
    }
}

$stmt = $conn->prepare($sql);
if ($item_type === 'product' && $stall_id > 0) {
    $stmt->bind_param('ii', $stall_id, $item_id);
} else {
    $stmt->bind_param('i', $item_id);
}

if ($stmt->execute()) {
    echo json_encode(['status'=>'success']);
} else {
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'DB error: '.$conn->error]);
}


$stmt->close();
$conn->close();
