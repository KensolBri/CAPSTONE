<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (ob_get_level() === 0) {
    ob_start();
}

function search_json_response($payload, $statusCode = 200) {
    if (http_response_code() !== $statusCode) {
        http_response_code($statusCode);
    }
    $stray = trim(ob_get_clean());
    if ($stray !== '') {
        $payload['_debug_output'] = $stray;
    }
    echo json_encode($payload);
    exit;
}

set_error_handler(function ($errno, $errstr) {
    search_json_response([
        'status' => 'error',
        'message' => $errstr
    ], 500);
});

try {
    require_once __DIR__ . '/../db.php';

    $q = trim($_GET['q'] ?? '');
    if ($q === '' || strlen($q) < 1) {
        search_json_response([
            'status' => 'success',
            'query' => $q,
            'results' => []
        ]);
    }

    // Basic guardrails
    $q = substr($q, 0, 100);
    $like = '%' . $q . '%';

    $results = [];

    $push_result = function (&$results, $type, $row) {
        $row['type'] = $type;
        $results[] = $row;
    };

    // 1) Stalls (approved applications)
    $sqlStalls = "
      SELECT
        s.id AS stall_id,
        COALESCE(a.stall_name, CONCAT('Stall #', s.id)) AS name,
        a.product_type,
        a.stall_image,
        s.lat, s.lng,
        s.avg_rating,
        s.ratings_count,
        s.favorites_count
      FROM stalls s
      LEFT JOIN (
        SELECT x.*
        FROM stall_applications x
        INNER JOIN (
          SELECT stall_id, MAX(applied_at) AS max_applied
          FROM stall_applications
          WHERE status = 'approved'
          GROUP BY stall_id
        ) m ON m.stall_id = x.stall_id AND m.max_applied = x.applied_at
        WHERE x.status = 'approved'
      ) a ON a.stall_id = s.id
      WHERE COALESCE(a.stall_name, '') LIKE ?
      ORDER BY s.avg_rating DESC, s.id DESC
      LIMIT 30
    ";

    if ($stmt = $conn->prepare($sqlStalls)) {
        $stmt->bind_param('s', $like);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $push_result($results, 'stall', $row);
        }
        $stmt->close();
    }

    // 2) Landmarks (markers table) - support old schemas with missing columns.
    $hasAddress = false;
    $colAddress = $conn->query("SHOW COLUMNS FROM markers LIKE 'address'");
    if ($colAddress && $colAddress->num_rows > 0) $hasAddress = true;

    $landmarkSelect = $hasAddress ? "address" : "'' AS address";
    $landmarkWhere = $hasAddress ? "(name LIKE ? OR address LIKE ?)" : "(name LIKE ?)";
    $sqlLandmarks = "
      SELECT
        id AS landmark_id,
        name,
        {$landmarkSelect},
        description,
        lat, lng,
        image
      FROM markers
      WHERE category = 'Landmark'
        AND {$landmarkWhere}
      ORDER BY id DESC
      LIMIT 30
    ";
    if ($stmt = $conn->prepare($sqlLandmarks)) {
        if ($hasAddress) $stmt->bind_param('ss', $like, $like);
        else $stmt->bind_param('s', $like);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $push_result($results, 'landmark', $row);
        }
        $stmt->close();
    }

    // 3) Events
    $sqlEvents = "
      SELECT
        id AS event_id,
        event_name AS name,
        location,
        polygon_id,
        start_date,
        end_date,
        event_image_display,
        event_plan,
        avg_rating,
        ratings_count,
        favorites_count
      FROM events
      WHERE event_name LIKE ? OR location LIKE ?
      ORDER BY start_date ASC
      LIMIT 30
    ";
    if ($stmt = $conn->prepare($sqlEvents)) {
        $stmt->bind_param('ss', $like, $like);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $push_result($results, 'event', $row);
        }
        $stmt->close();
    }

    search_json_response([
        'status' => 'success',
        'query' => $q,
        'results' => $results
    ]);
} catch (Throwable $e) {
    search_json_response([
        'status' => 'error',
        'message' => $e->getMessage()
    ], 500);
}

