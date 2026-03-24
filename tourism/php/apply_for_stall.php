<?php
// tourism/php/apply_for_stall.php
session_start();
require '../db.php';   // this defines $conn (mysqli)

header('Content-Type: application/json');

// Helper to send JSON error and stop
function json_error($msg, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'status'  => 'error',
        'message' => $msg
    ]);
    exit;
}

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST only', 405);
}

// Must be logged in as vendor
if (empty($_SESSION['user_id']) || ($_SESSION['account_type'] ?? '') !== 'vendor') {
    json_error('Only vendors can apply for stalls.', 403);
}

$vendorId = (int)$_SESSION['user_id'];
$stallId  = isset($_POST['stall_id']) ? (int)$_POST['stall_id'] : 0;

// Extra fields from the apply form
$stallName   = trim($_POST['stall_name']   ?? '');
$productType = trim($_POST['product_type'] ?? '');
$stallSize   = trim($_POST['stall_size']   ?? '');

// ----------------------
// Handle stall picture
// ----------------------
$stallImageName = '';

if (!isset($_FILES['stall_image']) || $_FILES['stall_image']['error'] === UPLOAD_ERR_NO_FILE) {
    json_error('Please upload a stall picture.');
}

$file = $_FILES['stall_image'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    json_error('Error uploading image (code '.$file['error'].').');
}

// OPTIONAL: simple extension check
$allowedExt = ['jpg','jpeg','png','gif','webp'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt)) {
    json_error('Invalid image type. Allowed: jpg, jpeg, png, gif, webp.');
}

// Make sure uploads folder exists (change path if you want)
$uploadDir = __DIR__ . '/../uploads/stalls';
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0775, true)) {
        json_error('Failed to create upload directory.', 500);
    }
}

// Create unique filename
$stallImageName = time() . '_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', $file['name']);
$targetPath     = $uploadDir . '/' . $stallImageName;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    json_error('Failed to save uploaded image on server.', 500);
}

// ----------------------
// Basic validation
// ----------------------
if ($stallId <= 0) {
    json_error('Invalid stall ID.');
}

if ($stallName === '' || $productType === '' || $stallSize === '') {
    json_error('Please fill in all required fields.');
}

// --- 1) Check stall exists and is available ---
$stmt = $conn->prepare("SELECT status FROM stalls WHERE id = ?");
if (!$stmt) {
    json_error('DB prepare failed (stalls check): ' . $conn->error, 500);
}
$stmt->bind_param("i", $stallId);
$stmt->execute();
$stmt->bind_result($status);
if (!$stmt->fetch()) {
    $stmt->close();
    json_error('Stall not found.', 404);
}
$stmt->close();

if ($status !== 'available') {
    json_error('Stall is not available.');
}

// --- 2) Prevent duplicate active applications by same vendor for same stall ---
$stmt = $conn->prepare("
    SELECT id 
    FROM stall_applications
    WHERE stall_id = ? AND vendor_id = ? AND status IN ('pending','approved')
");
if (!$stmt) {
    json_error('DB prepare failed (duplicate check): ' . $conn->error, 500);
}
$stmt->bind_param("ii", $stallId, $vendorId);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    $stmt->close();
    json_error('You already have an active application for this stall.');
}
$stmt->close();

// --- 3) Insert application + update stall to reserved (transaction) ---
$conn->begin_transaction();

try {
    // Insert into stall_applications
    // NOTE: assumes you have column `stall_image` in this table
    $appStatus = 'pending';
    $stmt = $conn->prepare("
        INSERT INTO stall_applications
            (stall_id, vendor_id, stall_name, product_type, stall_size, stall_image, status, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    if (!$stmt) {
        throw new Exception('DB prepare failed (insert application): ' . $conn->error);
    }
    $stmt->bind_param(
        "iisssss",
        $stallId,
        $vendorId,
        $stallName,
        $productType,
        $stallSize,
        $stallImageName,
        $appStatus
    );
    if (!$stmt->execute()) {
        throw new Exception('DB execute failed (insert application): ' . $stmt->error);
    }
    $stmt->close();

    // Update stall status to reserved
    $newStallStatus = 'reserved';
    $stmt = $conn->prepare("UPDATE stalls SET status = ? WHERE id = ?");
    if (!$stmt) {
        throw new Exception('DB prepare failed (update stall): ' . $conn->error);
    }
    $stmt->bind_param("si", $newStallStatus, $stallId);
    if (!$stmt->execute()) {
        throw new Exception('DB execute failed (update stall): ' . $stmt->error);
    }
    $stmt->close();

    $conn->commit();

    echo json_encode([
        'status'  => 'success',
        'message' => 'Stall application submitted successfully.',
        'stall_image' => $stallImageName
    ]);
} catch (Exception $e) {
    $conn->rollback();
    json_error('Database error: ' . $e->getMessage(), 500);
}
