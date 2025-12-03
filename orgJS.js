console.log("AccountType from PHP =", accountType);
var canEdit = (accountType === 'lgu');
console.log("canEdit =", canEdit);

var phpFolder = "tourism/php"; // all PHP files live here

var map = L.map('map').setView([10.7202, 122.5621], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

var drawnItems = new L.FeatureGroup().addTo(map);
var markerCluster = new L.MarkerClusterGroup().addTo(map);
map.addLayer(markerCluster);

var tempMarker = null;
var cityBoundaryBounds = null;

// --- Stall layout globals ---
var eventPolygon = null;        // main event polygon (green area)
var stallLayoutMode = false;    // true when LGU is in "Stall Layout" view
var stallPlacementMode = false; // used by Add Stall button
var stallMarkers = [];          // list of stall spot markers

// ==========================
// LGU Draw Controls
// ==========================
if (canEdit) {
    var drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems },
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

    map.on('draw:created', function(e){
        var type  = e.layerType;
        var layer = e.layer;

        if (type === 'marker') {
            tempMarker = layer;
            map.addLayer(tempMarker);

            showMarkerForm('Add Marker');

            // calculate position relative to page
            var containerPoint = map.latLngToContainerPoint(layer.getLatLng());
            var mapOffset      = $('#map').offset();

            $('#markerForm').css({
                top:  mapOffset.top  + containerPoint.y + 'px',
                left: mapOffset.left + containerPoint.x + 'px',
                display: 'block'
            });

        } else {
            showShapeForm(type, layer);
        }
    });

    map.on('draw:edited', function(e){
        e.layers.eachLayer(function(layer){
            if (layer instanceof L.Polygon) {
                var coords = layer.getLatLngs()[0].map(ll => ({lat: ll.lat, lng: ll.lng}));
                var color  = prompt("Change Polygon Color:", layer.options.color || "green");
                if (color) layer.setStyle({color: color});
                $.post(phpFolder + '/update_polygon.php', {
                    id: layer.layerId,
                    coordinates: JSON.stringify(coords),
                    color: color
                }, loadPolygons);
            } else if (layer instanceof L.Polyline) {
                var coords = layer.getLatLngs().map(ll => ({lat: ll.lat, lng: ll.lng}));
                var color  = prompt("Change Line Color:", layer.options.color || "blue");
                if (color) layer.setStyle({color: color});
                $.post(phpFolder + '/update_line.php', {
                    id: layer.layerId,
                    coordinates: JSON.stringify(coords),
                    color: color
                }, loadPolylines);
            }
        });
    });

    map.on('draw:deleted', function(e){
        e.layers.eachLayer(function(layer){
            if (layer instanceof L.Polygon) {
                $.post(phpFolder + '/delete_polygon.php', {id: layer.layerId}, loadPolygons);
            } else if (layer instanceof L.Polyline) {
                $.post(phpFolder + '/delete_line.php', {id: layer.layerId}, loadPolylines);
            }
        });
    });

    // Existing: click to place stall when Add Stall button is used
    map.on('click', function(e){
        if (!stallLayoutMode || !stallPlacementMode) return;

        if (!eventPolygon) {
            alert('Draw and save an event polygon first.');
            return;
        }

        var inside = false;
        if (typeof pointInPolygon === 'function') {
            inside = pointInPolygon(e.latlng, eventPolygon);
        } else {
            inside = eventPolygon.getBounds().contains(e.latlng);
        }

        if (!inside) {
            alert('Stalls must be placed inside the event area.');
            return;
        }

        // Create a new stall marker (default status: available)
        createStallMarker(e.latlng, 'available');

        // Only place one stall per button click
        stallPlacementMode = false;
    });
}

// ==========================
// Marker Form Functions
// ==========================
function showMarkerForm(title, data=null){
    if (!canEdit) return;

    $('#formTitle').text(title);

    if (data) {
        $('#markerId').val(data.id);
        $('#markerName').val(data.name);
        $('#markerCategory').val(data.category);
        $('#markerDescription').val(data.description);
        $('#markerIconType').val(data.icon_type);

        // if markerType select exists, default to POI for existing markers
        if ($('#markerType').length) {
            $('#markerType').val('poi');
        }
    } else {
        $('#markerId').val('');
        $('#markerName').val('');
        $('#markerCategory').val('Food');
        $('#markerDescription').val('');
        $('#markerIconType').val('round');
        $('#markerImage').val('');

        // default markerType to POI if present
        if ($('#markerType').length) {
            $('#markerType').val('poi');
        }
    }

    $('#markerForm').show();
}

