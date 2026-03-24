<?php
// tourism/php/update_stall_application.php

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST only', 405);
}

$accountType = $_SESSION['account_type'] ?? '';
$userId      = (int)($_SESSION['user_id'] ?? 0);

// application id can come as "id" (LGU) or "application_id" (vendor form)
$appId = isset($_POST['id'])
    ? (int)$_POST['id']
    : (int)($_POST['application_id'] ?? 0);

if ($appId <= 0) {
    json_error('Missing application id.');
}

/* =========================================================
   BRANCH 1: LGU – update status only (approve/reject/etc.)
   ========================================================= */
if ($accountType === 'lgu') {
    $newStatus = $_POST['status'] ?? '';
    $allowed   = ['pending', 'approved', 'rejected', 'cancelled'];

    if (!in_array($newStatus, $allowed, true)) {
        json_error('Invalid status.');
    }

    // Make sure application exists
    $stmt = $conn->prepare("SELECT stall_id FROM stall_applications WHERE id = ?");
    if (!$stmt) {
        json_error('DB error (lookup): ' . $conn->error, 500);
    }
    $stmt->bind_param('i', $appId);
    $stmt->execute();
    $stmt->bind_result($stallId);
    if (!$stmt->fetch()) {
        $stmt->close();
        json_error('Application not found.', 404);
    }
    $stmt->close();

    // Update application status
    $stmt = $conn->prepare("UPDATE stall_applications SET status = ? WHERE id = ?");
    if (!$stmt) {
        json_error('DB error (update): ' . $conn->error, 500);
    }
    $stmt->bind_param('si', $newStatus, $appId);
    if (!$stmt->execute()) {
        $stmt->close();
        json_error('DB error (update execute): ' . $stmt->error, 500);
    }
    $stmt->close();

    echo json_encode([
        'status'   => 'success',
        'message'  => 'Application status updated.',
        'stall_id' => $stallId
    ]);
    exit;
}

/* =========================================================
   BRANCH 2: VENDOR – edit own PENDING application
   ========================================================= */
if ($accountType !== 'vendor' || $userId <= 0) {
    json_error('Only vendors or LGU can update applications.', 403);
}

// 1) Load existing application and verify ownership + status
$stmt = $conn->prepare("
    SELECT stall_id, status, stall_image
    FROM stall_applications
    WHERE id = ? AND vendor_id = ?
");
if (!$stmt) {
    json_error('DB error (load application): ' . $conn->error, 500);
}
$stmt->bind_param('ii', $appId, $userId);
$stmt->execute();
$stmt->bind_result($stallId, $curStatus, $curImage);
if (!$stmt->fetch()) {
    $stmt->close();
    json_error('Application not found or not yours.', 404);
}
$stmt->close();

if ($curStatus !== 'pending') {
    json_error('Only pending applications can be edited.');
}

// 2) Read updated fields from form
$stallName   = trim($_POST['stall_name']   ?? '');
$productType = trim($_POST['product_type'] ?? '');
$stallSize   = trim($_POST['stall_size']   ?? '');

if ($stallName === '' || $productType === '' || $stallSize === '') {
    json_error('Please fill in all required fields.');
}

// 3) Optional image upload (image required on create, optional on edit)
$stallImageName = $curImage; // default to existing

if (isset($_FILES['stall_image']) && $_FILES['stall_image']['error'] !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['stall_image'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        json_error('Error uploading image (code '.$file['error'].').');
    }

    $allowedExt = ['jpg','jpeg','png','gif','webp'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) {
        json_error('Invalid image type. Allowed: jpg, jpeg, png, gif, webp.');
    }

    $uploadDir = __DIR__ . '/../uploads/stalls';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0775, true)) {
            json_error('Failed to create upload directory.', 500);
        }
    }

    $stallImageName = time() . '_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', $file['name']);
    $targetPath     = $uploadDir . '/' . $stallImageName;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        json_error('Failed to save uploaded image on server.', 500);
    }
}

// 4) Update application record
$stmt = $conn->prepare("
    UPDATE stall_applications
    SET stall_name = ?,
        product_type = ?,
        stall_size = ?,
        stall_image = ?
    WHERE id = ? AND vendor_id = ?
");
if (!$stmt) {
    json_error('DB error (update application): ' . $conn->error, 500);
}
$stmt->bind_param(
    'ssssii',
    $stallName,
    $productType,
    $stallSize,
    $stallImageName,
    $appId,
    $userId
);

if (!$stmt->execute()) {
    $msg = 'DB error (update execute): ' . $stmt->error;
    $stmt->close();
    json_error($msg, 500);
}
$stmt->close();

echo json_encode([
    'status'  => 'success',
    'message' => 'Stall application updated successfully.'
]);
