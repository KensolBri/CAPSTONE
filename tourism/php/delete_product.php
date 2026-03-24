<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== 'vendor') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Not authorized"]);
    exit;
}

$vendor_id = $_SESSION['user_id'] ?? null;
if (!$vendor_id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing vendor id"]);
    exit;
}

require '../db.php';

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid product id"]);
    exit;
}

$stmt = $conn->prepare("DELETE FROM vendor_products WHERE id = ? AND vendor_id = ?");
$stmt->bind_param("ii", $id, $vendor_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Product deleted"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "DB delete failed"]);
}

$stmt->close();
$conn->close();