$('#cancelMarker').click(function(){
    $('#markerForm').hide();
    if (tempMarker && !$('#markerId').val()) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
});

$('#deleteMarker').click(function(){
    if (tempMarker && tempMarker.markerData){
        if (confirm('Are you sure you want to delete this marker?')) {
            $.post(phpFolder + '/delete_marker.php', {
                id: tempMarker.markerData.id
            }, function(){
                map.removeLayer(tempMarker);
                tempMarker = null;
                $('#markerForm').hide();
                applyFilters();
            });
        }
    }
});

// ==========================
// Save Marker (POI OR Stall)
// ==========================
$('#saveMarker').click(function(){
    // read markerType safely (default: 'poi' if field not present)
    var markerType = 'poi';
    var markerTypeEl = document.getElementById('markerType');
    if (markerTypeEl && markerTypeEl.value) {
        markerType = markerTypeEl.value;
    }

    // 🔹 STALL mode: create stall marker instead of normal POI
    if (markerType === 'stall') {
        if (!tempMarker) {
            alert("Place a marker on the map first.");
            return;
        }
        if (!eventPolygon) {
            alert("Draw and save an event polygon (event area) first.");
            return;
        }

        var latlng = tempMarker.getLatLng();

        // check stall is inside event area
        var inside = false;
        if (typeof pointInPolygon === 'function') {
            inside = pointInPolygon(latlng, eventPolygon);
        } else {
            inside = eventPolygon.getBounds().contains(latlng);
        }

        if (!inside) {
            alert("Stall spaces must be inside the event area.");
            return;
        }

        // create stall marker (label "Available")
        createStallMarker(latlng, 'available');

        // remove the temp Leaflet-draw marker
        map.removeLayer(tempMarker);
        tempMarker = null;

        $('#markerForm').hide();
        return; // IMPORTANT: don't continue to normal POI save
    }

    // 🔹 Normal POI / event marker logic
    var formData = new FormData();
    formData.append('id', $('#markerId').val());
    formData.append('name', $('#markerName').val());
    formData.append('category', $('#markerCategory').val());
    formData.append('description', $('#markerDescription').val());
    formData.append('icon_type', $('#markerIconType').val());
    if ($('#markerImage')[0].files[0]) {
        formData.append('image', $('#markerImage')[0].files[0]);
    }
    if (tempMarker) {
        formData.append('lat', tempMarker.getLatLng().lat);
        formData.append('lng', tempMarker.getLatLng().lng);
    }

    var url = $('#markerId').val()
        ? phpFolder + '/update_marker.php'
        : phpFolder + '/save_marker.php';

    $.ajax({
        url: url,
        type:'POST',
        data: formData,
        contentType:false,
        processData:false,
        success:function(){
            tempMarker.markerData = {};
            $('#markerForm').hide();
            if (tempMarker) {
                map.removeLayer(tempMarker);
                tempMarker = null;
            }
            applyFilters();
        }
    });
});

