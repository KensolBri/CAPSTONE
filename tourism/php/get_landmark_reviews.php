<?php
session_start();
include '../db.php';

header('Content-Type: application/json');

$landmark_id = (int) ($_GET['landmark_id'] ?? 0);
if ($landmark_id <= 0) {
  echo json_encode([]);
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

$stmt = $conn->prepare("
  SELECT lr.id, lr.landmark_id, lr.user_id, lr.review_text, lr.created_at,
         COALESCE(u.full_name, 'User') AS reviewer_name,
         COALESCE(NULLIF(TRIM(u.profile_picture), ''), 'tourism/uploads/userPin.png') AS reviewer_avatar
  FROM landmark_reviews lr
  LEFT JOIN lokal_users.users u ON lr.user_id = u.id
  WHERE lr.landmark_id = ?
  ORDER BY lr.created_at DESC
");
$stmt->bind_param('i', $landmark_id);
$stmt->execute();

$res = $stmt->get_result();
$reviews = [];
while ($row = $res->fetch_assoc()) {
  $reviews[] = $row;
}

echo json_encode($reviews);
?>

