<?php
// tourism/php/delete_stall_application.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();
require '../db.php';

header('Content-Type: application/json');

function json_error($msg, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'status'  => 'error',
        'message' => $msg
    ]);
    exit;
}

// POST only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST only', 405);
}

// LGU only – vendors should NOT be able to delete records from history
if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    json_error('LGU only.', 403);
}

$appId = isset($_POST['id']) ? (int)$_POST['id'] : 0;
if ($appId <= 0) {
    json_error('Missing application id.');
}

// Get status first (and stall_id if you ever want to use it)
$stmt = $conn->prepare("
    SELECT stall_id, status
    FROM stall_applications
    WHERE id = ?
");
if (!$stmt) {
    json_error('DB error (lookup): ' . $conn->error, 500);
}
$stmt->bind_param('i', $appId);
$stmt->execute();
$stmt->bind_result($stallId, $status);
if (!$stmt->fetch()) {
    $stmt->close();
    json_error('Application not found.', 404);
}
$stmt->close();

// Only allow delete if already rejected or cancelled
if ($status !== 'rejected' && $status !== 'cancelled') {
    json_error('Only rejected or cancelled applications can be deleted.');
}

// Perform delete
$stmt = $conn->prepare("DELETE FROM stall_applications WHERE id = ?");
if (!$stmt) {
    json_error('DB error (delete): ' . $conn->error, 500);
}
$stmt->bind_param('i', $appId);
if (!$stmt->execute()) {
    $msg = 'DB error (delete execute): ' . $stmt->error;
    $stmt->close();
    json_error($msg, 500);
}
$stmt->close();

echo json_encode([
    'status'   => 'success',
    'message'  => 'Application deleted.',
    'stall_id' => $stallId
]);
