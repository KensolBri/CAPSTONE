<?php
// Returns id and name of polygons for dropdown (Ongoing Event Parameter)
include '../db.php';

header('Content-Type: application/json');

$result = $conn->query("SELECT id, name FROM polygons ORDER BY name ASC");
$items = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
}
echo json_encode($items);
