<?php
session_start();

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

$isLoggedIn = isset($_SESSION['user_id']);
$isGuest    = !empty($_SESSION['guest']);   // true if guest.php was used

// If NOT logged in and NOT guest → send back to capstone
if (!$isLoggedIn && !$isGuest) {
    header("Location: Capstone.php");
    exit;
}

$fullName        = $_SESSION['full_name'] ?? '';
$email           = $_SESSION['email'] ?? '';
$gender          = $_SESSION['gender'] ?? '';
$accountType     = $_SESSION['account_type'] ?? '';
$profilePicture  = $_SESSION['profile_picture'] ?? '';
?>



<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Main Page</title>
  <link rel="stylesheet" href="MainStyle.css?v=13" />
  <link rel="stylesheet" href="eventCardsShared.css?v=2" />
</head>
<body>

<header class="top-nav">

  <button id="menu-btn" class="menu-btn">
    <img src="menu.png" alt="Menu Icon" class="nav-img"/>
  </button>

  <div class="search-wrap">
    <input type="text" placeholder="Search" />
    <button class="search-icon">
      <img src="search.png" alt="Search Icon" class="notif-img"/>
    </button>
  </div>

  <button class="notif-btn">
    <img src="notification.png" alt="Notification Icon" class="nav-img"/>
  </button>
</header>

<aside id="side-menu" class="side-menu">
  <div class="menu-header">
    <span class="settings-icon">
       <img src="setting.png" alt="Setting Icon" class="notif-img"/>
    Settings</span>
    <button id="close-btn" class="close-btn">
      <img src="back.png" alt="Back Icon" class="notif-img"/>
    </button>
  </div>
  <ul>
     <li id="language-item" class="has-submenu">
      Language <span id="current-language">English ></span>
      <ul id="language-options" class="submenu">
        <li data-lang="English">English</li>
        <li data-lang="Filipino">Filipino</li>
        <li data-lang="Japanese">Japanese</li>
        <li data-lang="Korean">Korean</li>
      </ul>
    </li>

    <li id="country-item" class="has-submenu">
  Country or Region <span id="current-country">Philippines ></span>
  <ul id="country-options" class="submenu">
    <li data-country="United States">United States</li>
    <li data-country="South Korea">South Korea</li>
    <li data-country="Japan">Japan</li>
    <li data-country="Philippines">Philippines</li>
  </ul>
</li>

    <li>Currency <span>US Dollars ></span></li>
    <li>Units <span>Metric ></span></li>
    <li id="darkmode-toggle">Dark mode <span id="darkmode-status">OFF ></span></li>
    <li>Notification Settings</li>
    <li>About</li>
  </ul>
</aside>

<div id="overlay" class="overlay"></div>


  <div id="appContent">
    <section class="hero">
      <img src="IloChurch.jpg" alt="Iloilo City, Philippines" />
      <div class="city-label">ILOILO CITY, PHILIPPINES</div>
    </section>

    <main class="sheet">
      <section class="icon-grid" aria-label="Quick actions">
        <div class="icon-item" data-content="map">
         <span class="icon">
         <img src="map.png" alt="Map Icon" class="icon-img" />
        </span>
        <div class="label">Map</div>
      </div>
        <div class="icon-item" data-content="location">
          <span class="icon">
            <img src="location.png" alt="Location Icon" class="icon-img"/>
          </span>
          <div class="label">Location</div>
        </div>
        <div class="icon-item" data-content="profile">
          <span class="icon">
            <img src="profile.png" alt="Profile Icon" class="icon-img"/>
          </span>
          <div class="label">Profile</div>
        </div>

        <div class="icon-item" data-content="food">
          <span class="icon">
            <img src="food.png" alt="Food Icon" class="icon-img"/>
          </span>
          <div class="label">Stalls</div>
        </div>
        <div class="icon-item" data-content="festivities">
          <span class="icon">
            <img src="festive.png" alt="Festive Icon" class="icon-img"/>
          </span>
          <div class="label">Festivities</div>
        </div>
        <div class="icon-item" data-content="destination">
          <span class="icon">
            <img src="destine.png" alt="Destine Icon" class="icon-img"/>
          </span>
          <div class="label">Landmark</div>
        </div>
      </section>

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
  
  <div id="slidePanel">
      <div class="panel-content"></div>
    </div>

  
  <div id="iconContent" style="display:none;">
  
  <section id="map" class="full-content hidden">
    <div class="icon-header">
      <h2><img src="map.png" alt="Map Icon" class="map-icon"/> Map</h2>
      <button class="back-btn">⬅ Back</button>
    </div>
    <div class="map-container">
      <iframe 
        src="tourism/map.php" 
        allowfullscreen 
        loading="lazy" 
        referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>

    <div class="map-links">
      <div class="map-card lapaz"><p>Lapaz Iloilo City ></p></div>
      <div class="map-card molo"><p>Molo Iloilo City ></p></div>
      <div class="map-card villa"><p>Villa Arevalo Iloilo City ></p></div>
      <div class="map-card mandurriao"><p>Mandurriao Iloilo City ></p></div>
    </div>
  </section>

  
  <section id="location" class="full-content hidden">
    <h2>Location</h2>
    <p>Find your current location and nearby landmarks.</p>
    <button class="back-btn">⬅ Back</button>
  </section>

