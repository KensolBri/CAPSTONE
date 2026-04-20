<?php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

require_once __DIR__ . '/../db.php';

$eventId = (int)($_POST['event_id'] ?? 0);
$eventName = trim($_POST['event_name'] ?? '');
$startDate = trim($_POST['start_date'] ?? '');
$endDate = trim($_POST['end_date'] ?? '');
$location = trim($_POST['location'] ?? '');
$polygonId = (int)($_POST['polygon_id'] ?? 0);
$existingEventImage = trim($_POST['existing_event_image_display'] ?? '');
$existingEventPlan = trim($_POST['existing_event_plan'] ?? '');

if ($eventId <= 0 || $eventName === '' || $startDate === '' || $endDate === '' || $location === '') {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
    exit;
}

$eventImageDisplay = $existingEventImage;
$eventPlan = $existingEventPlan;

$uploadDir = __DIR__ . '/../uploads/events/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

if (isset($_FILES['event_image_display']) && $_FILES['event_image_display']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['event_image_display']['name'], PATHINFO_EXTENSION);
    $fn = 'event_' . time() . '_' . mt_rand(1000, 9999) . '.' . ($ext ?: 'jpg');
    if (move_uploaded_file($_FILES['event_image_display']['tmp_name'], $uploadDir . $fn)) {
        $eventImageDisplay = 'tourism/uploads/events/' . $fn;
    }
}

if (isset($_FILES['event_plan']) && $_FILES['event_plan']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['event_plan']['name'], PATHINFO_EXTENSION);
    $fn = 'plan_' . time() . '_' . mt_rand(1000, 9999) . '.' . ($ext ?: 'jpg');
    if (move_uploaded_file($_FILES['event_plan']['tmp_name'], $uploadDir . $fn)) {
        $eventPlan = 'tourism/uploads/events/' . $fn;
    }
}

$stmt = $conn->prepare("
    UPDATE events
    SET event_name = ?, start_date = ?, end_date = ?, location = ?, event_image_display = ?, event_plan = ?, polygon_id = NULLIF(?, 0)
    WHERE id = ?
");
if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to prepare update query.']);
    exit;
}

$stmt->bind_param(
    'ssssssii',
    $eventName,
    $startDate,
    $endDate,
    $location,
    $eventImageDisplay,
    $eventPlan,
    $polygonId,
    $eventId
);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Event updated successfully.']);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Failed to update event.']);
