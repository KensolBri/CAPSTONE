<?php
include '../db.php';

$result = $conn->query("SELECT * FROM polygons");
$polygons = array();
while($row = $result->fetch_assoc()){
    $row['coordinates'] = json_decode($row['coordinates'], true);
    $polygons[] = $row;
}
echo json_encode($polygons);
?>
