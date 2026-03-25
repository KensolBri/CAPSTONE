<?php
session_start();
if(!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== 'lgu'){
    die("Access denied. Only LGU users can view this page.");
}

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

$fullName       = $_SESSION['full_name'] ?? 'LGU';
$profilePicture = $_SESSION['profile_picture'] ?? '';
$accountType    = $_SESSION['account_type'] ?? 'lgu';
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
    <link rel="stylesheet" href="orgCSS.css?v=3" />
    <link rel="stylesheet" href="vendorCSS.css?v=4" />
</head>
<body>

  <header class="top-nav lgu-vendor-top-nav">
    <div class="search-wrap">
      <input type="text" placeholder="Search" />
      <button class="search-icon" type="button">
        <img src="search.png" alt="Search Icon" class="notif-img"/>
      </button>
    </div>
    <button class="notif-btn" type="button" aria-label="Notifications">
      <img src="notification.png" alt="Notification Icon" class="nav-img"/>
    </button>
  </header>

  <!-- MAIN DASHBOARD CONTENT -->
  <div id="appContent">
    <!-- Hero header -->
    <section class="hero">
      <!-- put your LGU / festival image here -->
      <img src="Iloilo.gif" alt="Iloilo City, Philippines" />
      <div class="city-label">ILOILO CITY, PHILIPPINES</div>
    </section>

    <!-- White sheet with icon grid (profile is in Menu only) -->
    <main class="sheet">
      <section class="icon-grid lgu-icon-grid" aria-label="LGU actions">
        <!-- Row 1: Stall Applications, Stall Layout, Tourist Interaction -->
        <div class="icon-item" data-content="stall" data-mode="Stall Applications">
          <span class="icon">
            <img src="application.png" alt="Stall Applications Icon" class="icon-img" />
          </span>
          <div class="label">Stall Applications</div>
        </div>

        <div class="icon-item" data-content="stall" data-mode="Stall Layout">
          <span class="icon">
            <img src="stall.png" alt="Stall Layout Icon" class="icon-img" />
          </span>
          <div class="label">Stall Layout</div>
        </div>

        <div class="icon-item" data-content="placeholder-tourist">
          <span class="icon">
            <img src="tourist.png" alt="Tourist Icon" class="icon-img" />
          </span>
          <div class="label">Tourist Interaction</div>
        </div>

        <!-- Row 2: Event Details, Event Analytics, Menu -->
        <div class="icon-item" data-content="placeholder-event">
          <span class="icon">
            <img src="Event Details.png" alt="Event Details Icon" class="icon-img" />
          </span>
          <div class="label">Event Details</div>
        </div>

        <div class="icon-item" data-content="placeholder-analytics">
          <span class="icon">
            <img src="analysis.png" alt="Analytics Icon" class="icon-img" />
          </span>
          <div class="label">Event Analytics</div>
        </div>

        <div class="icon-item" data-content="lgu-menu">
          <span class="icon">
            <img src="menu.png" alt="Menu Icon" class="icon-img" />
          </span>
          <div class="label">Menu</div>
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

<!-- Application list view under the map (for Stall Applications) -->
<div id="applicationListPanel">
  <h3>APPLICATION LIST VIEW</h3>
  <div class="application-table-wrapper">
    <table id="applicationTable">
      <thead>
        <tr>
          <th>Vendor Name</th>
          <th>Stall Name</th>
          <th>Date Applied</th>
          <th>Product Type</th>
          <th>Stall Size</th>
          <th>Stall Image</th>
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

<!-- Festival / Events stall summary under the map (for Stall Layout) -->
<div id="festivalSummaryPanel" style="display:none;">
  <h3>FESTIVAL / EVENTS STALL SUMMARY</h3>
  <div class="application-table-wrapper">
    <table id="festivalTable">
      <thead>
        <tr>
          <th>Festival / Event</th>
          <th>Total stalls</th>
          <th>Available</th>
          <th>Reserved</th>
          <th>Occupied</th>
          <th>View reserved / occupied</th>
        </tr>
      </thead>
      <tbody>
        <!-- rows inserted by JS -->
      </tbody>
    </table>
  </div>
</div>

