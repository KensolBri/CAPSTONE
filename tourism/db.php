<?php
$DB_HOST = "localhost";
$DB_USER = "root";
$DB_PASS = "";
$DB_NAME = "leaflet_map";

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($conn->connect_error) { die("DB failed: " . $conn->connect_error); }

/*
 * Per-stall product analytics
 * --------------------------
 * We keep `stall_products` as the junction between an approved stall and a vendor product.
 * For analytics, we store stall-product metrics (views/favorites/ratings) on `stall_products`,
 * and per-user favorite/rating in separate tables.
 */

// Ensure stall->product junction exists
$conn->query("
  CREATE TABLE IF NOT EXISTS stall_products (
    id INT(11) NOT NULL AUTO_INCREMENT,
    stall_id INT(11) NOT NULL,
    product_id INT(11) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    views INT(10) UNSIGNED NOT NULL DEFAULT 0,
    favorites_count INT(10) UNSIGNED NOT NULL DEFAULT 0,
    ratings_count INT(10) UNSIGNED NOT NULL DEFAULT 0,
    avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    stock INT(10) UNSIGNED NOT NULL DEFAULT 0,
    total_sold INT(10) UNSIGNED NOT NULL DEFAULT 0,
    total_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_stall_product (stall_id, product_id),
    KEY stall_products_stall_id_idx (stall_id),
    KEY stall_products_product_id_idx (product_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
");

// If an older `stall_products` existed (without metric columns), add missing columns.
$maybeAddCol = function ($colName, $ddl) use ($conn) {
    $res = $conn->query("SHOW COLUMNS FROM stall_products LIKE '" . $conn->real_escape_string($colName) . "'");
    if ($res && $res->num_rows === 0) {
        $conn->query("ALTER TABLE stall_products ADD COLUMN " . $ddl);
    }
};

$maybeAddCol('views', 'views INT(10) UNSIGNED NOT NULL DEFAULT 0');
$maybeAddCol('favorites_count', 'favorites_count INT(10) UNSIGNED NOT NULL DEFAULT 0');
$maybeAddCol('ratings_count', 'ratings_count INT(10) UNSIGNED NOT NULL DEFAULT 0');
$maybeAddCol('avg_rating', 'avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00');
$maybeAddCol('stock', 'stock INT(10) UNSIGNED NOT NULL DEFAULT 0');
$maybeAddCol('total_sold', 'total_sold INT(10) UNSIGNED NOT NULL DEFAULT 0');
$maybeAddCol('total_sales', 'total_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00');

// Per-user favorites for a specific stall-product
$conn->query("
  CREATE TABLE IF NOT EXISTS stall_product_favorites (
    id INT(11) NOT NULL AUTO_INCREMENT,
    stall_id INT(11) NOT NULL,
    product_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uniq_stall_product_user (stall_id, product_id, user_id),
    KEY stall_product_favorites_user_id_idx (user_id),
    KEY stall_product_favorites_stall_id_idx (stall_id),
    KEY stall_product_favorites_product_id_idx (product_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
");

// Per-user ratings for a specific stall-product
$conn->query("
  CREATE TABLE IF NOT EXISTS stall_product_ratings (
    id INT(11) NOT NULL AUTO_INCREMENT,
    stall_id INT(11) NOT NULL,
    product_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    rating TINYINT(4) NOT NULL,
    rated_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uniq_stall_product_rating (stall_id, product_id, user_id),
    KEY stall_product_ratings_user_id_idx (user_id),
    KEY stall_product_ratings_stall_id_idx (stall_id),
    KEY stall_product_ratings_product_id_idx (product_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
");

?>
