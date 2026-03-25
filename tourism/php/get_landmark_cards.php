<?php
session_start();
include '../db.php';

header('Content-Type: application/json');

// Ensure landmark analytics tables exist (reviews/ratings/favorites)
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

$user_id = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;

// Column availability (in case migration wasn't run yet)
$addrExists = false;
$imgListExists = false;
$res = $conn->query("SHOW COLUMNS FROM markers LIKE 'address'");
$addrExists = ($res && $res->num_rows > 0);
$res2 = $conn->query("SHOW COLUMNS FROM markers LIKE 'landmark_images'");
$imgListExists = ($res2 && $res2->num_rows > 0);

$addressSelect = $addrExists ? "m.address AS address" : "'' AS address";
$gallerySelect = $imgListExists ? "m.landmark_images AS landmark_images" : "NULL AS landmark_images";

$sql = "
  SELECT
    m.id,
    m.name,
    $addressSelect,
    m.description,
    m.image,
    $gallerySelect,
    COALESCE((SELECT AVG(r.rating) FROM landmark_ratings r WHERE r.landmark_id = m.id), 0) AS avg_rating,
    (SELECT COUNT(*) FROM landmark_ratings r2 WHERE r2.landmark_id = m.id) AS ratings_count,
    (SELECT COUNT(*) FROM landmark_favorites f2 WHERE f2.landmark_id = m.id) AS favorites_count,
    IF(lf.user_id IS NULL, 0, 1) AS is_favorite,
    COALESCE(lr.rating, 0) AS my_rating
  FROM markers m
  LEFT JOIN landmark_favorites lf ON lf.landmark_id = m.id AND lf.user_id = ?
  LEFT JOIN landmark_ratings lr ON lr.landmark_id = m.id AND lr.user_id = ?
  WHERE m.category = 'Landmark'
  ORDER BY m.id DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param('ii', $user_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();

$landmarks = [];
while ($row = $result->fetch_assoc()) {
  // Build image display paths expected by Main.php (served from /CAPSTONE)
  $row['image_display'] = (!empty($row['image'])) ? ('tourism/uploads/' . $row['image']) : 'dagyang.jpg';

  // Convert gallery images JSON list (if any) into full display paths
  if (!empty($row['landmark_images'])) {
    $arr = json_decode($row['landmark_images'], true);
    if (is_array($arr) && !empty($arr)) {
      $row['landmark_images_display'] = array_map(function ($fn) {
        return 'tourism/uploads/' . $fn;
      }, $arr);
    } else {
      $row['landmark_images_display'] = [];
    }
  } else {
    $row['landmark_images_display'] = [];
  }

  // Ensure numeric fields are always present
  $row['avg_rating'] = isset($row['avg_rating']) ? (float)$row['avg_rating'] : 0;
  $row['ratings_count'] = isset($row['ratings_count']) ? (int)$row['ratings_count'] : 0;
  $row['favorites_count'] = isset($row['favorites_count']) ? (int)$row['favorites_count'] : 0;
  $row['is_favorite'] = isset($row['is_favorite']) ? (int)$row['is_favorite'] : 0;
  $row['my_rating'] = isset($row['my_rating']) ? (int)$row['my_rating'] : 0;

  $landmarks[] = $row;
}

echo json_encode($landmarks);
?>

