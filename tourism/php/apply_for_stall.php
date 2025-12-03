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

$vendorId      = (int)$_SESSION['user_id'];
$stallId       = isset($_POST['stall_id']) ? (int)$_POST['stall_id'] : 0;

// Optional extra fields from the apply form
$stallName     = trim($_POST['stall_name']     ?? '');
$productType   = trim($_POST['product_type']   ?? '');
$stallSize     = trim($_POST['stall_size']     ?? '');
$preferredArea = trim($_POST['preferred_area'] ?? '');

if ($stallId <= 0) {
    json_error('Invalid stall ID.');
}

// Basic validation for form fields (adjust as you like)
if ($stallName === '' || $productType === '' || $stallSize === '' || $preferredArea === '') {
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

// --- 2) Optional: prevent duplicate active applications by same vendor for same stall ---
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
    $appStatus = 'pending';
    $stmt = $conn->prepare("
        INSERT INTO stall_applications
            (stall_id, vendor_id, stall_name, product_type, stall_size, preferred_area, status, applied_at)
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
        $preferredArea,
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
        'message' => 'Stall application submitted successfully.'
    ]);
} catch (Exception $e) {
    $conn->rollback();
    json_error('Database error: ' . $e->getMessage(), 500);
}
