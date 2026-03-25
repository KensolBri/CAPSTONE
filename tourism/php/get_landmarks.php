<?php
include '../db.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT * FROM markers WHERE category='Landmark' ORDER BY id DESC");
$landmarks = [];

while ($row = $result->fetch_assoc()) {
    $landmarks[] = $row;
}

echo json_encode($landmarks);
?>

