console.log("AccountType from PHP =", accountType);
var canEdit = (accountType === 'lgu');
console.log("canEdit =", canEdit);

var phpFolder = "tourism/php"; // all PHP files live here

var map = L.map('map', {
    minZoom: 12,   // or whatever zoom-out limit you want
    maxZoom: 25    // HIGH zoom-in limit (increase to 30 if you want)
}).setView([10.7202, 122.5621], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 25,
    maxNativeZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


var drawnItems = new L.FeatureGroup().addTo(map);
var markerCluster = new L.MarkerClusterGroup().addTo(map);
map.addLayer(markerCluster);

var tempMarker = null;
var cityBoundaryBounds = null;

// --- Stall layout globals ---
var eventPolygons = [];         // all event polygons (green areas); stall placement allowed inside any of them
var stallLayoutMode = false;    // true when LGU is in "Stall Layout" view
var stallPlacementMode = false; // used by Add Stall button
var stallMarkers = [];          // list of stall spot markers

// Returns the first polygon that contains the given latlng, or null
function getPolygonContaining(latlng) {
    if (!eventPolygons || eventPolygons.length === 0) return null;
    for (var i = 0; i < eventPolygons.length; i++) {
        var poly = eventPolygons[i];
        var inside = false;
        if (typeof pointInPolygon === 'function') {
            inside = pointInPolygon(latlng, poly);
        } else {
            inside = poly.getBounds().contains(latlng);
        }
        if (inside) return poly;
    }
    return null;
}

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

        if (!eventPolygons || eventPolygons.length === 0) {
            alert('Draw and save an event polygon first.');
            return;
        }

        var containingPolygon = getPolygonContaining(e.latlng);
        if (!containingPolygon) {
            alert('Stalls must be placed inside an event area.');
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
        if (!eventPolygons || eventPolygons.length === 0) {
            alert("Draw and save an event polygon (event area) first.");
            return;
        }

        var latlng = tempMarker.getLatLng();

        // check stall is inside any event area
        var containingPolygon = getPolygonContaining(latlng);
        if (!containingPolygon) {
            alert("Stall spaces must be inside an event area.");
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
            // Keep LGU "Landmarks Map" markers hidden from the main LGU map tab
            // (where the old marker form doesn't support Landmark Address/gallery).
            if (marker.category === 'Landmark') return;

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

        eventPolygons = [];

        data.forEach(function(poly){
            var coords = poly.coordinates.map(c => [c.lat, c.lng]);
            var polygonLayer = L.polygon(coords, {
                color: poly.color || 'green',
                fillOpacity: 0.3
            }).addTo(drawnItems);

            polygonLayer.layerId = poly.id;
            eventPolygons.push(polygonLayer);
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

    var sections        = document.querySelectorAll("#iconContent .full-content");
    var stallTitle      = document.getElementById("stallViewTitle");
    var appPanel        = document.getElementById("applicationListPanel");
    var festivalPanel   = document.getElementById("festivalSummaryPanel");

    function showSection(id) {
        appContent.style.display = "none";
        iconContent.style.display = "block";
        sections.forEach(function (sec) { sec.classList.add("hidden"); });
        var target = document.getElementById(id);
        if (target) target.classList.remove("hidden");
    }

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

            // Toggle which table panel is visible
            if (appPanel && festivalPanel) {
                if (stallLayoutMode) {
                    appPanel.style.display      = "none";
                    festivalPanel.style.display = "block";
                } else {
                    appPanel.style.display      = "block";
                    festivalPanel.style.display = "none";
                }
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
                if (stallLayoutMode) {
                    loadFestivalSummary();
                } else {
                    loadApplications();
                }
            }

            // Load Event Details (polygons dropdown, events list)
            if (key === "placeholder-event") {
                loadEventPolygonDropdown();
                loadLguEventsList();
            }

            if (key === "placeholder-analytics") {
                loadLguEventAnalytics();
            }

            // If we just opened the stall view, fix Leaflet map size and refit bounds
            if (key === "stall" && typeof map !== "undefined" && map && map.invalidateSize) {
                setTimeout(function () {
                    map.invalidateSize();

                    if (cityBoundaryBounds) {
                        map.fitBounds(cityBoundaryBounds);
                        map.setMaxBounds(cityBoundaryBounds);
                        map.options.minZoom = map.getZoom();
                    }
                }, 200);
            }
        });
    });

    // LGU Menu item clicks
    document.addEventListener("click", function (e) {
        var btn = e.target.closest && e.target.closest(".vendor-menu-item[data-action]");
        if (!btn) return;
        var action = btn.getAttribute("data-action");
        if (action === "lgu-general") {
            var gsModal = document.getElementById("lguGeneralSettingsModal");
            if (gsModal) gsModal.style.display = "flex";
        }
        if (action === "lgu-help") {
            alert("Help and Support: coming soon.");
        }
        if (action === "lgu-landmarks-map") {
            // Navigate inside the LGU iconContent screens
            showSection("lgu-landmarks-map");
        }
    });

    // Back buttons – return to hero + grid, or to specific section if data-back-to
    document.querySelectorAll(".back-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var backTo = btn.getAttribute && btn.getAttribute("data-back-to");
            if (backTo) {
                showSection(backTo);
                return;
            }
            iconContent.style.display = "none";
            appContent.style.display  = "block";

            sections.forEach(function (sec) {
                sec.classList.add("hidden");
            });

            stallLayoutMode   = false;
            stallPlacementMode = false;
        });
    });

    // LGU Add Event modal
    var addEventBtn   = document.getElementById("lguAddEventBtn");
    var addEventModal = document.getElementById("lguAddEventModal");
    var addEventClose = document.getElementById("lguAddEventModalClose");
    var addEventCancel = document.getElementById("lguAddEventCancel");
    var addEventForm  = document.getElementById("lguAddEventForm");

    function openAddEventModal() {
        if (addEventModal) {
            addEventModal.style.display = "flex";
            addEventModal.classList.add("open");
        }
    }
    function closeAddEventModal() {
        if (addEventModal) {
            addEventModal.style.display = "none";
            addEventModal.classList.remove("open");
        }
        if (addEventForm) addEventForm.reset();
    }

    if (addEventBtn) addEventBtn.addEventListener("click", openAddEventModal);
    if (addEventClose) addEventClose.addEventListener("click", closeAddEventModal);
    if (addEventCancel) addEventCancel.addEventListener("click", closeAddEventModal);

    if (addEventModal) {
        addEventModal.addEventListener("click", function (e) {
            if (e.target === addEventModal) closeAddEventModal();
        });
    }

    if (addEventForm) {
        addEventForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var fd = new FormData(addEventForm);
            $.ajax({
                url: phpFolder + "/add_event.php",
                type: "POST",
                data: fd,
                processData: false,
                contentType: false,
                dataType: "json",
                success: function (res) {
                    if (res && res.status === "success") {
                        alert(res.message || "Event added.");
                        closeAddEventModal();
                        loadLguEventsList();
                    } else {
                        alert((res && res.message) || "Failed to add event.");
                    }
                },
                error: function () {
                    alert("Failed to add event.");
                }
            });
        });
    }

    // LGU General Settings - change name and password
    var lguChangeNameBtn = document.getElementById("lguChangeNameBtn");
    var lguNewNameInput = document.getElementById("lguNewName");
    if (lguChangeNameBtn && lguNewNameInput) {
        lguChangeNameBtn.addEventListener("click", function () {
            var newName = lguNewNameInput.value.trim();
            if (!newName) { alert("Please enter a new name."); return; }
            $.post("lgu_change_name.php", { new_name: newName })
                .done(function (res) {
                    if (res && res.status === "success") {
                        alert(res.message);
                        var title = document.querySelector("#lgu-menu .vendor-menu-profile-title");
                        if (title) title.textContent = res.fullName;
                        lguNewNameInput.value = "";
                    } else alert((res && res.message) || "Failed.");
                })
                .fail(function () { alert("Failed to update name."); });
        });
    }
    var lguChangePasswordBtn = document.getElementById("lguChangePasswordBtn");
    var lguCurPwd = document.getElementById("lguCurrentPassword");
    var lguNewPwd = document.getElementById("lguNewPassword");
    var lguConfPwd = document.getElementById("lguConfirmPassword");
    if (lguChangePasswordBtn && lguCurPwd && lguNewPwd && lguConfPwd) {
        lguChangePasswordBtn.addEventListener("click", function () {
            var c = lguCurPwd.value, n = lguNewPwd.value, f = lguConfPwd.value;
            if (!c || !n || !f) { alert("Fill all password fields."); return; }
            if (n !== f) { alert("New and confirm password must match."); return; }
            $.post("lgu_change_password.php", { current_password: c, new_password: n, confirm_password: f })
                .done(function (res) {
                    if (res && res.status === "success") {
                        alert(res.message);
                        lguCurPwd.value = lguNewPwd.value = lguConfPwd.value = "";
                    } else alert((res && res.message) || "Failed.");
                })
                .fail(function () { alert("Failed."); });
        });
    }

    // LGU General Settings modal - close
    var gsClose = document.getElementById("lguGeneralSettingsClose");
    var gsModal = document.getElementById("lguGeneralSettingsModal");
    if (gsClose && gsModal) {
        gsClose.addEventListener("click", function () { gsModal.style.display = "none"; });
        gsModal.addEventListener("click", function (e) {
            if (e.target === gsModal) gsModal.style.display = "none";
        });
    }

    // LGU Avatar modal (dashboard + menu)
    (function initLguAvatarPicker() {
        var AVATAR_PRESETS = [
            { id: "avatar-happy",  label: "Alex",      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex" },
            { id: "avatar-cool",   label: "Michael",   imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael" },
            { id: "avatar-nerd",   label: "Alexander", imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Alexander" },
            { id: "avatar-artist", label: "Valentina", imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Valentina" },
            { id: "avatar-mentor", label: "Kimberly",  imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Jack" },
            { id: "avatar-wizard", label: "Jack",      imageUrl: "https://api.dicebear.com/9.x/toon-head/svg?seed=Kimberly" }
        ];
        var modal = document.getElementById("lguAvatarModal");
        var modalClose = document.getElementById("lguAvatarModalClose");
        var presetList = document.getElementById("lguAvatarPresetList");
        var uploadBtn = document.getElementById("lguAvatarUploadBtn");
        var saveBtn = document.getElementById("lguAvatarSaveBtn");
        var fileInput = document.getElementById("lguAvatarFileInput");
        var menuBtn = document.getElementById("lguMenuAvatarBtn");
        var menuImg = document.getElementById("lguMenuAvatarImg");
        if (!modal || !presetList || !saveBtn || !uploadBtn || !fileInput) return;

        var selectedPresetUrl = "";
        var avatarSource = "none";
        var currentPreviewImg = null;

        function openModal() {
            currentPreviewImg = menuImg;
            modal.style.display = "flex";
        }
        function closeModal() {
            modal.style.display = "none";
        }
        function updateAllAvatars(src) {
            if (menuImg) menuImg.src = src;
        }

        function renderPresets() {
            presetList.innerHTML = "";
            AVATAR_PRESETS.forEach(function (p) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "lgu-avatar-preset";
                btn.dataset.url = p.imageUrl;
                btn.innerHTML = "<img src=\"" + p.imageUrl + "\" alt=\"" + p.label + "\"><span>" + p.label + "</span>";
                btn.addEventListener("click", function () {
                    avatarSource = "preset";
                    selectedPresetUrl = p.imageUrl;
                    fileInput.value = "";
                    presetList.querySelectorAll(".lgu-avatar-preset").forEach(function (el) { el.classList.remove("selected"); });
                    btn.classList.add("selected");
                    if (currentPreviewImg) currentPreviewImg.src = p.imageUrl;
                });
                presetList.appendChild(btn);
            });
        }

        if (menuBtn) menuBtn.addEventListener("click", openModal);
        if (modalClose) modalClose.addEventListener("click", closeModal);
        modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
        uploadBtn.addEventListener("click", function () { fileInput.click(); });
        fileInput.addEventListener("change", function () {
            var file = fileInput.files && fileInput.files[0];
            if (!file) return;
            avatarSource = "upload";
            selectedPresetUrl = "";
            presetList.querySelectorAll(".lgu-avatar-preset").forEach(function (el) { el.classList.remove("selected"); });
            var reader = new FileReader();
            reader.onload = function (ev) {
                if (currentPreviewImg && ev.target && typeof ev.target.result === "string") {
                    currentPreviewImg.src = ev.target.result;
                }
            };
            reader.readAsDataURL(file);
        });
        saveBtn.addEventListener("click", function () {
            var fd = new FormData();
            fd.append("avatar_source", avatarSource);
            if (avatarSource === "preset") {
                fd.append("avatar_preset_url", selectedPresetUrl);
            } else if (avatarSource === "upload") {
                var file = fileInput.files && fileInput.files[0];
                if (file) fd.append("profile_image", file);
            }
            fetch("lgu_update_profile.php", { method: "POST", body: fd })
                .then(function (r) { return r.json(); })
                .then(function (res) {
                    if (res && res.status === "success") {
                        var src = res.avatar || (avatarSource === "preset" ? selectedPresetUrl : "");
                        if (src) updateAllAvatars(src);
                        closeModal();
                    } else {
                        alert((res && res.message) || "Failed to update profile picture.");
                    }
                })
                .catch(function () { alert("Failed to update profile picture."); });
        });
        renderPresets();
    })();

    // Welcome popup (after login)
    if (typeof lguShowWelcome !== "undefined" && lguShowWelcome) {
        var w = document.getElementById("lguWelcomePopup");
        if (w) {
            w.style.display = "flex";
            w.onclick = function () { w.style.display = "none"; };
        }
    }
});

function loadEventPolygonDropdown() {
    var sel = document.getElementById("lguEventPolygonSelect");
    if (!sel) return;
    $.getJSON(phpFolder + "/get_polygon_names.php", function (data) {
        sel.innerHTML = '<option value="">-- Select polygon (optional) --</option>';
        (data || []).forEach(function (p) {
            var opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name || ("Polygon #" + p.id);
            sel.appendChild(opt);
        });
    }).fail(function () {
        sel.innerHTML = '<option value="">-- Select polygon (optional) --</option>';
    });
}

var lguEventAnalyticsChart = null;

function loadLguEventAnalytics() {
    var el = document.getElementById("lguEventAnalyticsList");
    var chartCanvas = document.getElementById("lguEventAnalyticsChart");
    if (!el) return;
    el.innerHTML = "<p>Loading...</p>";
    if (chartCanvas) chartCanvas.parentNode.style.display = "none";

    $.getJSON(phpFolder + "/get_event_analytics.php", function (data) {
        if (!data || data.length === 0) {
            el.innerHTML = "<p class=\"lgu-events-empty\">No events yet.</p>";
            if (chartCanvas) chartCanvas.parentNode.style.display = "none";
            return;
        }

        var labels = data.map(function (ev) { return ev.event_name || "Event"; });
        var favorites = data.map(function (ev) { return parseInt(ev.favorites_count, 10) || 0; });
        var ratings = data.map(function (ev) { return parseInt(ev.ratings_count, 10) || 0; });
        var reviews = data.map(function (ev) { return parseInt(ev.reviews_count, 10) || 0; });

        if (chartCanvas && typeof Chart !== "undefined") {
            chartCanvas.parentNode.style.display = "block";
            var ctx = chartCanvas.getContext("2d");
            if (lguEventAnalyticsChart) lguEventAnalyticsChart.destroy();
            lguEventAnalyticsChart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [
                        { label: "Favorites", data: favorites, backgroundColor: "rgba(33, 150, 243, 0.7)", borderColor: "rgb(33, 150, 243)", borderWidth: 1 },
                        { label: "Ratings", data: ratings, backgroundColor: "rgba(76, 175, 80, 0.7)", borderColor: "rgb(76, 175, 80)", borderWidth: 1 },
                        { label: "Reviews", data: reviews, backgroundColor: "rgba(255, 152, 0, 0.7)", borderColor: "rgb(255, 152, 0)", borderWidth: 1 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    },
                    plugins: {
                        legend: { position: "top" }
                    }
                }
            });
        }

        var html = "<div class=\"lgu-analytics-table-wrap\"><table class=\"lgu-analytics-table\"><thead><tr><th>Event</th><th>Favorites</th><th>Ratings (avg)</th><th>Total Reviews</th></tr></thead><tbody>";
        data.forEach(function (ev) {
            var avg = parseFloat(ev.avg_rating) || 0;
            html += "<tr><td>" + (ev.event_name || "") + "</td><td>" + (ev.favorites_count || 0) + "</td><td>" + (ev.ratings_count || 0) + " (" + (avg > 0 ? avg.toFixed(1) : "-") + ")</td><td>" + (ev.reviews_count || 0) + "</td></tr>";
        });
        html += "</tbody></table></div>";
        el.innerHTML = html;
    }).fail(function () {
        el.innerHTML = "<p class=\"lgu-events-empty\">Could not load analytics.</p>";
        if (chartCanvas) chartCanvas.parentNode.style.display = "none";
    });
}

