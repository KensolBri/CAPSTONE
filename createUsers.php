<?php
header('Content-Type: application/json');
include 'userDb.php'; // your existing db connection

// Get POST data
$full_name = trim($_POST['full_name'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$password = $_POST['password'] ?? '';
$account_type = $_POST['account_type'] ?? 'tourist';

// Simple validation
if(empty($full_name) || empty($email) || empty($phone) || empty($password)) {
    echo json_encode(['status'=>'error', 'message'=>'All fields are required.']);
    exit;
}

if(!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['status'=>'error', 'message'=>'Invalid email address.']);
    exit;
}

// Check if email already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();
if($stmt->num_rows > 0){
    echo json_encode(['status'=>'error', 'message'=>'Email already registered.']);
    exit;
}
$stmt->close();

// Hash password
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Insert new user
$stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password, account_type) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $full_name, $email, $phone, $hashed_password, $account_type);

if($stmt->execute()){
    echo json_encode(['status'=>'success', 'message'=>'Account created successfully!']);
} else {
    echo json_encode(['status'=>'error', 'message'=>'Failed to create account.']);
}

$stmt->close();
$conn->close();
?>
