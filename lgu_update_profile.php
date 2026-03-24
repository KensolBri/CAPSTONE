<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || ($_SESSION['account_type'] ?? '') !== 'lgu') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

require_once 'userDb.php';

$userId = (int) $_SESSION['user_id'];

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

if ($newAvatarUrl === '') {
    echo json_encode(['status' => 'error', 'message' => 'No profile picture selected.']);
    exit;
}

try {
    $stmt = $conn->prepare('UPDATE users SET profile_picture = ? WHERE id = ?');
    $stmt->bind_param('si', $newAvatarUrl, $userId);
    $stmt->execute();
    $stmt->close();
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update profile picture.']);
    exit;
}

$_SESSION['profile_picture'] = $newAvatarUrl;

echo json_encode([
    'status'  => 'success',
    'message' => 'Profile picture updated.',
    'avatar'  => $newAvatarUrl,
]);
