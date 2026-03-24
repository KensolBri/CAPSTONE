<?php
session_start();
if (!isset($_SESSION['account_type']) || $_SESSION['account_type'] !== "vendor") {
    header("Location: Capstone.php");
    exit();
}

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

$fullName       = $_SESSION['full_name'] ?? 'Vendor';
$profilePicture = $_SESSION['profile_picture'] ?? '';
$accountType    = $_SESSION['account_type'] ?? 'vendor';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Vendor Dashboard</title>

    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css" />

    <!-- Custom Vendor CSS -->
    <link rel="stylesheet" href="vendorCSS.css?v=3" />
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

  <!-- MAIN DASHBOARD VIEW (like orgphp #appContent) -->
  <div id="appContent">
    <!-- Hero header -->
    <section class="hero">
      <!-- put your vendor / city image here -->
      <img src="IloChurch.jpg" alt="Iloilo City, Philippines" />
      <div class="city-label">ILOILO CITY, PHILIPPINES</div>
    </section>

    <!-- White sheet with icon grid -->
    <main class="sheet">
      <section class="icon-grid" aria-label="Vendor actions">

  <!-- MAP -->
  <div class="icon-item" data-content="mapView">
    <span class="icon">
      <img src="map.png" alt="Map Icon" class="icon-img" />
    </span>
    <div class="label">Map</div>
  </div>

  <!-- SALES -->
  <div class="icon-item" data-content="placeholder-sales">
    <span class="icon">
      <img src="sales.png" alt="Sales Icon" class="icon-img" />
    </span>
    <div class="label">Sales</div>
  </div>

  <!-- PRODUCTS -->
  <div class="icon-item" data-content="placeholder-products">
    <span class="icon">
      <img src="food.png" alt="Products Icon" class="icon-img" />
    </span>
    <div class="label">Products</div>
  </div>

  <!-- MENU -->
  <div class="icon-item" data-content="placeholder-menu">
    <span class="icon">
      <img src="menu.png" alt="Menu Icon" class="icon-img" />
    </span>
    <div class="label">Menu</div>
  </div>

</section>


      <!-- Popular section like your mockup -->
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

  <!-- SECOND VIEW: when you click MAP tile -->
  <div id="iconContent" style="display:none;">
    <!-- MAP VIEW (this is where your vendor map + filters live) -->
    <section id="mapView" class="full-content hidden">
      <div class="icon-header">
        <h2>
          <img src="map.png" alt="Map Icon" class="map-icon"/> Map
        </h2>
        <button class="back-btn">⬅ Back</button>
      </div>

      <!-- Your existing filters (same IDs so vendorJS works) -->
      <div id="filters">
        <input type="text" id="searchBox" placeholder="Search markers..."/>
        <div id="categoryFilters">
          <label><input type="checkbox" value="Food" checked> Food</label>
          <label><input type="checkbox" value="Souvenirs" checked> Souvenirs</label>
          <label><input type="checkbox" value="Shops" checked> Shops</label>
          <label><input type="checkbox" value="Events" checked> Events</label>
        </div>
      </div>

      <!-- Map container, same IDs as before -->
      <div id="mapContainer">
        <div id="map"></div>
      </div>
            <!-- Stall applications status panel -->
<!-- Stall applications panel under the map -->
<div id="stallApplicationsPanel">
  <h3 class="stall-app-heading">My stall applications</h3>
  <div id="stallApplicationsList">
    <!-- filled by JS -->
  </div>
</div>

<!-- Stall Application Modal -->
<div id="stallApplyModal" class="vendor-modal">
  <div class="vendor-modal-content">
    <span id="stallApplyClose" class="vendor-modal-close">&times;</span>
    <h3>Apply for Stall</h3>

    <form id="stallApplyForm" enctype="multipart/form-data">
      <!-- hidden when editing -->
      <input type="hidden" name="application_id" id="applyApplicationId">

      <input type="hidden" name="stall_id" id="applyStallId">

      <label>Stall Name:</label><br>
      <input type="text" name="stall_name" id="applyStallName" required><br>

      <label>Product Type:</label><br>
      <select name="product_type" id="applyProductType" required>
        <option value="" selected disabled>Select type</option>
        <option value="foods">foods</option>
        <option value="beverages">beverages</option>
        <option value="merchandise">merchandise</option>
        <option value="others">others</option>
      </select><br>

      <label>Stall Size:</label><br>
      <input type="text" name="stall_size" id="applyStallSize" placeholder="e.g. 2x2" required><br>

      <label>Upload Stall Picture:</label>
      <input type="file" name="stall_image" id="applyStallImage" accept="image/*" required>

      <button type="submit" class="popup-btn">Submit Application</button>
    </form>
  </div>
</div>


    </section>

    <!-- Placeholder sections for other icons (optional, like orgphp) -->
<section id="placeholder-sales" class="full-content hidden">
  <div class="icon-header">
    <h2>Analytics</h2>
    <button class="back-btn">⬅ Back</button>
  </div>

  <div class="analytics-container">
    <h3 class="analytics-heading">Stall performance</h3>
    <div style="margin: 8px 0 14px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <label for="vendorAnalyticsStallSelect" style="font-size:12px; font-weight:800;">Select stall:</label>
      <select id="vendorAnalyticsStallSelect" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(0,0,0,0.15);">
        <option value="">Loading…</option>
      </select>
    </div>
    <div id="analyticsStallSummary"></div>

    <div class="analytics-summary-row">
  <div id="analyticsSalesCard" class="summary-card"></div>
  <div id="analyticsSoldCard" class="summary-card"></div>
    </div>

    <!-- charts row 1 -->
    <div class="analytics-row">
      <div class="analytics-card">
        <h4 class="analytics-card-title">Top products by views</h4>
        <canvas id="productViewsChart"></canvas>
      </div>

      <div class="analytics-card">
        <h4 class="analytics-card-title">Favorites vs rating</h4>
        <canvas id="productFavsRatingsChart"></canvas>
      </div>
    </div>

    <!-- NEW: charts row 2 - sales per product -->
<div class="analytics-row">
  <div class="analytics-card">
    <h4 class="analytics-card-title">Sales per product</h4>
    <canvas id="productSalesChart"></canvas>
  </div>
</div>

    <h3 class="analytics-heading" style="margin-top:16px;">Products performance</h3>
    <div id="analyticsProductsSummary"></div>
  </div>
</section>

<!-- Reviews & Ratings screen (uses vendor analytics: views/favorites/ratings) -->
<section id="vendor-reviews" class="full-content hidden">
  <div class="icon-header">
    <h2>Reviews &amp; Ratings</h2>
    <button class="back-btn">⬅ Back</button>
  </div>

  <div class="analytics-container">
    <h3 class="analytics-heading">Stall</h3>
    <div style="margin: 8px 0 14px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <label for="vendorReviewsStallSelect" style="font-size:12px; font-weight:800;">Select stall:</label>
      <select id="vendorReviewsStallSelect" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(0,0,0,0.15);">
        <option value="">Loading…</option>
      </select>
    </div>
    <div id="vendorReviewsStallSummary"></div>

    <h3 class="analytics-heading" style="margin-top:16px;">Products</h3>
    <div id="vendorReviewsProductsSummary"></div>

    <div class="analytics-row" style="margin-top:14px;">
      <div class="analytics-card">
        <h4 class="analytics-card-title">Top products by views</h4>
        <canvas id="vendorReviewsProductViewsChart"></canvas>
      </div>
      <div class="analytics-card">
        <h4 class="analytics-card-title">Favorites vs rating</h4>
        <canvas id="vendorReviewsProductFavsRatingsChart"></canvas>
      </div>
    </div>
  </div>
</section>



<section id="placeholder-products" class="full-content hidden products-screen">
  <div class="icon-header products-header">
    <h2>PRODUCTS</h2>
    <div class="products-header-right">
      <button class="back-btn">⬅</button>
    </div>
  </div>

  <div class="products-toolbar">
    <button id="addProductBtn" class="add-product-btn">+ Add Product</button>
  </div>

  <!-- Cards list -->
  <div id="productList" class="products-grid">
    <!-- cards inserted by JS -->
  </div>

  <!-- Add / Edit Product Modal -->
  <div id="productModal" class="vendor-modal">
    <div class="vendor-modal-content product-modal-content">
      <span id="productModalClose" class="vendor-modal-close">&times;</span>
      <h3 id="productModalTitle">Add New Product</h3>

<form id="productForm" enctype="multipart/form-data">
  <input type="hidden" id="productId" name="id">

  <!-- keep existing image name when editing -->
  <input type="hidden" id="productExistingImage" name="existing_image">

  <label>Product Name</label>
  <input type="text" id="productName" name="name" required>

  <div class="product-form-row">
    <div class="product-form-group">
      <label>Price</label>
      <input type="number" id="productPrice" name="price" step="0.01" min="0" required>
    </div>
  </div>

  <label>Category</label>
  <input type="text" id="productCategory" name="category">

  <label>Image</label>
  <input type="file" id="productImage" name="image" accept="image/*">

  <label>Description</label>
  <textarea id="productDescription" name="description" rows="3"></textarea>

  <div class="product-modal-actions">
    <button type="button" id="productCancelBtn" class="btn-secondary">Cancel</button>
    <button type="submit" class="btn-primary">Save Product</button>
  </div>
</form>


    </div>
  </div>
</section>

<!-- Attach Products Modal -->
<div id="attachProductsModal" class="vendor-modal" aria-hidden="true" style="display:none;">
  <div class="vendor-modal-content attach-products-modal-content">
    <span id="attachProductsModalClose" class="vendor-modal-close">&times;</span>
    <h3>Attach Products</h3>
    <div id="attachProductsModalSubtitle" style="font-size:12px;color:#555;font-weight:800;margin:2px 0 12px;"></div>
    <div id="attachProductsList" class="attach-products-grid">
      <!-- rendered by JS -->
    </div>
  </div>
</div>

<!-- Stall Manage Modal -->
<div id="stallManageModal" class="vendor-modal" aria-hidden="true" style="display:none;">
  <div class="vendor-modal-content stall-manage-modal-content">
    <span id="stallManageModalClose" class="vendor-modal-close">&times;</span>
    <h3 id="stallManageName">Stall</h3>
    <img id="stallManageImage" class="stall-manage-image" src="tourism/uploads/stalls/noimg.png" alt="Stall image" />
    <div id="stallManageProductsWrap">
      <div id="stallManageProductsList" class="stall-manage-products-list"></div>
    </div>
    <div class="stall-manage-actions">
      <button type="button" id="stallManageAttachBtn" class="btn-primary">Attach Product</button>
    </div>
  </div>
</div>


    <section id="placeholder-menu" class="full-content hidden vendor-menu-screen">
      <div class="vendor-menu-layout">
        <div class="vendor-menu-top">
          <button class="back-btn vendor-menu-back">←</button>
        </div>

        <div class="vendor-menu-profile-card">
          <?php $vendorAvatarSrc = $profilePicture ?: 'tourism/uploads/userPin.png'; ?>
          <button type="button" class="vendor-menu-avatar" id="vendorAvatarBtn" aria-label="Change profile picture">
            <img id="vendorAvatarPreview" src="<?php echo htmlspecialchars($vendorAvatarSrc, ENT_QUOTES); ?>" alt="Profile picture" />
            <span class="vendor-menu-avatar-camera" aria-hidden="true">📷</span>
          </button>
          <div class="vendor-menu-profile-text">
            <div class="vendor-menu-profile-title"><?php echo htmlspecialchars($fullName, ENT_QUOTES); ?></div>
            <div class="vendor-menu-profile-subtitle">Role: Vendor</div>
          </div>
        </div>

        <!-- Avatar picker modal -->
        <div id="vendorAvatarModal" class="vendor-avatar-modal" aria-hidden="true">
          <div class="vendor-avatar-modal-sheet">
            <div class="vendor-avatar-modal-header">
              <div class="vendor-avatar-modal-title">Choose profile picture</div>
              <button type="button" id="vendorAvatarModalClose" class="vendor-avatar-modal-close">✕</button>
            </div>

            <div class="vendor-avatar-presets" id="vendorAvatarPresetList"></div>

            <div class="vendor-avatar-upload-row">
              <button type="button" class="vendor-avatar-upload-btn" id="vendorAvatarUploadBtn">Upload photo</button>
              <button type="button" class="vendor-avatar-save-btn" id="vendorAvatarSaveBtn">Save</button>
            </div>

            <input type="file" id="vendorAvatarFileInput" accept="image/*" style="display:none" />
          </div>
        </div>

        <div class="vendor-menu-sections">
          <div class="vendor-menu-group">
            <div class="vendor-menu-group-title">MANAGE</div>
            <button type="button" class="vendor-menu-item" data-action="reviews">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">⭐</span>
                <span>Reviews &amp; Ratings</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
            <button type="button" class="vendor-menu-item" data-action="your_stalls">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">🏪</span>
                <span>Your Stalls</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
            <button type="button" class="vendor-menu-item" data-action="events">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">📅</span>
                <span>Events</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
            <button type="button" class="vendor-menu-item" data-action="registration">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">🛡</span>
                <span>Registration Validity</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
          </div>

          <div class="vendor-menu-group">
            <div class="vendor-menu-group-title">APP SETTINGS</div>
            <button type="button" class="vendor-menu-item" data-action="general">
              <span class="vendor-menu-item-left">
                <span class="vendor-menu-icon">⚙</span>
                <span>General Settings</span>
              </span>
              <span class="vendor-menu-chevron">›</span>
            </button>
            <button type="button" class="vendor-menu-item" data-action="help">
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

    <section id="vendor-events" class="full-content hidden">
      <div class="icon-header">
        <h2>Events</h2>
        <button class="back-btn" data-back-to="placeholder-menu">⬅ Back</button>
      </div>
      <div id="vendorEventsList" class="festivities-list"></div>
    </section>

    <section id="placeholder-other1" class="full-content hidden">
      <div class="icon-header">
        <h2>Other</h2>
        <button class="back-btn">⬅ Back</button>
      </div>
      <p>Extra vendor tools will appear here.</p>
    </section>

    <section id="placeholder-other2" class="full-content hidden">
      <div class="icon-header">
        <h2>Analytics</h2>
        <button class="back-btn">⬅ Back</button>
      </div>
      <p>Coming soon: analytics and performance.</p>
    </section>

    <!-- Your Stalls (Manage) -->
    <section id="vendor-your-stalls" class="full-content hidden vendor-menu-screen">
      <div class="icon-header">
        <h2>Your Stalls</h2>
        <button class="back-btn" data-back-to="placeholder-menu">⬅ Back</button>
      </div>
      <div id="vendorStallsList" class="vendor-stalls-list"></div>
    </section>
  </div>


  <!-- Event Detail Modal (vendor - same as tourist) -->
  <div id="vendorEventDetailModal" class="event-detail-modal" style="display:none;">
    <div class="event-detail-modal-content">
      <button type="button" id="vendorEventDetailModalClose" class="event-detail-modal-close">&times;</button>
      <div id="vendorEventDetailBody">
        <div class="event-detail-top-row">
          <div class="event-detail-top-left">
            <button type="button" id="vendorEventDetailFavBtn" class="event-fav-btn" title="Favorite">❤</button>
            <div class="event-detail-rate-stars" id="vendorEventDetailStars">
              <span class="event-rating-star" data-rating="1">★</span>
              <span class="event-rating-star" data-rating="2">★</span>
              <span class="event-rating-star" data-rating="3">★</span>
              <span class="event-rating-star" data-rating="4">★</span>
              <span class="event-rating-star" data-rating="5">★</span>
            </div>
          </div>
          <div class="event-detail-top-right" id="vendorEventDetailRatingsSummary">
            <span class="event-avg-rating"></span>
            <span class="event-ratings-count"></span>
          </div>
        </div>
        <h3 id="vendorEventDetailTitle"></h3>
        <p id="vendorEventDetailDate"></p>
        <p id="vendorEventDetailLocation"></p>
        <div id="vendorEventDetailPlanWrap" class="event-plan-zoom-wrap">
          <img id="vendorEventDetailPlanImg" alt="Event Plan" class="event-plan-zoom-img" />
        </div>
        <div class="event-detail-bottom-row">
          <button type="button" id="vendorEventDetailLeaveReviewBtn" class="event-detail-btn">Leave a review</button>
          <button type="button" id="vendorEventDetailViewReviewsBtn" class="event-detail-btn">View reviews</button>
        </div>
        <div id="vendorEventDetailReviewsSection" class="event-reviews-section" style="display:none;">
          <h4>Reviews</h4>
          <div id="vendorEventDetailReviewsList"></div>
        </div>
        <div id="vendorEventDetailLeaveReviewSection" class="event-leave-review-section" style="display:none;">
          <textarea id="vendorEventDetailReviewText" placeholder="Write your review..." rows="3"></textarea>
          <button type="button" id="vendorEventDetailSubmitReviewBtn" class="event-detail-btn">Submit review</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Vendor General Settings Modal -->
  <div id="vendorGeneralSettingsModal" class="vendor-settings-modal" style="display:none;">
    <div class="vendor-settings-modal-sheet">
      <div class="vendor-settings-modal-header">
        <h2>General Settings</h2>
        <button type="button" id="vendorGeneralSettingsClose" class="vendor-settings-modal-close">✕</button>
      </div>
      <div class="vendor-settings-content">
        <div class="vendor-settings-group">
          <div class="vendor-settings-title">Change name</div>
          <div class="vendor-settings-row">
            <label>New full name</label>
            <input type="text" id="vendorNewName" class="vendor-settings-input" placeholder="Enter new full name" />
          </div>
          <button type="button" id="vendorChangeNameBtn" class="vendor-settings-btn">Update name</button>
        </div>
        <div class="vendor-settings-group">
          <div class="vendor-settings-title">Change password</div>
          <div class="vendor-settings-row">
            <label>Current password</label>
            <input type="password" id="vendorCurrentPassword" class="vendor-settings-input" placeholder="Enter current password" />
          </div>
          <div class="vendor-settings-row">
            <label>New password</label>
            <input type="password" id="vendorNewPassword" class="vendor-settings-input" placeholder="Enter new password" />
          </div>
          <div class="vendor-settings-row">
            <label>Confirm password</label>
            <input type="password" id="vendorConfirmPassword" class="vendor-settings-input" placeholder="Confirm new password" />
          </div>
          <button type="button" id="vendorChangePasswordBtn" class="vendor-settings-btn">Update password</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Welcome popup (after login) -->
  <div id="vendorWelcomePopup" class="welcome-popup" style="display:none;">
    <div class="welcome-popup-content">
      <h2>WELCOME DEAR <?php echo htmlspecialchars($accountType ?: 'Vendor', ENT_QUOTES); ?>, <?php echo htmlspecialchars($fullName ?: 'User', ENT_QUOTES); ?></h2>
      <p class="welcome-popup-hint">Click anywhere to continue</p>
    </div>
  </div>

  <!-- JS Libraries -->
  <script src="https://unpkg.com/jquery@3.6.0/dist/jquery.min.js"></script>
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>

  <!-- Pass PHP session to JS -->
  <script>
    var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>"; // 'vendor'
    var vendorShowWelcome = <?php echo !empty($_SESSION['show_welcome']) ? 'true' : 'false'; ?>;
    <?php if (!empty($_SESSION['show_welcome'])) { unset($_SESSION['show_welcome']); } ?>
  </script>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>


  <!-- Your existing map / stall logic + new dashboard behavior -->
  <script src="vendorJS.js?v=10"></script>

</body>
</html>
