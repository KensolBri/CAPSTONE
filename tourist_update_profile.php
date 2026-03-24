<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || ($_SESSION['account_type'] ?? '') !== 'tourist') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

require_once 'userDb.php';

$userId   = (int) $_SESSION['user_id'];
$fullName = trim($_SESSION['full_name'] ?? '');
$email    = trim($_SESSION['email'] ?? '');
$phone    = trim($_POST['phone'] ?? ($_SESSION['phone'] ?? ''));
$gender   = trim($_POST['gender'] ?? ($_SESSION['gender'] ?? ''));

if ($fullName === '' || $email === '') {
    echo json_encode(['status' => 'error', 'message' => 'Session invalid. Please log in again.']);
    exit;
}

$avatarSource    = $_POST['avatar_source'] ?? 'none';
$avatarPresetUrl = $_POST['avatar_preset_url'] ?? '';
$newAvatarUrl    = '';

if ($avatarSource === 'upload' && isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/tourism/uploads/profiles/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0775, true);
    }

    $ext      = pathinfo($_FILES['profile_image']['name'], PATHINFO_EXTENSION);
    $basename = 'profile_' . $userId . '_' . time();
    $filename = $basename . ($ext ? '.' . $ext : '');
    $target   = $uploadDir . $filename;

    if (!move_uploaded_file($_FILES['profile_image']['tmp_name'], $target)) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save uploaded image.']);
        exit;
    }

    $newAvatarUrl = 'tourism/uploads/profiles/' . $filename;
} elseif ($avatarSource === 'preset' && $avatarPresetUrl !== '') {
    $newAvatarUrl = $avatarPresetUrl;
}

try {
    if ($newAvatarUrl !== '') {
        // Save avatar together with basic profile fields (requires profile_picture + gender columns)
        $stmt = $conn->prepare('UPDATE users SET full_name = ?, email = ?, phone = ?, gender = ?, profile_picture = ? WHERE id = ?');
        $stmt->bind_param('sssssi', $fullName, $email, $phone, $gender, $newAvatarUrl, $userId);
    } else {
        $stmt = $conn->prepare('UPDATE users SET full_name = ?, email = ?, phone = ?, gender = ? WHERE id = ?');
        $stmt->bind_param('ssssi', $fullName, $email, $phone, $gender, $userId);
    }

    $stmt->execute();
    $stmt->close();
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update profile in database.']);
    exit;
}

$_SESSION['full_name'] = $fullName;
$_SESSION['email']     = $email;
$_SESSION['phone']     = $phone;
$_SESSION['gender']    = $gender;

if ($newAvatarUrl !== '') {
    $_SESSION['profile_picture'] = $newAvatarUrl;
}

echo json_encode([
    'status'   => 'success',
    'message'  => 'Profile updated successfully.',
    'fullName' => $fullName,
    'email'    => $email,
    'phone'    => $phone,
    'avatar'   => $_SESSION['profile_picture'] ?? '',
]);

