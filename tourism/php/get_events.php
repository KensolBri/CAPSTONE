<?php
session_start();
include '../db.php';

header('Content-Type: application/json');

$user_id = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;

$sql = "
    SELECT e.id, e.event_name, e.start_date, e.end_date, e.location,
           e.event_image_display, e.event_plan, e.polygon_id, e.avg_rating, e.ratings_count, e.favorites_count,
           p.name AS polygon_name,
           IF(ef.id IS NULL, 0, 1) AS is_favorite,
           COALESCE(er.rating, 0) AS my_rating
    FROM events e
    LEFT JOIN polygons p ON e.polygon_id = p.id
    LEFT JOIN event_favorites ef ON ef.event_id = e.id AND ef.user_id = ?
    LEFT JOIN event_ratings er ON er.event_id = e.id AND er.user_id = ?
    ORDER BY e.start_date ASC
";

$stmt = $conn->prepare($sql);
if ($stmt) {
    $stmt->bind_param('ii', $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query("
        SELECT e.id, e.event_name, e.start_date, e.end_date, e.location,
               e.event_image_display, e.event_plan, e.polygon_id,
               p.name AS polygon_name
        FROM events e
        LEFT JOIN polygons p ON e.polygon_id = p.id
        ORDER BY e.start_date ASC
    ");
}

$events = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        if (!isset($row['avg_rating'])) $row['avg_rating'] = 0;
        if (!isset($row['ratings_count'])) $row['ratings_count'] = 0;
        if (!isset($row['favorites_count'])) $row['favorites_count'] = 0;
        if (!isset($row['is_favorite'])) $row['is_favorite'] = 0;
        if (!isset($row['my_rating'])) $row['my_rating'] = 0;
        $events[] = $row;
    }
}

echo json_encode($events);
