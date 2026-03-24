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
  if (stallsLocationBtn) {
    stallsLocationBtn.addEventListener("click", () => initStallsNearYou());
  }

  const stallDetailModal = document.getElementById("stallDetailModal");
  const stallDetailClose = document.getElementById("stallDetailModalClose");
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
});

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
  return "tourism/uploads/stalls/noimg.png";
}

function productImageSrc(productImage) {
  if (productImage && productImage !== "0") return "tourism/uploads/products/" + productImage;
  return "tourism/uploads/default_product.png";
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
    gateText.textContent = "Stalls Near You -> No stalls yet. Please turn on your location.";
  }

  if (!navigator.geolocation) {
    loadingEl.classList.add("hidden");
    if (gateText) gateText.textContent = "Stalls Near You -> Location is not supported by your browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const userCoords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      gate.classList.add("hidden");
      loadingEl.classList.remove("hidden");
      loadingEl.textContent = "Loading stalls near you...";

      await loadAndRenderStalls(userCoords);

      loadingEl.classList.add("hidden");
      contentWrap.classList.remove("hidden");
    },
    (err) => {
      // Permission denied / timeout / etc.
      loadingEl.classList.add("hidden");
      gate.classList.remove("hidden");
      if (gateText) {
        gateText.textContent = "Stalls Near You -> No stalls yet. Please turn on your location.";
      }
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
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