<section id="profile" class="full-content hidden">
  <div class="tourist-profile-page">
    <div class="tourist-profile-topbar">
      <button class="back-btn">⬅ Back</button>
      <div class="tourist-profile-title">Profile</div>
      <div class="tourist-profile-top-spacer"></div>
    </div>

    <div class="tourist-profile-avatar-section">
      <div class="tourist-profile-avatar-wrapper">
        <?php
          $avatarSrc = $profilePicture ?: 'tourism/uploads/userPin.png';
        ?>
        <button type="button" class="tourist-profile-avatar" id="touristAvatarBtn" aria-label="Change profile picture">
          <img id="touristAvatarPreview" src="<?php echo htmlspecialchars($avatarSrc, ENT_QUOTES); ?>" alt="Profile picture" />
          <span class="tourist-avatar-camera" aria-hidden="true">📷</span>
        </button>
        <div class="tourist-profile-name-text">
          <?php echo $isLoggedIn ? htmlspecialchars($fullName, ENT_QUOTES) : 'Guest'; ?>
        </div>
      </div>
    </div>

    <form id="touristProfileForm" class="tourist-profile-form" enctype="multipart/form-data">
      <input type="hidden" id="avatarSource" name="avatar_source" value="none" />

      <div class="tourist-input-group">
        <label class="tourist-input-label">Full name</label>
        <input
          type="text"
          id="touristFullNameDisplay"
          class="tourist-input tourist-input-readonly"
          value="<?php echo htmlspecialchars($fullName, ENT_QUOTES); ?>"
          readonly
          disabled
        />
      </div>

      <div class="tourist-input-group">
        <label class="tourist-input-label">Role</label>
        <input
          type="text"
          class="tourist-input tourist-input-readonly"
          value="Tourist"
          readonly
          disabled
        />
      </div>

      <div class="tourist-input-group">
        <label class="tourist-input-label">Mobile number</label>
        <div class="tourist-phone-row">
          <div class="tourist-phone-flag">
            <img src="ph_flag.png" alt="PH" />
            <span>+63</span>
          </div>
          <input
            type="tel"
            name="phone"
            class="tourist-input tourist-phone-input"
            placeholder="9123456789"
            <?php echo $isLoggedIn ? '' : 'disabled'; ?>
          />
        </div>
      </div>

      <div class="tourist-input-group">
        <label class="tourist-input-label">Email</label>
        <input
          type="email"
          class="tourist-input tourist-input-readonly"
          value="<?php echo htmlspecialchars($email, ENT_QUOTES); ?>"
          readonly
          disabled
        />
      </div>

      <div class="tourist-input-group">
        <label class="tourist-input-label">Gender</label>
        <select
          name="gender"
          id="touristGenderSelect"
          class="tourist-input tourist-select"
          <?php echo $isLoggedIn ? '' : 'disabled'; ?>
        >
          <option value="" <?php echo $gender === '' ? 'selected' : ''; ?>>
            Please select your gender
          </option>
          <option value="female" <?php echo $gender === 'female' ? 'selected' : ''; ?>>
            Female
          </option>
          <option value="male" <?php echo $gender === 'male' ? 'selected' : ''; ?>>
            Male
          </option>
          <option value="other" <?php echo $gender === 'other' ? 'selected' : ''; ?>>
            Other
          </option>
          <option value="prefer_not" <?php echo $gender === 'prefer_not' ? 'selected' : ''; ?>>
            Prefer not to say
          </option>
        </select>
      </div>

      <!-- Avatar picker modal -->
      <div id="touristAvatarModal" class="tourist-avatar-modal" aria-hidden="true">
        <div class="tourist-avatar-modal-sheet">
          <div class="tourist-avatar-modal-header">
            <div class="tourist-avatar-modal-title">Choose profile picture</div>
            <button type="button" id="touristAvatarModalClose" class="tourist-avatar-modal-close">✕</button>
          </div>

          <div class="tourist-avatar-presets" id="touristAvatarPresetList"></div>

          <div class="tourist-avatar-upload-row">
            <button type="button" class="tourist-avatar-upload-btn" id="touristAvatarUploadBtn">Upload photo</button>
            <button type="button" class="tourist-avatar-save-btn" id="touristAvatarSaveBtn">Save</button>
          </div>

          <input type="file" id="touristAvatarFileInput" accept="image/*" style="display:none" />
        </div>
      </div>

      <div class="tourist-profiles-section">
        <div class="tourist-profiles-title">Profiles</div>
        <button
          type="button"
          id="addBusinessProfileBtn"
          class="tourist-link-button"
        >
          Add a business profile
        </button>
        <div class="tourist-profiles-subtext">Become a vendor</div>
      </div>

      <?php if ($isLoggedIn): ?>
      <div class="tourist-change-section">
        <div class="tourist-change-title">Change name</div>
        <div class="tourist-input-group">
          <label class="tourist-input-label">New full name</label>
          <input type="text" id="touristNewName" class="tourist-input" placeholder="Enter new full name" />
        </div>
        <button type="button" id="touristChangeNameBtn" class="tourist-secondary-button">Update name</button>
      </div>

      <div class="tourist-change-section">
        <div class="tourist-change-title">Change password</div>
        <div class="tourist-input-group">
          <label class="tourist-input-label">Current password</label>
          <input type="password" id="touristCurrentPassword" class="tourist-input" placeholder="Enter current password" />
        </div>
        <div class="tourist-input-group">
          <label class="tourist-input-label">New password</label>
          <input type="password" id="touristNewPassword" class="tourist-input" placeholder="Enter new password" />
        </div>
        <div class="tourist-input-group">
          <label class="tourist-input-label">Confirm password</label>
          <input type="password" id="touristConfirmPassword" class="tourist-input" placeholder="Confirm new password" />
        </div>
        <button type="button" id="touristChangePasswordBtn" class="tourist-secondary-button">Update password</button>
      </div>

        <button type="submit" class="tourist-primary-button">
          Save profile
        </button>
        <button
          type="button"
          id="logoutFromProfileBtn"
          class="tourist-logout-button"
        >
          Log Out
        </button>
      <?php else: ?>
        <div class="tourist-profile-guest-note">
          Log in or create an account to edit your profile.
        </div>
      <?php endif; ?>
    </form>
  </div>
