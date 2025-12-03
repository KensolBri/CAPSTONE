<?php
ini_set('display_errors',1);
error_reporting(E_ALL);

session_start();
require '../db.php';

header('Content-Type: application/json');

// Vendor only
if (($_SESSION['account_type'] ?? '') !== 'vendor') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Vendor only']);
    exit;
}

// Adjust this if you store the user id under a different key
$vendorId = $_SESSION['user_id'] ?? 0;
if (!$vendorId) {
    echo json_encode(['status' => 'error', 'message' => 'No vendor id']);
    exit;
}

// Get all decisions not yet shown to this vendor
$stmt = $conn->prepare("
    SELECT id, stall_id, stall_name, status
    FROM stall_applications
    WHERE vendor_id = ?
      AND vendor_notified = 0
      AND status IN ('approved','rejected','cancelled')
    ORDER BY applied_at DESC
");
$stmt->bind_param('i', $vendorId);
$stmt->execute();
$res  = $stmt->get_result();

$rows = [];
while ($row = $res->fetch_assoc()) {
    $rows[] = $row;
}

// Mark them as notified so we don't show twice
if (!empty($rows)) {
    $ids = array_column($rows, 'id');
    $idsList = implode(',', array_map('intval', $ids));
    $conn->query("UPDATE stall_applications SET vendor_notified = 1 WHERE id IN ($idsList)");
}

echo json_encode([
    'status' => 'success',
    'data'   => $rows
]);
