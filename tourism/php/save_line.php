<?php
include '../db.php';

$name = $_POST['name'];
$description = $_POST['description'];
$coordinates = $_POST['coordinates'];
$color = $_POST['color']; // NEW

$stmt = $conn->prepare("INSERT INTO polylines (name, description, coordinates, color) VALUES (?,?,?,?)");
$stmt->bind_param("ssss", $name, $description, $coordinates, $color);
$stmt->execute();
$stmt->close();
?>