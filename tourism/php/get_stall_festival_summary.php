<?php
// LGU-only endpoint that groups stalls by polygon (festival/event) name
// and returns counts of total / available / reserved / occupied,
// plus a list of stall names for reserved/occupied.

session_start();
require '../db.php';

header('Content-Type: application/json');

$accountType = strtolower((string)($_SESSION['account_type'] ?? ''));
if ($accountType !== 'lgu') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'LGU only']);
    exit;
}

// Fetch polygons (events) with decoded coordinates
$polygons = [];
$resPoly = $conn->query("SELECT id, name, coordinates FROM polygons");
if ($resPoly) {
    while ($row = $resPoly->fetch_assoc()) {
        $coords = json_decode($row['coordinates'], true) ?: [];
        $row['coords_array'] = $coords;
        $polygons[] = $row;
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'DB error (polygons): '.$conn->error]);
    exit;
}

// Fetch stalls with latest approved application name + status
$sqlStalls = "
    SELECT 
        s.id,
        s.lat,
        s.lng,
        s.status,
        (
            SELECT a.stall_name
            FROM stall_applications a
            WHERE a.stall_id = s.id
              AND a.status = 'approved'
            ORDER BY a.applied_at DESC
            LIMIT 1
        ) AS stall_name
    FROM stalls s
";

$resStall = $conn->query($sqlStalls);
if (!$resStall) {
    echo json_encode(['status' => 'error', 'message' => 'DB error (stalls): '.$conn->error]);
    exit;
}

// Helper: point-in-polygon (ray casting) in PHP
function pointInPolygonPhp($lat, $lng, $vertices) {
    $inside = false;
    $n = count($vertices);
    if ($n < 3) return false;

    for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
        $xi = $vertices[$i]['lng'];
        $yi = $vertices[$i]['lat'];
        $xj = $vertices[$j]['lng'];
        $yj = $vertices[$j]['lat'];

        $intersect = (($yi > $lat) != ($yj > $lat)) &&
            ($lng < ($xj - $xi) * ($lat - $yi) / (($yj - $yi) ?: 1e-9) + $xi);
        if ($intersect) {
            $inside = !$inside;
        }
    }
    return $inside;
}

// Prepare summary structure
$summary = [];

while ($stall = $resStall->fetch_assoc()) {
    $lat = (float)$stall['lat'];
    $lng = (float)$stall['lng'];
    $status = $stall['status'] ?: 'available';
    $stallName = $stall['stall_name'] ?: ('Stall #' . $stall['id']);

    $festivalName = 'Unassigned';

    // Find first polygon that contains this stall
    foreach ($polygons as $poly) {
        $coords = $poly['coords_array'];
        if (!$coords || count($coords) < 3) continue;
        if (pointInPolygonPhp($lat, $lng, $coords)) {
            $festivalName = $poly['name'] ?: ('Event #' . $poly['id']);
            break;
        }
    }

    if (!isset($summary[$festivalName])) {
        $summary[$festivalName] = [
            'festival'  => $festivalName,
            'total'     => 0,
            'available' => 0,
            'reserved'  => 0,
            'occupied'  => 0,
            'stalls'    => [] // reserved/occupied stalls with names
        ];
    }

    $summary[$festivalName]['total']++;
    if (isset($summary[$festivalName][$status])) {
        $summary[$festivalName][$status]++;
    }

    if ($status === 'reserved' || $status === 'occupied') {
        $summary[$festivalName]['stalls'][] = [
            'id'     => (int)$stall['id'],
            'name'   => $stallName,
            'status' => $status
        ];
    }
}

// Re-index for JSON
$rows = array_values($summary);

echo json_encode([
    'status' => 'success',
    'data'   => $rows
]);