// ==========================
// Shape Form
// ==========================
function showShapeForm(type, layer){
    if (!canEdit) return;
    var shapeType = (type === 'polyline') ? 'Line' : 'Polygon';
    var formHtml = `
        <div id="shapeForm" style="position:absolute; top:50px; left:50px; z-index:2000; background:#fff; padding:15px; border:1px solid #ccc; border-radius:5px;">
            <h3>Add ${shapeType}</h3>
            <label>Name:</label><br><input type="text" id="shapeName"><br><br>
            <label>Description:</label><br><textarea id="shapeDescription" rows="3"></textarea><br><br>
            <label>Choose Color:</label><br><input type="color" id="shapeColor" value="${type==='polyline' ? '#0000ff' : '#008000'}"><br><br>
            <button id="saveShape">Save</button>
            <button id="cancelShape">Cancel</button>
        </div>`;
    $('body').append(formHtml);

    $('#saveShape').on('click', function(){
        var name        = $('#shapeName').val();
        var description = $('#shapeDescription').val();
        var color       = $('#shapeColor').val();
        if (!name){
            alert("Name is required");
            return;
        }
        var coords = (type === 'polyline')
            ? layer.getLatLngs().map(ll => ({lat: ll.lat, lng: ll.lng}))
            : layer.getLatLngs()[0].map(ll => ({lat: ll.lat, lng: ll.lng}));

        var url = (type === 'polyline')
            ? phpFolder + '/save_line.php'
            : phpFolder + '/save_polygon.php';

        $.post(url, {
            name: name,
            description: description,
            coordinates: JSON.stringify(coords),
            color: color
        }, function(){
            if (type === 'polyline') {
                loadPolylines();
            } else {
                loadPolygons();
            }
        });
        $('#shapeForm').remove();
    });

    $('#cancelShape').on('click', function(){
        $('#shapeForm').remove();
    });
}

// ==========================
// Load Markers with Filters
// ==========================
function applyFilters(){
    var query   = $('#searchBox').val().toLowerCase();
    var checked = $('#categoryFilters input[type=checkbox]:checked')
                    .map(function(){ return this.value; }).get();
    markerCluster.clearLayers();

    $.getJSON(phpFolder + '/get_markers.php', function(data){
        data.forEach(function(marker){
            var iconUrl = marker.image
                ? 'tourism/uploads/' + marker.image
                : (marker.icon_type == 'square' ? 'square_icon.png' : 'circle_icon.png');

            var icon = L.icon({iconUrl: iconUrl, iconSize:[30,30]});
            var popup = "<b>" + marker.name + "</b><br>" +
                        marker.description + "<br>Category: " + marker.category;
            if (marker.image) {
                popup += "<br><img src='uploads/" + marker.image + "' width='100'>";
            }

            var matchesSearch   = (query === "" ||
                                  marker.name.toLowerCase().includes(query) ||
                                  marker.description.toLowerCase().includes(query));
            var matchesCategory = (checked.length === 0 || checked.includes(marker.category));

            if (matchesSearch && matchesCategory) {
                var m = L.marker([marker.lat, marker.lng], {icon: icon})
                    .bindPopup(popup)
                    .bindTooltip("<b>" + marker.name + "</b>", {
                        permanent:true,
                        direction:'top',
                        offset:[0,-10]
                    });
                if (canEdit) {
                    m.markerData = marker;
                    m.on('click', function(){
                        showMarkerForm('Edit Marker', marker);
                        tempMarker = m;
                    });
                }
                markerCluster.addLayer(m);
            }
        });
    });
}

$('#searchBox').on('input', applyFilters);
$('#categoryFilters input[type=checkbox]').on('change', applyFilters);
applyFilters();

// ==========================
// Load Polylines/Polygons
// ==========================
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
            pl.layerId = line.id;
            if (line.name === "Iloilo city" && !cityBoundaryBounds){
                cityBoundaryBounds = pl.getBounds();
                map.setMaxBounds(cityBoundaryBounds);
                map.fitBounds(cityBoundaryBounds);
                map.options.maxZoom = 16;
                map.options.minZoom = map.getZoom();
            }
        });
    });
}
loadPolylines();

function loadPolygons(){
    $.getJSON(phpFolder + '/get_polygons.php', function(data){
        drawnItems.eachLayer(function(l){
            if (l instanceof L.Polygon && !(l instanceof L.Polyline)) {
                drawnItems.removeLayer(l);
            }
        });

        eventPolygon = null;

        data.forEach(function(poly){
            var coords = poly.coordinates.map(c => [c.lat, c.lng]);
            var polygonLayer = L.polygon(coords, {
                color: poly.color || 'green',
                fillOpacity: 0.3
            }).addTo(drawnItems);

            if (!eventPolygon) {
                eventPolygon = polygonLayer;   // use first polygon as event area
            }
        });
    });
}
loadPolygons();

