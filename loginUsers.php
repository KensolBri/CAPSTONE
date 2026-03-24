<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/userDb.php'; // connect to lokal_users database
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

try {
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$login_type = $_POST['login_type'] ?? ''; // chosen login type

// include profile_picture so we can restore avatar on login
if ($conn instanceof PDO) {
    $sql = "SELECT id, full_name, email, phone, gender, profile_picture, password, account_type
            FROM users
            WHERE email = :email";

    $stmt = $conn->prepare($sql);
    $stmt->execute([':email' => $email]);
    $row = $stmt->fetch();

    if ($row && !empty($row['password']) && password_verify($password, $row['password'])) {
        $account_type = $row['account_type'];

        // ⬅️ CHECK IF USER IS LOGGING IN AS THE CORRECT ACCOUNT TYPE
        if ($login_type !== $account_type) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Wrong login type selected.'
            ]);
            exit;
        }

        // SUCCESSFULL LOGIN
        $_SESSION['user_id'] = $row['id'];
        $_SESSION['full_name'] = $row['full_name'];
        $_SESSION['email'] = $row['email'];
        $_SESSION['phone'] = $row['phone'];
        $_SESSION['gender'] = $row['gender'];
        $_SESSION['profile_picture'] = $row['profile_picture'];
        $_SESSION['account_type'] = $row['account_type'];
        $_SESSION['show_welcome'] = true;

        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'account_type' => $row['account_type'] // for redirect
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password'
        ]);
    }
    $stmt = null;
    $conn = null;
} else {
    // mysqli fallback (for local runtimes where mysqli exists)
    $stmt = $conn->prepare("SELECT id, full_name, email, phone, gender, profile_picture, password, account_type FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->bind_result($id, $full_name, $db_email, $phone, $gender, $profile_picture, $hashed_password, $account_type);
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
        $_SESSION['email'] = $db_email;
        $_SESSION['phone'] = $phone;
        $_SESSION['gender'] = $gender;
        $_SESSION['profile_picture'] = $profile_picture;
        $_SESSION['account_type'] = $account_type;
        $_SESSION['show_welcome'] = true;

        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'account_type' => $account_type // for redirect
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
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    exit;
}
?>

