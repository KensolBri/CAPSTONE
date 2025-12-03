<?php
// tourism/php/update_stall.php
require '../db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'POST only']);
    exit;
}

$id     = isset($_POST['id'])     ? intval($_POST['id']) : 0;
$status = isset($_POST['status']) ? $_POST['status']     : '';

$allowed = ['available','reserved','occupied'];
if ($id <= 0 || !in_array($status, $allowed)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    exit;
}

$stmt = $conn->prepare("UPDATE stalls SET status = ? WHERE id = ?");
if (!$stmt) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Prepare failed: ' . $conn->error
    ]);
    exit;
}

$stmt->bind_param("si", $status, $id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Update failed: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