<!-- Modal: detailed view of reserved / occupied stalls for a festival -->
<div id="festivalStallsModal" class="lgu-modal" style="display:none;">
  <div class="lgu-modal-content">
    <button id="festivalModalClose" class="lgu-modal-close" type="button">&times;</button>
    <h3 id="festivalModalTitle" class="lgu-modal-title"></h3>
    <div id="festivalModalBody" class="lgu-modal-body">
      <!-- filled by JS -->
    </div>
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

    <!-- Event Details - LGU Add Event -->
    <section id="placeholder-event" class="full-content hidden">
      <div class="icon-header">
        <h2>Event Details</h2>
        <button class="back-btn">⬅ Back</button>
      </div>
      <div class="event-details-content">
        <button type="button" id="lguAddEventBtn" class="lgu-add-event-btn">+ Add Event</button>
        <div id="lguEventsList"></div>
      </div>
    </section>

    <!-- Add Event Modal -->
    <div id="lguAddEventModal" class="lgu-modal" style="display:none;">
      <div class="lgu-modal-content lgu-modal-wide">
        <button type="button" id="lguAddEventModalClose" class="lgu-modal-close">&times;</button>
        <h3 class="lgu-modal-title">Add Event</h3>
        <form id="lguAddEventForm" enctype="multipart/form-data">
          <label>Event Name:</label>
          <input type="text" name="event_name" required placeholder="e.g. Dinagyang street dance competition" />

          <label>Start Date:</label>
          <input type="date" name="start_date" required />

          <label>End Date:</label>
          <input type="date" name="end_date" required />

          <label>Location:</label>
          <input type="text" name="location" required placeholder="e.g. Iloilo City" />

          <label>Ongoing Event Parameter:</label>
          <select name="polygon_id" id="lguEventPolygonSelect">
            <option value="">-- Select polygon (optional) --</option>
          </select>

          <label>Event Image Display (for tourist card background):</label>
          <input type="file" name="event_image_display" accept="image/*" />

          <label>Event Plan (full details image, optional):</label>
          <input type="file" name="event_plan" accept="image/*" />

          <div class="lgu-modal-actions">
            <button type="button" id="lguAddEventCancel" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Add Event</button>
          </div>
        </form>
      </div>
    </div>

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
      <div class="event-analytics-content">
        <div class="lgu-analytics-chart-wrap">
          <canvas id="lguEventAnalyticsChart"></canvas>
        </div>
        <div id="lguEventAnalyticsList"></div>
      </div>
    </section>

    <section id="lgu-menu" class="full-content hidden vendor-menu-screen">
      <div class="vendor-menu-layout" style="max-width: 400px; margin: 0 auto;">
        <div class="vendor-menu-top">
          <button class="back-btn">⬅ Back</button>
        </div>
        <div class="vendor-menu-profile-card">
          <?php $lguAvatarSrc = $profilePicture ?: 'tourism/uploads/userPin.png'; ?>
          <button type="button" class="vendor-menu-avatar lgu-menu-avatar-btn" id="lguMenuAvatarBtn">
            <img id="lguMenuAvatarImg" src="<?php echo htmlspecialchars($lguAvatarSrc, ENT_QUOTES); ?>" alt="Profile" />
            <span class="vendor-menu-avatar-camera">📷</span>
          </button>
          <div class="vendor-menu-profile-text">
            <div class="vendor-menu-profile-title"><?php echo htmlspecialchars($fullName, ENT_QUOTES); ?></div>
            <div class="vendor-menu-profile-subtitle">Role: LGU</div>
          </div>
        </div>
        <div class="vendor-menu-sections">
          <div class="vendor-menu-group">
            <div class="vendor-menu-group-title">MANAGE</div>
            <button type="button" class="vendor-menu-item" data-action="lgu-landmarks-map">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">🗺</span>
                <span>Landmarks Map</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
          </div>

          <div class="vendor-menu-group">
            <div class="vendor-menu-group-title">APP SETTINGS</div>
            <button type="button" class="vendor-menu-item" data-action="lgu-general">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">⚙</span>
                <span>General Settings</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
            <button type="button" class="vendor-menu-item" data-action="lgu-help">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">❓</span>
                <span>Help and Support</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
            <a class="vendor-menu-item vendor-menu-signout" href="logout.php">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">⎋</span>
                <span>Sign out</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <section id="lgu-landmarks-map" class="full-content hidden vendor-landmarks-screen">
      <div class="icon-header">
        <h2>
          <img src="map.png" alt="Map Icon" class="map-icon"/> Landmarks Map
        </h2>
        <button class="back-btn" data-back-to="lgu-menu">⬅ Back</button>
      </div>

      <div class="lgu-landmarks-iframe-wrap">
        <iframe
          class="lgu-landmarks-iframe"
          src="tourism/landmarks_map.php"
          title="LGU Landmarks Map"
          frameborder="0"></iframe>
      </div>
    </section>
  </div>

  <!-- LGU Avatar Modal -->
  <div id="lguAvatarModal" class="lgu-modal lgu-avatar-modal" style="display:none;">
    <div class="lgu-modal-sheet">
      <div class="lgu-modal-header">
        <div class="lgu-modal-title">Choose profile picture</div>
        <button type="button" id="lguAvatarModalClose" class="lgu-modal-close">✕</button>
      </div>
      <div class="lgu-avatar-presets" id="lguAvatarPresetList"></div>
      <div class="lgu-avatar-upload-row">
        <button type="button" class="lgu-avatar-upload-btn" id="lguAvatarUploadBtn">Upload photo</button>
        <button type="button" class="lgu-avatar-save-btn" id="lguAvatarSaveBtn">Save</button>
      </div>
      <input type="file" id="lguAvatarFileInput" accept="image/*" style="display:none" />
    </div>
  </div>

  <!-- LGU General Settings Modal -->
  <div id="lguGeneralSettingsModal" class="lgu-modal" style="display:none;">
    <div class="lgu-modal-sheet lgu-settings-modal-sheet">
      <div class="lgu-modal-header">
        <div class="lgu-modal-title">General Settings</div>
        <button type="button" id="lguGeneralSettingsClose" class="lgu-modal-close">✕</button>
      </div>
      <div class="vendor-settings-content">
        <div class="vendor-settings-group">
          <div class="vendor-settings-title">Change name</div>
          <div class="vendor-settings-row">
            <label>New full name</label>
            <input type="text" id="lguNewName" class="vendor-settings-input" placeholder="Enter new full name" />
          </div>
          <button type="button" id="lguChangeNameBtn" class="vendor-settings-btn">Update name</button>
        </div>
        <div class="vendor-settings-group">
          <div class="vendor-settings-title">Change password</div>
          <div class="vendor-settings-row">
            <label>Current password</label>
            <input type="password" id="lguCurrentPassword" class="vendor-settings-input" placeholder="Enter current password" />
          </div>
          <div class="vendor-settings-row">
            <label>New password</label>
            <input type="password" id="lguNewPassword" class="vendor-settings-input" placeholder="Enter new password" />
          </div>
          <div class="vendor-settings-row">
            <label>Confirm password</label>
            <input type="password" id="lguConfirmPassword" class="vendor-settings-input" placeholder="Confirm new password" />
          </div>
          <button type="button" id="lguChangePasswordBtn" class="vendor-settings-btn">Update password</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Welcome popup (after login) -->
  <div id="lguWelcomePopup" class="welcome-popup" style="display:none;">
    <div class="welcome-popup-content">
      <h2>WELCOME DEAR <?php echo htmlspecialchars($accountType ?: 'LGU', ENT_QUOTES); ?>, <?php echo htmlspecialchars($fullName ?: 'User', ENT_QUOTES); ?></h2>
      <p class="welcome-popup-hint">Click anywhere to continue</p>
    </div>
  </div>

  <!-- JS Libraries -->
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-draw/dist/leaflet.draw.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <!-- Pass PHP session to JS -->
  <script>
    var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>";
    var lguShowWelcome = <?php echo !empty($_SESSION['show_welcome']) ? 'true' : 'false'; ?>;
    <?php if (!empty($_SESSION['show_welcome'])) { unset($_SESSION['show_welcome']); } ?>
    var lguFullName = "<?php echo addslashes($_SESSION['full_name'] ?? ''); ?>";
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
