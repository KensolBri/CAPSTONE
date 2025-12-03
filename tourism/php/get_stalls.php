<?php
require '../db.php';
header('Content-Type: application/json');

$sql = "
    SELECT 
        s.id,
        s.lat,
        s.lng,
        s.status,
        (
            SELECT a.stall_name 
            FROM stall_applications a 
            WHERE a.stall_id = s.id AND a.status = 'approved'
            ORDER BY a.applied_at DESC
            LIMIT 1
        ) AS stall_name
    FROM stalls s
";

$result = $conn->query($sql);

$rows = [];
while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
}

echo json_encode($rows);

