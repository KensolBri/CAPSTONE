<?php
session_start();
if(!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== 'lgu'){
    die("Access denied. Only LGU users can view this page.");
}

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");


?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LGU Stall Management</title>

  <!-- Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-draw/dist/leaflet.draw.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css" />

  <!-- Custom CSS -->
  <link rel="stylesheet" href="orgCSS.css" />
</head>
<body>

  <!-- MAIN DASHBOARD CONTENT -->
  <div id="appContent">
    <!-- Hero header -->
    <section class="hero">
      <!-- put your LGU / festival image here -->
      <img src="IloChurch.jpg" alt="Iloilo City, Philippines" />
      <div class="city-label">ILOILO CITY, PHILIPPINES</div>
    </section>

    <!-- White sheet with icon grid -->
    <main class="sheet">
      <section class="icon-grid" aria-label="LGU actions">

        <!-- Stall Applications (opens stall view with map) -->
        <div class="icon-item" data-content="stall" data-mode="Stall Applications">
          <span class="icon">
            <img src="application.png" alt="Stall Applications Icon" class="icon-img" />
          </span>
          <div class="label">Stall Applications</div>
        </div>

        <!-- Event Details (placeholder) -->
        <div class="icon-item" data-content="placeholder-event">
          <span class="icon">
            <img src="Event Details.png" alt="Event Details Icon" class="icon-img" />
          </span>
          <div class="label">Event Details</div>
        </div>

        <!-- Stall Layout (also opens stall view with map) -->
        <div class="icon-item" data-content="stall" data-mode="Stall Layout">
          <span class="icon">
            <img src="stall.png" alt="Stall Layout Icon" class="icon-img" />
          </span>
          <div class="label">Stall Layout</div>
        </div>

        <!-- Tourist Interaction (placeholder) -->
        <div class="icon-item" data-content="placeholder-tourist">
          <span class="icon">
            <img src="tourist.png" alt="Tourist Icon" class="icon-img" />
          </span>
          <div class="label">Tourist Interaction</div>
        </div>

        <!-- Event Analytics (placeholder) -->
        <div class="icon-item" data-content="placeholder-analytics">
          <span class="icon">
            <img src="analysis.png" alt="Analytics Icon" class="icon-img" />
          </span>
          <div class="label">Event Analytics</div>
        </div>

        <!-- Other Actions (placeholder) -->
        <div class="icon-item" data-content="placeholder-other">
          <span class="icon">
            <img src="interaction.png" alt="Other Actions Icon" class="icon-img" />
          </span>
          <div class="label">Other Actions</div>
        </div>
      </section>

      <!-- Optional: popular section below, like your sample -->
      <section class="popular">
        <div class="popular-header">
          <h3>Popular in your location</h3>
          <a href="#">See all ></a>
        </div>

        <div class="popular-items">
          <div class="popular-card">
            <img src="dagyang.jpg" alt="Popular 1">
          </div>
          <div class="popular-card">
            <img src="batchoy.png" alt="Popular 2">
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- SECOND VIEW: when you click Stall Applications / Stall Layout -->
  <div id="iconContent" style="display:none;">
    <section id="stall" class="full-content hidden">
      <div class="icon-header">
        <h2 id="stallViewTitle">
          <img src="map.png" alt="Map Icon" class="map-icon"/> Stall Applications
        </h2>
        <button class="back-btn">⬅ Back</button>
      </div>

      <!-- === Your EXISTING FILTERS === -->
      <div id="filters">
        <input type="text" id="searchBox" placeholder="Search markers..."/>
        <div id="categoryFilters">
          <label><input type="checkbox" value="Food" checked> Food</label>
          <label><input type="checkbox" value="Souvenirs" checked> Souvenirs</label>
          <label><input type="checkbox" value="Shops" checked> Shops</label>
          <label><input type="checkbox" value="Events" checked> Events</label>
        </div>
      </div>

      <!-- === Your EXISTING MAP CONTAINER === -->
      <div id="mapContainer">
        <div id="map"></div>
      </div>

<!-- Application list view under the map -->
<div id="applicationListPanel">
  <h3>APPLICATION LIST VIEW</h3>
  <div class="application-table-wrapper">
    <table id="applicationTable">
<thead>
  <tr>
    <th>Vendor Name</th>
    <th>Stall Name</th>        <!-- ✅ new -->
    <th>Date Applied</th>
    <th>Product Type</th>
    <th>Stall Size</th>
    <th>Preferred Area</th>
    <th>Status</th>
    <th>Action</th>
  </tr>
</thead>

      <tbody>
        <!-- rows inserted by JS -->
      </tbody>
    </table>
  </div>
</div>


      <!-- === Your EXISTING MARKER FORM === -->
<div id="markerForm">
  <h3 id="formTitle"></h3>
  <input type="hidden" id="markerId">

  <!-- 🔹 NEW: Marker Type -->
  <label>Marker Type:</label><br>
  <select id="markerType">
    <option value="poi">Place / Event Marker</option>
    <option value="stall">Stall Space</option>
  </select><br>

  <label>Name:</label><br><input type="text" id="markerName"><br>
  <label>Category:</label><br>
  <select id="markerCategory">
    <option value="Food">Food</option>
    <option value="Souvenirs">Souvenirs</option>
    <option value="Shops">Shops</option>
    <option value="Events">Events</option>
  </select><br>
  <label>Description:</label><br><textarea id="markerDescription" rows="3"></textarea><br>
  <label>Icon Type:</label><br>
  <select id="markerIconType">
    <option value="round">Round</option>
    <option value="square">Square</option>
  </select><br>
  <label>Image (optional):</label><br><input type="file" id="markerImage"><br><br>
  <button id="saveMarker">Save</button>
  <button id="deleteMarker">Delete</button>
  <button id="cancelMarker">Cancel</button>
</div>

    </section>

    <!-- placeholder sections (optional, for completeness) -->
    <section id="placeholder-event" class="full-content hidden">
      <div class="icon-header">
        <h2>Event Details</h2>
        <button class="back-btn">⬅ Back</button>
      </div>
      <p>Coming soon: event scheduling and details.</p>
    </section>

    <section id="placeholder-tourist" class="full-content hidden">
      <div class="icon-header">
        <h2>Tourist Interaction</h2>
        <button class="back-btn">⬅ Back</button>
      </div>
      <p>Coming soon: tourist feedback and communication tools.</p>
    </section>

    <section id="placeholder-analytics" class="full-content hidden">
      <div class="icon-header">
        <h2>Event Analytics</h2>
        <button class="back-btn">⬅ Back</button>
      </div>
      <p>Coming soon: stall performance and visitor analytics.</p>
    </section>

    <section id="placeholder-other" class="full-content hidden">
      <div class="icon-header">
        <h2>Other Actions</h2>
        <button class="back-btn">⬅ Back</button>
      </div>
      <p>Additional LGU tools will appear here.</p>
    </section>
  </div>

  <!-- JS Libraries -->
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-draw/dist/leaflet.draw.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

  <!-- Pass PHP session to JS -->
  <script>
    var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>";
    console.log("Injected PHP accountType =", accountType);
  </script>

 <!-- <script>
window.addEventListener("beforeunload", function () {
    navigator.sendBeacon("logout.php"); 
});
</script> -->


  <!-- Your existing map JS + new dashboard behavior -->
  <script src="orgJS.js"></script>
</body>
</html>
