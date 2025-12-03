<?php
function log_action($conn, $user_id, $action, $target_type, $target_id){
    $stmt = $conn->prepare("INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("issi", $user_id, $action, $target_type, $target_id);
    $stmt->execute();
}
?>
