<?php
session_start();

// Mark this session as a guest
$_SESSION['guest'] = true;

// Make sure no old login sticks around
unset($_SESSION['user_id']);

// For debugging: temporarily uncomment this to see it runs
// echo "Guest flag set. Redirecting to Main.php...";
// exit;

header("Location: Main.php");
exit;
