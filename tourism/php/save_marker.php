<?php
include '../db.php';


$name = $_POST['name'];
$category = $_POST['category'];
$description = $_POST['description'];
$icon_type = $_POST['icon_type'];
$lat = $_POST['lat'];
$lng = $_POST['lng'];

// Handle image upload
$image_name = null;
if(isset($_FILES['image']) && $_FILES['image']['error']==0){
    $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $image_name = uniqid().'.'.$ext;
    move_uploaded_file($_FILES['image']['tmp_name'], '../uploads/'.$image_name);
}

// Insert marker
$stmt = $conn->prepare("INSERT INTO markers (name, category, description, icon_type, lat, lng, image) VALUES (?,?,?,?,?,?,?)");
$stmt->bind_param("ssssdds", $name, $category, $description, $icon_type, $lat, $lng, $image_name);
$stmt->execute();
$stmt->close();
?>
