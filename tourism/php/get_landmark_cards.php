<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
session_start();
include '../db.php';

header('Content-Type: application/json');

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

// On some hosted plans, CREATE TABLE is restricted. Instead of creating tables here,
// detect whether analytics tables exist and gracefully fall back to zeroed fields.
$hasFavorites = false;
$hasRatings = false;
$tf = $conn->query("SHOW TABLES LIKE 'landmark_favorites'");
if ($tf && $tf->num_rows > 0) $hasFavorites = true;
$tr = $conn->query("SHOW TABLES LIKE 'landmark_ratings'");
if ($tr && $tr->num_rows > 0) $hasRatings = true;

$avgRatingSelect = $hasRatings
  ? "COALESCE((SELECT AVG(r.rating) FROM landmark_ratings r WHERE r.landmark_id = m.id), 0) AS avg_rating"
  : "0 AS avg_rating";
$ratingsCountSelect = $hasRatings
  ? "(SELECT COUNT(*) FROM landmark_ratings r2 WHERE r2.landmark_id = m.id) AS ratings_count"
  : "0 AS ratings_count";
$favoritesCountSelect = $hasFavorites
  ? "(SELECT COUNT(*) FROM landmark_favorites f2 WHERE f2.landmark_id = m.id) AS favorites_count"
  : "0 AS favorites_count";
$isFavoriteSelect = $hasFavorites
  ? "IF(lf.user_id IS NULL, 0, 1) AS is_favorite"
  : "0 AS is_favorite";
$myRatingSelect = $hasRatings
  ? "COALESCE(lr.rating, 0) AS my_rating"
  : "0 AS my_rating";
$joinFavorites = $hasFavorites ? "LEFT JOIN landmark_favorites lf ON lf.landmark_id = m.id AND lf.user_id = ?" : "";
$joinRatings = $hasRatings ? "LEFT JOIN landmark_ratings lr ON lr.landmark_id = m.id AND lr.user_id = ?" : "";

$sql = "
  SELECT
    m.id,
    m.name,
    $addressSelect,
    m.description,
    m.image,
    $gallerySelect,
    $avgRatingSelect,
    $ratingsCountSelect,
    $favoritesCountSelect,
    $isFavoriteSelect,
    $myRatingSelect
  FROM markers m
  $joinFavorites
  $joinRatings
  WHERE TRIM(LOWER(m.category)) = 'landmark'
  ORDER BY m.id DESC
";

$stmt = $conn->prepare($sql);
$stmt = $stmt ?: null;
if (!$stmt) {
  echo json_encode([]);
  exit;
}
if ($hasFavorites && $hasRatings) {
  $stmt->bind_param('ii', $user_id, $user_id);
} elseif ($hasFavorites || $hasRatings) {
  $stmt->bind_param('i', $user_id);
}
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

$json = json_encode($landmarks, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
if ($json === false) {
  echo '[]';
  exit;
}
echo $json;
?>

