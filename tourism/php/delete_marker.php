<?php
include '../db.php';


$id = $_POST['id'];

// Delete image file if exists
$res = $conn->query("SELECT image FROM markers WHERE id=$id");
$row = $res->fetch_assoc();
if($row && $row['image']){
    @unlink('../uploads/'.$row['image']);
}

// Delete marker
$stmt = $conn->prepare("DELETE FROM markers WHERE id=?");
$stmt->bind_param("i",$id);
$stmt->execute();
$stmt->close();
?>
