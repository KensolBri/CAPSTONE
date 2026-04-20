document.addEventListener("DOMContentLoaded", () => {
  const AVATAR_PRESETS = [
    {
      id: "avatar-happy",
      label: "Alex",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    },
    {
      id: "avatar-cool",
      label: "Michael",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
    },
    {
      id: "avatar-nerd",
      label: "Alexander",
      imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Alexander",
    },
    {
      id: "avatar-artist",
      label: "Valentina",
      imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Valentina",
    },
    {
      id: "avatar-mentor",
      label: "Kimberly",
      imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Jack",
    },
    {
      id: "avatar-wizard",
      label: "Jack",
      imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Kimberly",
    },
  ];

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

      sections.forEach(sec => {
        sec.classList.add("hidden");
        sec.classList.remove("active");
        sec.style.display = "none";
      });

      const target = document.getElementById(key);
      if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
        target.style.display = "block";
      }

      if (key === "festivities") {
        loadFestivities();
      }
      if (key === "food") {
        initStallsNearYou();
      }
      if (key === "destination") {
        loadLandmarks();
      }
      if (key === "location") {
        initTouristLocationTab();
      }
      if (key === "map" && touristUserCoords) {
        // Re-send user location when Map tab is opened so iframe always receives it.
        setTimeout(() => {
          pushLocationToMapTab(touristUserCoords.lat, touristUserCoords.lng, 30);
        }, 250);
      }
    });
  });

  
  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      iconContent.style.display = "none";
      appContent.style.display = "block";
      sections.forEach(sec => {
        sec.classList.add("hidden");
        sec.classList.remove("active");
        sec.style.display = "none";
      });

      // Close stalls modal if it was open
      const stallDetailModal = document.getElementById("stallDetailModal");
      if (stallDetailModal) {
        stallDetailModal.style.display = "none";
        stallDetailModal.setAttribute("aria-hidden", "true");
      }

      const stallDetailSheet = document.getElementById("stallDetailSheet");
      if (stallDetailSheet) {
        closeStallDetailSheet();
      }

      // Close landmark modal if it was open
      const landmarkDetailModal = document.getElementById("landmarkDetailModal");
      if (landmarkDetailModal) {
        landmarkDetailModal.style.display = "none";
        landmarkDetailModal.setAttribute("aria-hidden", "true");
      }
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

  // Tourist avatar picker (modal, like vendor)
  const avatarImg = document.getElementById("touristAvatarPreview");
  const avatarBtn = document.getElementById("touristAvatarBtn");
  const avatarModal = document.getElementById("touristAvatarModal");
  const avatarModalClose = document.getElementById("touristAvatarModalClose");
  const avatarPresetList = document.getElementById("touristAvatarPresetList");
  const avatarUploadBtn = document.getElementById("touristAvatarUploadBtn");
  const avatarSaveBtn = document.getElementById("touristAvatarSaveBtn");
  const avatarFileInput = document.getElementById("touristAvatarFileInput");
  const profileForm = document.getElementById("touristProfileForm");
  const logoutFromProfileBtn = document.getElementById("logoutFromProfileBtn");
  const addBusinessProfileBtn = document.getElementById("addBusinessProfileBtn");

  let selectedPresetUrl = "";
  let avatarSource = "none"; // preset | upload

  function openAvatarModal() {
    if (!avatarModal) return;
    avatarModal.classList.add("active");
    avatarModal.setAttribute("aria-hidden", "false");
  }

  function closeAvatarModal() {
    if (!avatarModal) return;
    avatarModal.classList.remove("active");
    avatarModal.setAttribute("aria-hidden", "true");
  }

  function buildTouristAvatarPresets() {
    if (!avatarPresetList) return;
    avatarPresetList.innerHTML = "";

    AVATAR_PRESETS.forEach((preset) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "tourist-avatar-preset";
      item.dataset.imageUrl = preset.imageUrl;
      item.innerHTML = `<img src="${preset.imageUrl}" alt="${preset.label}"><span>${preset.label}</span>`;

      item.addEventListener("click", () => {
        avatarSource = "preset";
        selectedPresetUrl = preset.imageUrl;
        if (avatarFileInput) avatarFileInput.value = "";

        avatarPresetList.querySelectorAll(".tourist-avatar-preset").forEach((el) => el.classList.remove("selected"));
        item.classList.add("selected");

        if (avatarImg) avatarImg.src = preset.imageUrl;
      });

      avatarPresetList.appendChild(item);
    });
  }

  if (avatarBtn) {
    avatarBtn.addEventListener("click", openAvatarModal);
  }

  if (avatarModalClose) {
    avatarModalClose.addEventListener("click", closeAvatarModal);
  }

  if (avatarModal) {
    avatarModal.addEventListener("click", (e) => {
      if (e.target === avatarModal) closeAvatarModal();
    });
  }

  if (avatarUploadBtn && avatarFileInput) {
    avatarUploadBtn.addEventListener("click", () => avatarFileInput.click());
  }

  if (avatarFileInput) {
    avatarFileInput.addEventListener("change", () => {
      const file = avatarFileInput.files && avatarFileInput.files[0];
      if (!file) return;

      avatarSource = "upload";
      selectedPresetUrl = "";
      if (avatarPresetList) avatarPresetList.querySelectorAll(".tourist-avatar-preset").forEach((el) => el.classList.remove("selected"));

      const reader = new FileReader();
      reader.onload = (e) => {
        if (avatarImg && e.target && typeof e.target.result === "string") {
          avatarImg.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (avatarSaveBtn) {
    avatarSaveBtn.addEventListener("click", () => {
      const fd = new FormData();
      fd.append("avatar_source", avatarSource);

      if (avatarSource === "preset") {
        fd.append("avatar_preset_url", selectedPresetUrl);
      } else if (avatarSource === "upload" && avatarFileInput && avatarFileInput.files && avatarFileInput.files[0]) {
        fd.append("profile_image", avatarFileInput.files[0]);
      }

      fetch("tourist_update_profile.php", {
        method: "POST",
        body: fd,
      })
        .then((r) => r.json())
        .then((res) => {
          if (res && res.status === "success") {
            if (res.avatar && avatarImg) avatarImg.src = res.avatar;
            closeAvatarModal();
          } else {
            alert((res && res.message) || "Failed to update profile picture.");
          }
        })
        .catch(() => alert("Failed to update profile picture."));
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(profileForm);

      fetch("tourist_update_profile.php", {
        method: "POST",
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "Profile updated.");
        })
        .catch(err => {
          console.error(err);
          alert("Failed to update profile.");
        });
    });
  }

  if (logoutFromProfileBtn) {
    logoutFromProfileBtn.addEventListener("click", () => {
      window.location.href = "logout.php";
    });
  }

  if (addBusinessProfileBtn) {
    addBusinessProfileBtn.addEventListener("click", () => {
      window.location.href = "vendor.php";
    });
  }

  const changeNameBtn = document.getElementById("touristChangeNameBtn");
  const newNameInput = document.getElementById("touristNewName");
  if (changeNameBtn && newNameInput) {
    changeNameBtn.addEventListener("click", () => {
      const newName = newNameInput.value.trim();
      if (!newName) {
        alert("Please enter a new name.");
        return;
      }
      const fd = new FormData();
      fd.append("new_name", newName);
      fetch("tourist_change_name.php", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((res) => {
          if (res && res.status === "success") {
            alert(res.message || "Name updated.");
            const nameText = document.querySelector(".tourist-profile-name-text");
            if (nameText) nameText.textContent = res.fullName;
            const fullNameDisplay = document.getElementById("touristFullNameDisplay");
            if (fullNameDisplay) fullNameDisplay.value = res.fullName;
            newNameInput.value = "";
          } else {
            alert((res && res.message) || "Failed to update name.");
          }
        })
        .catch(() => alert("Failed to update name."));
    });
  }

  const changePasswordBtn = document.getElementById("touristChangePasswordBtn");
  const currentPasswordInput = document.getElementById("touristCurrentPassword");
  const newPasswordInput = document.getElementById("touristNewPassword");
  const confirmPasswordInput = document.getElementById("touristConfirmPassword");
  if (changePasswordBtn && currentPasswordInput && newPasswordInput && confirmPasswordInput) {
    changePasswordBtn.addEventListener("click", () => {
      const current = currentPasswordInput.value;
      const newPwd = newPasswordInput.value;
      const confirm = confirmPasswordInput.value;
      if (!current || !newPwd || !confirm) {
        alert("Please fill in all password fields.");
        return;
      }
      if (newPwd !== confirm) {
        alert("New password and confirm password do not match.");
        return;
      }
      const fd = new FormData();
      fd.append("current_password", current);
      fd.append("new_password", newPwd);
      fd.append("confirm_password", confirm);
      fetch("tourist_change_password.php", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((res) => {
          if (res && res.status === "success") {
            alert(res.message || "Password updated.");
            currentPasswordInput.value = "";
            newPasswordInput.value = "";
            confirmPasswordInput.value = "";
          } else {
            alert((res && res.message) || "Failed to update password.");
          }
        })
        .catch(() => alert("Failed to update password."));
    });
  }

  buildTouristAvatarPresets();

  // Stalls Near You location gate + modal controls
  const stallsLocationBtn = document.getElementById("stallsLocationBtn");
  if (stallsLocationBtn) stallsLocationBtn.style.display = "none";
  const touristLocationBtn = document.getElementById("touristLocationBtn");
  if (touristLocationBtn) {
    touristLocationBtn.style.display = "inline-flex";
    touristLocationBtn.addEventListener("click", () => {
      locateTouristForLocationTab();
    });
  }

  const stallDetailModal = document.getElementById("stallDetailModal");
  const stallDetailClose = document.getElementById("stallDetailModalClose");
  const stallDetailViewOnMapBtn = document.getElementById("stallDetailViewOnMapBtn");
  if (stallDetailClose) {
    stallDetailClose.addEventListener("click", () => {
      if (!stallDetailModal) return;
      stallDetailModal.style.display = "none";
      stallDetailModal.setAttribute("aria-hidden", "true");
    });
  }
  if (stallDetailModal) {
    stallDetailModal.addEventListener("click", (e) => {
      if (e.target === stallDetailModal) {
        stallDetailModal.style.display = "none";
        stallDetailModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  // Sheet close
  const stallDetailSheet = document.getElementById("stallDetailSheet");
  const stallDetailSheetClose = document.getElementById("stallDetailSheetClose");
  const stallDetailSheetViewOnMapBtn = document.getElementById("stallDetailSheetViewOnMapBtn");
  if (stallDetailSheetClose && stallDetailSheet) {
    stallDetailSheetClose.addEventListener("click", () => {
      closeStallDetailSheet();
    });
  }

  if (stallDetailSheet) {
    stallDetailSheet.addEventListener("click", (e) => {
      if (e.target === stallDetailSheet) {
        closeStallDetailSheet();
      }
    });
  }

  // Close sheet when clicking anywhere outside it.
  document.addEventListener("mousedown", (e) => {
    if (!stallDetailSheet || !stallDetailSheet.classList.contains("active")) return;
    if (!stallDetailSheet.contains(e.target)) {
      closeStallDetailSheet();
    }
  });

  if (stallDetailViewOnMapBtn) {
    stallDetailViewOnMapBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      viewCurrentStallOnMap();
    });
  }
  if (stallDetailSheetViewOnMapBtn) {
    stallDetailSheetViewOnMapBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      viewCurrentStallOnMap();
    });
  }

  // Festivities event detail modal
  const eventDetailModal = document.getElementById("eventDetailModal");
  const eventDetailClose = document.getElementById("eventDetailModalClose");
  if (eventDetailClose) {
    eventDetailClose.addEventListener("click", () => {
      if (eventDetailModal) {
        eventDetailModal.style.display = "none";
        eventDetailModal.setAttribute("aria-hidden", "true");
      }
    });
  }
  if (eventDetailModal) {
    eventDetailModal.addEventListener("click", (e) => {
      if (e.target === eventDetailModal) {
        eventDetailModal.style.display = "none";
        eventDetailModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  // Landmark detail modal
  const landmarkDetailModal = document.getElementById("landmarkDetailModal");
  const landmarkDetailClose = document.getElementById("landmarkDetailModalClose");
  if (landmarkDetailClose) {
    landmarkDetailClose.addEventListener("click", () => {
      if (landmarkDetailModal) {
        landmarkDetailModal.style.display = "none";
        landmarkDetailModal.setAttribute("aria-hidden", "true");
      }
    });
  }
  if (landmarkDetailModal) {
    landmarkDetailModal.addEventListener("click", (e) => {
      if (e.target === landmarkDetailModal) {
        landmarkDetailModal.style.display = "none";
        landmarkDetailModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  // One-time location prompt right after welcome popup is dismissed.
  const welcomePopup = document.getElementById("welcomePopup");
  const promptAfterWelcome = () => {
    setTimeout(() => {
      if (!touristSharedLocationPrompted) {
        showTouristLocationPromptCard();
      }
    }, 120);
  };
  if (welcomePopup) {
    welcomePopup.addEventListener("click", promptAfterWelcome, { once: true });
  } else {
    promptAfterWelcome();
  }
});

// ================================
// Tourist LOCATION (Landmarks map + distance cards)
// ================================
let touristLocationInitialized = false;
let touristLocationMap = null;
let touristLocationMarkerCluster = null;
let touristLocationLandmarksById = new Map();
let touristLocationMarkerById = new Map();
let touristUserMarker = null;
let touristUserAccuracyCircle = null;
let touristUserCoords = null;
let touristSelectedLandmarkId = null;
let touristRouteLine = null;
let touristRouteControl = null;
let touristRoutedLandmarkId = null;
let touristRouteWatchId = null;
let touristRouteDestLatLng = null;
let touristRouteMode = "car"; // car | foot (auto-switch)
let touristLastRouteUpdateAt = 0;
let touristLastPosSample = null; // {lat,lng,ts}
let touristLastMileLine = null;
let touristSharedLocationPrompted = false;
let touristSharedLocationEnabled = false;
let touristCurrentStallId = null;
let touristCurrentStallLatLng = null;
let touristLocationPromptCard = null;

function escapeHtml(str) {
  return (str ?? "").toString().replace(/[&<>"']/g, (c) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[c] || c;
  });
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const TOURIST_DEFAULT_PIN_ICON = 'tourism/uploads/userPin.png';

function getTouristAvatarPinIcon() {
  const fullName = (window.touristUserFullName || "").toString();
  const avatarUrl = (window.touristUserAvatarUrl || "").toString();
  const isGuest = !fullName || fullName.trim() === "";
  const useDefaultPin = isGuest || !avatarUrl || avatarUrl.trim() === "";

  // If avatar url is stored as project-relative path (e.g., tourism/uploads/..), keep it as-is from Main.php.
  const imgSrc = useDefaultPin ? TOURIST_DEFAULT_PIN_ICON : avatarUrl.replace(/"/g, "&quot;");
  const avatarHtml = `<img src="${imgSrc}" alt="You"/>`;

  const html = `
    <div class="user-avatar-pin">
      <svg viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 0 C34 0 44 12 44 22 C44 34 22 56 22 56 C22 56 0 34 0 22 C0 12 10 0 22 0 Z"
          fill="#E53935" stroke="#C62828" stroke-width="1"/>
      </svg>
      <div class="pin-avatar">${avatarHtml}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'leaflet-div-icon user-pin-icon',
    iconSize: [44, 56],
    iconAnchor: [22, 56]
  });
}

function buildTouristLandmarkIcon(lm) {
  const label = lm && lm.name ? lm.name : "Landmark";
  const thumb = (lm && lm.image) ? ('tourism/uploads/' + lm.image) : 'circle_icon.png';

  const html =
    '<div class="landmark-pin-wrapper">' +
      '<div class="landmark-pin-label">' + escapeHtml(label) + '</div>' +
      '<div class="landmark-pin">' +
        '<img src="' + thumb + '" alt="' + escapeHtml(label) + '">' +
      '</div>' +
    '</div>';

  return L.divIcon({
    className: "landmark-pin-icon",
    html,
    iconSize: [150, 76],
    iconAnchor: [75, 76]
  });
}

function closeTouristRouteSheet() {
  const backdrop = document.getElementById('touristRouteSheetBackdrop');
  const sheet = document.getElementById('touristRouteSheet');
  if (backdrop) {
    backdrop.style.display = "none";
    backdrop.setAttribute("aria-hidden", "true");
  }
  if (sheet) {
    sheet.style.display = "none";
    sheet.setAttribute("aria-hidden", "true");
  }
  touristSelectedLandmarkId = null;
}

function openTouristRouteSheet(lm) {
  const backdrop = document.getElementById('touristRouteSheetBackdrop');
  const sheet = document.getElementById('touristRouteSheet');
  const title = document.getElementById('touristRouteTitle');
  const goBtn = document.getElementById('touristRouteGoBtn');
  const cancelBtn = document.getElementById('touristRouteCancelBtn');
  if (!sheet || !backdrop) return;

  touristSelectedLandmarkId = Number(lm && lm.id ? lm.id : 0) || null;
  if (title) title.textContent = (lm && lm.name) ? lm.name : "Landmark";

  // Toggle buttons depending on whether this landmark is currently routed.
  const selectedId = touristSelectedLandmarkId;
  const isRouted = !!(selectedId && touristRoutedLandmarkId === selectedId);
  if (goBtn) goBtn.style.display = isRouted ? "none" : "inline-flex";
  if (cancelBtn) cancelBtn.textContent = isRouted ? "Cancel route" : "Cancel";

  backdrop.style.display = "block";
  backdrop.setAttribute("aria-hidden", "false");
  sheet.style.display = "block";
  sheet.setAttribute("aria-hidden", "false");
}

function drawRouteToLandmark(lm) {
  if (!touristLocationMap || !lm) return;
  if (!touristUserCoords) {
    const hint = document.getElementById('touristLocationHint');
    if (hint) hint.textContent = "Turn on location to draw a route.";
    return;
  }

  const lat = Number(lm.lat);
  const lng = Number(lm.lng);
  if (!isFinite(lat) || !isFinite(lng)) return;

  const from = L.latLng(touristUserCoords.lat, touristUserCoords.lng);
  const to = L.latLng(lat, lng);

  // Prefer road routing (Leaflet Routing Machine). Fallback to straight line if missing.
  if (typeof L !== "undefined" && L.Routing && typeof L.Routing.control === "function") {
    // If landmark is near, prefer walking to allow smaller streets/paths.
    const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
    const initialMode = (isFinite(km) && km <= 1.8) ? "foot" : touristRouteMode;
    createOrUpdateTouristRouteControl(from, to, initialMode, true);
  } else {
    // Fallback: straight line
    if (touristRouteLine) {
      try { touristLocationMap.removeLayer(touristRouteLine); } catch (e) {}
      touristRouteLine = null;
    }
    touristRouteLine = L.polyline([from, to], {
      color: "#ff2d7a",
      weight: 5,
      opacity: 0.95
    }).addTo(touristLocationMap);
    touristLocationMap.fitBounds(L.latLngBounds([from, to]), { padding: [30, 30] });
  }

  touristRoutedLandmarkId = Number(lm.id || 0) || null;
  touristRouteDestLatLng = to;
  startTouristRouteRealtimeTracking();
}

function createOrUpdateTouristRouteControl(from, to, mode, fit) {
  if (!touristLocationMap) return;

  // Remove existing control if we need to change router profile
  const wantMode = mode === "foot" ? "foot" : "car";
  const needRecreate = !touristRouteControl || touristRouteMode !== wantMode;

  if (needRecreate) {
    if (touristRouteControl) {
      try { touristLocationMap.removeControl(touristRouteControl); } catch (e) {}
    }

    touristRouteMode = wantMode;

    const router = (L.Routing && L.Routing.osrmv1)
      ? L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: wantMode
        })
      : undefined;

    touristRouteControl = L.Routing.control({
      waypoints: [from, to],
      router,
      // Do not create the default blue waypoint markers
      createMarker: function () { return null; },
      lineOptions: {
        styles: [{ color: "#ff2d7a", weight: 5, opacity: 0.95 }]
      },
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: !!fit,
      show: false
    }).addTo(touristLocationMap);

    // When routing returns, if it can't reach the exact destination,
    // draw a short dashed "last meters" connector (walkway-like).
    try {
      touristRouteControl.off('routesfound');
      touristRouteControl.on('routesfound', function (e) {
        if (!touristLocationMap || !touristRouteDestLatLng) return;

        if (touristLastMileLine) {
          try { touristLocationMap.removeLayer(touristLastMileLine); } catch (err) {}
          touristLastMileLine = null;
        }

        const routes = e && e.routes ? e.routes : [];
        const r0 = routes[0];
        const coords = r0 && r0.coordinates ? r0.coordinates : [];
        if (!coords.length) return;

        const last = coords[coords.length - 1];
        const end = L.latLng(last.lat, last.lng);
        const toLL = touristRouteDestLatLng;
        const kmToPin = haversineKm(end.lat, end.lng, toLL.lat, toLL.lng);

        // If route ends > ~50m away from the pin, connect it visually.
        if (isFinite(kmToPin) && kmToPin > 0.05) {
          touristLastMileLine = L.polyline([end, toLL], {
            color: "#ff2d7a",
            weight: 4,
            opacity: 0.85,
            dashArray: "8 10"
          }).addTo(touristLocationMap);
        }

        // If we're in car mode and can't get close, auto-switch to foot once.
        if (touristRouteMode === "car" && isFinite(kmToPin) && kmToPin > 0.12) {
          createOrUpdateTouristRouteControl(from, toLL, "foot", false);
        }
      });
    } catch (e) {}
  } else {
    // Update waypoints without recreating
    try {
      touristRouteControl.setWaypoints([from, to]);
    } catch (e) {}
  }
}

function estimateMoveSpeedMps(pos) {
  const now = Date.now();
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const gpsSpeed = pos.coords.speed;
  if (typeof gpsSpeed === "number" && isFinite(gpsSpeed) && gpsSpeed >= 0) return gpsSpeed;

  if (!touristLastPosSample) {
    touristLastPosSample = { lat, lng, ts: now };
    return 0;
  }

  const prev = touristLastPosSample;
  const dt = (now - prev.ts) / 1000;
  touristLastPosSample = { lat, lng, ts: now };
  if (!dt || dt <= 0) return 0;

  const km = haversineKm(prev.lat, prev.lng, lat, lng);
  const m = km * 1000;
  return m / dt;
}

function chooseRouteModeFromSpeed(speedMps) {
  // Simple heuristic: under ~2 m/s (~7.2 km/h) is likely walking.
  if (!isFinite(speedMps)) return "car";
  return speedMps <= 2.0 ? "foot" : "car";
}

function startTouristRouteRealtimeTracking() {
  if (!navigator.geolocation) return;
  if (!touristRouteDestLatLng || !touristRoutedLandmarkId) return;
  if (!touristRouteControl && !(typeof L !== "undefined" && L.Routing)) return;

  // Already watching
  if (touristRouteWatchId !== null) return;

  touristRouteWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!touristLocationMap || !touristRouteDestLatLng) return;

      touristUserCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const latlng = L.latLng(touristUserCoords.lat, touristUserCoords.lng);
      updateTouristUserMarker(latlng, pos.coords.accuracy);

      // Throttle reroutes (OSRM rate limit friendly)
      const now = Date.now();
      if (now - touristLastRouteUpdateAt < 1000) return;
      touristLastRouteUpdateAt = now;

      const speedMps = estimateMoveSpeedMps(pos);
      const nextMode = chooseRouteModeFromSpeed(speedMps);

      // Re-route from new position to destination (and recreate if mode changed)
      createOrUpdateTouristRouteControl(latlng, touristRouteDestLatLng, nextMode, false);
    },
    () => {
      // Ignore errors; user may revoke permission mid-route.
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

function cancelTouristRoute() {
  if (touristRouteControl && touristLocationMap) {
    try { touristLocationMap.removeControl(touristRouteControl); } catch (e) {}
  }
  touristRouteControl = null;

  if (touristRouteLine && touristLocationMap) {
    try { touristLocationMap.removeLayer(touristRouteLine); } catch (e) {}
  }
  touristRouteLine = null;
  touristRoutedLandmarkId = null;
  touristRouteDestLatLng = null;

  if (touristLastMileLine && touristLocationMap) {
    try { touristLocationMap.removeLayer(touristLastMileLine); } catch (e) {}
  }
  touristLastMileLine = null;

  if (touristRouteWatchId !== null && navigator.geolocation && navigator.geolocation.clearWatch) {
    try { navigator.geolocation.clearWatch(touristRouteWatchId); } catch (e) {}
  }
  touristRouteWatchId = null;
  touristLastPosSample = null;
}

function renderTouristLocationCards() {
  const container = document.getElementById('touristLocationCards');
  if (!container) return;

  const arr = Array.from(touristLocationLandmarksById.values());
  if (!arr.length) {
    container.innerHTML = '<div class="tourist-location-empty">No landmarks yet.</div>';
    return;
  }

  arr.forEach((lm) => {
    const lat = Number(lm.lat);
    const lng = Number(lm.lng);
    lm._distanceKm = (touristUserCoords && isFinite(lat) && isFinite(lng))
      ? haversineKm(touristUserCoords.lat, touristUserCoords.lng, lat, lng)
      : Number.POSITIVE_INFINITY;
  });

  arr.sort((a, b) => (a._distanceKm || 0) - (b._distanceKm || 0));
  container.innerHTML = "";

  arr.forEach((lm) => {
    const id = Number(lm.id || 0);
    if (!id) return;

    const distTxt = (touristUserCoords && isFinite(lm._distanceKm))
      ? `${lm._distanceKm.toFixed(1)} km away`
      : "Turn on location to see distance";

    const thumb = lm.image ? `tourism/uploads/${lm.image}` : "dagyang.jpg";
    const card = document.createElement('div');
    card.className = 'tourist-location-card';
    card.dataset.landmarkId = String(id);
    card.innerHTML = `
      <img class="tourist-location-thumb" src="${thumb}" alt="${escapeHtml(lm.name || 'Landmark')}" onerror="this.src='dagyang.jpg'"/>
      <div class="tourist-location-meta">
        <div class="tourist-location-name">${escapeHtml(lm.name || "Landmark")}</div>
        <div class="tourist-location-address">${escapeHtml(lm.address || "")}</div>
        <div class="tourist-location-distance">${escapeHtml(distTxt)}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      const marker = touristLocationMarkerById.get(id);
      const lat = Number(lm.lat);
      const lng = Number(lm.lng);
      if (marker && isFinite(lat) && isFinite(lng)) {
        touristLocationMap.setView([lat, lng], Math.max(touristLocationMap.getZoom(), 17), { animate: true });
      }
      openTouristRouteSheet(lm);
    });

    container.appendChild(card);
  });
}

function loadTouristLocationLandmarks() {
  if (!touristLocationMarkerCluster) return;
  touristLocationMarkerCluster.clearLayers();
  touristLocationLandmarksById.clear();
  touristLocationMarkerById.clear();

  fetch('tourism/php/get_landmarks.php', { credentials: "same-origin" })
    .then(async (r) => {
      if (!r.ok) throw new Error("Failed to load landmarks");
      const txt = await r.text();
      try { return JSON.parse(txt); } catch (_) { return []; }
    })
    .then((data) => {
      const list = Array.isArray(data) ? data : [];
      list.forEach((lm) => {
        const category = String((lm && lm.category) || '').trim().toLowerCase();
        if (!lm || category !== 'landmark') return;
        const id = Number(lm.id || 0);
        const lat = Number(lm.lat);
        const lng = Number(lm.lng);
        if (!id || !isFinite(lat) || !isFinite(lng)) return;

        touristLocationLandmarksById.set(id, lm);
        const icon = buildTouristLandmarkIcon(lm);
        const m = L.marker([lat, lng], { icon });
        // Do NOT show landmark details on click; only open route sheet and focus pin
        m.on('click', () => {
          closeTouristRouteSheet(); // reset any previous sheet/route state
          touristLocationMap.setView([lat, lng], Math.max(touristLocationMap.getZoom(), 17), { animate: true });
          openTouristRouteSheet(lm);
        });
        touristLocationMarkerCluster.addLayer(m);
        touristLocationMarkerById.set(id, m);
      });

      renderTouristLocationCards();
    })
    .catch(() => {
      const container = document.getElementById('touristLocationCards');
      if (container) container.innerHTML = '<div class="tourist-location-empty">Could not load landmarks.</div>';
    });
}

function updateTouristUserMarker(latlng, accuracy) {
  if (touristUserMarker) {
    touristUserMarker.setLatLng(latlng);
    touristUserMarker.setIcon(getTouristAvatarPinIcon());
  } else {
    touristUserMarker = L.marker(latlng, { icon: getTouristAvatarPinIcon() })
      .addTo(touristLocationMap)
      .bindPopup("You are here");
  }

  if (touristUserAccuracyCircle) {
    touristUserAccuracyCircle.setLatLng(latlng).setRadius(accuracy || 30);
  } else {
    touristUserAccuracyCircle = L.circle(latlng, { radius: accuracy || 30 }).addTo(touristLocationMap);
  }
}

function pushLocationToMapTab(lat, lng, accuracy) {
  const frame = document.querySelector('iframe[src*="tourism/map.php"]');
  if (!frame) return;

  const payload = {
    type: "tourist-location-update",
    lat: Number(lat),
    lng: Number(lng),
    accuracy: Number(accuracy || 30)
  };

  const send = () => {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage(payload, "*");
  };

  send();
  // If iframe was not ready yet when first sent, send again after load.
  frame.addEventListener("load", send, { once: true });
}

function requestTouristSharedLocation(hintText) {
  touristSharedLocationPrompted = true;
  const hint = document.getElementById('touristLocationHint');
  if (hintText && hint) hint.textContent = hintText;
  if (!navigator.geolocation) {
    if (hint) hint.textContent = "Location is not supported by your browser.";
    return Promise.reject(new Error("Geolocation not supported"));
  }
  if (hint) hint.textContent = "Getting your location...";
  return new Promise((resolve, reject) => {
    const onSuccess = async (pos) => {
      touristSharedLocationEnabled = true;
      touristUserCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const latlng = L.latLng(touristUserCoords.lat, touristUserCoords.lng);
      if (touristLocationMap) {
        updateTouristUserMarker(latlng, pos.coords.accuracy);
      }
      pushLocationToMapTab(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);

      try {
        await loadAndRenderStalls(touristUserCoords);
        const gate = document.getElementById("stallsLocationGate");
        const contentWrap = document.getElementById("stallsContent");
        const loadingEl = document.getElementById("stallsLoading");
        if (gate) gate.classList.add("hidden");
        if (loadingEl) loadingEl.classList.add("hidden");
        if (contentWrap) contentWrap.classList.remove("hidden");
      } catch (e) {}

      if (hint) hint.textContent = "Showing distances from your current location.";
      renderTouristLocationCards();
      resolve(touristUserCoords);
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        // Retry with relaxed settings for mobile devices that time out on strict GPS requests.
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (err2) => {
            const msg = (err2 && err2.message) ? err2.message : "Please allow location and turn on GPS.";
            if (hint) hint.textContent = "Location failed: " + msg;
            reject(new Error(msg));
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  });
}

function ensureTouristLocationPromptCard() {
  if (touristLocationPromptCard) return touristLocationPromptCard;
  const overlay = document.createElement("div");
  overlay.id = "touristLocationPromptCard";
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "background:rgba(0,0,0,0.35)",
    "display:none",
    "align-items:center",
    "justify-content:center",
    "z-index:10050"
  ].join(";");

  const card = document.createElement("div");
  card.style.cssText = [
    "width:min(360px, calc(100vw - 24px))",
    "background:#fff",
    "border-radius:16px",
    "padding:16px 14px 14px",
    "box-shadow:0 18px 50px rgba(0,0,0,0.25)"
  ].join(";");
  card.innerHTML = `
    <div style="font-weight:900;font-size:16px;color:#111;">Please turn on your location</div>
    <div style="margin-top:8px;font-size:13px;font-weight:700;color:#555;">
      We will use it once to show your location in Map, Location, and Stalls.
    </div>
    <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
      <button type="button" id="touristLocationPromptLater" style="border:0;background:#eee;color:#333;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;">Later</button>
      <button type="button" id="touristLocationPromptEnable" style="border:0;background:#111;color:#fff;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer;">Turn on location</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const btnEnable = card.querySelector("#touristLocationPromptEnable");
  const btnLater = card.querySelector("#touristLocationPromptLater");
  if (btnEnable) {
    btnEnable.addEventListener("click", async () => {
      try {
        await requestTouristSharedLocation("Please turn on your location.");
        overlay.style.display = "none";
      } catch (e) {
        const hint = document.getElementById("touristLocationHint");
        if (hint) hint.textContent = (e && e.message) ? e.message : "Location failed. Please enable GPS.";
      }
    });
  }
  if (btnLater) {
    btnLater.addEventListener("click", () => {
      overlay.style.display = "none";
      const hint = document.getElementById("touristLocationHint");
      if (hint && !touristSharedLocationEnabled) hint.textContent = "Please turn on your location.";
    });
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });

  touristLocationPromptCard = overlay;
  return overlay;
}

function showTouristLocationPromptCard() {
  const card = ensureTouristLocationPromptCard();
  card.style.display = "flex";
}

function locateTouristForLocationTab() {
  requestTouristSharedLocation("Please turn on your location.");
}

function ensureTouristLocationCoords() {
  return new Promise((resolve, reject) => {
    if (touristUserCoords && isFinite(touristUserCoords.lat) && isFinite(touristUserCoords.lng)) {
      resolve(touristUserCoords);
      return;
    }
    requestTouristSharedLocation("Please turn on your location.").then(resolve).catch(reject);
  });
}

function initTouristLocationTab() {
  const mapEl = document.getElementById('touristLocationMap');
  if (!mapEl) return;

  // Initialize only once (Leaflet cannot re-init on the same element)
  if (!touristLocationInitialized) {
    touristLocationInitialized = true;

    touristLocationMap = L.map('touristLocationMap', {
      zoomControl: true,
      maxZoom: 25
    }).setView([10.7202, 122.5621], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxNativeZoom: 19,
      maxZoom: 25
    }).addTo(touristLocationMap);

    touristLocationMarkerCluster = new L.MarkerClusterGroup().addTo(touristLocationMap);

    // Bind route sheet buttons + close behavior
    const backdrop = document.getElementById('touristRouteSheetBackdrop');
    const sheet = document.getElementById('touristRouteSheet');
    if (backdrop) backdrop.addEventListener('click', closeTouristRouteSheet);
    if (sheet) {
      sheet.addEventListener('click', (e) => e.stopPropagation());
    }

    const goBtn = document.getElementById('touristRouteGoBtn');
    if (goBtn) {
      goBtn.addEventListener('click', async () => {
        if (!touristSelectedLandmarkId) return;
        const lm = touristLocationLandmarksById.get(touristSelectedLandmarkId);
        if (!lm) return;

        try {
          await ensureTouristLocationCoords();
        } catch (e) {
          const hint = document.getElementById('touristLocationHint');
          if (hint) hint.textContent = "Please allow location access to draw a route.";
          return;
        }

        drawRouteToLandmark(lm);
        // After clicking Go to: close sheet but KEEP route
        closeTouristRouteSheet();
      });
    }

    const cancelBtn = document.getElementById('touristRouteCancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        // Cancel just closes sheet if no route; if routed, remove route then close
        if (touristSelectedLandmarkId && touristRoutedLandmarkId === touristSelectedLandmarkId) {
          cancelTouristRoute();
        }
        closeTouristRouteSheet();
      });
    }

    // Click anywhere on the map (outside markers) closes the sheet (route stays).
    touristLocationMap.on('click', () => closeTouristRouteSheet());

    loadTouristLocationLandmarks();
  }

  // When tab becomes visible, Leaflet needs a resize pass.
  setTimeout(() => {
    try {
      touristLocationMap.invalidateSize();
      if (touristUserCoords && isFinite(touristUserCoords.lat) && isFinite(touristUserCoords.lng)) {
        const ll = L.latLng(touristUserCoords.lat, touristUserCoords.lng);
        updateTouristUserMarker(ll, 30);
        touristLocationMap.setView(ll, Math.max(touristLocationMap.getZoom(), 17), { animate: true });
        renderTouristLocationCards();
      }
    } catch (e) {}
  }, 80);

  if (!touristSharedLocationEnabled) {
    const hint = document.getElementById('touristLocationHint');
    if (hint) hint.textContent = "Please turn on your location.";
  }
}

function loadFestivities() {
  const listEl = document.getElementById("festivitiesList");
  if (!listEl) return;
  listEl.innerHTML = '<div class="festivities-loading">Loading events...</div>';

  fetch("tourism/php/get_events.php")
    .then((r) => r.json())
    .then((events) => {
      if (!events || events.length === 0) {
        listEl.innerHTML = '<p class="festivities-empty">No events at the moment. Check back later!</p>';
        return;
      }
      listEl.innerHTML = "";
      events.forEach((ev) => {
        const card = document.createElement("div");
        card.className = "event-card";
        card.dataset.id = ev.id;
        card.dataset.name = ev.event_name || "";
        card.dataset.start = ev.start_date || "";
        card.dataset.end = ev.end_date || "";
        card.dataset.location = ev.location || "";
        card.dataset.image = ev.event_image_display || "";
        card.dataset.plan = ev.event_plan || "";

        const img = ev.event_image_display
          ? ev.event_image_display
          : "dagyang.jpg";
        const dateStr = ev.start_date && ev.end_date
          ? "Start date: " + formatEventDateRange(ev.start_date, ev.end_date)
          : ev.start_date
            ? "Start date: " + formatEventDate(ev.start_date)
            : "";

        const avgRating = parseFloat(ev.avg_rating) || 0;
        const ratingsCount = parseInt(ev.ratings_count, 10) || 0;
        const isFav = !!(ev.is_favorite && ev.is_favorite !== "0");
        const myRating = parseInt(ev.my_rating, 10) || 0;

        /* Same layout as vendor Events: inner clips image/gradient; review buttons sit on top (sibling) so they stay visible */
        card.innerHTML =
          '<div class="event-card-inner">' +
          '<img src="' + img + '" alt="' + (ev.event_name || "Event") + '" class="event-img" onerror="this.src=\'dagyang.jpg\'" />' +
          '<div class="event-card-top-left">' +
          '<button type="button" class="event-card-fav-btn' + (isFav ? " active" : "") + '" data-event-id="' + ev.id + '" title="Favorite">❤</button>' +
          '<div class="event-card-stars" data-event-id="' + ev.id + '">' +
          [1, 2, 3, 4, 5].map((r) => '<span class="event-card-star' + (myRating >= r ? " filled" : "") + '" data-rating="' + r + '">★</span>').join("") +
          "</div>" +
          "</div>" +
          '<div class="event-card-top-right">' +
          '<span class="event-card-avg">' + (avgRating > 0 ? avgRating.toFixed(1) : "-") + "</span> ★ (" + ratingsCount + ")" +
          "</div>" +
          '<div class="event-info">' +
          "<h3>" + (ev.event_name || "Event") + "</h3>" +
          (dateStr ? "<p>" + dateStr + "</p>" : "") +
          "<p>" + (ev.location || "") + " ></p>" +
          "</div>" +
          "</div>" +
          '<div class="event-card-bottom-right">' +
          '<button type="button" class="event-card-review-btn" data-action="leave" data-event-id="' + ev.id + '">Leave a review</button>' +
          '<button type="button" class="event-card-review-btn" data-action="view" data-event-id="' + ev.id + '">View reviews</button>' +
          "</div>";

        card.addEventListener("click", (e) => {
          if (e.target.closest(".event-card-fav-btn, .event-card-star, .event-card-review-btn")) return;
          openEventDetailModal(ev);
        });
        bindEventCardButtons(card, ev);
        listEl.appendChild(card);
      });
    })
    .catch(() => {
      listEl.innerHTML =
        '<p class="festivities-empty">Could not load events. Please try again.</p>';
    });
}

// ================================
// Landmark cards (Tourist "Destination" tab)
// ================================
function truncateLandmarkDescription(text) {
  const t = (text ?? "").toString().replace(/\s+/g, " ").trim();
  if (!t) return "";
  // First 2 sentences (fallback to max length)
  const sentences = t.split(/(?<=[.!?])\s+/);
  const first = sentences.slice(0, 2).join(" ");
  if (sentences.length > 2) return first + "...";
  if (first.length > 160) return first.substring(0, 160).trim() + "...";
  return first;
}

function loadLandmarks() {
  const listEl = document.getElementById("landmarksList");
  if (!listEl) return;
  listEl.innerHTML = '<div class="festivities-loading">Loading landmarks...</div>';

  fetch("tourism/php/get_landmark_cards.php", { credentials: "same-origin" })
    .then(async (r) => {
      if (!r.ok) throw new Error("Failed to load landmark cards");
      const txt = await r.text();
      try { return JSON.parse(txt); } catch (_) { return []; }
    })
    .then((landmarks) => {
      if (!landmarks || landmarks.length === 0) {
        listEl.innerHTML = '<p class="festivities-empty">No landmarks yet.</p>';
        return;
      }

      listEl.innerHTML = "";
      landmarks.forEach((lm) => {
        const card = document.createElement("div");
        card.className = "landmark-card";
        card.dataset.landmarkId = lm.id;

        const img = lm.image_display || "dagyang.jpg";
        const address = lm.address || "";
        const shortDesc = truncateLandmarkDescription(lm.description || "");

        const avgRating = parseFloat(lm.avg_rating) || 0;
        const ratingsCount = parseInt(lm.ratings_count, 10) || 0;
        const isFav = !!(lm.is_favorite && lm.is_favorite !== "0");
        const myRating = parseInt(lm.my_rating, 10) || 0;

        card.innerHTML =
          '<img class="landmark-card-img" src="' + img + '" alt="' + escapeHtml(lm.name || "Landmark") + '" onerror="this.src=\'dagyang.jpg\'" />' +
          '<div class="landmark-card-body">' +
            '<div class="landmark-card-title">' + escapeHtml(lm.name || "Landmark") + '</div>' +
            '<div class="landmark-card-address">' + escapeHtml(address) + '</div>' +
            '<div class="landmark-card-desc">' + escapeHtml(shortDesc) + '</div>' +
            '<div class="landmark-card-meta">' +
              '<div class="landmark-card-rating">' +
                '<span class="landmark-card-avg">' + (avgRating > 0 ? avgRating.toFixed(1) : "-") + '</span> ★ ' +
                '<span class="landmark-card-count">(' + ratingsCount + ')</span>' +
              '</div>' +
              '<button type="button" class="landmark-card-fav-btn' + (isFav ? " active" : "") + '" title="Favorite">❤</button>' +
            '</div>' +
            '<div class="landmark-card-stars" aria-label="Rate landmark">' +
              [1,2,3,4,5].map((r) => '<button type="button" class="landmark-star' + (myRating >= r ? " filled" : "") + '" data-rating="' + r + '" aria-label="Rate ' + r + '">★</button>').join("") +
            '</div>' +
            '<div class="landmark-card-actions">' +
              '<button type="button" class="landmark-card-action-btn" data-action="leave">Leave a review</button>' +
              '<button type="button" class="landmark-card-action-btn" data-action="view">View reviews</button>' +
            '</div>' +
          '</div>';

        card.addEventListener("click", (e) => {
          if (e.target.closest(".landmark-card-fav-btn, .landmark-star, .landmark-card-action-btn")) return;
          openLandmarkDetailModal(lm);
        });

        bindLandmarkCardButtons(card, lm);
        listEl.appendChild(card);
      });
    })
    .catch(() => {
      listEl.innerHTML = '<p class="festivities-empty">Could not load landmarks.</p>';
    });
}

function bindLandmarkCardButtons(card, lm) {
  const favBtn = card.querySelector(".landmark-card-fav-btn");
  if (favBtn) {
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLandmarkFavorite(lm.id, favBtn, () => loadLandmarks());
    });
  }

  card.querySelectorAll(".landmark-star").forEach((star) => {
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      const r = parseInt(star.dataset.rating, 10);
      if (!r) return;
      rateLandmark(lm.id, r, () => loadLandmarks());
    });
  });

  card.querySelectorAll(".landmark-card-action-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.dataset.action === "leave") {
        openLandmarkDetailModal(lm);
        setTimeout(() => {
          const leaveSec = document.getElementById("landmarkDetailLeaveReviewSection");
          const reviewsSec = document.getElementById("landmarkDetailReviewsSection");
          const txt = document.getElementById("landmarkDetailReviewText");
          if (leaveSec) leaveSec.style.display = "block";
          if (reviewsSec) reviewsSec.style.display = "none";
          if (txt) txt.focus();
          const viewBtn = document.getElementById("landmarkDetailViewReviewsBtn");
          if (viewBtn) viewBtn.textContent = "View reviews";
        }, 100);
      } else {
        openLandmarkDetailModal(lm);
        setTimeout(() => {
          const leaveSec = document.getElementById("landmarkDetailLeaveReviewSection");
          const reviewsSec = document.getElementById("landmarkDetailReviewsSection");
          const viewBtn = document.getElementById("landmarkDetailViewReviewsBtn");
          if (leaveSec) leaveSec.style.display = "none";
          if (reviewsSec) reviewsSec.style.display = "block";
          if (viewBtn) viewBtn.textContent = "Hide reviews";
          loadLandmarkReviews(lm.id);
        }, 100);
      }
    });
  });
}

function toggleLandmarkFavorite(landmarkId, btnEl, onDone) {
  const fd = new FormData();
  fd.append("landmark_id", landmarkId);
  fetch("tourism/php/toggle_landmark_favorite.php", { method: "POST", body: fd, credentials: "same-origin" })
    .then((r) => r.json())
    .then((res) => {
      if (res && res.status === "success") {
        btnEl.classList.toggle("active", res.favorite === "added");
        if (onDone) onDone();
      } else {
        alert((res && res.message) || "Please log in to favorite.");
      }
    })
    .catch(() => alert("Error toggling favorite."));
}

function rateLandmark(landmarkId, rating, onDone) {
  const fd = new FormData();
  fd.append("landmark_id", landmarkId);
  fd.append("rating", rating);
  fetch("tourism/php/rate_landmark.php", { method: "POST", body: fd, credentials: "same-origin" })
    .then((r) => r.json())
    .then((res) => {
      if (res && res.status === "success") {
        if (onDone) onDone(res);
      } else {
        alert((res && res.message) || "Please log in to rate.");
      }
    })
    .catch(() => alert("Error saving rating."));
}

let currentLandmarkInModal = null;

function openLandmarkDetailModal(lm) {
  currentLandmarkInModal = lm;

  const modal = document.getElementById("landmarkDetailModal");
  const title = document.getElementById("landmarkDetailTitle");
  const addressEl = document.getElementById("landmarkDetailAddress");
  const descEl = document.getElementById("landmarkDetailDescription");
  const imgEl = document.getElementById("landmarkDetailImage");
  const galleryEl = document.getElementById("landmarkDetailGallery");
  const favBtn = document.getElementById("landmarkDetailFavBtn");
  const starsEl = document.getElementById("landmarkDetailStars");
  const ratingsSummary = document.getElementById("landmarkDetailRatingsSummary");
  const reviewsSection = document.getElementById("landmarkDetailReviewsSection");
  const leaveSection = document.getElementById("landmarkDetailLeaveReviewSection");

  const leaveBtn = document.getElementById("landmarkDetailLeaveReviewBtn");
  const viewBtn = document.getElementById("landmarkDetailViewReviewsBtn");

  if (!modal) return;

  if (title) title.textContent = lm.name || "Landmark";
  if (addressEl) addressEl.textContent = lm.address || "";
  if (descEl) descEl.textContent = lm.description || "";

  if (imgEl) {
    const src = lm.image_display || "dagyang.jpg";
    imgEl.src = src;
    imgEl.style.display = src ? "block" : "none";
  }

  // Landmark gallery (optional multiple pictures)
  if (galleryEl) {
    const pics = Array.isArray(lm.landmark_images_display) ? lm.landmark_images_display : [];
    if (pics.length) {
      galleryEl.innerHTML = pics
        .map((url) => '<img class="landmark-gallery-img" src="' + url + '" alt="Landmark photo" />')
        .join("");
      galleryEl.style.display = "flex";
    } else {
      galleryEl.innerHTML = "";
      galleryEl.style.display = "none";
    }
  }

  // Favorite
  if (favBtn) {
    favBtn.classList.toggle("active", !!(lm.is_favorite && lm.is_favorite !== "0"));
    favBtn.onclick = () => {
      toggleLandmarkFavorite(lm.id, favBtn, () => {
        if (currentLandmarkInModal) currentLandmarkInModal.is_favorite = favBtn.classList.contains("active") ? 1 : 0;
      });
    };
  }

  // Stars
  if (starsEl) {
    const myRating = parseInt(lm.my_rating, 10) || 0;
    starsEl.querySelectorAll(".event-rating-star").forEach((s) => {
      s.classList.toggle("filled", parseInt(s.dataset.rating, 10) <= myRating);
      s.onclick = () => {
        const r = parseInt(s.dataset.rating, 10);
        if (!r) return;
        // Update rating via endpoint, then reload cards/reviews
        rateLandmark(lm.id, r, (res) => {
          starsEl.querySelectorAll(".event-rating-star").forEach((ss) => {
            ss.classList.toggle("filled", parseInt(ss.dataset.rating, 10) <= r);
          });

          if (ratingsSummary && res) {
            const avgSpan = ratingsSummary.querySelector(".event-avg-rating");
            const countSpan = ratingsSummary.querySelector(".event-ratings-count");
            const avg = parseFloat(res.avg_rating) || 0;
            const cnt = parseInt(res.ratings_count, 10) || 0;
            if (avgSpan) avgSpan.textContent = avg > 0 ? avg.toFixed(1) : "-";
            if (countSpan) countSpan.textContent = "(" + cnt + " ratings)";
          }
        });
      };
    });
  }

  const avgRating = parseFloat(lm.avg_rating) || 0;
  const ratingsCount = parseInt(lm.ratings_count, 10) || 0;
  if (ratingsSummary) {
    const avgSpan = ratingsSummary.querySelector(".event-avg-rating");
    const countSpan = ratingsSummary.querySelector(".event-ratings-count");
    if (avgSpan) avgSpan.textContent = avgRating > 0 ? avgRating.toFixed(1) : "-";
    if (countSpan) countSpan.textContent = "(" + ratingsCount + " ratings)";
  }

  if (reviewsSection) reviewsSection.style.display = "none";
  if (leaveSection) leaveSection.style.display = "none";

  if (leaveBtn) {
    leaveBtn.onclick = () => {
      if (reviewsSection) reviewsSection.style.display = "none";
      if (leaveSection) leaveSection.style.display = "block";
      const txt = document.getElementById("landmarkDetailReviewText");
      if (txt) txt.value = "";
      if (viewBtn) viewBtn.textContent = "View reviews";
    };
  }

  if (viewBtn) {
    viewBtn.onclick = () => {
      if (reviewsSection && reviewsSection.style.display === "block") {
        reviewsSection.style.display = "none";
        viewBtn.textContent = "View reviews";
        return;
      }
      if (leaveSection) leaveSection.style.display = "none";
      loadLandmarkReviews(lm.id);
      if (reviewsSection) reviewsSection.style.display = "block";
      viewBtn.textContent = "Hide reviews";
    };
  }

  const submitBtn = document.getElementById("landmarkDetailSubmitReviewBtn");
  const reviewText = document.getElementById("landmarkDetailReviewText");
  if (submitBtn && reviewText) {
    submitBtn.onclick = () => {
      const text = reviewText.value.trim();
      if (!text) {
        alert("Please enter your review.");
        return;
      }
      const fd = new FormData();
      fd.append("landmark_id", lm.id);
      fd.append("review_text", text);
      fetch("tourism/php/add_landmark_review.php", { method: "POST", body: fd, credentials: "same-origin" })
        .then((r) => r.json())
        .then((res) => {
          if (res && res.status === "success") {
            alert("Review submitted!");
            reviewText.value = "";
            if (leaveSection) leaveSection.style.display = "none";
            loadLandmarkReviews(lm.id);
            if (reviewsSection) reviewsSection.style.display = "block";
            if (viewBtn) viewBtn.textContent = "Hide reviews";
          } else {
            alert((res && res.message) || "Please log in to leave a review.");
          }
        })
        .catch(() => alert("Failed to submit review."));
    };
  }

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function loadLandmarkReviews(landmarkId) {
  const listEl = document.getElementById("landmarkDetailReviewsList");
  if (!listEl) return;
  listEl.innerHTML = '<p class="event-reviews-loading">Loading...</p>';

  fetch("tourism/php/get_landmark_reviews.php?landmark_id=" + landmarkId)
    .then((r) => r.json())
    .then((reviews) => {
      if (!reviews || reviews.length === 0) {
        listEl.innerHTML = "<p class=\"event-reviews-empty\">No reviews yet.</p>";
        return;
      }
      listEl.innerHTML = reviews
        .map((r) => {
          const avatarUrl = r.reviewer_avatar && r.reviewer_avatar.trim() ? r.reviewer_avatar : "tourism/uploads/userPin.png";
          const avatar = '<img src="' + avatarUrl + '" alt="" class="event-reviewer-avatar" onerror="this.src=\'tourism/uploads/userPin.png\'" />';
          const safeText = (r.review_text || "").replace(/</g, "&lt;");
          return (
            '<div class="event-review-item">' +
            avatar +
            '<div class="event-review-content">' +
            "<strong>" +
            (r.reviewer_name || "User") +
            '</strong> <span class="event-review-date">' +
            (r.created_at || "") +
            '</span><p>' +
            safeText +
            "</p></div></div>"
          );
        })
        .join("");
    })
    .catch(() => {
      listEl.innerHTML = "<p class=\"event-reviews-empty\">Could not load reviews.</p>";
    });
}

function formatEventDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months[d.getMonth()] + " " + d.getDate();
}

function formatEventDateRange(startStr, endStr) {
  if (!startStr) return formatEventDate(endStr) || "";
  if (!endStr) return formatEventDate(startStr) || "";
  const s = new Date(startStr);
  const e = new Date(endStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return months[s.getMonth()] + " " + s.getDate() + "\u2013" + e.getDate();
  }
  return formatEventDate(startStr) + " \u2013 " + formatEventDate(endStr);
}

function bindEventCardButtons(card, ev) {
  const favBtn = card.querySelector(".event-card-fav-btn");
  if (favBtn) {
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleEventFavorite(ev.id, favBtn, () => loadFestivities());
    });
  }
  card.querySelectorAll(".event-card-star").forEach((star) => {
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      const r = parseInt(star.dataset.rating, 10);
      if (!r) return;
      rateEvent(ev.id, r, card, () => loadFestivities());
    });
  });
  card.querySelectorAll(".event-card-review-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.dataset.action === "leave") {
        openEventDetailModal(ev);
        setTimeout(() => {
          document.getElementById("eventDetailLeaveReviewSection").style.display = "block";
          document.getElementById("eventDetailReviewsSection").style.display = "none";
          document.getElementById("eventDetailReviewText").focus();
        }, 100);
      } else {
        openEventDetailModal(ev);
        setTimeout(() => {
          const leaveSec = document.getElementById("eventDetailLeaveReviewSection");
          const reviewsSec = document.getElementById("eventDetailReviewsSection");
          const viewBtn = document.getElementById("eventDetailViewReviewsBtn");
          if (leaveSec) leaveSec.style.display = "none";
          if (reviewsSec) reviewsSec.style.display = "block";
          if (viewBtn) viewBtn.textContent = "Hide reviews";
          loadEventReviews(ev.id);
        }, 100);
      }
    });
  });
}

function toggleEventFavorite(eventId, btnEl, onDone) {
  const fd = new FormData();
  fd.append("item_type", "event");
  fd.append("item_id", eventId);
  fetch("tourism/php/toggle_favorite.php", { method: "POST", body: fd, credentials: "same-origin" })
    .then((r) => r.json())
    .then((res) => {
      if (res && res.status === "success") {
        btnEl.classList.toggle("active", res.favorite === "added");
        if (onDone) onDone();
      } else {
        alert((res && res.message) || "Please log in to favorite.");
      }
    })
    .catch(() => alert("Error toggling favorite."));
}

function rateEvent(eventId, rating, cardEl, onDone) {
  const fd = new FormData();
  fd.append("item_type", "event");
  fd.append("item_id", eventId);
  fd.append("rating", rating);
  fetch("tourism/php/rate_item.php", { method: "POST", body: fd, credentials: "same-origin" })
    .then((r) => r.json())
    .then((res) => {
      if (res && res.status === "success") {
        if (onDone) onDone();
      } else {
        alert((res && res.message) || "Please log in to rate.");
      }
    })
    .catch(() => alert("Error saving rating."));
}

let currentEventInModal = null;

function openEventDetailModal(ev) {
  currentEventInModal = ev;
  const modal = document.getElementById("eventDetailModal");
  const title = document.getElementById("eventDetailTitle");
  const dateEl = document.getElementById("eventDetailDate");
  const locEl = document.getElementById("eventDetailLocation");
  const planWrap = document.getElementById("eventDetailPlanWrap");
  const planImg = document.getElementById("eventDetailPlanImg");
  const favBtn = document.getElementById("eventDetailFavBtn");
  const starsEl = document.getElementById("eventDetailStars");
  const ratingsSummary = document.getElementById("eventDetailRatingsSummary");
  const reviewsSection = document.getElementById("eventDetailReviewsSection");
  const leaveSection = document.getElementById("eventDetailLeaveReviewSection");

  if (!modal) return;
  if (title) title.textContent = ev.event_name || "Event";
  if (dateEl) {
    const start = ev.start_date ? formatEventDate(ev.start_date) : "";
    const end = ev.end_date ? formatEventDate(ev.end_date) : "";
    dateEl.textContent = start && end ? `${start} – ${end}` : start || end || "";
  }
  if (locEl) locEl.textContent = ev.location || "";

  if (ev.event_plan && planImg && planWrap) {
    planImg.src = ev.event_plan;
    planWrap.style.display = "block";
    planImg.classList.remove("zoomed");
  } else if (planWrap) {
    planWrap.style.display = "none";
  }

  if (favBtn) {
    favBtn.classList.toggle("active", !!(ev.is_favorite && ev.is_favorite !== "0"));
    favBtn.onclick = () => {
      toggleEventFavorite(ev.id, favBtn, () => {
        if (currentEventInModal) currentEventInModal.is_favorite = favBtn.classList.contains("active") ? 1 : 0;
      });
    };
  }
  if (starsEl) {
    const myRating = parseInt(ev.my_rating, 10) || 0;
    starsEl.querySelectorAll(".event-rating-star").forEach((s) => {
      s.classList.toggle("filled", parseInt(s.dataset.rating, 10) <= myRating);
      s.onclick = () => {
        const r = parseInt(s.dataset.rating, 10);
        if (!r) return;
        rateEvent(ev.id, r, null, () => {
          starsEl.querySelectorAll(".event-rating-star").forEach((ss) =>
            ss.classList.toggle("filled", parseInt(ss.dataset.rating, 10) <= r)
          );
          const avgSpan = ratingsSummary && ratingsSummary.querySelector(".event-avg-rating");
          if (avgSpan) avgSpan.textContent = r.toFixed(1);
        });
      };
    });
  }
  const avgRating = parseFloat(ev.avg_rating) || 0;
  const ratingsCount = parseInt(ev.ratings_count, 10) || 0;
  if (ratingsSummary) {
    ratingsSummary.querySelector(".event-avg-rating").textContent = avgRating > 0 ? avgRating.toFixed(1) : "-";
    ratingsSummary.querySelector(".event-ratings-count").textContent = "(" + ratingsCount + " ratings)";
  }

  if (reviewsSection) reviewsSection.style.display = "none";
  if (leaveSection) leaveSection.style.display = "none";

  const leaveBtn = document.getElementById("eventDetailLeaveReviewBtn");
  const viewBtn = document.getElementById("eventDetailViewReviewsBtn");
  if (leaveBtn) leaveBtn.onclick = () => {
    reviewsSection.style.display = "none";
    leaveSection.style.display = "block";
    document.getElementById("eventDetailReviewText").value = "";
    if (viewBtn) viewBtn.textContent = "View reviews";
  };
  if (viewBtn) {
    viewBtn.onclick = () => {
      if (reviewsSection.style.display === "block") {
        reviewsSection.style.display = "none";
        viewBtn.textContent = "View reviews";
      } else {
        leaveSection.style.display = "none";
        loadEventReviews(ev.id);
        reviewsSection.style.display = "block";
        viewBtn.textContent = "Hide reviews";
      }
    };
    viewBtn.textContent = "View reviews";
  }

  const submitBtn = document.getElementById("eventDetailSubmitReviewBtn");
  const reviewText = document.getElementById("eventDetailReviewText");
  if (submitBtn && reviewText) {
    submitBtn.onclick = () => {
      const text = reviewText.value.trim();
      if (!text) {
        alert("Please enter your review.");
        return;
      }
      const fd = new FormData();
      fd.append("event_id", ev.id);
      fd.append("review_text", text);
      fetch("tourism/php/add_event_review.php", { method: "POST", body: fd })
        .then((r) => r.json())
        .then((res) => {
          if (res && res.status === "success") {
            alert("Review submitted!");
            reviewText.value = "";
            leaveSection.style.display = "none";
            loadEventReviews(ev.id);
            reviewsSection.style.display = "block";
            const vBtn = document.getElementById("eventDetailViewReviewsBtn");
            if (vBtn) vBtn.textContent = "Hide reviews";
          } else {
            alert((res && res.message) || "Please log in to leave a review.");
          }
        })
        .catch(() => alert("Failed to submit review."));
    };
  }

  if (planImg) {
    planImg.onclick = () => planImg.classList.toggle("zoomed");
  }

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function loadEventReviews(eventId) {
  const listEl = document.getElementById("eventDetailReviewsList");
  if (!listEl) return;
  listEl.innerHTML = '<p class="event-reviews-loading">Loading...</p>';
  fetch("tourism/php/get_event_reviews.php?event_id=" + eventId)
    .then((r) => r.json())
    .then((reviews) => {
      if (!reviews || reviews.length === 0) {
        listEl.innerHTML = "<p class=\"event-reviews-empty\">No reviews yet.</p>";
        return;
      }
      listEl.innerHTML = reviews
        .map(
          (r) => {
            const avatarUrl = (r.reviewer_avatar && r.reviewer_avatar.trim())
              ? r.reviewer_avatar
              : "tourism/uploads/userPin.png";
            const avatar = '<img src="' + avatarUrl + '" alt="" class="event-reviewer-avatar" onerror="this.src=\'tourism/uploads/userPin.png\'" />';
            return '<div class="event-review-item">' + avatar + '<div class="event-review-content"><strong>' +
              (r.reviewer_name || "User") +
              "</strong> <span class=\"event-review-date\">" + (r.created_at || "") +
              "</span><p>" + (r.review_text || "").replace(/</g, "&lt;") + "</p></div></div>";
          }
        )
        .join("");
    })
    .catch(() => {
      listEl.innerHTML = "<p class=\"event-reviews-empty\">Could not load reviews.</p>";
    });
}

// ================================
// STALLS NEAR YOU (Tourist)
// ================================
let touristStallsById = new Map();

function closeStallDetailSheet() {
  const stallDetailSheet = document.getElementById("stallDetailSheet");
  if (!stallDetailSheet) return;
  stallDetailSheet.classList.remove("active");
  stallDetailSheet.setAttribute("aria-hidden", "true");
  stallDetailSheet.style.bottom = "";
  stallDetailSheet.style.display = "none";
}

function escapeHtml(str) {
  return (str ?? "").toString().replace(/[&<>"']/g, (c) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[c] || c;
  });
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeStallCategory(productType) {
  const t = (productType ?? "").toString().toLowerCase().trim();
  if (!t) return "other";
  // Exact-ish categories from your system are likely "Merchandise", "Food", "Beverages"
  if (t.includes("merch")) return "merchandise";
  if (t.includes("bever")) return "beverages";
  if (t.includes("food")) return "foods";
  // Fallback heuristics if your DB stores more descriptive values
  if (t.includes("milk") || t.includes("tea") || t.includes("coffee") || t.includes("drink")) return "beverages";
  if (t.includes("soup") || t.includes("pancit") || t.includes("rice") || t.includes("noodle") || t.includes("meal")) return "foods";
  return "other";
}

function formatRating(avgRating, ratingsCount) {
  const avg = Number(avgRating) || 0;
  const count = Number(ratingsCount) || 0;
  if (!avg || avg <= 0) return `- ★ (${count})`;
  return `${avg.toFixed(1)} ★ (${count})`;
}

function stallImageSrc(stallImage) {
  // stall_image is stored as the filename in uploads/stalls/
  if (stallImage && stallImage !== "0") return "tourism/uploads/stalls/" + stallImage;
  return "tourism/uploads/userPin.png";
}

function productImageSrc(productImage) {
  if (productImage && productImage !== "0") return "tourism/uploads/products/" + productImage;
  return "tourism/uploads/userPin.png";
}

async function initStallsNearYou() {
  const gate = document.getElementById("stallsLocationGate");
  const contentWrap = document.getElementById("stallsContent");
  const loadingEl = document.getElementById("stallsLoading");
  if (!gate || !contentWrap || !loadingEl) return;

  gate.classList.remove("hidden");
  contentWrap.classList.add("hidden");
  loadingEl.classList.remove("hidden");

  // Default text (if geolocation fails)
  const gateText = document.getElementById("stallsLocationGateText");
  if (gateText) {
    gateText.textContent = "Please turn on your location.";
  }

  if (!touristUserCoords) {
    loadingEl.classList.add("hidden");
    gate.classList.remove("hidden");
    if (gateText) gateText.textContent = "Please turn on your location.";
    return;
  }

  gate.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  loadingEl.textContent = "Loading stalls near you...";
  await loadAndRenderStalls(touristUserCoords);
  loadingEl.classList.add("hidden");
  contentWrap.classList.remove("hidden");
}

async function loadAndRenderStalls(userCoords) {
  const topRatedEl = document.getElementById("topRatedStallsCarousel");
  const merchEl = document.getElementById("merchandiseStallsCarousel");
  const foodsEl = document.getElementById("foodsStallsCarousel");
  const beveragesEl = document.getElementById("beveragesStallsCarousel");
  const moreListEl = document.getElementById("moreStallsList");
  if (!topRatedEl || !merchEl || !foodsEl || !beveragesEl || !moreListEl) return;

  topRatedEl.innerHTML = "";
  merchEl.innerHTML = "";
  foodsEl.innerHTML = "";
  beveragesEl.innerHTML = "";
  moreListEl.innerHTML = "";

  let stalls = [];
  try {
    const res = await fetch("tourism/php/get_stalls.php", { credentials: "same-origin" });
    const data = await res.json();
    stalls = Array.isArray(data) ? data : [];
  } catch (e) {
    stalls = [];
  }

  if (!stalls.length) {
    const empty = '<div class="stalls-empty">No stalls yet.</div>';
    topRatedEl.innerHTML = empty;
    merchEl.innerHTML = empty;
    foodsEl.innerHTML = empty;
    beveragesEl.innerHTML = empty;
    moreListEl.innerHTML = empty;
    return;
  }

  // Normalize ids + add distance + categorize
  stalls.forEach((s) => {
    const sid = Number(s.stall_id || s.id || 0);
    s.stall_id = sid;
    const lat = Number(s.lat);
    const lng = Number(s.lng);
    const distanceKm =
      isFinite(lat) && isFinite(lng)
        ? haversineKm(userCoords.lat, userCoords.lng, lat, lng)
        : Number.POSITIVE_INFINITY;
    s.distanceKm = distanceKm;
    s.category = normalizeStallCategory(s.product_type);
  });

  // Hide incomplete/unsupported stalls from tourist lists.
  // Requirement: no "other/more" type stalls should appear when vendor has no such type.
  stalls = stalls.filter((s) => {
    const sid = Number(s.stall_id || 0);
    if (!sid) return false;
    if (!s.stall_name || !(s.stall_name + "").trim()) return false;
    return s.category === "merchandise" || s.category === "foods" || s.category === "beverages";
  });

  if (!stalls.length) {
    const empty = '<div class="stalls-empty">No stalls yet.</div>';
    topRatedEl.innerHTML = empty;
    merchEl.innerHTML = empty;
    foodsEl.innerHTML = empty;
    beveragesEl.innerHTML = empty;
    moreListEl.innerHTML = empty;
    return;
  }

  touristStallsById = new Map(stalls.map((s) => [Number(s.stall_id || s.id || 0), s]));

  stalls.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

  const topRated = stalls
    .filter((s) => Number(s.avg_rating) >= 4 && Number(s.ratings_count) >= 1)
    .slice(0, 12);

  const merchandise = stalls.filter((s) => s.category === "merchandise").slice(0, 12);
  const foods = stalls.filter((s) => s.category === "foods").slice(0, 12);
  const beverages = stalls.filter((s) => s.category === "beverages").slice(0, 12);

  // More: show the rest (non-carousel)
  const topIds = new Set(topRated.map((s) => Number(s.stall_id || s.id || 0)));
  const catIds = new Set([...merchandise, ...foods, ...beverages].map((s) => Number(s.stall_id || s.id || 0)));
  const other = stalls.filter((s) => {
    const sid = Number(s.stall_id || s.id || 0);
    return !topIds.has(sid) && !catIds.has(sid);
  }).slice(0, 30);

  renderStallCarousel(topRatedEl, topRated);
  renderStallCarousel(merchEl, merchandise);
  renderStallCarousel(foodsEl, foods);
  renderStallCarousel(beveragesEl, beverages);
  renderMoreStallsList(moreListEl, other);

  // Attach click listeners
  attachStallCardClicks(topRatedEl);
  attachStallCardClicks(merchEl);
  attachStallCardClicks(foodsEl);
  attachStallCardClicks(beveragesEl);
  attachStallCardClicks(moreListEl);
}

function renderStallCarousel(container, stalls) {
  if (!stalls || !stalls.length) {
    container.innerHTML = '<div class="stalls-empty">No stalls yet.</div>';
    return;
  }

  container.innerHTML = "";
  stalls.forEach((s) => {
    const sid = Number(s.stall_id || s.id || 0);
    if (!sid) return;
    const ratingTxt = formatRating(s.avg_rating, s.ratings_count);
    const distTxt = isFinite(s.distanceKm) ? `${s.distanceKm.toFixed(1)} km away` : "Distance unavailable";
    const card = document.createElement("div");
    card.className = "stall-card";
    card.dataset.stallId = String(sid);
    card.dataset.distance = distTxt;
    card.innerHTML = `
      <img src="${stallImageSrc(s.stall_image)}" alt="${escapeHtml(s.stall_name || "Stall")}"/>
      <div class="stall-card-body">
        <div class="stall-card-name">${escapeHtml(s.stall_name || "Stall")}</div>
        <div class="stall-card-rating">${escapeHtml(ratingTxt)}</div>
        <div class="stall-card-distance">${escapeHtml(distTxt)}</div>
      </div>
    `;
    // Direct click handler (extra safety besides event delegation)
    card.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openStallDetailById(sid);
    });

    container.appendChild(card);
  });
}

function renderMoreStallsList(container, stalls) {
  if (!stalls || !stalls.length) {
    container.innerHTML = '<div class="stalls-empty">No other stalls yet.</div>';
    return;
  }

  container.innerHTML = "";
  stalls.forEach((s) => {
    const sid = Number(s.stall_id || s.id || 0);
    if (!sid) return;
    const ratingTxt = formatRating(s.avg_rating, s.ratings_count);
    const distTxt = isFinite(s.distanceKm) ? `${s.distanceKm.toFixed(1)} km away` : "Distance unavailable";
    const item = document.createElement("div");
    item.className = "stall-more-item";
    item.dataset.stallId = String(sid);
    item.innerHTML = `
      <img src="${stallImageSrc(s.stall_image)}" alt="${escapeHtml(s.stall_name || "Stall")}"/>
      <div class="stall-more-meta">
        <div class="stall-more-name">${escapeHtml(s.stall_name || "Stall")}</div>
        <div class="stall-more-rating">${escapeHtml(ratingTxt)}</div>
        <div class="stall-more-distance">${escapeHtml(distTxt)}</div>
      </div>
    `;
    item.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openStallDetailById(sid);
    });

    container.appendChild(item);
  });
}

function attachStallCardClicks(container) {
  if (!container) return;
  // Bind once (cards are re-rendered when the user re-opens the screen / location changes)
  if (container.dataset.stallClickBound === "1") return;
  container.dataset.stallClickBound = "1";

  container.addEventListener("click", (e) => {
    const cardEl = e.target && e.target.closest ? e.target.closest("[data-stall-id]") : null;
    if (!cardEl) return;

    const stallId = Number(cardEl.dataset.stallId);
    if (!stallId) return;

    openStallDetailById(stallId);
  });
}

async function openStallDetailById(stallId) {
  touristCurrentStallId = Number(stallId || 0) || null;
  if (!stallId) return;

  // Open the bottom sheet (same interaction style as other tabs).
  const sheet = document.getElementById("stallDetailSheet");
  if (sheet) {
    sheet.classList.add("active");
    sheet.setAttribute("aria-hidden", "false");
    sheet.style.display = "block";
    // Force visible position (some layouts may rely on computed class styles)
    sheet.style.bottom = "0";
  }

  const nameEl = document.getElementById("stallDetailName");
  const ratingEl = document.getElementById("stallDetailRating");
  const distanceEl = document.getElementById("stallDetailDistance");
  const imgEl = document.getElementById("stallDetailImage");
  const productsEl = document.getElementById("stallDetailProducts");

  if (productsEl) productsEl.innerHTML = '<div class="stalls-empty">Loading products...</div>';

  const sheetName = document.getElementById("stallSheetName");
  const sheetRating = document.getElementById("stallSheetRating");
  const sheetDistance = document.getElementById("stallSheetDistance");
  const sheetImg = document.getElementById("stallSheetImage");
  const sheetProducts = document.getElementById("stallSheetProducts");
  if (sheetProducts) sheetProducts.innerHTML = '<div class="stalls-empty">Loading products...</div>';

  try {
    const res = await fetch(`tourism/php/get_stall_details.php?stall_id=${encodeURIComponent(stallId)}`, {
      credentials: "same-origin"
    });
    const data = await res.json();
    if (!data || data.status === "error") {
      if (productsEl) productsEl.innerHTML = '<div class="stalls-empty">Could not load stall details.</div>';
      return;
    }

    const stall = data.stall || {};
    const sLat = Number(stall.lat);
    const sLng = Number(stall.lng);
    touristCurrentStallLatLng = (isFinite(sLat) && isFinite(sLng)) ? { lat: sLat, lng: sLng } : null;
    const products = data.products || [];

    if (nameEl) nameEl.textContent = stall.stall_name || "Stall";
    if (ratingEl) ratingEl.textContent = "Rating: " + formatRating(stall.avg_rating, stall.ratings_count);
    if (distanceEl) {
      const nearbyStall = touristStallsById.get(stallId);
      const distTxt = nearbyStall && isFinite(nearbyStall.distanceKm)
        ? `${nearbyStall.distanceKm.toFixed(1)} km away`
        : "Distance unavailable";
      distanceEl.textContent = "Distance: " + distTxt;
    }
    if (imgEl) imgEl.src = stallImageSrc(stall.stall_image);

    if (sheetName) sheetName.textContent = stall.stall_name || "Stall";
    if (sheetRating) sheetRating.textContent = "Rating: " + formatRating(stall.avg_rating, stall.ratings_count);
    if (sheetDistance) {
      const nearbyStall = touristStallsById.get(stallId);
      const distTxt = nearbyStall && isFinite(nearbyStall.distanceKm)
        ? `${nearbyStall.distanceKm.toFixed(1)} km away`
        : "Distance unavailable";
      sheetDistance.textContent = "Distance: " + distTxt;
    }
    if (sheetImg) sheetImg.src = stallImageSrc(stall.stall_image);

    if (productsEl) {
      if (!products.length) {
        productsEl.innerHTML = '<div class="stalls-empty">No products yet.</div>';
      } else {
        productsEl.innerHTML = products
          .map((p) => {
            const avg = Number(p.avg_rating) || 0;
            const cnt = Number(p.ratings_count) || 0;
            const priceTxt = p.price !== null && p.price !== undefined ? `₱ ${p.price}` : "";
            const ratingTxt = avg > 0 ? `${avg.toFixed(1)} ★ (${cnt})` : `- ★ (${cnt})`;
            const imgSrc = productImageSrc(p.image);
            return `
              <div class="stall-product-card">
                <img src="${imgSrc}" alt="${escapeHtml(p.name || "Product")}"/>
                <div class="stall-product-card-body">
                  <div class="stall-product-name">${escapeHtml(p.name || "Product")}</div>
                  <div class="stall-product-price">${escapeHtml(priceTxt)}</div>
                  <div class="stall-product-rating">${escapeHtml(ratingTxt)}</div>
                  <div class="stall-product-desc">${escapeHtml(p.description || "")}</div>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }

    if (sheetProducts) {
      if (!products.length) {
        sheetProducts.innerHTML = '<div class="stalls-empty">No products yet.</div>';
      } else {
        sheetProducts.innerHTML = products
          .map((p) => {
            const avg = Number(p.avg_rating) || 0;
            const cnt = Number(p.ratings_count) || 0;
            const priceTxt = p.price !== null && p.price !== undefined ? `₱ ${p.price}` : "";
            const ratingTxt = avg > 0 ? `${avg.toFixed(1)} ★ (${cnt})` : `- ★ (${cnt})`;
            const imgSrc = productImageSrc(p.image);
            return `
              <div class="stall-product-card">
                <img src="${imgSrc}" alt="${escapeHtml(p.name || "Product")}"/>
                <div class="stall-product-card-body">
                  <div class="stall-product-name">${escapeHtml(p.name || "Product")}</div>
                  <div class="stall-product-price">${escapeHtml(priceTxt)}</div>
                  <div class="stall-product-rating">${escapeHtml(ratingTxt)}</div>
                  <div class="stall-product-desc">${escapeHtml(p.description || "")}</div>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }
  } catch (e) {
    if (productsEl) productsEl.innerHTML = '<div class="stalls-empty">Could not load products.</div>';
    if (sheetProducts) sheetProducts.innerHTML = '<div class="stalls-empty">Could not load products.</div>';
  }
}

function viewCurrentStallOnMap() {
  if (!touristCurrentStallId && !touristCurrentStallLatLng) return;
  const mapTile = document.querySelector('.icon-item[data-content="map"]');
  if (mapTile) mapTile.click();
  closeStallDetailSheet();
  const frame = document.querySelector('iframe[src*="tourism/map.php"]');
  if (!frame) return;

  let lat = touristCurrentStallLatLng ? touristCurrentStallLatLng.lat : null;
  let lng = touristCurrentStallLatLng ? touristCurrentStallLatLng.lng : null;
  if ((!isFinite(lat) || !isFinite(lng)) && touristCurrentStallId) {
    const near = touristStallsById.get(Number(touristCurrentStallId));
    lat = Number(near?.lat);
    lng = Number(near?.lng);
  }
  if (!isFinite(lat) || !isFinite(lng)) return;

  frame.src = `tourism/map.php?focus_type=stall&focus_name=${encodeURIComponent("Stall")}&focus_lat=${encodeURIComponent(lat)}&focus_lng=${encodeURIComponent(lng)}`;
}
