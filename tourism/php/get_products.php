<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== 'vendor') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Not authorized"]);
    exit;
}

$vendor_id = $_SESSION['user_id'] ?? null;   // <-- change if your key is different
if (!$vendor_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing vendor id in session"]);
    exit;
}

require '../db.php';

$stmt = $conn->prepare("
    SELECT id, vendor_id, name, description, price, stock, category, image
    FROM vendor_products
    WHERE vendor_id = ?
    ORDER BY created_at DESC
");
$stmt->bind_param("i", $vendor_id);
$stmt->execute();
$result = $stmt->get_result();

$products = [];
while ($row = $result->fetch_assoc()) {
    $products[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode([
    "status" => "success",
    "data"   => $products
]);
