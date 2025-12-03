
<?php
session_start();

header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

$isLoggedIn = isset($_SESSION['user_id']);
$isGuest    = !empty($_SESSION['guest']);   // true if guest.php was used

// If NOT logged in and NOT guest → send back to capstone
if (!$isLoggedIn && !$isGuest) {
    header("Location: capstone.php");
    exit;
}

$fullName    = $_SESSION['full_name'] ?? '';
$email       = $_SESSION['email'] ?? '';
$accountType = $_SESSION['account_type'] ?? '';
?>



<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Main Page</title>
  <link rel="stylesheet" href="MainStyle.css" />
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
          <div class="label">Delicacies</div>
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
  <div class="profile-header">
    <!-- This is clickable to open slide -->
    <span id="profileNameClick" class="profile-icon" style="cursor:pointer;">
      <img src="profile.png"/>
      <?php echo $isLoggedIn ? $fullName : "Profile"; ?>
    </span>
    <button class="back-btn">⬅ Back</button>
  </div>

  <ul class="menu-list">
    <?php if ($isLoggedIn): ?>
      <li id="userInfoItem" style="cursor:pointer;">
        <span class="icon"><img src="profile.png"/></span>
        <span class="label"><?php echo $fullName; ?></span>
      </li>
      <li>
        <span class="icon"><img src="timeline.png"/></span>
        <span class="label">Your Timeline</span>
      </li>
      <li>
        <span class="icon"><img src="heart.png"/></span>
        <span class="label">Favorites</span>
      </li>
      <li>
        <span class="icon"><img src="star.png"/></span>
        <span class="label">Ratings</span>
      </li>
      <li>
        <span class="icon"><img src="setting.png"/></span>
        <span class="label">Settings</span>
      </li>
      <li>
        <span class="icon"><img src="helpcenter.png"/></span>
        <span class="label">Help Center</span>
      </li>
    <?php else: ?>
      <li>
        <span class="icon"><img src="profile.png"/></span>
        <span class="label">Login / Sign up</span>
      </li>
    <?php endif; ?>
  </ul>
</section>

<?php if ($isLoggedIn): ?>
<!-- Bottom slide panel -->
<div id="userSlideDrawer" class="slide-panel-bottom">
  <button id="closeUserDrawer" class="close-panel-bottom">X</button>
  <h3>User Info</h3>
  <p><strong>Name:</strong> <?php echo $fullName; ?></p>
  <p><strong>Email:</strong> <?php echo $email; ?></p>
  <p><strong>Account Type:</strong> <?php echo ucfirst($accountType); ?></p>
  <a href="logout.php" id="logoutUserBtn" class="logout-btn-bottom">Logout</a>
</div>
<?php endif; ?>




<section id="food" class="full-content hidden">
  <div class="icon-header">
    <h2><img src="food.png" alt="Food Icon" class="map-icon"/> Delicacies </h2>
    <button class="back-btn">⬅ Back</button>
  </div>

  <div class="food-list">
    <div class="food-card">
      <div class="food-wrapper">
      <img src="batchoy.png" alt="Lapaz Batchoy" class="food-img"/>
      <span class="heart-icon">
        <img src="heart.png" class="heart-img" alt="heart">
      </span>
      </div>
      <div class="food-info">
        <span class="food-category">Soup</span>
        <h3 class="food-title">Lapaz Batchoy</h3>
        <p class="food-desc">Lapaz Batchoy in Iloilo City district of Lapaz<br>
        By Lorenz Lapaz Batchoyan</p>
        <p class="food-rating">⭐ 4.9 (350)</p>
        <p class="food-price">From US$ 1.50</p>
      </div>
    </div>


    <div class="food-card">
       <div class="food-wrapper">
      <img src="pancit.jpg" alt="Pancit Molo" class="food-img"/>
      <span class="heart-icon">
        <img src="heart.png" class="heart-img" alt="heart">
      </span>
       </div>
      <div class="food-info">
        <span class="food-category">Soup</span>
        <h3 class="food-title">Pancit Molo</h3>
        <p class="food-desc">Pancit Molo in Iloilo City district of Molo<br>
        By Moloha Ko Gha</p>
        <p class="food-rating">⭐ 4.7 (297)</p>
        <p class="food-price">From US$ 1.50</p>
      </div>
    </div>
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

  <div class="festivities-list">

    <div class="event-card">
      <img src="dagyang.jpg" alt="Dinagyang Street Dance" class="event-img" />
      <div class="event-info">
        <h3>Dinagyang street dance competition</h3>
        <p>Start date: Jan 25–26</p>
        <p>Iloilo City ></p>
      </div>
    </div>


    <div class="event-card">
      <img src="dagyang.jpg" alt="Dinagyang Ilomination" class="event-img" />
      <div class="event-info">
        <h3>Dinagyang Ilomination</h3>
        <p>Start date: Jan 23–24</p>
        <p>Iloilo City ></p>
      </div>
    </div>


    <div class="event-card empty">
      <div class="event-placeholder"></div>
    </div>
  </div>
</section>


  <section id="destination" class="full-content hidden">
    <h2>Destination</h2>
    <p>Top tourist spots: Miag-ao Church, Guimaras Island, and more.</p>
    <button class="back-btn">⬅ Back</button>
  </section>
</div>


  <script>
window.addEventListener("beforeunload", function () {
    navigator.sendBeacon("logout.php"); 
});
</script>



  <script src="Main.js"></script>
</body>
</html>