<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
include '../db.php';

header('Content-Type: application/json');
$host = $_SERVER['HTTP_HOST'] ?? '';
$isHosted = stripos($host, 'free.nf') !== false || stripos($host, 'infinityfreeapp.com') !== false;
$usersDb = getenv('DB_NAME_USERS') ?: ($isHosted ? 'if0_41601200_lokal_users' : 'lokal_users');
$usersTable = $usersDb . '.users';

$event_id = (int) ($_GET['event_id'] ?? 0);
if ($event_id <= 0) {
    echo json_encode([]);
    exit;
}

$stmt = $conn->prepare("
    SELECT er.id, er.event_id, er.user_id, er.review_text, er.created_at,
           COALESCE(u.full_name, 'User') AS reviewer_name,
           COALESCE(NULLIF(TRIM(u.profile_picture), ''), 'tourism/uploads/userPin.png') AS reviewer_avatar
    FROM event_reviews er
    LEFT JOIN {$usersTable} u ON er.user_id = u.id
    WHERE er.event_id = ?
    ORDER BY er.created_at DESC
");
$stmt = $stmt ?: null;
if (!$stmt) {
    echo json_encode([]);
    exit;
}
$stmt->bind_param('i', $event_id);
$stmt->execute();
$res = $stmt->get_result();

$reviews = [];
while ($row = $res->fetch_assoc()) {
    $reviews[] = $row;
}

echo json_encode($reviews);
