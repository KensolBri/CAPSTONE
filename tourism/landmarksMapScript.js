// Base folder for landmark AJAX endpoints, relative to /CAPSTONE/tourism/
var phpFolder = "php";

var map = L.map('landmarksMap', {
  zoomControl: true,
  maxZoom: 25,
  // Make bounds restriction feel like a hard wall
  maxBoundsViscosity: 1.0
}).setView([10.7202, 122.5621], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxNativeZoom: 19,
  maxZoom: 25
}).addTo(map);

var markerCluster = new L.MarkerClusterGroup().addTo(map);

// ==============================
// Polylines (LGU: Iloilo city boundary restriction)
// ==============================
var drawnItems = new L.FeatureGroup().addTo(map);
var cityBoundaryBounds = null;
var cityBoundaryMinZoom = null;

function applyCityBoundaryLock() {
  if (!cityBoundaryBounds) return;

  // Make sure Leaflet has correct size (iframe-safe)
  map.invalidateSize();

  var size = map.getSize && map.getSize();
  if (!size || size.x < 120 || size.y < 120) {
    setTimeout(applyCityBoundaryLock, 120);
    return;
  }

  map.setMaxBounds(cityBoundaryBounds);
  map.fitBounds(cityBoundaryBounds, { padding: [10, 10] });

  // Lock max zoom-out to whatever zoom Leaflet chose after fitting (same pattern as orgJS.js)
  var z = map.getZoom();
  if (Number.isFinite(z)) {
    cityBoundaryMinZoom = z;
    if (map.setMinZoom) map.setMinZoom(z);
    else map.options.minZoom = z;
  }
}

function loadPolylinesForRestriction() {
  map.invalidateSize();
  $.getJSON(phpFolder + '/get_lines.php', function (data) {
    drawnItems.eachLayer(function (l) {
      drawnItems.removeLayer(l);
    });

    (data || []).forEach(function (line) {
      var coords = (line.coordinates || [])
        .map(function (c) {
          var lat = parseFloat(c.lat);
          var lng = parseFloat(c.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return [lat, lng];
        })
        .filter(Boolean);

      // Skip empty/invalid lines (prevents fitBounds from zooming to the whole world)
      if (coords.length < 2) return;

      var pl = L.polyline(coords, { color: line.color || 'blue' }).addTo(drawnItems);
      pl.layerId = line.id;

      if (!cityBoundaryBounds && String(line.name || '').toLowerCase() === "iloilo city") {
        var bounds = pl.getBounds();
        if (bounds && typeof bounds.isValid === 'function' ? bounds.isValid() : true) {
          var center = bounds.getCenter && bounds.getCenter();
          if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return;

          cityBoundaryBounds = bounds;
          applyCityBoundaryLock();
        }
      }
    });

    // If bounds couldn't be determined (for any reason), still keep the view on Iloilo.
    if (!cityBoundaryBounds) {
      map.setView([10.7202, 122.5621], 14);
    }

    // Re-apply after Leaflet finishes sizing inside the iframe (same idea as orgJS stall map invalidate)
    setTimeout(applyCityBoundaryLock, 200);
  }).fail(function (xhr) {
    // If boundary polylines fail to load, at least show Iloilo centered.
    console.error('Failed to load polylines for restriction:', xhr && xhr.responseText ? xhr.responseText : xhr);
    cityBoundaryBounds = null;
    map.setView([10.7202, 122.5621], 14);
  });
}

var tempMarker = null;          // Leaflet marker created by drawing (new add)
var currentMarkerLayer = null; // Leaflet marker being edited/created
var currentLandmarkId = "";    // DB id for edit; empty string for new

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

function getGalleryArray(landmark) {
  if (!landmark || !landmark.landmark_images) return [];
  try {
    var parsed = JSON.parse(landmark.landmark_images);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
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
    // MUST match the fixed wrapper size in landmarks_map.php
    iconSize: [150, 76],
    iconAnchor: [75, 76]
  });
}

