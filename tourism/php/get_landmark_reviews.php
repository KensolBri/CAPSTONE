<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
session_start();
include '../db.php';

header('Content-Type: application/json');
$host = $_SERVER['HTTP_HOST'] ?? '';
$isHosted = stripos($host, 'free.nf') !== false || stripos($host, 'infinityfreeapp.com') !== false;
$usersDb = getenv('DB_NAME_USERS') ?: ($isHosted ? 'if0_41601200_lokal_users' : 'lokal_users');
$usersTable = $usersDb . '.users';

$landmark_id = (int) ($_GET['landmark_id'] ?? 0);
if ($landmark_id <= 0) {
  echo json_encode([]);
  exit();
}

// Hosted fallback: if the table is missing, return an empty list instead of 500.
$tableCheck = $conn->query("SHOW TABLES LIKE 'landmark_reviews'");
if (!$tableCheck || $tableCheck->num_rows === 0) {
  echo json_encode([]);
  exit();
}

$stmt = $conn->prepare("
  SELECT lr.id, lr.landmark_id, lr.user_id, lr.review_text, lr.created_at,
         COALESCE(u.full_name, 'User') AS reviewer_name,
         COALESCE(NULLIF(TRIM(u.profile_picture), ''), 'tourism/uploads/userPin.png') AS reviewer_avatar
  FROM landmark_reviews lr
  LEFT JOIN {$usersTable} u ON lr.user_id = u.id
  WHERE lr.landmark_id = ?
  ORDER BY lr.created_at DESC
");
$stmt = $stmt ?: null;
if (!$stmt) {
  echo json_encode([]);
  exit();
}
$stmt->bind_param('i', $landmark_id);
$stmt->execute();

$res = $stmt->get_result();
$reviews = [];
while ($row = $res->fetch_assoc()) {
  $reviews[] = $row;
}

$json = json_encode($reviews, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
if ($json === false) {
  echo '[]';
  exit();
}
echo $json;
?>

