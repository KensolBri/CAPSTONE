// accountType is injected from PHP in vendor.php:
// var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>";

var canEdit = (accountType === 'lgu'); // vendor = false

// Base folder for PHP APIs
var phpFolder = "tourism/php";

// ================================
// Initialize Map
// ================================
var map = L.map('map').setView([10.7202, 122.5621], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

var drawnItems    = new L.FeatureGroup().addTo(map);
var markerCluster = new L.MarkerClusterGroup().addTo(map);
map.addLayer(markerCluster);

var tempMarker = null;
var cityBoundaryBounds = null;

// Stall application modal elements
var stallApplyModal  = document.getElementById('stallApplyModal');
var stallApplyForm   = document.getElementById('stallApplyForm');
var stallIdInput     = document.getElementById('stallIdInput');
var stallNameInput   = document.getElementById('stallNameInput');
var productTypeInput = document.getElementById('productTypeInput');
var stallApplyCancel = document.getElementById('stallApplyCancel');

// keep reference to which marker is being applied for
var currentStallMarker = null;


// ================================
// LGU draw/edit controls (skip for vendor)
// ================================
if (canEdit) {
    var drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems, edit: true, remove: true },
        draw: {
            marker: true,
            polyline: true,
            polygon: true,
            rectangle: false,
            circle: false,
            circlemarker: false
        }
    });
    map.addControl(drawControl);
}

// ================================
// Load markers (view only for vendor)
// ================================
function applyFilters(){
    var query = $('#searchBox').val().toLowerCase();
    var checked = $('#categoryFilters input[type=checkbox]:checked')
        .map(function(){ return this.value; }).get();

    markerCluster.clearLayers();

    $.getJSON(phpFolder + '/get_markers.php', function(data){
        data.forEach(function(marker){
            var matchesSearch =
                (query === "" ||
                 marker.name.toLowerCase().includes(query) ||
                 marker.description.toLowerCase().includes(query));

            var matchesCategory =
                (checked.length === 0 || checked.includes(marker.category));

            if (!matchesSearch || !matchesCategory) return;

            var iconUrl = marker.image
                ? 'tourism/uploads/' + marker.image
                : (marker.icon_type === 'square' ? 'square_icon.png' : 'circle_icon.png');

            var icon = L.icon({ iconUrl: iconUrl, iconSize: [30, 30] });

            var popup =
                "<b>" + marker.name + "</b><br>" +
                marker.description +
                "<br>Category: " + marker.category;

            if (marker.image) {
                popup += "<br><img src='uploads/" + marker.image + "' width='100'>";
            }

            var m = L.marker([marker.lat, marker.lng], {icon: icon})
                .bindPopup(popup)
                .bindTooltip("<b>" + marker.name + "</b>", {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -10]
                });

            markerCluster.addLayer(m);
        });
    });
}

$('#searchBox').on('input', applyFilters);
$('#categoryFilters input[type=checkbox]').on('change', applyFilters);
applyFilters();

// ================================
// Load polylines and polygons (read-only)
// ================================
function loadPolylines(){
    $.getJSON(phpFolder + '/get_lines.php', function(data){
        drawnItems.eachLayer(function(l){
            if (l instanceof L.Polyline && !(l instanceof L.Polygon)) {
                drawnItems.removeLayer(l);
            }
        });

        data.forEach(function(line){
            var coords = line.coordinates.map(c => [c.lat, c.lng]);
            var pl = L.polyline(coords, {color: line.color || 'blue'}).addTo(drawnItems);

            if (line.name === "Iloilo city" && !cityBoundaryBounds) {
                cityBoundaryBounds = pl.getBounds();
                map.setMaxBounds(cityBoundaryBounds);
                map.fitBounds(cityBoundaryBounds);
                map.options.maxZoom = 16;
                map.options.minZoom = map.getZoom();
            }
        });
    });
}

