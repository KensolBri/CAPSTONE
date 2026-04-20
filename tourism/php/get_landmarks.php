<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
include '../db.php';

header('Content-Type: application/json');

// Return rows even if category values have extra spaces/case differences.
$result = $conn->query("SELECT * FROM markers WHERE TRIM(LOWER(category))='landmark' ORDER BY id DESC");
$landmarks = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $landmarks[] = $row;
    }
}

$json = json_encode($landmarks, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
if ($json === false) {
    echo '[]';
    exit;
}
echo $json;
?>

