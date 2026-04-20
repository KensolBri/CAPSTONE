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
var pendingEventFormData = null;
var pendingEventName = '';
var isEventPolygonDrawMode = false;
var lguEventFormMode = 'add'; // add | edit
var eventCenterMarkersLayer = L.layerGroup().addTo(map);
var manualMarkerPlacementMode = false;
var lguEventsCache = [];
var lguEventsCurrentPage = 1;
var lguEventsPageSize = 10;
var applicationsCache = [];
var applicationCurrentPage = 1;
var applicationPageSize = 5;

function escapeAppHtml(str) {
    return (str == null ? '' : String(str)).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c];
    });
}

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
            marker: false,
            polyline: true,
            polygon: false,
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
            manualMarkerPlacementMode = false;
            tempMarker = layer;
            map.addLayer(tempMarker);

            showMarkerForm('Add Marker');
            positionMarkerFormAtLatLng(layer.getLatLng());
            $('#markerForm').css({ display: 'block' });

        } else if (type === 'polygon' && isEventPolygonDrawMode && pendingEventFormData) {
            saveEventPolygonAndFinalize(layer);
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
    } else {
        $('#markerId').val('');
        $('#markerName').val('');
        $('#markerCategory').val('Food');
        $('#markerDescription').val('');
        $('#markerImage').val('');
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
    // Normal POI / event marker logic
    var formData = new FormData();
    formData.append('id', $('#markerId').val());
    formData.append('name', $('#markerName').val());
    formData.append('category', $('#markerCategory').val());
    formData.append('description', $('#markerDescription').val());
    formData.append('icon_type', 'round');
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
            var icon = buildPinIcon(iconUrl);
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
                        positionMarkerFormAtLatLng(m.getLatLng());
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
        renderEventCenterMarkersFromExistingEvents();
    });
}
loadPolygons();