function loadStalls() {
    $.getJSON(phpFolder + '/get_stalls.php', function(data){
        data.forEach(function(stall){
            var latlng = L.latLng(stall.lat, stall.lng);
            createStallMarker(latlng, stall.status, stall.id);
        });
    });
}
loadStalls();

// Ray-casting algorithm: check if latlng is inside a polygon
function pointInPolygon(latlng, polygon) {
    var x = latlng.lng, y = latlng.lat;
    var inside = false;
    var vs = polygon.getLatLngs()[0];  // first ring

    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].lng, yi = vs[i].lat;
        var xj = vs[j].lng, yj = vs[j].lat;

        var intersect = ((yi > y) !== (yj > y)) &&
                        (x < (xj - xi) * (y - yi) / (yj - yi + 0.0) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Create a stall marker (Available / Reserved / Occupied) with label style
function createStallMarker(latlng, status, id) {
    status = status || 'available';

    var labelText = status.charAt(0).toUpperCase() + status.slice(1);

    // ✅ Explicit icon size + anchor at bottom-center
    var icon = L.divIcon({
        className: 'stall-label stall-' + status,
        html: labelText,
        iconSize: [80, 30],  // width, height in px
        iconAnchor: [40, 30] // center bottom of the label
    });

    var m = L.marker(latlng, { icon: icon }).addTo(drawnItems);
    m.stallStatus = status;

    if (id) {
        m.stallId = id; // existing stall from DB
    }

    m.on('click', function(e){
        L.DomEvent.stopPropagation(e);

        var order = ['available', 'reserved', 'occupied'];
        var idx = order.indexOf(m.stallStatus);
        var nextStatus = order[(idx + 1) % order.length];

        m.stallStatus = nextStatus;

        var nextLabel = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
        var newIcon = L.divIcon({
            className: 'stall-label stall-' + nextStatus,
            html: nextLabel,
            iconSize: [80, 30],
            iconAnchor: [40, 30]
        });
        m.setIcon(newIcon);

        if (m.stallId) {
            $.post(phpFolder + '/update_stall.php', {
                id: m.stallId,
                status: nextStatus
            });
        }
    });

    stallMarkers.push(m);

    if (!id) {
        $.post(phpFolder + '/save_stall.php', {
            lat: latlng.lat,
            lng: latlng.lng,
            status: status
        }, function (res) {
            if (res && res.status === 'success') {
                m.stallId = res.id;
            }
        }, 'json');
    }

    return m;
}

// Update local stall marker status (for map view) when an application changes
function updateLocalStallStatus(stallId, status) {
    stallMarkers.forEach(function (m) {
        if (m.stallId == stallId) {
            m.stallStatus = status;
            var label = status.charAt(0).toUpperCase() + status.slice(1);
            var newIcon = L.divIcon({
                className: 'stall-label stall-' + status,
                html: label,
                iconAnchor: [0, 0]
            });
            m.setIcon(newIcon);
        }
    });
}



// ==========================
// Dashboard view switching (like Main.js)
// ==========================
document.addEventListener("DOMContentLoaded", function () {
    var appContent  = document.getElementById("appContent");
    var iconContent = document.getElementById("iconContent");
    if (!appContent || !iconContent) return; // safety if used on other pages

    var sections   = document.querySelectorAll("#iconContent .full-content");
    var stallTitle = document.getElementById("stallViewTitle");

    // When clicking any tile in the grid
    document.querySelectorAll(".icon-item").forEach(function (icon) {
        icon.addEventListener("click", function () {
            var key = this.dataset.content;
            if (!key) return;

            // If this icon has a mode (Stall Applications / Stall Layout), update title
            var mode = this.dataset.mode;
            if (mode && stallTitle) {
                stallTitle.innerHTML =
                    '<img src="map.png" alt="Map Icon" class="map-icon"/> ' +
                    mode;
            }

            // Turn stall layout mode ON only for "Stall Layout"
            if (mode === 'Stall Layout') {
                stallLayoutMode = true;
            } else {
                stallLayoutMode = false;
            }

            // Hide dashboard, show iconContent
            appContent.style.display  = "none";
            iconContent.style.display = "block";

            // Hide all sections and show the selected one
            sections.forEach(function (sec) {
                sec.classList.add("hidden");
            });

            var target = document.getElementById(key);
            if (target) {
                target.classList.remove("hidden");
            }

                        // Load stall applications when opening Stall view
            if (key === "stall") {
                loadApplications();
            }


            // If we just opened the stall view, fix Leaflet map size and refit bounds
            if (key === "stall" && typeof map !== "undefined" && map && map.invalidateSize) {
                setTimeout(function () {
                    map.invalidateSize();

                    if (cityBoundaryBounds) {
                        map.fitBounds(cityBoundaryBounds);
                        map.setMaxBounds(cityBoundaryBounds);
                        map.options.maxZoom = 16;
                        map.options.minZoom = map.getZoom();
                    }
                }, 200);
            }
        });
    });

    // Back buttons – return to hero + grid
    document.querySelectorAll(".back-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            iconContent.style.display = "none";
            appContent.style.display  = "block";

            sections.forEach(function (sec) {
                sec.classList.add("hidden");
            });

            // Leaving stall view: always turn off stall layout mode
            stallLayoutMode   = false;
            stallPlacementMode = false;
        });
    });
});

