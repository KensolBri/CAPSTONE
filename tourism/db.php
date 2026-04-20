<?php
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isHosted = stripos($httpHost, 'free.nf') !== false || stripos($httpHost, 'infinityfreeapp.com') !== false;

// Local defaults (XAMPP)
$localHost = "localhost";
$localUser = "root";
$localPass = "";
$localDbTourism = "leaflet_map";

// Hosted defaults (InfinityFree)
$prodHost = "sql302.infinityfree.com";
$prodUser = "if0_41601200";
$prodPass = getenv('DB_PASS') ?: "Yasuo133";
$prodDbTourism = "if0_41601200_leaflet_map";

$DB_HOST = getenv('DB_HOST') ?: ($isHosted ? $prodHost : $localHost);
$DB_USER = getenv('DB_USER') ?: ($isHosted ? $prodUser : $localUser);
$DB_PASS = $isHosted ? $prodPass : (getenv('DB_PASS') ?: $localPass);
$DB_NAME = getenv('DB_NAME_TOURISM') ?: ($isHosted ? $prodDbTourism : $localDbTourism);

/**
 * Compatibility layer:
 * - Use mysqli when available
 * - Fall back to PDO with a mysqli-like shim so existing endpoint code keeps working
 */
if (!class_exists('mysqli') && class_exists('PDO')) {
    class DbResultShim {
        public $num_rows = 0;
        private $rows = [];
        private $idx = 0;

        public function __construct(array $rows) {
            $this->rows = array_values($rows);
            $this->num_rows = count($this->rows);
        }

        public function fetch_assoc() {
            if ($this->idx >= $this->num_rows) return null;
            return $this->rows[$this->idx++];
        }
    }

    class DbStmtShim {
        public $error = '';
        public $num_rows = 0;
        private $pdo;
        private $stmt;
        private $boundRefs = [];
        private $resultRows = [];
        private $bindResultRefs = [];
        private $fetchIdx = 0;

        public function __construct(PDO $pdo, PDOStatement $stmt) {
            $this->pdo = $pdo;
            $this->stmt = $stmt;
        }

        public function bind_param($types, &...$vars) {
            $this->boundRefs = &$vars;
            return true;
        }

        public function execute() {
            try {
                $params = [];
                foreach ($this->boundRefs as $v) $params[] = $v;
                $ok = $this->stmt->execute($params);
                if (!$ok) {
                    $info = $this->stmt->errorInfo();
                    $this->error = isset($info[2]) ? (string)$info[2] : 'SQL execute failed';
                    return false;
                }
                $this->resultRows = [];
                $this->fetchIdx = 0;
                if ($this->stmt->columnCount() > 0) {
                    $this->resultRows = $this->stmt->fetchAll(PDO::FETCH_ASSOC);
                    $this->num_rows = count($this->resultRows);
                } else {
                    $this->num_rows = 0;
                }
                return true;
            } catch (Throwable $e) {
                $this->error = $e->getMessage();
                return false;
            }
        }

        public function get_result() {
            return new DbResultShim($this->resultRows);
        }

        public function bind_result(&...$vars) {
            $this->bindResultRefs = &$vars;
            return true;
        }

        public function fetch() {
            if ($this->fetchIdx >= count($this->resultRows)) return false;
            $row = array_values($this->resultRows[$this->fetchIdx++]);
            foreach ($this->bindResultRefs as $i => &$ref) {
                $ref = $row[$i] ?? null;
            }
            return true;
        }

        public function store_result() {
            $this->num_rows = count($this->resultRows);
            return true;
        }

        public function close() {
            $this->stmt = null;
            return true;
        }
    }

    class DbConnShim {
        public $connect_error = '';
        public $error = '';
        public $insert_id = 0;
        private $pdo;

        public function __construct(PDO $pdo) {
            $this->pdo = $pdo;
        }

        public function query($sql) {
            try {
                $stmt = $this->pdo->query($sql);
                $this->error = '';
                if ($stmt instanceof PDOStatement) {
                    if ($stmt->columnCount() > 0) {
                        return new DbResultShim($stmt->fetchAll(PDO::FETCH_ASSOC));
                    }
                    return true;
                }
                return true;
            } catch (Throwable $e) {
                $this->error = $e->getMessage();
                return false;
            }
        }

        public function prepare($sql) {
            try {
                $stmt = $this->pdo->prepare($sql);
                $this->error = '';
                if (!$stmt) {
                    $this->error = 'Failed to prepare statement.';
                    return false;
                }
                return new DbStmtShim($this->pdo, $stmt);
            } catch (Throwable $e) {
                $this->error = $e->getMessage();
                return false;
            }
        }

        public function real_escape_string($v) {
            return addslashes((string)$v);
        }

        public function begin_transaction() {
            try { return $this->pdo->beginTransaction(); } catch (Throwable $e) { $this->error = $e->getMessage(); return false; }
        }
        public function commit() {
            try { return $this->pdo->commit(); } catch (Throwable $e) { $this->error = $e->getMessage(); return false; }
        }
        public function rollback() {
            try { return $this->pdo->rollBack(); } catch (Throwable $e) { $this->error = $e->getMessage(); return false; }
        }

        public function close() {
            $this->pdo = null;
            return true;
        }
    }
}

if (class_exists('mysqli')) {
    $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
    if ($conn->connect_error) {
        die("DB failed: " . $conn->connect_error);
    }
} elseif (class_exists('PDO')) {
    try {
        $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
        $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        $conn = new DbConnShim($pdo);
    } catch (Throwable $e) {
        die("DB failed: " . $e->getMessage());
    }
} else {
    die("DB failed: no supported DB extension (mysqli/PDO).");
}

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