function buildLandmarkPopup(landmark) {
  var name = landmark.name ? escapeHtml(landmark.name) : '';
  var address = landmark.address ? escapeHtml(landmark.address) : '';
  var description = landmark.description ? escapeHtml(landmark.description) : '';
  var gallery = getGalleryArray(landmark);

  var html = "<b>" + name + "</b>";
  if (address) html += "<br><i>Address:</i> " + address;
  if (description) html += "<br>" + description;

  if (landmark.image) {
    html += "<br><img src='uploads/" + landmark.image + "' width='140' style='border-radius:10px; border:1px solid rgba(0,0,0,0.08);' />";
  }

  if (gallery.length) {
    html += "<br><div style='display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;'>";
    gallery.slice(0, 6).forEach(function (fn) {
      html += "<img src='uploads/" + escapeHtml(fn) + "' width='60' style='border-radius:8px; border:1px solid rgba(0,0,0,0.08);' />";
    });
    html += "</div>";
  }

  return html;
}

function positionFormAtLatLng(layer) {
  if (!layer) return;
  var latlng = layer.getLatLng ? layer.getLatLng() : null;
  if (!latlng) return;

  var containerPoint = map.latLngToContainerPoint(latlng);
  var mapOffset = $('#landmarksMap').offset();
  $('#landmarkForm').css({
    top: (mapOffset.top + containerPoint.y) + 'px',
    left: (mapOffset.left + containerPoint.x) + 'px',
    display: 'block'
  });
}

function resetLandmarkForm() {
  currentLandmarkId = "";
  currentMarkerLayer = null;
  tempMarker = null;

  $('#landmarkFormTitle').text('Add Landmark');
  $('#landmarkId').val('');

  $('#landmarkName').val('');
  $('#landmarkAddress').val('');
  $('#landmarkDescription').val('');

  $('#landmarkThumbnail').val('');
  $('#landmarkPictures').val('');

  $('#landmarkThumbnailPreview').hide().attr('src', '');
  $('#landmarkPicturesPreview').empty();

  $('#deleteLandmark').hide();
}

function renderLandmarkPreviews(landmark) {
  if (landmark && landmark.image) {
    $('#landmarkThumbnailPreview').show().attr('src', 'uploads/' + landmark.image);
  } else {
    $('#landmarkThumbnailPreview').hide().attr('src', '');
  }

  var gallery = getGalleryArray(landmark);
  var $preview = $('#landmarkPicturesPreview');
  $preview.empty();
  gallery.forEach(function (fn) {
    $preview.append('<img src="uploads/' + escapeHtml(fn) + '" alt="Landmark picture thumbnail" />');
  });
}

function openLandmarkForm(title, landmark, layer) {
  if (!canEdit) return;

  $('#landmarkFormTitle').text(title);

  // New vs edit
  if (landmark && landmark.id) {
    currentLandmarkId = String(landmark.id);
    $('#landmarkId').val(currentLandmarkId);
    currentMarkerLayer = layer;
    tempMarker = null; // editing existing marker

    $('#landmarkName').val(landmark.name || '');
    $('#landmarkAddress').val(landmark.address || '');
    $('#landmarkDescription').val(landmark.description || '');

    $('#deleteLandmark').show();
    renderLandmarkPreviews(landmark);
  } else {
    resetLandmarkForm();
    currentMarkerLayer = layer;
    tempMarker = layer;
    $('#landmarkId').val('');
    $('#deleteLandmark').hide();
  }

  positionFormAtLatLng(layer);
}

function loadLandmarks() {
  markerCluster.clearLayers();
  $.getJSON(phpFolder + '/get_landmarks.php', function (data) {
    data.forEach(function (landmark) {
      var icon = createLandmarkIcon(landmark);
      var m = L.marker([landmark.lat, landmark.lng], { icon: icon })
        .bindPopup(buildLandmarkPopup(landmark))
        ;

      m.markerData = landmark;
      if (canEdit) {
        m.on('click', function () {
          openLandmarkForm('Edit Landmark', landmark, m);
        });
      }

      markerCluster.addLayer(m);
    });
  });
}

