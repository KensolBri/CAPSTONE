<?php
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isHosted = stripos($httpHost, 'free.nf') !== false || stripos($httpHost, 'infinityfreeapp.com') !== false;

// Local defaults (XAMPP)
$localHost = "localhost";
$localUser = "root";
$localPass = "";
$localDbUsers = "lokal_users";

// Hosted defaults (InfinityFree)
$prodHost = "sql302.infinityfree.com";
$prodUser = "if0_41601200";
$prodPass = getenv('DB_PASS') ?: "Yasuo133";
$prodDbUsers = "if0_41601200_lokal_users";

$DB_HOST = getenv('DB_HOST') ?: ($isHosted ? $prodHost : $localHost);
$DB_USER = getenv('DB_USER') ?: ($isHosted ? $prodUser : $localUser);
$DB_PASS = $isHosted ? $prodPass : (getenv('DB_PASS') ?: $localPass);
$DB_NAME = getenv('DB_NAME_USERS') ?: ($isHosted ? $prodDbUsers : $localDbUsers);

// Prefer mysqli if available; otherwise fall back to PDO.
// This helps avoid ngrok/runtime environments where mysqli isn't enabled.
if (class_exists('mysqli')) {
    $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
} else if (class_exists('PDO')) {
    $dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
    $conn = new PDO($dsn, $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} else {
    throw new Exception('No supported database driver found (mysqli/PDO).');
}
?>
