(() => {
  const SEARCH_ENDPOINT = "tourism/php/search.php";
  const MAX_SUGGESTIONS = 12;

  function getName(item) {
    return (item?.name || item?.event_name || "").toString().trim();
  }

  function rankAndTrimResults(query, results) {
    const q = (query || "").toLowerCase().trim();
    const scored = (results || []).map((r) => {
      const name = getName(r).toLowerCase();
      const starts = name.startsWith(q) ? 0 : 1;
      const contains = name.includes(q) ? 0 : 1;
      return { ...r, _score: starts * 10 + contains };
    });
    scored.sort((a, b) => a._score - b._score || getName(a).localeCompare(getName(b)));
    return scored.slice(0, MAX_SUGGESTIONS);
  }

  function openTouristMapAndFocus(result) {
    const mapTile = document.querySelector('.icon-item[data-content="map"]');
    if (mapTile) mapTile.click();

    const frame = document.querySelector('iframe[src*="tourism/map.php"]');
    if (!frame) return;

    const lat = result?.lat;
    const lng = result?.lng;
    if (!lat || !lng) return;

    const type = result.type || "result";
    const name = getName(result) || "Result";
    const extra = result?.focus_polygon_id
      ? `&focus_polygon_id=${encodeURIComponent(result.focus_polygon_id)}`
      : "";
    const url = `tourism/map.php?focus_type=${encodeURIComponent(type)}&focus_name=${encodeURIComponent(name)}&focus_lat=${encodeURIComponent(lat)}&focus_lng=${encodeURIComponent(lng)}${extra}`;
    frame.src = url;
  }

  function openTouristMapAndFocusEvent(result) {
    const mapTile = document.querySelector('.icon-item[data-content="map"]');
    if (mapTile) mapTile.click();

    const frame = document.querySelector('iframe[src*="tourism/map.php"]');
    if (!frame) return;

    const polygonId = Number(result?.polygon_id || result?.focus_polygon_id || 0);
    const type = "event";
    const name = getName(result) || "Event";
    const extra = polygonId ? `&focus_polygon_id=${encodeURIComponent(polygonId)}` : "";
    frame.src = `tourism/map.php?focus_type=${encodeURIComponent(type)}&focus_name=${encodeURIComponent(name)}${extra}`;
  }

  function openTouristLocationAndFocusLandmark(result) {
    const locationTile = document.querySelector('.icon-item[data-content="location"]');
    if (locationTile) locationTile.click();

    const landmarkId = String(result?.landmark_id || "");
    if (!landmarkId) return;

    // Wait for location cards to render, then trigger existing landmark flow.
    let attempts = 0;
    const maxAttempts = 25;
    const timer = setInterval(() => {
      attempts += 1;
      const card = document.querySelector(`#touristLocationCards .tourist-location-card[data-landmark-id="${landmarkId}"]`);
      if (card) {
        clearInterval(timer);
        card.click();
      } else if (attempts >= maxAttempts) {
        clearInterval(timer);
      }
    }, 120);
  }

  function focusMapOnCurrentPage(result) {
    // Events: open the relevant event section instead of map focus.
    if (result?.type === "event") {
      const hasTouristMapIframe = !!document.querySelector('iframe[src*="tourism/map.php"]');
      if (hasTouristMapIframe) {
        openTouristMapAndFocusEvent(result);
        return true;
      }

      if (typeof window.map !== "undefined" && typeof window.focusPolygonById === "function") {
        const mapViewTile = document.querySelector('.icon-item[data-content="mapView"]');
        const lguStallLayoutTile = document.querySelector('.icon-item[data-content="stall"][data-mode="Stall Layout"]');
        const lguStallTile = document.querySelector('.icon-item[data-content="stall"]');
        if (mapViewTile) mapViewTile.click();
        if (!mapViewTile && lguStallLayoutTile) lguStallLayoutTile.click();
        if (!mapViewTile && !lguStallLayoutTile && lguStallTile) lguStallTile.click();
        const pid = Number(result?.polygon_id || result?.focus_polygon_id || 0);
        if (pid) {
          setTimeout(() => window.focusPolygonById(pid), 220);
        }
        return true;
      }

      // Fallback to events list if polygon is unavailable.
      const touristEventsTile = document.querySelector('.icon-item[data-content="festivities"]');
      if (touristEventsTile) touristEventsTile.click();
      return true;
    }

    const lat = Number(result?.lat);
    const lng = Number(result?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

    // Landmarks on tourist should use Location tab (not Map tab).
    if (result?.type === "landmark") {
      const hasTouristLocation = !!document.querySelector('.icon-item[data-content="location"]');
      if (hasTouristLocation) {
        openTouristLocationAndFocusLandmark(result);
        return true;
      }
    }

    // Vendor/LGU in-page map
    if (typeof window.map !== "undefined" && window.map && typeof window.map.setView === "function") {
      const mapViewTile = document.querySelector('.icon-item[data-content="mapView"]');
      const lguStallLayoutTile = document.querySelector('.icon-item[data-content="stall"][data-mode="Stall Layout"]');
      const lguStallTile = document.querySelector('.icon-item[data-content="stall"]');
      if (mapViewTile) mapViewTile.click();
      if (!mapViewTile && lguStallLayoutTile) lguStallLayoutTile.click();
      if (!mapViewTile && !lguStallLayoutTile && lguStallTile) lguStallTile.click();

      setTimeout(() => {
        try {
          window.map.setView([lat, lng], Math.max(window.map.getZoom?.() || 14, 17), { animate: true });
        } catch (e) {
          console.error(e);
        }
      }, 250);

      return true;
    }

    // Tourist parent page with iframe map (used for stalls).
    openTouristMapAndFocus(result);
    return true;
  }

  async function doSearch(query) {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${raw.slice(0, 180)}`);
    }
  }

  function buildSuggestionsContainer(searchWrap) {
    let box = document.getElementById("globalSearchSuggestions");
    if (box) return box;
    searchWrap.style.position = "relative";
    box = document.createElement("div");
    box.id = "globalSearchSuggestions";
    box.style.cssText = [
      "position:absolute",
      "left:0",
      "right:0",
      "top:calc(100% + 8px)",
      "background:#fff",
      "border-radius:12px",
      "box-shadow:0 14px 30px rgba(0,0,0,0.18)",
      "max-height:320px",
      "overflow:auto",
      "display:none",
      "z-index:9999",
      "padding:6px"
    ].join(";");
    searchWrap.appendChild(box);
    return box;
  }

  function renderSuggestionCards(container, query, results) {
    container.innerHTML = "";
    if (!query.trim()) {
      container.style.display = "none";
      return;
    }

    const ranked = rankAndTrimResults(query, results);
    if (!ranked.length) {
      const empty = document.createElement("div");
      empty.textContent = "No results found.";
      empty.style.cssText = "padding:10px 12px;font-size:12px;font-weight:700;color:#666;";
      container.appendChild(empty);
      container.style.display = "block";
      return;
    }

    ranked.forEach((r) => {
      const card = document.createElement("button");
      card.type = "button";
      card.style.cssText = "width:100%;text-align:left;border:0;background:#fff;border-radius:10px;padding:10px 12px;cursor:pointer;";
      card.onmouseenter = () => (card.style.background = "#f7f7f7");
      card.onmouseleave = () => (card.style.background = "#fff");

      const name = getName(r) || "Result";
      const sub = r.type === "stall"
        ? (r.product_type ? `Stall - ${r.product_type}` : "Stall")
        : r.type === "landmark"
          ? (r.address ? `Landmark - ${r.address}` : "Landmark")
          : r.type === "event"
            ? (r.location ? `Event - ${r.location}` : "Event")
            : "Result";

      card.innerHTML = `
        <div style="font-size:14px;font-weight:900;color:#111;">${name}</div>
        <div style="font-size:12px;font-weight:700;color:#666;margin-top:2px;">${sub}</div>
      `;

      card.addEventListener("click", () => {
        const input = document.querySelector("header .search-wrap input");
        if (input) input.value = name;
        container.style.display = "none";
        focusMapOnCurrentPage(r);
      });

      container.appendChild(card);
    });
    container.style.display = "block";
  }

  function attachToHeaderSearch() {
    const searchWrap = document.querySelector("header .search-wrap");
    const input = document.querySelector("header .search-wrap input");
    const btn = document.querySelector("header .search-wrap .search-icon");
    if (!searchWrap || !input || !btn) return;
    const suggestions = buildSuggestionsContainer(searchWrap);
    let typingTimer = null;
    let lastResults = [];

    const run = async () => {
      const query = (input.value || "").trim();
      if (!query) {
        suggestions.style.display = "none";
        return;
      }
      try {
        const data = await doSearch(query);
        lastResults = data?.results || [];
        renderSuggestionCards(suggestions, query, lastResults);
      } catch (e) {
        console.error(e);
        renderSuggestionCards(suggestions, query, []);
      }
    };

    btn.addEventListener("click", () => {
      run();
    });

    input.addEventListener("input", () => {
      clearTimeout(typingTimer);
      typingTimer = setTimeout(run, 180);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = rankAndTrimResults(input.value || "", lastResults)[0];
        if (first) {
          suggestions.style.display = "none";
          focusMapOnCurrentPage(first);
        } else {
          run();
        }
      }
    });

    document.addEventListener("click", (e) => {
      if (!searchWrap.contains(e.target)) {
        suggestions.style.display = "none";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", attachToHeaderSearch);
})();