function loadPolygons(){
    $.getJSON(phpFolder + '/get_polygons.php', function(data){
        drawnItems.eachLayer(function(l){
            if (l instanceof L.Polygon && !(l instanceof L.Polyline)) {
                drawnItems.removeLayer(l);
            }
        });

        data.forEach(function(poly){
            var coords = poly.coordinates.map(c => [c.lat, c.lng]);
            L.polygon(coords, {color: poly.color || 'green'}).addTo(drawnItems);
        });
    });
}

loadPolylines();
loadPolygons();

// ================================
// STALLS: show LGU-defined stall spaces (read-only)
// ================================
function createStallMarker(latlng, status, id) {
    status = status || 'available';
    var labelText = status.charAt(0).toUpperCase() + status.slice(1);

    var icon = L.divIcon({
        className: 'stall-label stall-' + status,
        html: labelText,
        iconSize: [80, 30],   // EXACTLY like org
        iconAnchor: [40, 30]  // bottom-center
    });

    var m = L.marker(latlng, { icon: icon }).addTo(drawnItems);
    m.stallStatus = status;
    m.stallId     = id;

    // Vendors click to apply
    m.on('click', function () {
        if (m.stallStatus !== 'available') {
            alert('This stall is currently ' + m.stallStatus + '.');
            return;
        }

        $('#applyStallId').val(m.stallId);
        $('#applyStallName').val('');
        $('#applyProductType').val('');
        $('#applyStallSize').val('');
        $('#applyPreferredArea').val('');
        $('#stallApplyModal').show();
    });

    return m;
}


function loadStallsForVendors() {
    $.getJSON(phpFolder + '/get_stalls.php', function(data){
        data.forEach(function(stall){
            var latlng = L.latLng(stall.lat, stall.lng);
            createStallMarker(latlng, stall.status, stall.id);
        });
    });
}

// Call after other layers (so they appear on top)
loadStallsForVendors();

// ================================
// Stall application form handlers
// ================================

// Submit form
// ================================
// Handle stall application form
// ================================
$(document).ready(function () {
    // close modal
    $('#stallApplyClose').on('click', function () {
        $('#stallApplyModal').hide();
    });

    $('#stallApplyModal').on('click', function (e) {
        if (e.target.id === 'stallApplyModal') {
            $('#stallApplyModal').hide();
        }
    });

$('#stallApplyForm').on('submit', function (e) {
    e.preventDefault();

    var formData = $(this).serialize();

    $.ajax({
        url: phpFolder + '/apply_for_stall.php',
        type: 'POST',
        data: formData,
        dataType: 'json',
        success: function (res) {
            console.log('apply_for_stall response:', res);

            if (res.status === 'success') {
                alert(res.message || 'Application submitted!');
                $('#stallApplyModal').hide();

                // you may also want to return stall_id from PHP
                if (res.stall_id) {
                    updateLocalStallStatus(res.stall_id, 'reserved');
                }
            } else {
                alert(res.message || 'Failed to apply for stall.');
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('AJAX error:', textStatus, errorThrown);
            console.error('Response text:', jqXHR.responseText);

            // Try to parse JSON error sent by json_error()
            try {
                var err = JSON.parse(jqXHR.responseText);
                alert(err.message || 'Server error while applying for stall.');
            } catch (e) {
                alert('Server error while applying for stall.');
            }
        }
    });
});
});

function checkNotifications() {
    $.getJSON(phpFolder + '/check_vendor_notifications.php', function (res) {
        if (!res || res.status !== 'success') return;

        (res.data || []).forEach(function (app) {
            var msg;
            if (app.status === 'approved') {
                msg = "Your stall application for '" + (app.stall_name || "a stall") +
                      "' has been APPROVED.\nThe stall is now occupied.";
            } else if (app.status === 'rejected') {
                msg = "Your stall application for '" + (app.stall_name || "a stall") +
                      "' has been REJECTED.\nThe stall is available again.";
            } else {
                msg = "Your stall application for '" + (app.stall_name || "a stall") +
                      "' has been " + app.status.toUpperCase() + ".";
            }

            alert(msg);
            // here you could also update any vendor-side UI list of applications
        });
    });
}

// Check immediately when vendor opens the map
checkNotifications();

// And then every 10 seconds (adjust as you like)
setInterval(checkNotifications, 10000);