function loadLguEventsList() {
    var el = document.getElementById("lguEventsList");
    if (!el) return;
    $.getJSON(phpFolder + "/get_events.php", function (data) {
        if (!data || data.length === 0) {
            el.innerHTML = "<p class=\"lgu-events-empty\">No events yet. Click Add Event to create one.</p>";
            return;
        }
        var html = "<div class=\"lgu-events-table-wrap\"><table class=\"lgu-events-table\"><thead><tr><th>Event</th><th>Start</th><th>End</th><th>Location</th></tr></thead><tbody>";
        data.forEach(function (ev) {
            html += "<tr><td>" + (ev.event_name || "") + "</td><td>" + (ev.start_date || "") + "</td><td>" + (ev.end_date || "") + "</td><td>" + (ev.location || "") + "</td></tr>";
        });
        html += "</tbody></table></div>";
        el.innerHTML = html;
    }).fail(function () {
        el.innerHTML = "<p class=\"lgu-events-empty\">Could not load events. Ensure the events table exists (run SQL/events.sql).</p>";
    });
}

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
    } else if (app.status === 'approved') {
        actionsHtml =
            '<button class="app-action-btn app-cancel" data-id="' + app.id + '" data-stall="' + app.stall_id + '">Cancel</button>';
    } else if (app.status === 'rejected' || app.status === 'cancelled') {
        actionsHtml =
            '<button class="app-action-btn app-delete" data-id="' + app.id + '" data-stall="' + app.stall_id + '">Delete</button>';
    }

    return (
        '<tr data-app-id="' + app.id + '" data-stall-id="' + app.stall_id + '">' +
            '<td>' + (app.vendor_name    || '') + '</td>' +
            '<td>' + (app.stall_name     || '') + '</td>' +
            '<td>' + (app.applied_at     || '') + '</td>' +
            '<td>' + (app.product_type   || '') + '</td>' +
            '<td>' + (app.stall_size     || '') + '</td>' +
            '<td><img src="tourism/uploads/stalls/' + (app.stall_image || 'noimg.png') + '" width="60"></td>' +
            '<td>' + statusPill(app.status) + '</td>' +
            '<td>' + actionsHtml + '</td>' +
        '</tr>'
    );
}

