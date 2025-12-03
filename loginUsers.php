<?php
session_start();
include 'userDb.php'; // connect to lokal_users database

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $login_type = $_POST['login_type'] ?? ''; // ⬅️ ADDED: the chosen login type

    $stmt = $conn->prepare("SELECT id, full_name, password, account_type FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->bind_result($id, $full_name, $hashed_password, $account_type);
    $stmt->fetch();

    if ($hashed_password && password_verify($password, $hashed_password)) {

        // ⬅️ CHECK IF USER IS LOGGING IN AS THE CORRECT ACCOUNT TYPE
        if ($login_type !== $account_type) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Wrong login type selected.'
            ]);
            exit;
        }

        // SUCCESSFULL LOGIN
        $_SESSION['user_id'] = $id;
        $_SESSION['full_name'] = $full_name;
        $_SESSION['account_type'] = $account_type;

        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'account_type' => $account_type    // ⬅️ send back the type for redirect
        ]);

    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password'
        ]);
    }

    $stmt->close();
    $conn->close();
}
?>

