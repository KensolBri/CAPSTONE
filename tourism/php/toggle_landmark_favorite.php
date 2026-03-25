<?php
session_start();
include '../db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['status' => 'error', 'message' => 'Login required']);
  exit();
}

$user_id = (int) $_SESSION['user_id'];
$landmark_id = (int) ($_POST['landmark_id'] ?? 0);

if ($landmark_id <= 0) {
  http_response_code(400);
  echo json_encode(['status' => 'error', 'message' => 'Invalid landmark id']);
  exit();
}

$conn->query("
  CREATE TABLE IF NOT EXISTS landmark_favorites (
    id INT(11) NOT NULL AUTO_INCREMENT,
    landmark_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uniq_landmark_user (landmark_id, user_id),
    KEY landmark_favorites_user_id_idx (user_id),
    KEY landmark_favorites_landmark_id_idx (landmark_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// Check existing favorite
$check = $conn->prepare("SELECT id FROM landmark_favorites WHERE landmark_id=? AND user_id=?");
$check->bind_param('ii', $landmark_id, $user_id);
$check->execute();
$check->store_result();

$status = 'added';
if ($check->num_rows > 0) {
  $del = $conn->prepare("DELETE FROM landmark_favorites WHERE landmark_id=? AND user_id=?");
  $del->bind_param('ii', $landmark_id, $user_id);
  $del->execute();
  $del->close();
  $status = 'removed';
} else {
  $ins = $conn->prepare("INSERT INTO landmark_favorites (landmark_id, user_id, created_at) VALUES (?, ?, NOW())");
  $ins->bind_param('ii', $landmark_id, $user_id);
  $ins->execute();
  $ins->close();
}
$check->close();

$count = 0;
$cntStmt = $conn->prepare("SELECT COUNT(*) AS c FROM landmark_favorites WHERE landmark_id=?");
$cntStmt->bind_param('i', $landmark_id);
$cntStmt->execute();
$cntStmt->bind_result($count);
$cntStmt->fetch();
$cntStmt->close();

echo json_encode([
  'status' => 'success',
  'favorite' => $status,
  'favorites_count' => (int)$count
]);
?>

