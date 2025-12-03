<?php
include '../db.php';

$id = $_POST['id'];
$stmt = $conn->prepare("DELETE FROM polygons WHERE id=?");
$stmt->bind_param("i", $id);
$stmt->execute();
$stmt->close();
?>