// Load per-application list (Stall Applications mode)
function loadApplications() {
    var tbody = $('#applicationTable tbody');
    if (!tbody.length) return;

    $.getJSON(phpFolder + '/get_stall_applications.php', function (res) {
        console.log('applications response:', res);

        if (!res || res.status !== 'success') {
            tbody.empty();
            tbody.append('<tr><td colspan="8">Unable to load applications.</td></tr>');
            return;
        }

        var rows = res.data || [];
        tbody.empty();

        if (!rows.length) {
            tbody.append('<tr><td colspan="8">No stall applications yet.</td></tr>');
            return;
        }

        rows.forEach(function (app) {
            tbody.append(buildApplicationRow(app));
        });
    }).fail(function () {
        tbody.empty();
        tbody.append(
            '<tr><td colspan="8">Server error loading applications.</td></tr>'
        );
    });
}

// Change application status via AJAX and keep stall markers in sync
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
            stallStatus = 'occupied';
        } else if (newStatus === 'rejected' || newStatus === 'cancelled') {
            stallStatus = 'available';
        }

        if (stallStatus && typeof updateLocalStallStatus === 'function') {
            updateLocalStallStatus(stallId, stallStatus);
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

function deleteApplication(appId) {
    $.post(phpFolder + '/delete_stall_application.php', {
        id: appId
    }, function (res) {
        console.log('delete_stall_application result:', res);

        if (!res || res.status !== 'success') {
            alert(res && res.message ? res.message : 'Failed to delete application.');
            return;
        }

        loadApplications();
    }, 'json').fail(function (jqXHR, textStatus, errorThrown) {
        console.error('AJAX error (delete):', textStatus, errorThrown, jqXHR.responseText);
        alert('Server error deleting application.');
    });
}

// Event delegation for action buttons in Application List View
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

$(document).on('click', '.app-delete', function () {
    var appId = $(this).data('id');
    if (!confirm('Permanently delete this application? This cannot be undone.')) {
        return;
    }
    deleteApplication(appId);
});

// ==========================
// Festival summary table (Stall Layout mode)
// ==========================
function loadFestivalSummary() {
    var tbody = $('#festivalTable tbody');
    if (!tbody.length) return;

    $.getJSON(phpFolder + '/get_stall_festival_summary.php', function (res) {
        console.log('festival summary response:', res);

        if (!res || res.status !== 'success') {
            tbody.empty();
            tbody.append('<tr><td colspan="6">Unable to load stall summary.</td></tr>');
            return;
        }

        var rows = res.data || [];
        tbody.empty();

        if (!rows.length) {
            tbody.append('<tr><td colspan="6">No stalls found.</td></tr>');
            return;
        }

        rows.forEach(function (row) {
            var stallIds = (row.stalls || [])
                .map(function (s) { return s.id; })
                .join(',');

            var hasStalls = row.stalls && row.stalls.length;

            var viewBtnHtml = hasStalls
                ? '<button class="festival-view-stalls" data-festival="' +
                    (row.festival || '') + '" data-stall-ids="' +
                    stallIds + '">View</button>'
                : '<span style="font-size:11px;color:#999;">None</span>';

            tbody.append(
                '<tr>' +
                  '<td>' + (row.festival || '') + '</td>' +
                  '<td>' + (row.total || 0) + '</td>' +
                  '<td>' + (row.available || 0) + '</td>' +
                  '<td>' + (row.reserved || 0) + '</td>' +
                  '<td>' + (row.occupied || 0) + '</td>' +
                  '<td>' + viewBtnHtml + '</td>' +
                '</tr>'
            );
        });
    }).fail(function () {
        tbody.empty();
        tbody.append(
            '<tr><td colspan="6">Server error loading stall summary.</td></tr>'
        );
    });
}

// Modal view handler: show reserved/occupied stalls with vendor, stall image, and products
$(document).on('click', '.festival-view-stalls', function () {
    var festival = $(this).data('festival') || 'Festival';
    var idsStr   = $(this).data('stall-ids') || '';
    if (!idsStr) {
        alert('No reserved or occupied stalls for ' + festival + '.');
        return;
    }

    var stallIds = idsStr.toString().split(',').filter(function (id) { return id; });
    if (!stallIds.length) {
        alert('No reserved or occupied stalls for ' + festival + '.');
        return;
    }

    openFestivalStallsModal(festival, stallIds);
});

function openFestivalStallsModal(festivalName, stallIds) {
    var $modal = $('#festivalStallsModal');
    var $title = $('#festivalModalTitle');
    var $body  = $('#festivalModalBody');

    if (!$modal.length || !$title.length || !$body.length) return;

    $title.text(festivalName + ' — Reserved / Occupied Stalls');
    $body.html('<p style="font-size:12px;">Loading stall details…</p>');
    $modal.addClass('open').show();

    var requests = stallIds.map(function (id) {
        return $.getJSON(phpFolder + '/get_stall_details.php', { stall_id: id })
            .then(function (res) {
                if (!res || res.status !== 'success') return null;
                return {
                    stallId:   id,
                    stall:     res.stall || {},
                    products:  res.products || []
                };
            }).catch(function () {
                return null;
            });
    });

    Promise.all(requests).then(function (results) {
        var valid = results.filter(function (r) { return r && r.stall; });
        if (!valid.length) {
            $body.html('<p style="font-size:12px;color:#c62828;">Unable to load stall details.</p>');
            return;
        }

        var html = '';
        valid.forEach(function (entry) {
            var s   = entry.stall;
            var prods = entry.products;
            var vendorName = s.vendor_name || 'Vendor';
            var stallName  = s.stall_name || 'Stall';
            var status     = 'occupied'; // in this view, all are reserved/occupied
            var type       = s.product_type || '';
            var img        = s.stall_image
                ? 'tourism/uploads/stalls/' + s.stall_image
                : 'tourism/uploads/default_stall.png';

            html += '<div class="lgu-stall-card">';
            html +=   '<div class="lgu-stall-avatar"><img src="' + img + '" alt="' + stallName + '"></div>';
            html +=   '<div class="lgu-stall-main">';
            html +=     '<div class="lgu-stall-header">';
            html +=       '<div class="lgu-stall-names">';
            html +=         '<span class="lgu-stall-vendor">' + vendorName + '</span>';
            html +=         '<span class="lgu-stall-stallname">' + stallName + '</span>';
            html +=       '</div>';
            html +=       '<span class="lgu-stall-status-pill ' + status + '">' + status + '</span>';
            html +=     '</div>';

            if (type) {
                html += '<div class="lgu-stall-type">Product type: <strong>' + type + '</strong></div>';
            }

            if (prods.length) {
                var listId = 'stall-products-' + entry.stallId;
                html += '<button type="button" class="lgu-stall-products-toggle" data-target="#' + listId + '">View products</button>';
                html += '<div id="' + listId + '" class="lgu-stall-products">';
                html +=   '<ul>';
                prods.forEach(function (p) {
                    var pImg = p.image
                        ? 'tourism/uploads/products/' + p.image
                        : 'tourism/uploads/default_product.png';

                    html += '<li>' +
                              '<span class="lgu-product-avatar"><img src="' + pImg + '" alt="' + (p.name || '') + '"></span>' +
                              '<span><strong>' + (p.name || '') + '</strong>';
                    if (p.price) {
                        html += ' — ₱ ' + parseFloat(p.price).toFixed(2);
                    }
                    if (p.category) {
                        html += ' (' + p.category + ')';
                    }
                    html += '</span></li>';
                });
                html +=   '</ul>';
                html += '</div>';
            } else {
                html += '<div class="lgu-stall-type" style="font-size:11px;color:#777;">No products listed yet.</div>';
            }

            html +=   '</div>'; // .lgu-stall-main
            html += '</div>';   // .lgu-stall-card
        });

        $body.html(html);
    });
}

// modal close handlers
$(document).on('click', '#festivalModalClose', function () {
    $('#festivalStallsModal').removeClass('open').hide();
});

$('#festivalStallsModal').on('click', function (e) {
    if (e.target.id === 'festivalStallsModal') {
        $('#festivalStallsModal').removeClass('open').hide();
    }
});

// toggle products list inside modal
$(document).on('click', '.lgu-stall-products-toggle', function () {
    var targetSel = $(this).data('target');
    if (!targetSel) return;
    $(targetSel).toggleClass('open');
});

