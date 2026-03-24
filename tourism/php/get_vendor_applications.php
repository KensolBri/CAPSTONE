<?php
// tourism/php/get_vendor_applications.php
session_start();
require '../db.php';

header('Content-Type: application/json');

function json_error($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
}

if (($_SESSION['account_type'] ?? '') !== 'vendor' || empty($_SESSION['user_id'])) {
    json_error('Vendor login required.', 403);
}
$vendorId = (int)$_SESSION['user_id'];

$sql = "
    SELECT 
        a.id,
        a.stall_id,
        a.stall_name,
        a.product_type,
        a.stall_size,
        a.stall_image,
        a.status,
        a.applied_at
    FROM stall_applications a
    WHERE a.vendor_id = ?
    ORDER BY a.applied_at DESC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    json_error('DB prepare failed: ' . $conn->error, 500);
}
$stmt->bind_param('i', $vendorId);
$stmt->execute();
$res = $stmt->get_result();

$data = [];
while ($row = $res->fetch_assoc()) {
    $data[] = $row;
}
$stmt->close();

echo json_encode([
    'status' => 'success',
    'data'   => $data
]);
