<?php session_start(); 
$accountType    = $_SESSION['account_type'] ?? 'tourist';
$userFullName   = $_SESSION['full_name'] ?? '';
$userAvatarUrl  = $_SESSION['profile_picture'] ?? '';  // add profile_picture to session when available

// Normalize avatar path:
// - If it's an external URL (http/https), leave as is (DiceBear presets).
// - If it's a project‑relative path like "tourism/uploads/...", make it
//   relative to this file ("../tourism/uploads/...") so it still works when
//   the app is served under "/CAPSTONE/".
if ($userAvatarUrl && strpos($userAvatarUrl, 'http://') !== 0 && strpos($userAvatarUrl, 'https://') !== 0) {
    if (strpos($userAvatarUrl, 'tourism/') === 0) {
        // From /CAPSTONE/tourism/map.php, "../tourism/..." points to the
        // correct folder under the project root.
        $userAvatarUrl = '../' . $userAvatarUrl;
    }
    // Otherwise leave it as stored.
}
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

/* ===========================
   STALL PHOTO PIN MARKER
   =========================== */

/* Leaflet divIcon wrapper */
.stall-photo-icon {
  background: transparent;
  border: none;
}

/* Whole marker (label + pin) */
.stall-pin-wrapper {
  text-align: center;
  font-family: Arial, sans-serif;
}

/* Stall name above the pin */
.stall-pin-label {
  display: inline-block;
  padding: 2px 6px;
  margin-bottom: 3px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255,255,255,0.9);
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Pin body (google-style, rotated) */
.stall-pin {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 50% 50% 50% 0;
  background: #fff;
  overflow: hidden;
  transform: rotate(-45deg);
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  margin: 0 auto;
}

/* Image inside the pin */
.stall-pin img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: rotate(45deg); /* cancel the parent rotation so photo is upright */
}

/* Little shadow under the pin tip (optional) */
.stall-pin-shadow {
  width: 20px;
  height: 4px;
  margin: 2px auto 0;
  background: rgba(0,0,0,0.2);
  border-radius: 50%;
}

/* Popup container */
.stall-popup {
    width: 240px;
    font-family: Arial, sans-serif;
    font-size: 12px;
}

/* Stall name centered on top */
.stall-popup-title {
    text-align: center;
    font-weight: 700;
    margin-bottom: 4px;
}

/* Stall main image */
.stall-popup-image img {
    display: block;
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
}

/* Product type (e.g., Milk Tea, Merch) */
.stall-popup-type {
    margin-top: 4px;
    font-style: italic;
    text-align: center;
    color: #555;
}

/* Products list area */
.stall-popup-products {
    margin-top: 6px;
    max-height: 150px;       /* scroll if many products */
    overflow-y: auto;
}

/* "Products" headline */
.stall-popup-products-title {
    font-weight: 600;
    margin-bottom: 4px;
}

/* Single product row */
.stall-popup-product {
    display: flex;
    margin-bottom: 4px;
}

/* Product thumbnail */
.stall-popup-product-thumb {
    width: 38px;
    height: 38px;
    object-fit: cover;
    border-radius: 4px;
    margin-right: 5px;
}

/* Product text */
.stall-popup-product-text {
    flex: 1;
}

/* Name / desc / price */
.stall-popup-product-name {
    font-weight: 600;
    font-size: 11px;
}

.stall-popup-product-desc {
    font-size: 10px;
    color: #555;
}

.stall-popup-product-price {
    font-size: 11px;
    font-weight: 600;
    margin-top: 1px;
}

/* Empty / error states */
.stall-popup-products-empty,
.stall-popup-error {
    margin-top: 6px;
    font-size: 11px;
    color: #a00;
}

/* Fullscreen product detail modal */
.product-detail-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: none;               /* shown via JS */
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.product-detail-content {
    background: #fff;
    border-radius: 10px;
    max-width: 420px;
    width: 90%;
    max-height: 90vh;
    padding: 12px 14px 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    font-family: Arial, sans-serif;
    position: relative;
}

.product-detail-close {
    position: absolute;
    top: 6px;
    right: 10px;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
}

.product-detail-image-wrap {
    text-align: center;
    margin-top: 14px;
}

.product-detail-image {
    max-width: 100%;
    max-height: 220px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

.product-detail-info {
    margin-top: 10px;
}

.product-detail-name {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
}

.product-detail-price {
    font-size: 14px;
    font-weight: 600;
    color: #2e7d32;
    margin-bottom: 6px;
}

.product-detail-desc {
    font-size: 13px;
    color: #444;
    line-height: 1.4;
}

/* =======================================================
   ⭐ STAR STYLES
======================================================= */
.stall-rating-star,
.product-rating-star,
.modal-rating-star {
    cursor: pointer;
    font-size: 16px;
    color: #ccc;
    margin-right: 2px;
    transition: 0.2s;
}

.stall-rating-star.filled,
.product-rating-star.filled,
.modal-rating-star.active {
    color: gold;
}

.stall-rating-star:hover,
.product-rating-star:hover,
.modal-rating-star:hover {
    color: orange;
}

/* =======================================================
   ❤️ FAVORITE BUTTONS
======================================================= */
.stall-fav-btn,
.product-fav-btn,
.modal-fav-btn {
    background: none;
    border: none;
    color: #777;
    cursor: pointer;
    font-size: 16px;
    margin-left: 6px;
    transition: 0.2s;
}

.stall-fav-btn.active,
.product-fav-btn.active,
.modal-fav-btn.favorited {
    color: red;
    font-weight: bold;
}

.stall-fav-btn:hover,
.product-fav-btn:hover,
.modal-fav-btn:hover {
    color: red;
}

/* =======================================================
   USER AVATAR PIN (red teardrop + profile picture)
======================================================= */
.leaflet-div-icon.user-pin-icon {
    background: none !important;
    border: none !important;
}
.user-default-pin {
    display: block;
    width: 44px;
    height: 56px;
    cursor: default;
}
.user-default-pin img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
}
.user-avatar-pin {
    display: block;
    width: 44px;
    height: 56px;
    cursor: default;
    position: relative;
}
.user-avatar-pin svg {
    width: 100%;
    height: 100%;
    display: block;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
}
.user-avatar-pin .pin-avatar {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    width: 26px;
    height: 26px;
    border-radius: 50%;
    overflow: hidden;
    background: #E3F2FD;
    border: 2px solid #fff;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 10px;
    color: #1565C0;
    z-index: 1;
}
.user-avatar-pin .pin-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}



    </style>
    <script>
      var userRole = "<?php echo addslashes($accountType); ?>";
      var userFullName = "<?php echo addslashes($userFullName); ?>";
      var userAvatarUrl = "<?php echo addslashes($userAvatarUrl); ?>";
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

    <?php if ($accountType === 'tourist' || $accountType === ''): ?>
    <button id="locateBtn" style="margin-top:5px;">📍 My location</button>
    <?php endif; ?>


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

<script src="mapScript.js"></script>

</body>
</html>