// Stall "Add Stall Space" button (existing behavior)
var addStallBtn = document.getElementById("addStallBtn");
if (addStallBtn) {
    addStallBtn.addEventListener("click", function () {
        if (!canEdit) {
            alert("Only LGU accounts can add stalls.");
            return;
        }
        if (!stallLayoutMode) {
            alert("Open the Stall Layout view first.");
            return;
        }
        stallPlacementMode = true;
        alert("Stall placement activated.\nClick inside the event area to drop a stall.");
    });
}

// Optional: keep Leaflet happy on window resize
window.addEventListener("resize", function () {
    if (typeof map !== "undefined" && map && map.invalidateSize) {
        map.invalidateSize();
    }
});

// ==========================
// Stall Applications List (LGU)
// ==========================

// Build one <tr> HTML for an application row
function buildApplicationRow(app) {
    function statusPill(status) {
        var classMap = {
            'pending':   'app-status-pending',
            'approved':  'app-status-approved',
            'rejected':  'app-status-rejected',
            'cancelled': 'app-status-cancelled'
        };
        var cls = classMap[status] || 'app-status-pending';
        var label = status.charAt(0).toUpperCase() + status.slice(1);
        return '<span class="app-status-pill ' + cls + '">' + label + '</span>';
    }

    // Which buttons to show
    var actionsHtml = '';
    if (app.status === 'pending') {
        actionsHtml =
            '<button class="app-action-btn app-approve" data-id="' + app.id + '" data-stall="' + app.stall_id + '">Approve</button>' +
            '<button class="app-action-btn app-reject"  data-id="' + app.id + '" data-stall="' + app.stall_id + '">Reject</button>';
    } else if (app.status === 'approved' || app.status === 'rejected') {
        actionsHtml =
            '<button class="app-action-btn app-cancel" data-id="' + app.id + '" data-stall="' + app.stall_id + '">Cancel</button>';
    } else {
        // cancelled -> no further actions
        actionsHtml = '';
    }

    return (
        '<tr data-app-id="' + app.id + '" data-stall-id="' + app.stall_id + '">' +
            '<td>' + (app.vendor_name || '') + '</td>' +
            '<td>' + (app.applied_at || '') + '</td>' +
            '<td>' + (app.product_type || '') + '</td>' +
            '<td>' + (app.stall_size || '') + '</td>' +
            '<td>' + (app.preferred_area || '') + '</td>' +
            '<td>' + statusPill(app.status) + '</td>' +
            '<td>' + actionsHtml + '</td>' +
        '</tr>'
    );
}

// Load all applications via AJAX
// ==========================
// Stall Applications List (LGU)
// ==========================

