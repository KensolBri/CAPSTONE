<?php
ini_set('display_errors',1);
error_reporting(E_ALL);

session_start();
require '../db.php';

header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

$id     = $_POST['id']     ?? null;
$status = $_POST['status'] ?? null;

$valid = ['pending','approved','rejected','cancelled'];
if (!$id || !in_array($status, $valid)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    exit;
}

$stmt = $conn->prepare("
    UPDATE stall_applications
    SET status = ?, vendor_notified = 0   -- ✅ reset notify flag
    WHERE id = ?
");
$stmt->bind_param('si', $status, $id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => $conn->error]);
}