</section>




<section id="food" class="full-content hidden">
  <div class="icon-header">
    <h2><img src="food.png" alt="Food Icon" class="map-icon"/> Stalls </h2>
    <button class="back-btn">⬅ Back</button>
  </div>

  <div class="stalls-nearby">
    <div class="stalls-subtitle" id="stallsNearYouTitle">Stalls Near You</div>

    <div id="stallsLocationGate" class="stalls-location-gate">
      <p id="stallsLocationGateText">Stalls Near You -> No stalls yet. Please turn on your location.</p>
      <button type="button" id="stallsLocationBtn" class="stalls-location-btn">Turn on location</button>
    </div>

    <div id="stallsLoading" class="stalls-empty hidden">Loading stalls...</div>

    <div id="stallsContent" class="hidden">
      <div class="stalls-section-title">Top Rated Stalls (4+)</div>
      <div id="topRatedStallsCarousel" class="stalls-carousel"></div>

      <div class="stalls-section-title">All Merchandise</div>
      <div id="merchandiseStallsCarousel" class="stalls-carousel"></div>

      <div class="stalls-section-title">All Foods</div>
      <div id="foodsStallsCarousel" class="stalls-carousel"></div>

      <div class="stalls-section-title">All Beverages</div>
      <div id="beveragesStallsCarousel" class="stalls-carousel"></div>

      <div class="stalls-section-title">More Stalls</div>
      <div class="stalls-more-wrap">
        <div id="moreStallsList" class="stalls-more-list"></div>
      </div>
    </div>
  </div>

  <!-- Stall Detail Modal -->
  <div id="stallDetailModal" class="stall-detail-modal" aria-hidden="true">
    <div class="stall-detail-modal-content">
      <button type="button" id="stallDetailModalClose" class="stall-detail-modal-close" aria-label="Close">&times;</button>

      <div class="stall-detail-header">
        <img id="stallDetailImage" src="tourism/uploads/stalls/noimg.png" alt="Stall" />
        <div class="stall-detail-meta">
          <h3 id="stallDetailName">Stall</h3>
          <div class="stall-detail-rating" id="stallDetailRating"></div>
          <div class="stall-detail-distance" id="stallDetailDistance"></div>
        </div>
      </div>

      <div class="stall-detail-products-title">Products</div>
      <div id="stallDetailProducts" class="stall-products-grid"></div>
    </div>
  </div>

  <!-- Stall Detail Sheet fallback (if modal is not visible) -->
  <div id="stallDetailSheet" class="slide-panel-bottom" aria-hidden="true">
    <button type="button" id="stallDetailSheetClose" class="close-panel-bottom" aria-label="Close">&times;</button>
    <div class="icon-header" style="margin-bottom:12px;">
      <h2 style="font-size:18px;margin:0;">Stall Details</h2>
    </div>
    <div style="display:flex; gap:12px; align-items:flex-start;">
      <img id="stallSheetImage" src="tourism/uploads/stalls/noimg.png" alt="Stall" style="width:88px;height:88px;border-radius:14px;object-fit:cover;"/>
      <div style="flex:1;">
        <div id="stallSheetName" style="font-weight:950;font-size:16px;margin-bottom:6px;">Stall</div>
        <div id="stallSheetRating" style="font-weight:900;font-size:13px;margin-bottom:4px;color:#111;"></div>
        <div id="stallSheetDistance" style="font-weight:800;font-size:13px;color:#555;"></div>
      </div>
    </div>
    <div style="margin-top:16px;font-weight:950;">Products</div>
    <div id="stallSheetProducts" class="stall-products-grid"></div>
  </div>
