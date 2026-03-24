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

$name        = trim($_POST['name'] ?? '');
$price       = floatval($_POST['price'] ?? 0);
$stock       = intval($_POST['stock'] ?? 0);
$category    = trim($_POST['category'] ?? '');
$description = trim($_POST['description'] ?? '');

if ($name === '') {
    echo json_encode(["status" => "error", "message" => "Product name is required"]);
    exit;
}

$imageFileName = null;

// Handle optional image upload
if (!empty($_FILES['image']['name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
    $uploadDir = __DIR__ . '/../uploads/products/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $ext  = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $ext  = strtolower($ext);
    $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '', pathinfo($_FILES['image']['name'], PATHINFO_FILENAME));
    $file = uniqid('prod_') . '_' . $safe . '.' . $ext;

    $target = $uploadDir . $file;

    if (!move_uploaded_file($_FILES['image']['tmp_name'], $target)) {
        echo json_encode(["status" => "error", "message" => "Failed to upload image"]);
        exit;
    }

    $imageFileName = $file;
}

$stmt = $conn->prepare("
    INSERT INTO vendor_products (vendor_id, name, description, price, stock, category, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param(
    "issdiss",
    $vendor_id,
    $name,
    $description,
    $price,
    $stock,
    $category,
    $imageFileName
);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Product added"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "DB insert failed"]);
}

$stmt->close();
$conn->close();
