<?php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

require_once __DIR__ . '/../db.php';

$eventId = (int)($_POST['id'] ?? 0);
if ($eventId <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing event id.']);
    exit;
}

$stmt = $conn->prepare("SELECT polygon_id FROM events WHERE id = ? LIMIT 1");
if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare lookup query.']);
    exit;
}
$stmt->bind_param('i', $eventId);
$stmt->execute();
$stmt->bind_result($polygonId);
if (!$stmt->fetch()) {
    $stmt->close();
    echo json_encode(['status' => 'error', 'message' => 'Event not found.']);
    exit;
}
$stmt->close();

$stmt = $conn->prepare("DELETE FROM events WHERE id = ?");
if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare delete query.']);
    exit;
}
$stmt->bind_param('i', $eventId);
if (!$stmt->execute()) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to delete event.']);
    exit;
}
$stmt->close();

if (!empty($polygonId)) {
    $stmt = $conn->prepare("DELETE FROM polygons WHERE id = ?");
    if ($stmt) {
        $stmt->bind_param('i', $polygonId);
        $stmt->execute();
        $stmt->close();
    }
}

echo json_encode(['status' => 'success', 'message' => 'Event deleted successfully.']);
