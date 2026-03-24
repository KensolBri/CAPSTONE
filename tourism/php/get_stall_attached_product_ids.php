<?php
// tourism/php/get_stall_attached_product_ids.php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'vendor') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Vendor only']);
    exit;
}

$vendor_id = (int)($_SESSION['user_id'] ?? 0);
if ($vendor_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing vendor id']);
    exit;
}

require '../db.php';

$stall_id = isset($_REQUEST['stall_id']) ? (int)$_REQUEST['stall_id'] : 0;
if ($stall_id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid stall_id']);
    exit;
}

// Only allow reading attachments for your APPROVED stall.
$sqlApp = "
    SELECT id
    FROM stall_applications
    WHERE stall_id = ?
      AND vendor_id = ?
      AND status = 'approved'
    ORDER BY applied_at DESC
    LIMIT 1
";
$stmt = $conn->prepare($sqlApp);
$stmt->bind_param('ii', $stall_id, $vendor_id);
$stmt->execute();
$app = $stmt->get_result();
$appRow = $app ? $app->fetch_assoc() : null;
$stmt->close();

if (!$appRow) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Stall not found / not approved']);
    exit;
}

// Junction table: stall_products
$attachedIds = [];
$sql = "
    SELECT product_id
    FROM stall_products
    WHERE stall_id = ?
    ORDER BY created_at DESC
";
$stmt = $conn->prepare($sql);
if ($stmt) {
    $stmt->bind_param('i', $stall_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $attachedIds[] = (int)$row['product_id'];
    }
    $stmt->close();
}

// If stall_products table doesn't exist (prepare failed), attachedIds remains empty.
echo json_encode([
    'status' => 'success',
    'data' => $attachedIds
]);

$conn->close();

