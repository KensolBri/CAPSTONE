<?php
session_start();
if (!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== "vendor") {
    header("Location: Main.php");
    exit();
}
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Vendor Map</title>

    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css" />

    <!-- Custom Vendor CSS -->
    <link rel="stylesheet" href="vendorCSS.css">
</head>
<body>

<div id="filters">
    <input type="text" id="searchBox" placeholder="Search markers..." />
    <div id="categoryFilters">
        <label><input type="checkbox" value="Food" checked> Food</label>
        <label><input type="checkbox" value="Souvenirs" checked> Souvenirs</label>
        <label><input type="checkbox" value="Shops" checked> Shops</label>
        <label><input type="checkbox" value="Events" checked> Events</label>
    </div>
</div>

<div id="map"></div>

<!-- Stall Application Modal -->
<!-- Stall application form modal -->
<div id="stallApplyModal" class="vendor-modal">
  <div class="vendor-modal-content">
    <span id="stallApplyClose" class="vendor-modal-close">&times;</span>
    <h3>Apply for Stall</h3>

    <form id="stallApplyForm">
      <!-- hidden stall id from clicked marker -->
      <input type="hidden" name="stall_id" id="applyStallId">

      <label>Stall Name:</label><br>
      <input type="text" name="stall_name" id="applyStallName" required><br>

      <label>Product Type:</label><br>
      <input type="text" name="product_type" id="applyProductType" required><br>

      <label>Stall Size:</label><br>
      <input type="text" name="stall_size" id="applyStallSize" placeholder="e.g. 2x2" required><br>

      <label>Preferred Area:</label><br>
      <input type="text" name="preferred_area" id="applyPreferredArea"
             placeholder="e.g. Near stage" required><br><br>

      <button type="submit" class="popup-btn">Submit Application</button>
    </form>
  </div>
</div>



<!-- JS Libraries -->
<script src="https://unpkg.com/jquery@3.6.0/dist/jquery.min.js"></script>
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>

<!-- Pass PHP session to JS -->
<script>
    var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>"; // 'vendor'
</script>

<!-- Custom Vendor JS -->
<script src="vendorJS.js"></script>

<!--  <script>
window.addEventListener("beforeunload", function () {
    navigator.sendBeacon("logout.php"); 
});
</script> -->

</body>
</html>
