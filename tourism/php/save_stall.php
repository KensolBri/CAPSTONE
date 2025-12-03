<?php
// tourism/php/save_stall.php
require '../db.php';   // use your existing mysqli $conn

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'POST only']);
    exit;
}

$lat    = isset($_POST['lat'])    ? floatval($_POST['lat'])    : null;
$lng    = isset($_POST['lng'])    ? floatval($_POST['lng'])    : null;
$status = isset($_POST['status']) ? $_POST['status']           : 'available';

if ($lat === null || $lng === null) {
    echo json_encode(['status' => 'error', 'message' => 'Missing lat/lng']);
    exit;
}

$allowed = ['available','reserved','occupied'];
if (!in_array($status, $allowed)) {
    $status = 'available';
}

// mysqli prepared statement
$stmt = $conn->prepare("INSERT INTO stalls (lat, lng, status) VALUES (?, ?, ?)");
if (!$stmt) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Prepare failed: ' . $conn->error
    ]);
    exit;
}

$stmt->bind_param("dds", $lat, $lng, $status);

if ($stmt->execute()) {
    echo json_encode([
        'status' => 'success',
        'id'     => $stmt->insert_id
    ]);
} else {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Insert failed: ' . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