// Setup draw controls (LGU only)
if (canEdit) {
  var drawControl = new L.Control.Draw({
    edit: false,
    draw: {
      marker: true,
      polyline: false,
      polygon: false,
      rectangle: false,
      circle: false,
      circlemarker: false
    }
  });
  map.addControl(drawControl);

  map.on('draw:created', function (e) {
    if (e.layerType !== 'marker') return;

    // Remove previous temp marker if user redraws
    if (tempMarker) {
      map.removeLayer(tempMarker);
      tempMarker = null;
    }

    tempMarker = e.layer;
    currentMarkerLayer = tempMarker;
    map.addLayer(tempMarker);

    openLandmarkForm('Add Landmark', null, tempMarker);
  });
}

// Cancel
$('#cancelLandmark').on('click', function () {
  // If it's a new marker being added, remove the temp marker
  if (canEdit && tempMarker && !currentLandmarkId) {
    try { map.removeLayer(tempMarker); } catch (e) {}
  }
  $('#landmarkForm').hide();
  resetLandmarkForm();
});

// Delete
$('#deleteLandmark').on('click', function () {
  if (!canEdit) return;
  if (!currentLandmarkId) return;

  if (!confirm('Delete this landmark?')) return;

  $.post(phpFolder + '/delete_marker.php', { id: currentLandmarkId }, function () {
    // Clear temp marker if any
    tempMarker = null;
    currentMarkerLayer = null;
    $('#landmarkForm').hide();
    resetLandmarkForm();
    loadLandmarks();
  });
});

// Save (add/update)
$('#saveLandmark').on('click', function () {
  if (!canEdit) return;

  var isNew = !currentLandmarkId;
  var name = $('#landmarkName').val().trim();
  var address = $('#landmarkAddress').val().trim();
  var description = $('#landmarkDescription').val().trim();

  if (!name) {
    alert('Landmark Name is required.');
    return;
  }
  if (!address) {
    alert('Landmark Address is required.');
    return;
  }
  if (!currentMarkerLayer || !currentMarkerLayer.getLatLng) {
    alert('Please place a pin on the map first.');
    return;
  }

  // Thumbnail required only for new landmarks
  var thumbFile = $('#landmarkThumbnail')[0].files[0];
  if (isNew && !thumbFile) {
    alert('Landmark thumbnail is required.');
    return;
  }

  var latlng = currentMarkerLayer.getLatLng();
  var fd = new FormData();
  fd.append('id', currentLandmarkId);
  fd.append('name', name);
  fd.append('address', address);
  fd.append('description', description);
  fd.append('lat', latlng.lat);
  fd.append('lng', latlng.lng);
  fd.append('icon_type', 'round');

  if (thumbFile) fd.append('thumbnail', thumbFile);

  var files = $('#landmarkPictures')[0].files;
  for (var i = 0; i < files.length; i++) {
    fd.append('landmark_pictures[]', files[i]);
  }

  var url = isNew ? (phpFolder + '/save_landmark.php') : (phpFolder + '/update_landmark.php');

  $.ajax({
    url: url,
    type: 'POST',
    data: fd,
    processData: false,
    contentType: false,
    success: function () {
      // If we were adding a new marker, remove the temp marker to avoid duplicates
      if (isNew && tempMarker) {
        try { map.removeLayer(tempMarker); } catch (e) {}
        tempMarker = null;
      }

      $('#landmarkForm').hide();
      resetLandmarkForm();
      loadLandmarks();
    },
    error: function (xhr) {
      // Show server response for easier debugging
      var msg = (xhr && xhr.responseText) ? xhr.responseText : 'No server response';
      alert('Failed to save landmark.\n\n' + msg);
    }
  });
});

// Initial load (polylines first so the map can be restricted)
loadPolylinesForRestriction();
loadLandmarks();

