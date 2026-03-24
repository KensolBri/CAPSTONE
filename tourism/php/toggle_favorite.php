<?php
// tourism/php/toggle_favorite.php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Login required']);
    exit;
}

$user_id   = (int) $_SESSION['user_id'];
$item_type = $_POST['item_type'] ?? '';   // 'stall', 'product', or 'event'
$item_id   = (int) ($_POST['item_id'] ?? 0);
$stall_id  = (int) ($_POST['stall_id'] ?? 0);

if (!in_array($item_type, ['stall', 'product', 'event'], true) || $item_id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    exit;
}

require '../db.php';

if ($item_type === 'stall') {
    $favTable   = 'stall_favorites';
    $favCol     = 'stall_id';
    $aggTable   = 'stalls';
    $aggIdCol   = 'id';
} elseif ($item_type === 'event') {
    $favTable   = 'event_favorites';
    $favCol     = 'event_id';
    $aggTable   = 'events';
    $aggIdCol   = 'id';
} else {
    // product favorites are per-stall if stall_id is given
    if ($stall_id > 0) {
        $favTable = 'stall_product_favorites';
        // special handling below; keep vars for code structure
        $favCol   = 'product_id';
        $aggTable = null;
        $aggIdCol = null;
    } else {
        $favTable   = 'product_favorites';
        $favCol     = 'product_id';
        $aggTable   = 'vendor_products';
        $aggIdCol   = 'id';
    }
}

/* -------------------------------------------------
   1. Check if this is already a favorite
------------------------------------------------- */
$status = 'added';
$count = 0;

if ($item_type === 'product' && $stall_id > 0) {
    // ---- Per-stall product favorite ----
    $check = $conn->prepare("SELECT id FROM {$favTable} WHERE stall_id = ? AND product_id = ? AND user_id = ?");
    $check->bind_param('iii', $stall_id, $item_id, $user_id);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        $del = $conn->prepare("DELETE FROM {$favTable} WHERE stall_id = ? AND product_id = ? AND user_id = ?");
        $del->bind_param('iii', $stall_id, $item_id, $user_id);
        $del->execute();
        $del->close();
        $status = 'removed';
    } else {
        $ins = $conn->prepare("INSERT INTO {$favTable} (stall_id, product_id, user_id, created_at) VALUES (?, ?, ?, NOW())");
        $ins->bind_param('iii', $stall_id, $item_id, $user_id);
        $ins->execute();
        $ins->close();
        $status = 'added';
    }
    $check->close();

    // Recalculate stall-product favorites_count and store in stall_products
    $cntStmt = $conn->prepare("SELECT COUNT(*) AS c FROM {$favTable} WHERE stall_id = ? AND product_id = ?");
    $cntStmt->bind_param('ii', $stall_id, $item_id);
    $cntStmt->execute();
    $cntStmt->bind_result($count);
    $cntStmt->fetch();
    $cntStmt->close();

    $updStmt = $conn->prepare("UPDATE stall_products SET favorites_count = ? WHERE stall_id = ? AND product_id = ?");
    $updStmt->bind_param('iii', $count, $stall_id, $item_id);
    $updStmt->execute();
    $updStmt->close();
} else {
    // ---- Global product favorite (existing behavior) ----
    $check = $conn->prepare("SELECT id FROM {$favTable} WHERE {$favCol} = ? AND user_id = ?");
    $check->bind_param('ii', $item_id, $user_id);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        // ---- REMOVE FAVORITE ----
        $del = $conn->prepare("DELETE FROM {$favTable} WHERE {$favCol} = ? AND user_id = ?");
        $del->bind_param('ii', $item_id, $user_id);
        $del->execute();
        $del->close();
        $status = 'removed';
    } else {
        // ---- ADD FAVORITE ----
        $ins = $conn->prepare("INSERT INTO {$favTable} ({$favCol}, user_id, created_at) VALUES (?, ?, NOW())");
        $ins->bind_param('ii', $item_id, $user_id);
        $ins->execute();
        $ins->close();
        $status = 'added';
    }

    $check->close();

    /* -------------------------------------------------
       2. Recalculate total favorites and store in
          stalls.favorites_count or vendor_products.favorites_count
    ------------------------------------------------- */
    $count = 0;
    $cntSql = "SELECT COUNT(*) AS c FROM {$favTable} WHERE {$favCol} = ?";
    $cntStmt = $conn->prepare($cntSql);
    $cntStmt->bind_param('i', $item_id);
    $cntStmt->execute();
    $cntStmt->bind_result($count);
    $cntStmt->fetch();
    $cntStmt->close();

    // Update aggregated favorites_count on the main table (if applicable)
    if ($aggTable && $aggIdCol) {
        $updSql = "UPDATE {$aggTable} SET favorites_count = ? WHERE {$aggIdCol} = ?";
        $updStmt = $conn->prepare($updSql);
        $updStmt->bind_param('ii', $count, $item_id);
        $updStmt->execute();
        $updStmt->close();
    }
}

$conn->close();

echo json_encode([
    'status'          => 'success',
    'favorite'        => $status,      // 'added' or 'removed'
    'favorites_count' => (int)$count   // useful if you want to display it
]);
