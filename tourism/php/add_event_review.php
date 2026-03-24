<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Login required']);
    exit;
}

require '../db.php';

$user_id  = (int) $_SESSION['user_id'];
$event_id = (int) ($_POST['event_id'] ?? 0);
$review   = trim($_POST['review_text'] ?? '');

if ($event_id <= 0 || $review === '') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    exit;
}

$stmt = $conn->prepare("INSERT INTO event_reviews (event_id, user_id, review_text) VALUES (?, ?, ?)");
$stmt->bind_param('iis', $event_id, $user_id, $review);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Review submitted.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to save review.']);
}
$stmt->close();