function loadStalls() {
    stallMarkers.forEach(function (m) {
        if (m && drawnItems.hasLayer(m)) drawnItems.removeLayer(m);
    });
    stallMarkers = [];

    $.getJSON(phpFolder + '/get_stalls.php', function(data){
        data.forEach(function(stall){
            var latlng = L.latLng(stall.lat, stall.lng);
            createStallMarker(latlng, stall.status, stall.id, stall);
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

function setEventPolygonFlowVisible(visible) {
    var box = document.getElementById('eventPolygonFlowBox');
    if (!box) return;
    box.style.display = visible ? 'block' : 'none';
}

function setEventPolygonFlowText(text) {
    var textEl = document.getElementById('eventPolygonFlowText');
    if (!textEl) return;
    textEl.textContent = text || '';
}

function resetPendingEventFlow() {
    pendingEventFormData = null;
    pendingEventName = '';
    isEventPolygonDrawMode = false;
    setEventPolygonFlowVisible(false);
}

function getPolygonCenterFromCoords(coords) {
    if (!coords || !coords.length) return null;
    var bounds = L.latLngBounds(coords.map(function (c) { return [c.lat, c.lng]; }));
    var center = bounds.getCenter();
    return { lat: center.lat, lng: center.lng };
}

function positionMarkerFormAtLatLng(latlng) {
    var formEl = document.getElementById('markerForm');
    var mapEl = document.getElementById('map');
    if (!formEl || !mapEl || !latlng || typeof map === 'undefined') return;

    var point = map.latLngToContainerPoint(latlng);
    var mapRect = mapEl.getBoundingClientRect();
    var top = window.scrollY + mapRect.top + point.y - 20;
    var left = window.scrollX + mapRect.left + point.x + 20;

    formEl.style.top = Math.max(80, top) + 'px';
    formEl.style.left = Math.max(12, left) + 'px';
}

function buildPinIcon(imageUrl) {
    var innerHtml = imageUrl
        ? '<span class="map-pin-image-wrap"><img src="' + imageUrl + '" class="map-pin-image" alt=""></span>'
        : '<span class="map-pin-dot"></span>';
    return L.divIcon({
        className: 'map-pin-marker',
        html: '<div class="map-pin-body">' + innerHtml + '</div>',
        iconSize: [30, 42],
        iconAnchor: [15, 40],
        popupAnchor: [0, -36]
    });
}

function buildEventPinIcon(imageUrl) {
    var innerHtml = imageUrl
        ? '<span class="map-pin-image-wrap"><img src="' + imageUrl + '" class="map-pin-image" alt=""></span>'
        : '<span class="map-pin-dot"></span>';
    return L.divIcon({
        className: 'map-pin-marker map-pin-event-large',
        html: '<div class="map-pin-body map-pin-body-large">' + innerHtml + '</div>',
        iconSize: [53, 74],
        iconAnchor: [26, 72],
        popupAnchor: [0, -64]
    });
}

function darkenHexColor(color, amount) {
    var c = (color || '').toString().trim();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return '#1e3a8a';
    if (c.length === 4) {
        c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    }
    var r = parseInt(c.substr(1, 2), 16);
    var g = parseInt(c.substr(3, 2), 16);
    var b = parseInt(c.substr(5, 2), 16);
    var f = Math.max(0, Math.min(1, amount || 0.35));
    r = Math.max(0, Math.round(r * (1 - f)));
    g = Math.max(0, Math.round(g * (1 - f)));
    b = Math.max(0, Math.round(b * (1 - f)));
    return '#' + [r, g, b].map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
}

function buildEventPinIconWithBorder(imageUrl, polygonColor) {
    var borderColor = darkenHexColor(polygonColor || '#2563eb', 0.38);
    var innerHtml = imageUrl
        ? '<span class="map-pin-image-wrap" style="border-color:' + borderColor + ';"><img src="' + imageUrl + '" class="map-pin-image" alt=""></span>'
        : '<span class="map-pin-dot" style="background:' + borderColor + ';border-color:' + borderColor + ';"></span>';
    return L.divIcon({
        className: 'map-pin-marker map-pin-event-large',
        html: '<div class="map-pin-body map-pin-body-large">' + innerHtml + '<span style="position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:20px solid ' + borderColor + ';"></span></div>',
        iconSize: [53, 74],
        iconAnchor: [26, 72],
        popupAnchor: [0, -64]
    });
}

function renderEventCenterMarkersFromExistingEvents() {
    if (!eventCenterMarkersLayer) return;
    eventCenterMarkersLayer.clearLayers();

    $.getJSON(phpFolder + '/get_events.php', function (events) {
        if (!events || !events.length) return;
        events.forEach(function (ev) {
            if (!ev.polygon_id) return;
            var poly = eventPolygons.find(function (p) {
                return String(p.layerId) === String(ev.polygon_id);
            });
            if (!poly) return;

            var center = poly.getBounds().getCenter();
            var icon = buildEventPinIconWithBorder(ev.event_image_display || '', (poly.options && poly.options.color) || '#2563eb');
            var marker = L.marker(center, { icon: icon, zIndexOffset: 5000 });
            marker.bindPopup('<b>' + escapeAppHtml(ev.event_name || 'Event') + '</b><br>' + escapeAppHtml(ev.location || ''));
            eventCenterMarkersLayer.addLayer(marker);
        });
    });
}

function createEventMarkerAtCenter(eventRes, center) {
    if (!eventRes || !center) return;

    var markerFd = new FormData();
    markerFd.append('name', eventRes.event_name || pendingEventName || 'Event');
    markerFd.append('category', 'Events');
    markerFd.append('description', eventRes.location || 'Event location');
    markerFd.append('icon_type', 'round');
    markerFd.append('lat', String(center.lat));
    markerFd.append('lng', String(center.lng));

    var imageFile = pendingEventFormData ? pendingEventFormData.get('event_image_display') : null;
    if (imageFile instanceof File && imageFile.size > 0) {
        markerFd.append('image', imageFile);
    }

    $.ajax({
        url: phpFolder + '/save_marker.php',
        method: 'POST',
        data: markerFd,
        processData: false,
        contentType: false
    }).always(function () {
        applyFilters();
    });
}

function saveEventPolygonAndFinalize(layer) {
    if (!pendingEventFormData) return;

    var eventName = pendingEventName || (pendingEventFormData.get('event_name') || 'Event');
    var coords = layer.getLatLngs()[0].map(function (ll) {
        return { lat: ll.lat, lng: ll.lng };
    });

    setEventPolygonFlowText('Saving polygon for "' + eventName + '"...');
    var colorInput = document.getElementById('eventPolygonColor');
    var polygonColor = (colorInput && colorInput.value) ? colorInput.value : '#008000';
    var polygonCenter = getPolygonCenterFromCoords(coords);

    $.ajax({
        url: phpFolder + '/save_polygon.php',
        method: 'POST',
        dataType: 'json',
        data: {
            name: eventName + ' Area',
            description: 'Auto-generated event area for ' + eventName,
            coordinates: JSON.stringify(coords),
            color: polygonColor
        }
    }).done(function (polyRes) {
        if (!polyRes || polyRes.status !== 'success' || !polyRes.id) {
            setEventPolygonFlowText('Failed to save polygon. Please try again.');
            if (layer && map.hasLayer(layer)) map.removeLayer(layer);
            isEventPolygonDrawMode = false;
            return;
        }

        pendingEventFormData.set('polygon_id', String(polyRes.id));
        setEventPolygonFlowText('Polygon saved. Creating event...');

        $.ajax({
            url: phpFolder + '/add_event.php',
            method: 'POST',
            data: pendingEventFormData,
            processData: false,
            contentType: false,
            dataType: 'json'
        }).done(function (eventRes) {
            if (eventRes && eventRes.status === 'success') {
                alert('Event created successfully and polygon attached.');
                createEventMarkerAtCenter(eventRes, polygonCenter);
                loadLguEventsList();
                loadPolygons();
                resetPendingEventFlow();
            } else {
                setEventPolygonFlowText((eventRes && eventRes.message) || 'Failed to create event after polygon save.');
            }
        }).fail(function () {
            setEventPolygonFlowText('Server error while creating event.');
        });
    }).fail(function () {
        setEventPolygonFlowText('Server error while saving event polygon.');
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
        isEventPolygonDrawMode = false;
    });
}

function buildStallStatusPinIcon(status, stallImage) {
    var s = (status || 'available').toLowerCase();
    var isOccupied = s === 'occupied';
    var bodyClass = isOccupied ? 'occupied' : (s === 'reserved' ? 'reserved' : 'available');
    var inner = isOccupied && stallImage
        ? '<span class="lgu-stall-pin-image-wrap"><img src="tourism/uploads/stalls/' + encodeURIComponent(stallImage) + '" class="lgu-stall-pin-image" alt=""></span>'
        : '<span class="lgu-stall-pin-dot"></span>';
    return L.divIcon({
        className: 'lgu-stall-pin-icon',
        html: '<div class="lgu-stall-pin-body ' + bodyClass + '">' + inner + '</div>',
        iconSize: [40, 54],
        iconAnchor: [20, 52],
        popupAnchor: [0, -46]
    });
}

function openLguStallStatusModal(marker) {
    if (!marker || !marker.stallId) return;
    var modal = document.getElementById('stallStatusModal');
    var title = document.getElementById('stallStatusModalTitle');
    var body = document.getElementById('stallStatusModalBody');
    if (!modal || !title || !body) return;

    title.textContent = 'Stall #' + marker.stallId;
    body.innerHTML = '<p style="font-size:12px;">Loading stall details...</p>';
    modal.style.display = 'flex';
    modal.classList.add('open');

    if (marker.stallStatus !== 'occupied') {
        body.innerHTML =
            '<div class="lgu-stall-status-modal-row">' +
                '<label>Status</label>' +
                '<select id="stallStatusSelect">' +
                    '<option value="available"' + (marker.stallStatus === 'available' ? ' selected' : '') + '>Available</option>' +
                    '<option value="reserved"' + (marker.stallStatus === 'reserved' ? ' selected' : '') + '>Reserved</option>' +
                    '<option value="occupied"' + (marker.stallStatus === 'occupied' ? ' selected' : '') + '>Occupied</option>' +
                '</select>' +
            '</div>' +
            '<div class="lgu-stall-status-modal-actions">' +
                '<button type="button" class="lgu-stall-status-btn" id="saveStallStatusBtn">Save Status</button>' +
                '<button type="button" class="lgu-stall-status-btn danger" id="removeStallBtn">Remove Stall</button>' +
            '</div>';

        document.getElementById('saveStallStatusBtn').onclick = function () {
            var nextStatus = (document.getElementById('stallStatusSelect') || {}).value || marker.stallStatus;
            $.post(phpFolder + '/update_stall.php', { id: marker.stallId, status: nextStatus }, function (res) {
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (e) { res = null; }
                }
                if (res && res.status === 'success') {
                    updateLocalStallStatus(marker.stallId, nextStatus);
                    modal.style.display = 'none';
                } else {
                    alert((res && res.message) || 'Failed to update stall.');
                }
            });
        };
        document.getElementById('removeStallBtn').onclick = function () {
            if (!confirm('Remove this stall space?')) return;
            $.post(phpFolder + '/delete_stall.php', { stall_id: marker.stallId }, function (res) {
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (e) { res = null; }
                }
                if (res && res.status === 'success') {
                    if (drawnItems.hasLayer(marker)) drawnItems.removeLayer(marker);
                    stallMarkers = stallMarkers.filter(function (m) { return m !== marker; });
                    modal.style.display = 'none';
                } else {
                    alert((res && res.message) || 'Failed to remove stall.');
                }
            });
        };
        return;
    }

    $.getJSON(phpFolder + '/get_stall_details.php', { stall_id: marker.stallId }, function (res) {
        if (!res || res.status !== 'success') {
            body.innerHTML = '<p style="font-size:12px;color:#b91c1c;">Failed to load occupied stall details.</p>';
            return;
        }
        var stall = res.stall || {};
        var products = res.products || [];
        var productsHtml = products.length
            ? '<ul class="lgu-occupied-products">' + products.map(function (p) { return '<li>' + escapeAppHtml(p.name || '') + '</li>'; }).join('') + '</ul>'
            : '<p style="font-size:12px;color:#666;">No products attached.</p>';

        body.innerHTML =
            '<div class="lgu-occupied-stall-details">' +
                '<div><b>Stall name:</b> ' + escapeAppHtml(stall.stall_name || '-') + '</div>' +
                '<div><b>Vendor name:</b> ' + escapeAppHtml(stall.vendor_name || '-') + '</div>' +
                '<div style="margin-top:8px;"><b>Products:</b></div>' +
                productsHtml +
            '</div>' +
            '<div class="lgu-stall-status-modal-actions">' +
                '<button type="button" class="lgu-stall-status-btn warn" id="releaseOccupiedStallBtn">Set Available</button>' +
                '<button type="button" class="lgu-stall-status-btn danger" id="removeOccupiedStallBtn">Remove Stall</button>' +
            '</div>';

        document.getElementById('releaseOccupiedStallBtn').onclick = function () {
            $.post(phpFolder + '/update_stall.php', { id: marker.stallId, status: 'available' }, function (upRes) {
                if (typeof upRes === 'string') {
                    try { upRes = JSON.parse(upRes); } catch (e) { upRes = null; }
                }
                if (!(upRes && upRes.status === 'success')) {
                    alert((upRes && upRes.message) || 'Failed to release stall.');
                    return;
                }
                var appId = stall.application_id || 0;
                if (appId) {
                    $.post(phpFolder + '/update_stall_application.php', { id: appId, status: 'cancelled' });
                }
                updateLocalStallStatus(marker.stallId, 'available');
                modal.style.display = 'none';
            });
        };
        document.getElementById('removeOccupiedStallBtn').onclick = function () {
            if (!confirm('Remove this occupied stall and related records?')) return;
            $.post(phpFolder + '/delete_stall.php', { stall_id: marker.stallId }, function (delRes) {
                if (typeof delRes === 'string') {
                    try { delRes = JSON.parse(delRes); } catch (e) { delRes = null; }
                }
                if (delRes && delRes.status === 'success') {
                    if (drawnItems.hasLayer(marker)) drawnItems.removeLayer(marker);
                    stallMarkers = stallMarkers.filter(function (m) { return m !== marker; });
                    modal.style.display = 'none';
                } else {
                    alert((delRes && delRes.message) || 'Failed to remove stall.');
                }
            });
        };
    });
}

// Create a stall marker pin (Available / Reserved / Occupied)
function createStallMarker(latlng, status, id, stallData) {
    status = status || 'available';
    stallData = stallData || {};
    var icon = buildStallStatusPinIcon(status, stallData.stall_image || '');
    var m = L.marker(latlng, { icon: icon }).addTo(drawnItems);
    m.stallStatus = status;
    if (id) m.stallId = id;
    m.stallMeta = stallData;

    m.on('click', function(e){
        L.DomEvent.stopPropagation(e);
        openLguStallStatusModal(m);
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
            if (status !== 'occupied') {
                m.stallMeta = m.stallMeta || {};
                m.stallMeta.stall_image = '';
            }
            var newIcon = buildStallStatusPinIcon(status, (m.stallMeta || {}).stall_image || '');
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
    var mapContainerEl  = document.getElementById("mapContainer");
    var filtersEl       = document.getElementById("filters");
    var markerFormEl    = document.getElementById("markerForm");
    var stallLayoutToolsEl = document.getElementById("stallLayoutTools");

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
                    if (mapContainerEl) mapContainerEl.style.display = "block";
                    if (filtersEl) filtersEl.style.display = "block";
                    if (stallLayoutToolsEl) stallLayoutToolsEl.style.display = "flex";
                } else {
                    appPanel.style.display      = "block";
                    festivalPanel.style.display = "none";
                    if (mapContainerEl) mapContainerEl.style.display = "none";
                    if (filtersEl) filtersEl.style.display = "none";
                    if (stallLayoutToolsEl) stallLayoutToolsEl.style.display = "none";
                    if (markerFormEl) markerFormEl.style.display = "none";
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
    var addEventModalTitle = document.getElementById("lguAddEventModalTitle");
    var addEventSubmitBtn = document.getElementById("lguAddEventSubmitBtn");
    var eventIdInput = document.getElementById("lguEventId");
    var existingEventImageInput = document.getElementById("lguExistingEventImageDisplay");
    var existingEventPlanInput = document.getElementById("lguExistingEventPlan");
    var eventPolygonIdInput = document.getElementById("lguEventPolygonId");
    var startEventPolygonBtn = document.getElementById('startEventPolygonBtn');
    var cancelEventPolygonBtn = document.getElementById('cancelEventPolygonBtn');
    var addMarkerBtn = document.getElementById('addMarkerBtn');
    var stallStatusModal = document.getElementById('stallStatusModal');
    var stallStatusModalClose = document.getElementById('stallStatusModalClose');

    function setAddEventMode(mode, eventData) {
        lguEventFormMode = mode === 'edit' ? 'edit' : 'add';
        if (!addEventForm) return;

        if (lguEventFormMode === 'add') {
            addEventForm.reset();
            if (eventIdInput) eventIdInput.value = '';
            if (existingEventImageInput) existingEventImageInput.value = '';
            if (existingEventPlanInput) existingEventPlanInput.value = '';
            if (eventPolygonIdInput) eventPolygonIdInput.value = '';
            if (addEventModalTitle) addEventModalTitle.textContent = 'Add Event';
            if (addEventSubmitBtn) addEventSubmitBtn.textContent = 'Add Event';
            return;
        }

        eventData = eventData || {};
        if (addEventModalTitle) addEventModalTitle.textContent = 'Edit Event';
        if (addEventSubmitBtn) addEventSubmitBtn.textContent = 'Save Changes';
        if (eventIdInput) eventIdInput.value = eventData.id || '';
        if (existingEventImageInput) existingEventImageInput.value = eventData.event_image_display || '';
        if (existingEventPlanInput) existingEventPlanInput.value = eventData.event_plan || '';
        if (eventPolygonIdInput) eventPolygonIdInput.value = eventData.polygon_id || '';

        if (addEventForm.elements['event_name']) addEventForm.elements['event_name'].value = eventData.event_name || '';
        if (addEventForm.elements['start_date']) addEventForm.elements['start_date'].value = eventData.start_date || '';
        if (addEventForm.elements['end_date']) addEventForm.elements['end_date'].value = eventData.end_date || '';
        if (addEventForm.elements['location']) addEventForm.elements['location'].value = eventData.location || '';
    }

    function openAddEventModal() {
        setAddEventMode('add');
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
        if (lguEventFormMode === 'add') {
            if (addEventForm) addEventForm.reset();
        }
    }

    if (addEventBtn) addEventBtn.addEventListener("click", openAddEventModal);
    if (addEventClose) addEventClose.addEventListener("click", function () {
        closeAddEventModal();
        setAddEventMode('add');
    });
    if (addEventCancel) addEventCancel.addEventListener("click", function () {
        closeAddEventModal();
        setAddEventMode('add');
    });

    if (addEventModal) {
        addEventModal.addEventListener("click", function (e) {
            if (e.target === addEventModal) {
                closeAddEventModal();
                setAddEventMode('add');
            }
        });
    }

    document.addEventListener('click', function (e) {
        var kebab = e.target.closest && e.target.closest('.lgu-event-kebab');
        if (kebab) {
            e.stopPropagation();
            var menu = kebab.parentElement && kebab.parentElement.querySelector('.lgu-event-menu');
            if (!menu) return;
            document.querySelectorAll('.lgu-event-menu.open').forEach(function (m) {
                if (m !== menu) m.classList.remove('open');
            });
            menu.classList.toggle('open');
            return;
        }

        var editBtn = e.target.closest && e.target.closest('.lgu-event-menu-edit');
        if (editBtn) {
            e.stopPropagation();
            var payload = editBtn.getAttribute('data-event');
            if (!payload) return;
            try {
                var eventData = JSON.parse(decodeURIComponent(payload));
                setAddEventMode('edit', eventData);
                if (addEventModal) {
                    addEventModal.style.display = 'flex';
                    addEventModal.classList.add('open');
                }
            } catch (err) {
                alert('Failed to open edit form.');
            }
            return;
        }

        var delBtn = e.target.closest && e.target.closest('.lgu-event-menu-delete');
        if (delBtn) {
            e.stopPropagation();
            var eventId = delBtn.getAttribute('data-id');
            if (!eventId) return;
            if (!confirm('Delete this event?')) return;

            $.post(phpFolder + '/delete_event.php', { id: eventId }, function (res) {
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (err2) { res = null; }
                }
                if (res && res.status === 'success') {
                    loadLguEventsList();
                    loadPolygons();
                    applyFilters();
                } else {
                    alert((res && res.message) || 'Failed to delete event.');
                }
            }).fail(function () {
                alert('Server error while deleting event.');
            });
            return;
        }

        document.querySelectorAll('.lgu-event-menu.open').forEach(function (m) {
            m.classList.remove('open');
        });
    });

    document.addEventListener('click', function (e) {
        var pageBtn = e.target.closest && e.target.closest('.lgu-events-page-btn');
        if (!pageBtn || pageBtn.disabled) return;
        var dir = pageBtn.getAttribute('data-page');
        if (dir === 'prev') lguEventsCurrentPage -= 1;
        if (dir === 'next') lguEventsCurrentPage += 1;
        renderLguEventsTable();
    });

    if (addEventForm) {
        addEventForm.addEventListener("submit", function (e) {
            e.preventDefault();

            if (lguEventFormMode === 'edit') {
                var editFd = new FormData(addEventForm);
                $.ajax({
                    url: phpFolder + "/update_event.php",
                    method: "POST",
                    data: editFd,
                    processData: false,
                    contentType: false,
                    dataType: "json"
                }).done(function (res) {
                    if (res && res.status === 'success') {
                        alert(res.message || 'Event updated.');
                        closeAddEventModal();
                        setAddEventMode('add');
                        loadLguEventsList();
                    } else {
                        alert((res && res.message) || 'Failed to update event.');
                    }
                }).fail(function () {
                    alert('Server error while updating event.');
                });
                return;
            }

            if (pendingEventFormData) {
                alert("Finish or cancel the current event setup first.");
                return;
            }

            pendingEventFormData = new FormData(addEventForm);
            pendingEventName = (pendingEventFormData.get('event_name') || 'Event').toString();

            closeAddEventModal();
            stallLayoutMode = true;
            showSection("stall");
            if (stallTitle) {
                stallTitle.innerHTML = '<img src="map.png" alt="Map Icon" class="map-icon"/> Stall Layout';
            }
            if (appPanel && festivalPanel) {
                appPanel.style.display = "none";
                festivalPanel.style.display = "block";
            }
            if (mapContainerEl) mapContainerEl.style.display = "block";
            if (filtersEl) filtersEl.style.display = "block";
            if (stallLayoutToolsEl) stallLayoutToolsEl.style.display = "flex";

            setEventPolygonFlowVisible(true);
            setEventPolygonFlowText('Event "' + pendingEventName + '" is pending. Click "Create Event Polygon", draw one polygon on the map, and the event will be created automatically.');

            setTimeout(function () {
                if (typeof map !== "undefined" && map && map.invalidateSize) {
                    map.invalidateSize();
                }
            }, 200);
        });
    }

    if (startEventPolygonBtn) {
        startEventPolygonBtn.addEventListener('click', function () {
            if (!pendingEventFormData) {
                alert('No pending event setup found.');
                return;
            }
            if (isEventPolygonDrawMode) {
                alert('Polygon drawing is already active. Draw the polygon on the map.');
                return;
            }
            isEventPolygonDrawMode = true;
            setEventPolygonFlowText('Draw the polygon now on the map for "' + pendingEventName + '".');
            new L.Draw.Polygon(map).enable();
        });
    }

    if (addMarkerBtn) {
        addMarkerBtn.addEventListener('click', function () {
            if (!canEdit) {
                alert('Only LGU can add markers.');
                return;
            }
            if (!stallLayoutMode) {
                alert('Open Stall Layout first.');
                return;
            }
            manualMarkerPlacementMode = true;
            new L.Draw.Marker(map).enable();
        });
    }

    if (cancelEventPolygonBtn) {
        cancelEventPolygonBtn.addEventListener('click', function () {
            if (!pendingEventFormData) {
                setEventPolygonFlowVisible(false);
                return;
            }
            if (!confirm('Cancel this pending event setup?')) return;
            resetPendingEventFlow();
        });
    }

    if (stallStatusModalClose && stallStatusModal) {
        stallStatusModalClose.addEventListener('click', function () {
            stallStatusModal.style.display = 'none';
            stallStatusModal.classList.remove('open');
        });
        stallStatusModal.addEventListener('click', function (e) {
            if (e.target === stallStatusModal) {
                stallStatusModal.style.display = 'none';
                stallStatusModal.classList.remove('open');
            }
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
    var pagination = document.getElementById("lguEventsPagination");
    if (!el) return;
    $.getJSON(phpFolder + "/get_events.php", function (data) {
        lguEventsCache = data || [];
        renderLguEventsTable();
    }).fail(function () {
        el.innerHTML = "<p class=\"lgu-events-empty\">Could not load events. Ensure the events table exists (run SQL/events.sql).</p>";
        if (pagination) pagination.innerHTML = "";
    });
}

function renderLguEventsTable() {
    var el = document.getElementById("lguEventsList");
    var pagination = document.getElementById("lguEventsPagination");
    if (!el) return;

    var data = lguEventsCache || [];
    if (!data.length) {
            el.innerHTML = "<p class=\"lgu-events-empty\">No events yet. Click Add Event to create one.</p>";
            if (pagination) pagination.innerHTML = "";
            return;
        }

    var totalPages = Math.max(1, Math.ceil(data.length / lguEventsPageSize));
    if (lguEventsCurrentPage > totalPages) lguEventsCurrentPage = totalPages;
    if (lguEventsCurrentPage < 1) lguEventsCurrentPage = 1;
    var start = (lguEventsCurrentPage - 1) * lguEventsPageSize;
    var pageRows = data.slice(start, start + lguEventsPageSize);

    var html = "<div class=\"lgu-events-table-wrap\"><table class=\"lgu-events-table\"><thead><tr><th>Event</th><th>Start</th><th>End</th><th>Location</th><th>Action</th></tr></thead><tbody>";
        pageRows.forEach(function (ev) {
            var payload = encodeURIComponent(JSON.stringify({
                id: ev.id || '',
                event_name: ev.event_name || '',
                start_date: ev.start_date || '',
                end_date: ev.end_date || '',
                location: ev.location || '',
                event_image_display: ev.event_image_display || '',
                event_plan: ev.event_plan || '',
                polygon_id: ev.polygon_id || ''
            }));
            html += "<tr>" +
                "<td>" + escapeAppHtml(ev.event_name || "") + "</td>" +
                "<td>" + escapeAppHtml(ev.start_date || "") + "</td>" +
                "<td>" + escapeAppHtml(ev.end_date || "") + "</td>" +
                "<td>" + escapeAppHtml(ev.location || "") + "</td>" +
                "<td class=\"lgu-event-actions-cell\">" +
                    "<button type=\"button\" class=\"lgu-event-kebab\" aria-label=\"Event actions\">&#8942;</button>" +
                    "<div class=\"lgu-event-menu\">" +
                        "<button type=\"button\" class=\"lgu-event-menu-edit\" data-event=\"" + payload + "\">Edit</button>" +
                        "<button type=\"button\" class=\"lgu-event-menu-delete\" data-id=\"" + (ev.id || '') + "\">Delete</button>" +
                    "</div>" +
                "</td>" +
            "</tr>";
        });
        html += "</tbody></table></div>";
        el.innerHTML = html;

    if (pagination) {
        var prevDisabled = lguEventsCurrentPage <= 1 ? 'disabled' : '';
        var nextDisabled = lguEventsCurrentPage >= totalPages ? 'disabled' : '';
        pagination.innerHTML =
            '<button class="lgu-events-page-btn" data-page="prev" ' + prevDisabled + '>Prev</button>' +
            '<span class="lgu-events-page-label">Page ' + lguEventsCurrentPage + ' of ' + totalPages + '</span>' +
            '<button class="lgu-events-page-btn" data-page="next" ' + nextDisabled + '>Next</button>';
    }
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

function getFilteredApplications() {
    var searchVal = ($('#applicationSearchInput').val() || '').toLowerCase().trim();
    var statusVal = ($('#applicationStatusFilter').val() || '').toLowerCase().trim();
    return applicationsCache.filter(function (app) {
        var vendorName = (app.vendor_name || '').toLowerCase();
        var stallName = (app.stall_name || '').toLowerCase();
        var productType = (app.product_type || '').toLowerCase();
        var appStatus = (app.status || '').toLowerCase();

        var matchesSearch = !searchVal ||
            vendorName.includes(searchVal) ||
            stallName.includes(searchVal) ||
            productType.includes(searchVal);
        var matchesStatus = !statusVal || appStatus === statusVal;
        return matchesSearch && matchesStatus;
    });
}

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
            '<td>' + escapeAppHtml(app.vendor_name || '') + '</td>' +
            '<td>' + escapeAppHtml(app.stall_name || '') + '</td>' +
            '<td>' + escapeAppHtml(app.applied_at || '') + '</td>' +
            '<td>' + escapeAppHtml(app.product_type || '') + '</td>' +
            '<td>' + escapeAppHtml(app.stall_size || '') + '</td>' +
            '<td><img src="tourism/uploads/stalls/' + encodeURIComponent(app.stall_image || '') + '" width="60" onerror="this.src=\'tourism/uploads/userPin.png\'"></td>' +
            '<td>' + statusPill(app.status) + '</td>' +
            '<td>' + actionsHtml + '</td>' +
        '</tr>'
    );
}

function renderApplicationsTable() {
    var tbody = $('#applicationTable tbody');
    var pagination = $('#applicationPagination');
    if (!tbody.length) return;

    var filtered = getFilteredApplications();
    var total = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / applicationPageSize));

    if (applicationCurrentPage > totalPages) applicationCurrentPage = totalPages;
    if (applicationCurrentPage < 1) applicationCurrentPage = 1;

    tbody.empty();
    if (!total) {
        tbody.append('<tr><td colspan="8">No stall applications match your filter.</td></tr>');
        if (pagination.length) pagination.html('');
        return;
    }

    var start = (applicationCurrentPage - 1) * applicationPageSize;
    var rows = filtered.slice(start, start + applicationPageSize);
    rows.forEach(function (app) {
        tbody.append(buildApplicationRow(app));
    });

    if (pagination.length) {
        var prevDisabled = applicationCurrentPage <= 1 ? 'disabled' : '';
        var nextDisabled = applicationCurrentPage >= totalPages ? 'disabled' : '';
        pagination.html(
            '<button class="application-page-btn" data-page="prev" ' + prevDisabled + '>Prev</button>' +
            '<span class="application-page-label">Page ' + applicationCurrentPage + ' of ' + totalPages + '</span>' +
            '<button class="application-page-btn" data-page="next" ' + nextDisabled + '>Next</button>'
        );
    }
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

        applicationsCache = res.data || [];
        applicationCurrentPage = 1;
        renderApplicationsTable();
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

$(document).on('input', '#applicationSearchInput', function () {
    applicationCurrentPage = 1;
    renderApplicationsTable();
});

$(document).on('change', '#applicationStatusFilter', function () {
    applicationCurrentPage = 1;
    renderApplicationsTable();
});

$(document).on('click', '.application-page-btn', function () {
    if ($(this).is(':disabled')) return;
    var dir = $(this).data('page');
    if (dir === 'prev') applicationCurrentPage -= 1;
    if (dir === 'next') applicationCurrentPage += 1;
    renderApplicationsTable();
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
                : 'tourism/uploads/userPin.png';

            html += '<div class="lgu-stall-card">';
            html +=   '<div class="lgu-stall-avatar"><img src="' + img + '" alt="' + stallName + '" onerror="this.src=\'tourism/uploads/userPin.png\'"></div>';
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
                        : 'tourism/uploads/userPin.png';

                    html += '<li>' +
                              '<span class="lgu-product-avatar"><img src="' + pImg + '" alt="' + (p.name || '') + '" onerror="this.src=\'tourism/uploads/userPin.png\'"></span>' +
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

