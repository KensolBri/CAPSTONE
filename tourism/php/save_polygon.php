<?php
include '../db.php';

$name = $_POST['name'];
$description = $_POST['description'];
$coordinates = $_POST['coordinates'];
$color = $_POST['color'];


$sql = "INSERT INTO polygons (name, description, coordinates, color) VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssss", $name, $description, $coordinates, $color);
$stmt->execute();

echo "success";
?>

