<?php
// tourism/php/cancel_stall_application.php
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

// must be logged in as vendor
if (empty($_SESSION['user_id']) || ($_SESSION['account_type'] ?? '') !== 'vendor') {
    json_error('Only vendors can cancel applications.', 403);
}

$vendorId = (int)$_SESSION['user_id'];
$appId    = (int)($_POST['application_id'] ?? 0);

if ($appId <= 0) {
    json_error('Missing application id.');
}

// 1) Load the application and make sure it belongs to this vendor and is pending
$sql = "
    SELECT stall_id, status
    FROM stall_applications
    WHERE id = ? AND vendor_id = ?
    LIMIT 1
";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    json_error('DB prepare failed: ' . $conn->error, 500);
}
$stmt->bind_param('ii', $appId, $vendorId);
$stmt->execute();
$stmt->bind_result($stallId, $status);
if (!$stmt->fetch()) {
    $stmt->close();
    json_error('Application not found.', 404);
}
$stmt->close();

if ($status !== 'pending') {
    json_error('Only pending applications can be cancelled.');
}

// 2) Cancel application + free stall (transaction)
$conn->begin_transaction();

try {
    // mark application as cancelled
    $newStatus = 'cancelled';
    $stmt = $conn->prepare("
        UPDATE stall_applications
        SET status = ?
        WHERE id = ? AND vendor_id = ?
    ");
    if (!$stmt) {
        throw new Exception('DB prepare failed (update app): ' . $conn->error);
    }
    $stmt->bind_param('sii', $newStatus, $appId, $vendorId);
    if (!$stmt->execute()) {
        throw new Exception('DB execute failed (update app): ' . $stmt->error);
    }
    $stmt->close();

    // set stall back to available (it should currently be reserved)
    $stallStatus = 'available';
    $stmt = $conn->prepare("
        UPDATE stalls
        SET status = ?
        WHERE id = ?
    ");
    if (!$stmt) {
        throw new Exception('DB prepare failed (update stall): ' . $conn->error);
    }
    $stmt->bind_param('si', $stallStatus, $stallId);
    if (!$stmt->execute()) {
        throw new Exception('DB execute failed (update stall): ' . $stmt->error);
    }
    $stmt->close();

    $conn->commit();

    echo json_encode([
        'status'  => 'success',
        'message' => 'Application cancelled and stall freed.'
    ]);
} catch (Exception $e) {
    $conn->rollback();
    json_error('Database error: ' . $e->getMessage(), 500);
}
