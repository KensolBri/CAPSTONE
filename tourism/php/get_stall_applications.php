<?php
ini_set('display_errors',1);
error_reporting(E_ALL);

session_start();
require '../db.php';

header('Content-Type: application/json');

// LGU only
if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'message' => 'LGU only'
    ]);
    exit;
}

$sql = "
    SELECT 
        a.id,
        a.stall_id,
        a.vendor_id,
        a.stall_name,
        a.product_type,
        a.stall_size,
        a.preferred_area,
        a.status,
        DATE_FORMAT(a.applied_at, '%b %e, %Y %H:%i:%s') AS applied_at,
        u.username AS vendor_name
    FROM stall_applications a
    LEFT JOIN users u ON a.vendor_id = u.id
    ORDER BY a.applied_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        'status' => 'error',
        'message' => 'DB error: ' . $conn->error
    ]);
    exit;
}

$apps = [];
while ($row = $result->fetch_assoc()) {
    $apps[] = $row;
}

echo json_encode([
    'status' => 'success',
    'data' => $apps
]);
?>
