<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || ($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

require_once 'userDb.php';

$userId   = (int) $_SESSION['user_id'];
$fullName = trim($_POST['new_name'] ?? '');

if ($fullName === '') {
    echo json_encode(['status' => 'error', 'message' => 'New name is required.']);
    exit;
}

try {
    $stmt = $conn->prepare('UPDATE users SET full_name = ? WHERE id = ?');
    $stmt->bind_param('si', $fullName, $userId);
    $stmt->execute();
    $stmt->close();
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update name.']);
    exit;
}

$_SESSION['full_name'] = $fullName;

echo json_encode([
    'status'   => 'success',
    'message'  => 'Name updated successfully.',
    'fullName' => $fullName,
]);
