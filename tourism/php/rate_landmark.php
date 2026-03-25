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
$rating = (int) ($_POST['rating'] ?? 0);

if ($landmark_id <= 0 || $rating < 1 || $rating > 5) {
  http_response_code(400);
  echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
  exit();
}

// Ensure landmark ratings table exists
$conn->query("
  CREATE TABLE IF NOT EXISTS landmark_ratings (
    id INT(11) NOT NULL AUTO_INCREMENT,
    landmark_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    rating TINYINT(4) NOT NULL,
    rated_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uniq_landmark_user_rating (landmark_id, user_id),
    KEY landmark_ratings_user_id_idx (user_id),
    KEY landmark_ratings_landmark_id_idx (landmark_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$stmt = $conn->prepare("
  INSERT INTO landmark_ratings (landmark_id, user_id, rating, rated_at)
  VALUES (?, ?, ?, NOW())
  ON DUPLICATE KEY UPDATE
    rating = VALUES(rating),
    rated_at = VALUES(rated_at)
");
$stmt->bind_param('iii', $landmark_id, $user_id, $rating);
$stmt->execute();
$stmt->close();

// Return updated analytics
$avg = 0;
$count = 0;
$q = $conn->prepare("SELECT COALESCE(AVG(rating),0) AS avg_rating, COUNT(*) AS ratings_count FROM landmark_ratings WHERE landmark_id=?");
$q->bind_param('i', $landmark_id);
$q->execute();
$res = $q->get_result();
if ($row = $res->fetch_assoc()) {
  $avg = (float)$row['avg_rating'];
  $count = (int)$row['ratings_count'];
}
$q->close();

echo json_encode([
  'status' => 'success',
  'avg_rating' => $avg,
  'ratings_count' => $count,
  'my_rating' => $rating
]);
?>

