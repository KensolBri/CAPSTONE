<?php
// tourism/php/update_product.php
session_start();
header('Content-Type: application/json');

if (($_SESSION['account_type'] ?? '') !== 'vendor') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Vendor only']);
    exit;
}

$vendor_id = (int) ($_SESSION['user_id'] ?? 0);
if ($vendor_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing vendor id']);
    exit;
}

require '../db.php';

$id          = (int)($_POST['id'] ?? 0);
$name        = trim($_POST['name'] ?? '');
$price       = (float)($_POST['price'] ?? 0);
$hasStockInput = isset($_POST['stock']) && $_POST['stock'] !== '';
$stock       = $hasStockInput ? (int)$_POST['stock'] : null;
$category    = trim($_POST['category'] ?? '');
$description = trim($_POST['description'] ?? '');
$existingImg = trim($_POST['productExistingImage'] ?? ($_POST['existing_image'] ?? ''));

if ($id <= 0 || $name === '') {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
    exit;
}

/* -------------------------------------------------
   1) Load current product to compute sold quantity
   ------------------------------------------------- */
$stmt = $conn->prepare("
    SELECT stock, price, total_sold, total_sales, image
    FROM vendor_products
    WHERE id = ? AND vendor_id = ?
");
if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $conn->error]);
    exit;
}
$stmt->bind_param('ii', $id, $vendor_id);
$stmt->execute();
$res = $stmt->get_result();
$old = $res->fetch_assoc();
$stmt->close();

if (!$old) {
    echo json_encode(['status' => 'error', 'message' => 'Product not found.']);
    exit;
}

$oldStock      = (int)$old['stock'];
$oldTotalSold  = (int)$old['total_sold'];
$oldTotalSales = (float)$old['total_sales'];

// ----------------------
// Handle image upload
// ----------------------
$newImageName = $existingImg;  // default: keep old image

if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {

    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode([
            'status'  => 'error',
            'message' => 'Error uploading image (code ' . $_FILES['image']['error'] . ').'
        ]);
        exit;
    }

    $file = $_FILES['image'];
    $allowedExt = ['jpg','jpeg','png','gif','webp'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid image type. Allowed: jpg, jpeg, png, gif, webp.'
        ]);
        exit;
    }

    $uploadDir = __DIR__ . '/../uploads/products';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0775, true)) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to create upload directory.'
            ]);
            exit;
        }
    }

    $newImageName = time() . '_' . preg_replace('/[^A-Za-z0-9_.-]/', '_', $file['name']);
    $targetPath   = $uploadDir . '/' . $newImageName;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to save uploaded image on server.'
        ]);
        exit;
    }

    // (optional) delete old file if you want
    // if ($existingImg && $existingImg !== $newImageName) {
    //     @unlink($uploadDir . '/' . $existingImg);
    // }
}

/* -------------------------------------------------
   2) Compute sold vs restock based on stock change
   ------------------------------------------------- */
// positive deltaStock = sold; negative = restock (ignore for sales)
$effectiveStock = ($stock === null) ? $oldStock : max(0, $stock);
$deltaStock = $oldStock - $effectiveStock;

$newTotalSold  = $oldTotalSold;
$newTotalSales = $oldTotalSales;

if ($deltaStock > 0) {
    // items sold
    $soldUnits      = $deltaStock;
    $salesIncrement = $soldUnits * $price;  // use current price

    $newTotalSold  += $soldUnits;
    $newTotalSales += $salesIncrement;
}

/* -------------------------------------------------
   3) Update product
   ------------------------------------------------- */
$sql = "
    UPDATE vendor_products
    SET name = ?, price = ?, stock = ?, category = ?, description = ?,
        image = ?, total_sold = ?, total_sales = ?
    WHERE id = ? AND vendor_id = ?
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $conn->error]);
    exit;
}

$stmt->bind_param(
    'sissssiddi',
    $name,
    $price,
    $effectiveStock,
    $category,
    $description,
    $newImageName,
    $newTotalSold,
    $newTotalSales,
    $id,
    $vendor_id
);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Update failed: ' . $stmt->error]);
}
$stmt->close();
$conn->close();
