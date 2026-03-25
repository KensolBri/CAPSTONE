<?php
include '../db.php';

header('Content-Type: application/json');

// Ensure landmark columns exist (in case SQL migration wasn't run yet).
// This prevents "Unknown column" errors on update.
$colCheck = $conn->query("SHOW COLUMNS FROM markers LIKE 'address'");
if (!$colCheck || $colCheck->num_rows === 0) {
    $conn->query("ALTER TABLE markers ADD COLUMN address TEXT DEFAULT NULL");
}
$colCheck2 = $conn->query("SHOW COLUMNS FROM markers LIKE 'landmark_images'");
if (!$colCheck2 || $colCheck2->num_rows === 0) {
    $conn->query("ALTER TABLE markers ADD COLUMN landmark_images TEXT DEFAULT NULL");
}

$addressExists = ($colCheck && $colCheck->num_rows > 0);
$galleryExists = ($colCheck2 && $colCheck2->num_rows > 0);

// Re-check after ALTER attempts
if (!$addressExists) {
    $tmp = $conn->query("SHOW COLUMNS FROM markers LIKE 'address'");
    $addressExists = ($tmp && $tmp->num_rows > 0);
}
if (!$galleryExists) {
    $tmp2 = $conn->query("SHOW COLUMNS FROM markers LIKE 'landmark_images'");
    $galleryExists = ($tmp2 && $tmp2->num_rows > 0);
}

$id = $_POST['id'] ?? null;
if (!$id) {
    echo json_encode(['status' => 'error', 'message' => 'Missing landmark id.']);
    exit();
}

$name = $_POST['name'] ?? '';
$address = $_POST['address'] ?? '';
$description = $_POST['description'] ?? '';
$lat = isset($_POST['lat']) ? floatval($_POST['lat']) : 0;
$lng = isset($_POST['lng']) ? floatval($_POST['lng']) : 0;
$icon_type = $_POST['icon_type'] ?? 'round';
$category = 'Landmark';

// Get existing image (+ landmark_images if column exists) so we can keep them if user doesn't re-upload
$selectCols = $galleryExists ? "image, landmark_images" : "image";
$stmtExisting = $conn->prepare("SELECT " . $selectCols . " FROM markers WHERE id=?");
$stmtExisting->bind_param("i", $id);
$stmtExisting->execute();
$existing = $stmtExisting->get_result()->fetch_assoc();
$stmtExisting->close();

if (!$existing) {
    echo json_encode(['status' => 'error', 'message' => 'Landmark not found.']);
    exit();
}

$image_name = $existing['image'] ?? null;
$landmark_images_json = $galleryExists ? ($existing['landmark_images'] ?? null) : null;

// Optional new thumbnail
if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === 0) {
    $ext = pathinfo($_FILES['thumbnail']['name'], PATHINFO_EXTENSION);
    $newName = uniqid() . '.' . $ext;
    move_uploaded_file($_FILES['thumbnail']['tmp_name'], '../uploads/' . $newName);

    // Delete old thumbnail file (best-effort)
    if (!empty($image_name)) {
        @unlink('../uploads/' . $image_name);
    }

    $image_name = $newName;
}

// Optional new gallery images
if (isset($_FILES['landmark_pictures']) && is_array($_FILES['landmark_pictures']['name'])) {
    $gallery_files = [];
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

    // If user uploaded new pictures, replace gallery
    if (!empty($gallery_files)) {
        // Delete old gallery files (best-effort)
        if (!empty($landmark_images_json)) {
            $old = json_decode($landmark_images_json, true);
            if (is_array($old)) {
                foreach ($old as $oldImg) {
                    if (!empty($oldImg)) @unlink('../uploads/' . $oldImg);
                }
            }
        }

        if ($galleryExists) {
            $landmark_images_json = json_encode($gallery_files);
        }
    }
}

// Dynamic update based on which columns exist
if ($addressExists && $galleryExists) {
    $stmt = $conn->prepare(
        "UPDATE markers
         SET name=?,
             category='Landmark',
             description=?,
             lat=?,
             lng=?,
             icon_type=?,
             image=?,
             address=?,
             landmark_images=?
         WHERE id=?"
    );
    $stmt->bind_param(
        "ssddssssi",
        $name,
        $description,
        $lat,
        $lng,
        $icon_type,
        $image_name,
        $address,
        $landmark_images_json,
        $id
    );
} elseif ($addressExists && !$galleryExists) {
    $stmt = $conn->prepare(
        "UPDATE markers
         SET name=?,
             category='Landmark',
             description=?,
             lat=?,
             lng=?,
             icon_type=?,
             image=?,
             address=?
         WHERE id=?"
    );
    $stmt->bind_param(
        "ssddsssi",
        $name,
        $description,
        $lat,
        $lng,
        $icon_type,
        $image_name,
        $address,
        $id
    );
} elseif (!$addressExists && $galleryExists) {
    $stmt = $conn->prepare(
        "UPDATE markers
         SET name=?,
             category='Landmark',
             description=?,
             lat=?,
             lng=?,
             icon_type=?,
             image=?,
             landmark_images=?
         WHERE id=?"
    );
    $stmt->bind_param(
        "ssddsssi",
        $name,
        $description,
        $lat,
        $lng,
        $icon_type,
        $image_name,
        $landmark_images_json,
        $id
    );
} else {
    $stmt = $conn->prepare(
        "UPDATE markers
         SET name=?,
             category='Landmark',
             description=?,
             lat=?,
             lng=?,
             icon_type=?,
             image=?
         WHERE id=?"
    );
    $stmt->bind_param(
        "ssddssi",
        $name,
        $description,
        $lat,
        $lng,
        $icon_type,
        $image_name,
        $id
    );
}

if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => $stmt->error]);
}

$stmt->close();
?>

