<?php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

require_once __DIR__ . '/../db.php';

$eventName = trim($_POST['event_name'] ?? '');
$startDate = trim($_POST['start_date'] ?? '');
$endDate   = trim($_POST['end_date'] ?? '');
$location  = trim($_POST['location'] ?? '');
$polygonId = !empty($_POST['polygon_id']) ? (int) $_POST['polygon_id'] : null;

if ($eventName === '' || $startDate === '' || $endDate === '' || $location === '') {
    echo json_encode(['status' => 'error', 'message' => 'Event name, start date, end date, and location are required.']);
    exit;
}

$eventImageDisplay = null;
$eventPlan         = null;

$uploadDir = __DIR__ . '/../uploads/events/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

// Event Image Display (card background)
if (isset($_FILES['event_image_display']) && $_FILES['event_image_display']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['event_image_display']['name'], PATHINFO_EXTENSION);
    $fn  = 'event_' . time() . '_' . mt_rand(1000, 9999) . '.' . ($ext ?: 'jpg');
    if (move_uploaded_file($_FILES['event_image_display']['tmp_name'], $uploadDir . $fn)) {
        $eventImageDisplay = 'tourism/uploads/events/' . $fn;
    }
}

// Event Plan (optional)
if (isset($_FILES['event_plan']) && $_FILES['event_plan']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['event_plan']['name'], PATHINFO_EXTENSION);
    $fn  = 'plan_' . time() . '_' . mt_rand(1000, 9999) . '.' . ($ext ?: 'jpg');
    if (move_uploaded_file($_FILES['event_plan']['tmp_name'], $uploadDir . $fn)) {
        $eventPlan = 'tourism/uploads/events/' . $fn;
    }
}

$polygonIdVal = ($polygonId && $polygonId > 0) ? $polygonId : 0;
$eventImg     = $eventImageDisplay ?: '';
$eventPlanVal = $eventPlan ?: '';

$stmt = $conn->prepare("
    INSERT INTO events (event_name, start_date, end_date, location, event_image_display, event_plan, polygon_id)
    VALUES (?, ?, ?, ?, ?, ?, NULLIF(?, 0))
");
$stmt->bind_param('ssssssi',
    $eventName, $startDate, $endDate, $location,
    $eventImg, $eventPlanVal,
    $polygonIdVal
);

if ($stmt->execute()) {
    echo json_encode([
        'status'   => 'success',
        'message'  => 'Event added successfully.',
        'event_id' => $conn->insert_id,
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to add event. ' . $conn->error]);
}
