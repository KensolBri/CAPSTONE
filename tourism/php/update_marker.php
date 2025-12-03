<?php
include '../db.php';


$id = $_POST['id'];
$name = $_POST['name'];
$category = $_POST['category'];
$description = $_POST['description'];
$icon_type = $_POST['icon_type'];

// Handle image upload
$image_sql = "";
if(isset($_FILES['image']) && $_FILES['image']['error']==0){
    $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $image_name = uniqid().'.'.$ext;
    move_uploaded_file($_FILES['image']['tmp_name'], '../uploads/'.$image_name);
    $image_sql = ", image='$image_name'";
}

$stmt = $conn->prepare("UPDATE markers SET name=?, category=?, description=?, icon_type=? $image_sql WHERE id=?");
$stmt->bind_param("ssssi", $name, $category, $description, $icon_type, $id);
$stmt->execute();
$stmt->close();
?>
