<?php
session_start();
include '../db.php';

header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$description = trim($_POST['description'] ?? '');
$coordinates = trim($_POST['coordinates'] ?? '');
$color = trim($_POST['color'] ?? '');

if ($name === '' || $coordinates === '' || $color === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing required polygon fields.']);
    exit;
}

$sql = "INSERT INTO polygons (name, description, coordinates, color) VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare save polygon query.']);
    exit;
}

$stmt->bind_param("ssss", $name, $description, $coordinates, $color);

if ($stmt->execute()) {
    echo json_encode([
        'status' => 'success',
        'id' => (int)$conn->insert_id
    ]);
    exit;
}

http_response_code(500);
echo json_encode([
    'status' => 'error',
    'message' => 'Failed to save polygon.'
]);

