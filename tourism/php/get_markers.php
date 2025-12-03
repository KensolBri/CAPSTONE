<?php
include '../db.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT * FROM markers");
$markers = [];
while($row = $result->fetch_assoc()){
    $markers[] = $row;
}
echo json_encode($markers);
?>
