<?php
include '../db.php';


$id = $_POST['id'];

// Delete image file if exists
// (Backwards compatible: landmark_images column may not exist yet.)
$hasGallery = false;
$colRes = $conn->query("SHOW COLUMNS FROM markers LIKE 'landmark_images'");
if ($colRes && $colRes->num_rows > 0) {
    $hasGallery = true;
}

$selectCols = $hasGallery ? "image, landmark_images" : "image";
$res = $conn->query("SELECT " . $selectCols . " FROM markers WHERE id=$id");
$row = $res ? $res->fetch_assoc() : null;

if($row && !empty($row['image'])){
    @unlink('../uploads/'.$row['image']);
}

// Optional landmark gallery images (LGU Landmarks Map)
if ($row && isset($row['landmark_images']) && !empty($row['landmark_images'])) {
    $images = json_decode($row['landmark_images'], true);
    if (is_array($images)) {
        foreach ($images as $img) {
            if (!empty($img)) {
                @unlink('../uploads/'.$img);
            }
        }
    }
}

// Delete marker
$stmt = $conn->prepare("DELETE FROM markers WHERE id=?");
$stmt->bind_param("i",$id);
$stmt->execute();
$stmt->close();
?>
