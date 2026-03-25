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
$review = trim($_POST['review_text'] ?? '');

if ($landmark_id <= 0 || $review === '') {
  http_response_code(400);
  echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
  exit();
}

// Ensure reviews table exists
$conn->query("
  CREATE TABLE IF NOT EXISTS landmark_reviews (
    id INT(11) NOT NULL AUTO_INCREMENT,
    landmark_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    review_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY landmark_reviews_landmark_id_idx (landmark_id),
    KEY landmark_reviews_user_id_idx (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$stmt = $conn->prepare("INSERT INTO landmark_reviews (landmark_id, user_id, review_text) VALUES (?, ?, ?)");
$stmt->bind_param('iis', $landmark_id, $user_id, $review);

if ($stmt->execute()) {
  echo json_encode(['status' => 'success', 'message' => 'Review submitted.']);
} else {
  echo json_encode(['status' => 'error', 'message' => 'Failed to save review.']);
}
$stmt->close();
?>

