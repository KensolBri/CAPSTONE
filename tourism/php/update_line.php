<?php
include '../db.php';

$id = $_POST['id'];
$coordinates = $_POST['coordinates'];

$stmt = $conn->prepare("UPDATE polylines SET coordinates=? WHERE id=?");
$stmt->bind_param("si", $coordinates, $id);
$stmt->execute();
$stmt->close();
?>
