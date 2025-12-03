<?php session_start(); 
$accountType = $_SESSION['account_type'] ?? 'tourist';
?>
<!DOCTYPE html>
<html>
<head>
    <title>Iloilo Tourism Map</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css"/>
    <style>
        #map { height: 90vh; width: 100%; }
        #controls { padding: 5px; background: #f7f7f7; }
        #markerForm { display:none; position:absolute; z-index:1000; background:white; padding:15px; border:1px solid #ccc; border-radius:5px; }
        #markerForm button { margin-right:5px; margin-top:5px; }

        .stall-label {
    position: relative;
    display: block;
    width: 80px;
    height: 24px;
    line-height: 24px;
    text-align: center;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    background: #eee;
    border: 1px solid #bbb;
}
.stall-occupied { background:#ffd6d6; border-color:#e53935; }
.stall-available { background:#e8ffe8; border-color:#66bb66; }
.stall-reserved { background:#fff3cd; border-color:#ffca28; }


    </style>
     
    <script>
      var userRole = "<?php echo $accountType; ?>"; // 'lgu', 'tourist', 'vendor'
    </script>

</head>
<body>

<div id="controls">
    <input type="text" id="searchBox" placeholder="Search markers..."/>
    <div id="categoryFilters">
        <label><input type="checkbox" value="Food" checked> Food</label>
        <label><input type="checkbox" value="Souvenirs" checked> Souvenirs</label>
        <label><input type="checkbox" value="Shops" checked> Shops</label>
        <label><input type="checkbox" value="Events" checked> Events</label>
    </div>
</div>

<div id="markerForm">
    <h3 id="formTitle">Add Marker</h3>
    <input type="hidden" id="markerId">
    <label>Name:</label><br><input type="text" id="markerName"><br>
    <label>Category:</label><br><input type="text" id="markerCategory"><br>
    <label>Description:</label><br><textarea id="markerDescription" rows="3"></textarea><br>
    <label>Icon Type:</label><br>
    <select id="markerIconType">
        <option value="round">Circle</option>
        <option value="square">Square</option>
    </select><br>
    <label>Image:</label><br><input type="file" id="markerImage"><br><br>
    <button id="saveMarker">Save</button>
    <button id="deleteMarker">Delete</button>
    <button id="cancelMarker">Cancel</button>
</div>

<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
<script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<script src = "mapScript.js"></script>

</body>
</html>