</section>


<section id="festivities" class="full-content hidden">
  <div class="icon-header">
    <h2>
      <img src="festive.png" alt="Festive Icon" class="map-icon" />
      Festivities
    </h2>
    <button class="back-btn">⬅ Back</button>
  </div>

  <div id="festivitiesList" class="festivities-list">
    <div class="festivities-loading">Loading events...</div>
  </div>
</section>

<!-- Event Detail Modal (tourist + vendor) -->
<div id="eventDetailModal" class="event-detail-modal" style="display:none;" aria-hidden="true">
  <div class="event-detail-modal-content">
    <button type="button" id="eventDetailModalClose" class="event-detail-modal-close">&times;</button>
    <div id="eventDetailBody">
      <div class="event-detail-top-row">
        <div class="event-detail-top-left">
          <button type="button" id="eventDetailFavBtn" class="event-fav-btn" title="Favorite">❤</button>
          <div class="event-detail-rate-stars" id="eventDetailStars">
            <span class="event-rating-star" data-rating="1">★</span>
            <span class="event-rating-star" data-rating="2">★</span>
            <span class="event-rating-star" data-rating="3">★</span>
            <span class="event-rating-star" data-rating="4">★</span>
            <span class="event-rating-star" data-rating="5">★</span>
          </div>
        </div>
        <div class="event-detail-top-right" id="eventDetailRatingsSummary">
          <span class="event-avg-rating"></span>
          <span class="event-ratings-count"></span>
        </div>
      </div>
      <h3 id="eventDetailTitle"></h3>
      <p id="eventDetailDate"></p>
      <p id="eventDetailLocation"></p>
      <div id="eventDetailPlanWrap" class="event-plan-zoom-wrap">
        <img id="eventDetailPlanImg" alt="Event Plan" class="event-plan-zoom-img" />
      </div>
      <div class="event-detail-bottom-row">
        <button type="button" id="eventDetailLeaveReviewBtn" class="event-detail-btn">Leave a review</button>
        <button type="button" id="eventDetailViewReviewsBtn" class="event-detail-btn">View reviews</button>
      </div>
      <div id="eventDetailReviewsSection" class="event-reviews-section" style="display:none;">
        <h4>Reviews</h4>
        <div id="eventDetailReviewsList"></div>
      </div>
      <div id="eventDetailLeaveReviewSection" class="event-leave-review-section" style="display:none;">
        <textarea id="eventDetailReviewText" placeholder="Write your review..." rows="3"></textarea>
        <button type="button" id="eventDetailSubmitReviewBtn" class="event-detail-btn">Submit review</button>
      </div>
    </div>
  </div>
</div>


  <section id="destination" class="full-content hidden">
    <h2>Destination</h2>
    <p>Top tourist spots: Miag-ao Church, Guimaras Island, and more.</p>
    <button class="back-btn">⬅ Back</button>
  </section>
</div>


  <!-- Welcome popup (after login) -->
  <div id="welcomePopup" class="welcome-popup" style="display:none;">
    <div class="welcome-popup-content">
      <h2>WELCOME DEAR <?php echo htmlspecialchars($accountType ?: 'User', ENT_QUOTES); ?>, <?php echo htmlspecialchars($fullName ?: 'Guest', ENT_QUOTES); ?></h2>
      <p class="welcome-popup-hint">Click anywhere to continue</p>
    </div>
  </div>

  <script>
window.addEventListener("beforeunload", function () {
    navigator.sendBeacon("logout.php"); 
});
<?php if (!empty($_SESSION['show_welcome'])) { unset($_SESSION['show_welcome']); ?>
document.addEventListener("DOMContentLoaded", function() {
  var w = document.getElementById("welcomePopup");
  if (w) {
    w.style.display = "flex";
    w.onclick = function() { w.style.display = "none"; };
  }
});
<?php } ?>
</script>

  <script src="Main.js?v=12"></script>
</body>
</html>