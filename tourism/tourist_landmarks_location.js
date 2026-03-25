// Tourist Location tab: landmark map + tourist location + distance cards

var phpFolder = "php";

var map = L.map('landmarksTouristMap', {
  zoomControl: true,
  maxZoom: 25
}).setView([10.7202, 122.5621], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxNativeZoom: 19,
  maxZoom: 25
}).addTo(map);

var markerCluster = new L.MarkerClusterGroup().addTo(map);
var landmarksById = new Map();    // id -> landmark
var markerById = new Map();       // id -> leaflet marker

var userMarker = null;
var userAccuracyCircle = null;
var userCoords = null;            // {lat, lng}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

function haversineKm(lat1, lon1, lat2, lon2) {
  var toRad = function (v) { return (v * Math.PI) / 180; };
  var R = 6371;
  var dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function landmarkThumbSrc(lm) {
  if (lm && lm.image) return 'uploads/' + lm.image;
  return 'dagyang.jpg';
}

function createLandmarkIcon(landmark) {
  var label = landmark && landmark.name ? landmark.name : "Landmark";
  var thumb = (landmark && landmark.image) ? ('uploads/' + landmark.image) : 'circle_icon.png';
  var html =
    '<div class="landmark-pin-wrapper">' +
      '<div class="landmark-pin-label">' + escapeHtml(label) + '</div>' +
      '<div class="landmark-pin">' +
        '<img src="' + thumb + '" alt="' + escapeHtml(label) + '">' +
      '</div>' +
    '</div>';

  return L.divIcon({
    className: "landmark-pin-icon",
    html: html,
    iconSize: [150, 76],
    iconAnchor: [75, 76]
  });
}

function buildLandmarkPopup(lm) {
  var name = lm && lm.name ? escapeHtml(lm.name) : '';
  var address = lm && lm.address ? escapeHtml(lm.address) : '';
  var desc = lm && lm.description ? escapeHtml(lm.description) : '';

  var html = "<b>" + name + "</b>";
  if (address) html += "<br><i>Address:</i> " + address;
  if (desc) html += "<br>" + desc;
  if (lm && lm.image) {
    html += "<br><img src='uploads/" + escapeHtml(lm.image) + "' width='140' style='border-radius:10px; border:1px solid rgba(0,0,0,0.08);' />";
  }
  return html;
}

function renderCards() {
  var container = document.getElementById('landmarkCards');
  if (!container) return;

  var arr = Array.from(landmarksById.values());
  if (!arr.length) {
    container.innerHTML = '<div class="empty">No landmarks yet.</div>';
    return;
  }

  // Attach distance if we have user coords
  arr.forEach(function (lm) {
    var lat = Number(lm.lat);
    var lng = Number(lm.lng);
    if (userCoords && isFinite(lat) && isFinite(lng)) {
      lm._distanceKm = haversineKm(userCoords.lat, userCoords.lng, lat, lng);
    } else {
      lm._distanceKm = Number.POSITIVE_INFINITY;
    }
  });

  // Sort by distance when available
  arr.sort(function (a, b) {
    return (a._distanceKm || 0) - (b._distanceKm || 0);
  });

  container.innerHTML = '';

  arr.forEach(function (lm) {
    var id = Number(lm.id || 0);
    if (!id) return;

    var distTxt = (userCoords && isFinite(lm._distanceKm))
      ? (lm._distanceKm.toFixed(1) + " km away")
      : "Turn on location to see distance";

    var el = document.createElement('div');
    el.className = 'lm-card';
    el.dataset.landmarkId = String(id);
    el.innerHTML =
      '<img class="lm-thumb" src="' + landmarkThumbSrc(lm) + '" alt="' + escapeHtml(lm.name || 'Landmark') + '" onerror="this.src=\'dagyang.jpg\'" />' +
      '<div class="lm-meta">' +
        '<div class="lm-name">' + escapeHtml(lm.name || 'Landmark') + '</div>' +
        '<div class="lm-addr">' + escapeHtml(lm.address || '') + '</div>' +
        '<div class="lm-dist">' + escapeHtml(distTxt) + '</div>' +
      '</div>';

    el.addEventListener('click', function () {
      var mid = Number(el.dataset.landmarkId || 0);
      var marker = markerById.get(mid);
      var lm2 = landmarksById.get(mid);
      if (marker && lm2) {
        var lat = Number(lm2.lat);
        var lng = Number(lm2.lng);
        if (isFinite(lat) && isFinite(lng)) {
          map.setView([lat, lng], Math.max(map.getZoom(), 17), { animate: true });
          marker.openPopup();
        }
      }
    });

    container.appendChild(el);
  });
}

function loadLandmarks() {
  markerCluster.clearLayers();
  landmarksById.clear();
  markerById.clear();

  $.getJSON(phpFolder + '/get_landmarks.php', function (data) {
    (data || []).forEach(function (lm) {
      if (!lm || String(lm.category || '') !== 'Landmark') return;
      var id = Number(lm.id || 0);
      var lat = Number(lm.lat);
      var lng = Number(lm.lng);
      if (!id || !isFinite(lat) || !isFinite(lng)) return;

      landmarksById.set(id, lm);

      var icon = createLandmarkIcon(lm);
      var m = L.marker([lat, lng], { icon: icon }).bindPopup(buildLandmarkPopup(lm));
      markerCluster.addLayer(m);
      markerById.set(id, m);
    });

    renderCards();
  }).fail(function () {
    var container = document.getElementById('landmarkCards');
    if (container) container.innerHTML = '<div class="empty">Could not load landmarks.</div>';
  });
}

function updateUserMarker(latlng, accuracy) {
  if (userMarker) {
    userMarker.setLatLng(latlng);
  } else {
    userMarker = L.marker(latlng).addTo(map).bindPopup("You are here");
  }

  if (userAccuracyCircle) {
    userAccuracyCircle.setLatLng(latlng).setRadius(accuracy || 30);
  } else {
    userAccuracyCircle = L.circle(latlng, { radius: accuracy || 30 }).addTo(map);
  }
}

function locateTouristOnce() {
  var hint = document.getElementById('touristLocateHint');
  if (!navigator.geolocation) {
    if (hint) hint.textContent = "Location is not supported by your browser.";
    return;
  }

  if (hint) hint.textContent = "Getting your location...";

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      var latlng = L.latLng(userCoords.lat, userCoords.lng);
      updateUserMarker(latlng, pos.coords.accuracy);
      map.setView(latlng, Math.max(map.getZoom(), 17), { animate: true });

      if (hint) hint.textContent = "Showing distances from your current location.";
      renderCards();
    },
    function () {
      if (hint) hint.textContent = "Please allow location access to see distances.";
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
  );
}

document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('touristLocateBtn');
  if (btn) btn.addEventListener('click', locateTouristOnce);
  loadLandmarks();
});

