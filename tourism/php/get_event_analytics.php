<?php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

require '../db.php';

$result = $conn->query("
    SELECT e.id, e.event_name, e.start_date, e.end_date, e.location,
           (SELECT COUNT(*) FROM event_favorites WHERE event_id = e.id) AS favorites_count,
           (SELECT COUNT(*) FROM event_ratings WHERE event_id = e.id) AS ratings_count,
           (SELECT COALESCE(AVG(rating), 0) FROM event_ratings WHERE event_id = e.id) AS avg_rating,
           (SELECT COUNT(*) FROM event_reviews WHERE event_id = e.id) AS reviews_count
    FROM events e
    ORDER BY e.start_date ASC
");

$events = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $events[] = $row;
    }
}

echo json_encode($events);
