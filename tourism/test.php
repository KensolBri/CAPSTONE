<?php
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isHosted = stripos($httpHost, 'free.nf') !== false || stripos($httpHost, 'infinityfreeapp.com') !== false;

$DB_HOST = getenv('DB_HOST') ?: ($isHosted ? "sql302.infinityfree.com" : "localhost");
$DB_USER = getenv('DB_USER') ?: ($isHosted ? "if0_41601200" : "root");
$DB_PASS = $isHosted ? (getenv('DB_PASS') ?: "Yasuo133") : (getenv('DB_PASS') ?: "");
$DB_NAME = getenv('DB_NAME_USERS') ?: ($isHosted ? "if0_41601200_lokal_users" : "lokal_users");

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($conn->connect_error) { die("DB failed: " . $conn->connect_error); }
?>