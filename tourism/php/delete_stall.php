<?php
session_start();
require '../db.php';

header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'POST only']);
    exit;
}

$stallId = isset($_POST['stall_id']) ? (int)$_POST['stall_id'] : 0;
if ($stallId <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid stall id.']);
    exit;
}

$conn->begin_transaction();
try {
    $stmt = $conn->prepare("DELETE FROM stall_products WHERE stall_id = ?");
    if ($stmt) {
        $stmt->bind_param('i', $stallId);
        $stmt->execute();
        $stmt->close();
    }

    $stmt = $conn->prepare("DELETE FROM stall_applications WHERE stall_id = ?");
    if ($stmt) {
        $stmt->bind_param('i', $stallId);
        $stmt->execute();
        $stmt->close();
    }

    $stmt = $conn->prepare("DELETE FROM stalls WHERE id = ?");
    if (!$stmt) {
        throw new Exception('Failed to prepare stall delete query.');
    }
    $stmt->bind_param('i', $stallId);
    if (!$stmt->execute()) {
        throw new Exception('Failed to delete stall.');
    }
    $stmt->close();

    $conn->commit();
    echo json_encode(['status' => 'success', 'message' => 'Stall removed.']);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
