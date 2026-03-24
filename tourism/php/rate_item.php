<?php
// tourism/php/rate_item.php
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
$rating    = (int) ($_POST['rating'] ?? 0);
$stall_id  = (int) ($_POST['stall_id'] ?? 0);

if (!in_array($item_type, ['stall', 'product', 'event'], true) || $item_id <= 0 || $rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    exit;
}

require '../db.php';

// choose table & column based on type
if ($item_type === 'stall') {
    $table        = 'stall_ratings';
    $col          = 'stall_id';
    $aggTable     = 'stalls';
    $timestampCol = 'rated_at';
} elseif ($item_type === 'event') {
    $table        = 'event_ratings';
    $col          = 'event_id';
    $aggTable     = 'events';
    $timestampCol = 'rated_at';
} else {
    $table        = 'product_ratings';
    $col          = 'product_id';
    $aggTable     = 'vendor_products';
    $timestampCol = 'rated_at';
}

// If this is a product rating but scoped to a specific stall, update stall-product tables.
if ($item_type === 'product' && $stall_id > 0) {
    $sql = "
        INSERT INTO stall_product_ratings (stall_id, product_id, user_id, rating, rated_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            rating  = VALUES(rating),
            rated_at = VALUES(rated_at)
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param('iiii', $stall_id, $item_id, $user_id, $rating);
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $stmt->error]);
        $stmt->close();
        exit;
    }
    $stmt->close();

    // Update stall_products avg_rating + ratings_count for this stall-product
    $aggSql = "
        UPDATE stall_products t
        JOIN (
            SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS cnt
            FROM stall_product_ratings
            WHERE stall_id = ? AND product_id = ?
            GROUP BY product_id
        ) x ON x.product_id = t.product_id
        SET t.avg_rating = x.avg_rating,
            t.ratings_count = x.cnt
        WHERE t.stall_id = ? AND t.product_id = ?
    ";
    $aggStmt = $conn->prepare($aggSql);
    $aggStmt->bind_param('iiii', $stall_id, $item_id, $stall_id, $item_id);
    $aggStmt->execute();
    $aggStmt->close();

    echo json_encode(['status' => 'success']);
    exit;
}

/*
 * Make sure in MySQL you have:
 *   ALTER TABLE stall_ratings   ADD UNIQUE KEY uniq_stall_user   (stall_id, user_id);
 *   ALTER TABLE product_ratings ADD UNIQUE KEY uniq_product_user (product_id, user_id);
 */

$sql = "
    INSERT INTO {$table} ({$col}, user_id, rating, {$timestampCol})
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
        rating      = VALUES(rating),
        {$timestampCol} = VALUES({$timestampCol})
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $conn->error]);
    exit;
}
$stmt->bind_param('iii', $item_id, $user_id, $rating);

if (!$stmt->execute()) {
    echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $stmt->error]);
    $stmt->close();
    exit;
}
$stmt->close();

/*
 * Recalculate avg_rating and ratings_count in the main table
 */
$aggStmt = null;

if ($item_type === 'product' && $stall_id > 0) {
    // ---- Per-stall product rating ----
    $table = 'stall_product_ratings';
    $sql = "
      INSERT INTO {$table} (stall_id, product_id, user_id, rating, rated_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        rating  = VALUES(rating),
        rated_at = VALUES(rated_at)
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('iiii', $stall_id, $item_id, $user_id, $rating);
    if (!$stmt->execute()) {
        echo json_encode(['status' => 'error', 'message' => 'DB error: ' . $stmt->error]);
        $stmt->close();
        exit;
    }
    $stmt->close();

    $aggSql = "
      UPDATE stall_products t
      JOIN (
        SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS cnt
        FROM stall_product_ratings
        WHERE stall_id = ? AND product_id = ?
        GROUP BY product_id
      ) x ON x.product_id = t.product_id
      SET t.avg_rating = x.avg_rating,
          t.ratings_count = x.cnt
      WHERE t.stall_id = ? AND t.product_id = ?
    ";
    $aggStmt = $conn->prepare($aggSql);
    $aggStmt->bind_param('iiii', $stall_id, $item_id, $stall_id, $item_id);
    $aggStmt->execute();
    $aggStmt->close();

    echo json_encode(['status' => 'success']);
    exit;
}

// ---- Original global rating update ----
$aggSql = "
    UPDATE {$aggTable} t
    JOIN (
        SELECT {$col} AS cid, AVG(rating) AS avg_rating, COUNT(*) AS cnt
        FROM {$table}
        WHERE {$col} = ?
    ) x ON x.cid = t.id
    SET t.avg_rating    = x.avg_rating,
        t.ratings_count = x.cnt
";
$aggStmt = $conn->prepare($aggSql);
$aggStmt->bind_param('i', $item_id);
$aggStmt->execute();
$aggStmt->close();

echo json_encode(['status' => 'success']);
