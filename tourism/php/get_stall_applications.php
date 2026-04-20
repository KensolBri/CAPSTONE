<?php
ini_set('display_errors',1);
error_reporting(E_ALL);

session_start();
require '../db.php';

header('Content-Type: application/json');

$host = $_SERVER['HTTP_HOST'] ?? '';
$isHosted = stripos($host, 'free.nf') !== false || stripos($host, 'infinityfreeapp.com') !== false;
$usersDb = getenv('DB_NAME_USERS') ?: ($isHosted ? 'if0_41601200_lokal_users' : 'lokal_users');
$usersTable = $usersDb . '.users';
$accountType = strtolower((string)($_SESSION['account_type'] ?? ''));

// LGU only
if ($accountType !== 'lgu') {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'message' => 'LGU only'
    ]);
    exit;
}

$sql = "
    SELECT 
        sa.id,
        sa.stall_id,
        sa.vendor_id,
        u.full_name AS vendor_name,
        sa.stall_name,
        sa.product_type,
        sa.stall_size,
        sa.stall_image,
        sa.status,
        sa.applied_at
    FROM stall_applications AS sa
    JOIN {$usersTable} AS u
      ON sa.vendor_id = u.id
    ORDER BY sa.applied_at DESC
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
