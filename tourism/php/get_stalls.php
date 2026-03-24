<?php
session_start();                    // so we know who the user is
require '../db.php';

header('Content-Type: application/json');

// current user (0 = guest)
$user_id = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;

$sql = "
    SELECT 
        s.id,
        s.lat,
        s.lng,
        s.status,

        -- latest approved stall name
        (
            SELECT a.stall_name 
            FROM stall_applications a 
            WHERE a.stall_id = s.id 
              AND a.status = 'approved'
            ORDER BY a.applied_at DESC
            LIMIT 1
        ) AS stall_name,

        -- latest approved stall image
        (
            SELECT a.stall_image
            FROM stall_applications a 
            WHERE a.stall_id = s.id 
              AND a.status = 'approved'
            ORDER BY a.applied_at DESC
            LIMIT 1
        ) AS stall_image,

        /* ✅ analytics stored directly on stalls table */
        s.views,
        s.favorites_count,
        s.ratings_count,
        s.avg_rating,
        
        /* Latest approved application product type (Food / Beverages / Merchandise / etc.) */
        (
            SELECT a.product_type
            FROM stall_applications a 
            WHERE a.stall_id = s.id 
              AND a.status = 'approved'
            ORDER BY a.applied_at DESC
            LIMIT 1
        ) AS product_type,

        /* ✅ is THIS user’s favorite? (1 or NULL) */
        (
            SELECT 1
            FROM stall_favorites f
            WHERE f.stall_id = s.id
              AND f.user_id  = {$user_id}
            LIMIT 1
        ) AS is_favorite,

        /* ✅ THIS user’s rating for this stall (1–5 or NULL) */
        (
            SELECT r.rating
            FROM stall_ratings r
            WHERE r.stall_id = s.id
              AND r.user_id  = {$user_id}
            LIMIT 1
        ) AS my_rating

    FROM stalls s
";

$result = $conn->query($sql);

$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
} else {
    // helpful in case of future errors
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'DB error: ' . $conn->error
    ]);
    exit;
}

echo json_encode($rows);
