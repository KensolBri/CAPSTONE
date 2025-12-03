<?php
include '../db.php';

$result = $conn->query("SELECT * FROM polylines");
$lines = array();
while($row = $result->fetch_assoc()){
    $row['coordinates'] = json_decode($row['coordinates'], true);
    $lines[] = $row;
}
echo json_encode($lines);
?>
