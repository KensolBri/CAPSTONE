<?php
include '../db.php';

header('Content-Type: application/json');

// Ensure landmark columns exist (in case SQL migration wasn't run yet).
// This prevents "Unknown column" errors when saving.
$colCheck = $conn->query("SHOW COLUMNS FROM markers LIKE 'address'");
if (!$colCheck || $colCheck->num_rows === 0) {
    $conn->query("ALTER TABLE markers ADD COLUMN address TEXT DEFAULT NULL");
}
$colCheck2 = $conn->query("SHOW COLUMNS FROM markers LIKE 'landmark_images'");
$addressExists = ($colCheck && $colCheck->num_rows > 0);
$galleryExists = ($colCheck2 && $colCheck2->num_rows > 0);

// If landmark_images is missing, create it so optional pictures can be saved.
if (!$galleryExists) {
    $conn->query("ALTER TABLE markers ADD COLUMN landmark_images TEXT DEFAULT NULL");
    $colCheck2 = $conn->query("SHOW COLUMNS FROM markers LIKE 'landmark_images'");
    $galleryExists = ($colCheck2 && $colCheck2->num_rows > 0);
}

// Re-check after ALTER attempts
if (!$addressExists) {
    $colCheck = $conn->query("SHOW COLUMNS FROM markers LIKE 'address'");
    $addressExists = ($colCheck && $colCheck->num_rows > 0);
}
// (galleryExists already re-checked above when attempting to add the column)

$name = $_POST['name'] ?? '';
$address = $_POST['address'] ?? '';
$description = $_POST['description'] ?? '';
$lat = isset($_POST['lat']) ? floatval($_POST['lat']) : 0;
$lng = isset($_POST['lng']) ? floatval($_POST['lng']) : 0;
$icon_type = $_POST['icon_type'] ?? 'round';
$category = 'Landmark';

// Thumbnail (required)
$thumbnail_name = null;
if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === 0) {
    $ext = pathinfo($_FILES['thumbnail']['name'], PATHINFO_EXTENSION);
    $thumbnail_name = uniqid() . '.' . $ext;
    move_uploaded_file($_FILES['thumbnail']['tmp_name'], '../uploads/' . $thumbnail_name);
}

// Optional landmark pictures (gallery)
$gallery_files = [];
if (isset($_FILES['landmark_pictures']) && is_array($_FILES['landmark_pictures']['name'])) {
    $count = count($_FILES['landmark_pictures']['name']);
    for ($i = 0; $i < $count; $i++) {
        if (!isset($_FILES['landmark_pictures']['error'][$i]) || $_FILES['landmark_pictures']['error'][$i] !== 0) {
            continue;
        }
        $picName = $_FILES['landmark_pictures']['name'][$i];
        if (!$picName) continue;
        $ext = pathinfo($picName, PATHINFO_EXTENSION);
        $newName = uniqid() . '.' . $ext;
        move_uploaded_file($_FILES['landmark_pictures']['tmp_name'][$i], '../uploads/' . $newName);
        $gallery_files[] = $newName;
    }
}
$landmark_images_json = !empty($gallery_files) ? json_encode($gallery_files) : null;

if (!$name || $lat === 0 || $lng === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required landmark fields.']);
    exit();
}

if (!$thumbnail_name) {
    echo json_encode(['status' => 'error', 'message' => 'Landmark thumbnail is required.']);
    exit();
}

if ($addressExists && $galleryExists) {
    $stmt = $conn->prepare(
        "INSERT INTO markers (name, category, description, lat, lng, icon_type, image, address, landmark_images)
         VALUES (?,?,?,?,?,?,?,?,?)"
    );
    $stmt->bind_param(
        "sssddssss",
        $name,
        $category,
        $description,
        $lat,
        $lng,
        $icon_type,
        $thumbnail_name,
        $address,
        $landmark_images_json
    );
} elseif ($addressExists && !$galleryExists) {
    $stmt = $conn->prepare(
        "INSERT INTO markers (name, category, description, lat, lng, icon_type, image, address)
         VALUES (?,?,?,?,?,?,?,?)"
    );
    $stmt->bind_param(
        "sssddsss",
        $name,
        $category,
        $description,
        $lat,
        $lng,
        $icon_type,
        $thumbnail_name,
        $address
    );
} elseif (!$addressExists && $galleryExists) {
    $stmt = $conn->prepare(
        "INSERT INTO markers (name, category, description, lat, lng, icon_type, image, landmark_images)
         VALUES (?,?,?,?,?,?,?,?)"
    );
    $stmt->bind_param(
        "sssddsss",
        $name,
        $category,
        $description,
        $lat,
        $lng,
        $icon_type,
        $thumbnail_name,
        $landmark_images_json
    );
} else {
    $stmt = $conn->prepare(
        "INSERT INTO markers (name, category, description, lat, lng, icon_type, image)
         VALUES (?,?,?,?,?,?,?)"
    );
    $stmt->bind_param(
        "sssddss",
        $name,
        $category,
        $description,
        $lat,
        $lng,
        $icon_type,
        $thumbnail_name
    );
}

if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => $stmt->error]);
}
$stmt->close();
?>