function buildApplicationRow(app) {
    function statusPill(status) {
        var classMap = {
            'pending':   'app-status-pending',
            'approved':  'app-status-approved',
            'rejected':  'app-status-rejected',
            'cancelled': 'app-status-cancelled'
        };
        var cls   = classMap[status] || 'app-status-pending';
        var label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
        return '<span class="app-status-pill ' + cls + '">' + label + '</span>';
    }

    var actionsHtml = '';
    if (app.status === 'pending') {
        actionsHtml =
            '<button class="app-action-btn app-approve" data-id="' + app.id + '" data-stall="' + app.stall_id + '">Approve</button>' +
            '<button class="app-action-btn app-reject"  data-id="' + app.id + '" data-stall="' + app.stall_id + '">Reject</button>';
    } else if (app.status === 'approved' || app.status === 'rejected') {
        actionsHtml =
            '<button class="app-action-btn app-cancel" data-id="' + app.id + '" data-stall="' + app.stall_id + '">Cancel</button>';
    }

return (
    '<tr data-app-id="' + app.id + '" data-stall-id="' + app.stall_id + '">' +
        '<td>' + (app.vendor_name    || '') + '</td>' +
        '<td>' + (app.stall_name     || '') + '</td>' +   // ✅ new cell
        '<td>' + (app.applied_at     || '') + '</td>' +
        '<td>' + (app.product_type   || '') + '</td>' +
        '<td>' + (app.stall_size     || '') + '</td>' +
        '<td>' + (app.preferred_area || '') + '</td>' +
        '<td>' + statusPill(app.status) + '</td>' +
        '<td>' + actionsHtml + '</td>' +
    '</tr>'
);

}

function loadApplications() {
    var tbody = $('#applicationTable tbody');
    if (!tbody.length) return;

    $.getJSON(phpFolder + '/get_stall_applications.php', function (res) {
        console.log('applications response:', res);

        if (!res || res.status !== 'success') {
            tbody.empty();
            tbody.append(
                '<tr><td colspan="7">Unable to load applications.</td></tr>'
            );
            return;
        }

        var rows = res.data || [];
        tbody.empty();

        if (!rows.length) {
            tbody.append(
                '<tr><td colspan="7">No stall applications yet.</td></tr>'
            );
            return;
        }

        rows.forEach(function (app) {
            tbody.append(buildApplicationRow(app));
        });
    }).fail(function () {
        var tbody = $('#applicationTable tbody');
        tbody.empty();
        tbody.append(
            '<tr><td colspan="7">Server error loading applications.</td></tr>'
        );
    });
}


// Helper: change application status via AJAX
function setApplicationStatus(appId, stallId, newStatus) {
    $.post(phpFolder + '/update_stall_application.php', {
        id: appId,
        status: newStatus
    }, function (res) {
        console.log('update_stall_application result:', res);

        if (!res || res.status !== 'success') {
            alert(res && res.message ? res.message : 'Failed to update application.');
            return;
        }

        // Reload table so the UI updates
        loadApplications();

        // Map application status -> stall status
        var stallStatus = null;
        if (newStatus === 'approved') {
            stallStatus = 'occupied';   // ✅ approve -> occupied
        } else if (newStatus === 'rejected') {
            stallStatus = 'available';  // ✅ reject  -> available
        } else if (newStatus === 'cancelled') {
            stallStatus = 'available';  // optional mapping
        }

        if (stallStatus && typeof updateLocalStallStatus === 'function') {
            // update marker on the map
            updateLocalStallStatus(stallId, stallStatus);

            // also persist to stalls table, so vendor sees it
            $.post(phpFolder + '/update_stall.php', {
                id: stallId,
                status: stallStatus
            });
        }
    }, 'json').fail(function (jqXHR, textStatus, errorThrown) {
        console.error('AJAX error:', textStatus, errorThrown, jqXHR.responseText);
        alert('Server error updating application.');
    });
}


// Use EVENT DELEGATION because rows are added dynamically
$(document).on('click', '.app-approve', function () {
    var appId   = $(this).data('id');
    var stallId = $(this).data('stall');
    setApplicationStatus(appId, stallId, 'approved');
});

$(document).on('click', '.app-reject', function () {
    var appId   = $(this).data('id');
    var stallId = $(this).data('stall');
    setApplicationStatus(appId, stallId, 'rejected');
});

$(document).on('click', '.app-cancel', function () {
    var appId   = $(this).data('id');
    var stallId = $(this).data('stall');
    setApplicationStatus(appId, stallId, 'cancelled');
});
