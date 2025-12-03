
document.addEventListener("DOMContentLoaded", () => {
  const appContent = document.getElementById("appContent");
  const iconContent = document.getElementById("iconContent");
  const sections = document.querySelectorAll("#iconContent .full-content");

  const menuBtn = document.getElementById("menu-btn"); 
  const closeBtn = document.getElementById("close-btn");
  const sideMenu = document.getElementById("side-menu");
  const overlay = document.getElementById("overlay");

  const darkModeToggle = document.getElementById("darkmode-toggle");
  const darkModeStatus = document.getElementById("darkmode-status");

  
  document.querySelectorAll(".icon-item").forEach(icon => {
    icon.addEventListener("click", () => {
      const key = icon.dataset.content;

      appContent.style.display = "none";
      iconContent.style.display = "block";

      sections.forEach(sec => sec.classList.add("hidden"));
      document.getElementById(key)?.classList.remove("hidden");
    });
  });

  
  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      iconContent.style.display = "none";
      appContent.style.display = "block";
      sections.forEach(sec => sec.classList.add("hidden"));
    });
  });

 
  const closeMenu = () => {
    sideMenu.classList.remove("active");
    overlay.classList.remove("active");
  };

  menuBtn.addEventListener("click", () => {
    sideMenu.classList.add("active");
    overlay.classList.add("active");
  });
  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);

 
  function setupDropdown(itemId, currentId, optionsId, dataAttr) {
    const item = document.getElementById(itemId);
    const current = document.getElementById(currentId);
    const options = document.getElementById(optionsId);

 
    item.addEventListener("click", e => {
      e.stopPropagation();
      options.classList.toggle("active");
    });

 
    options.querySelectorAll("li").forEach(option => {
      option.addEventListener("click", e => {
        e.stopPropagation();
        current.textContent = e.target.getAttribute(dataAttr) + " >";
        options.classList.remove("active");
      });
    });

  
    document.addEventListener("click", () => {
      options.classList.remove("active");
    });
  }

  setupDropdown("language-item", "current-language", "language-options", "data-lang");
  setupDropdown("country-item", "current-country", "country-options", "data-country");

 
  const enableDarkMode = () => {
    document.body.classList.add("dark-mode");
    darkModeStatus.textContent = "ON >";
    localStorage.setItem("dark-mode", "enabled");
  };

  const disableDarkMode = () => {
    document.body.classList.remove("dark-mode");
    darkModeStatus.textContent = "OFF >";
    localStorage.setItem("dark-mode", "disabled");
  };

  // Load saved preference
  if (localStorage.getItem("dark-mode") === "enabled") {
    enableDarkMode();
  } else {
    disableDarkMode();
  }

  
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.contains("dark-mode") ? disableDarkMode() : enableDarkMode();
  });

document.querySelectorAll(".heart-icon").forEach(heart => {
  heart.addEventListener("click", () => {
    const img = heart.querySelector(".heart-img");
    if (img.src.includes("heart.png")) {
      img.src = "heartf.png";  
    } else {
      img.src = "heart.png";  
    }
  });
});

  const profileNameClick = document.getElementById("profileNameClick");
  const userSlideDrawer = document.getElementById("userSlideDrawer");
  const closeUserDrawer = document.getElementById("closeUserDrawer");

  // Open bottom slide panel
  if(profileNameClick && userSlideDrawer){
    profileNameClick.addEventListener("click", (e) => {
      e.stopPropagation();
      userSlideDrawer.classList.add("active");
    });
  }

  // Close bottom slide panel
  if(closeUserDrawer && userSlideDrawer){
    closeUserDrawer.addEventListener("click", (e) => {
      e.stopPropagation();
      userSlideDrawer.classList.remove("active");
    });
  }

  // Optional: clicking outside closes the slider
  document.addEventListener("click", (e) => {
    if(userSlideDrawer && !userSlideDrawer.contains(e.target) && !profileNameClick.contains(e.target)){
      userSlideDrawer.classList.remove("active");
    }
  });
});

