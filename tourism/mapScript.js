// ================================
// Determine user type from PHP session
// ================================
var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>"; // LGU, tourist, vendor
var canEdit = (accountType === 'lgu');

// ================================
// Initialize Map
// ================================
var map = L.map('map').setView([10.7202, 122.5621], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

var drawnItems = new L.FeatureGroup().addTo(map);
var markerCluster = new L.MarkerClusterGroup().addTo(map);
var tempMarker = null;

var cityBoundaryBounds = null;

var stallLayer = L.layerGroup().addTo(map);

// ================================
// Draw Controls (only for LGU)
// ================================
if(canEdit){
    var drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems, edit: true, remove: true },
        draw: { marker: true, polyline: true, polygon: true, rectangle: false, circle: false, circlemarker: false }
    });
    map.addControl(drawControl);

    // Handle creation
    map.on('draw:created', function(e){
        var type = e.layerType, layer = e.layer;

        if(type === 'marker'){
            tempMarker = layer;
            showMarkerForm('Add Marker');
            var pos = map.latLngToContainerPoint(layer.getLatLng());
            $('#markerForm').css({top: pos.y+'px', left: pos.x+'px'});
        }
        else if(type === 'polyline' || type === 'polygon'){
            showShapeForm(type, layer);
        }
    });

    // Handle edits
    map.on('draw:edited', function(e){
        e.layers.eachLayer(function(layer){
            if(layer instanceof L.Polygon){
                var coords = layer.getLatLngs()[0].map(ll=>({lat:ll.lat,lng:ll.lng}));
                var color = prompt("Change Polygon Color:", layer.options.color || "green");
                if(color) layer.setStyle({color: color});
                $.post('php/update_polygon.php',{id:layer.layerId, coordinates:JSON.stringify(coords), color: color}, function(){ loadPolygons(); });
            }
            else if(layer instanceof L.Polyline){
                var coords = layer.getLatLngs().map(ll=>({lat:ll.lat,lng:ll.lng}));
                var color = prompt("Change Line Color:", layer.options.color || "blue");
                if(color) layer.setStyle({color: color});
                $.post('php/update_line.php',{id:layer.layerId, coordinates:JSON.stringify(coords), color: color}, function(){ loadPolylines(); });
            }
        });
    });

    // Handle deletions
    map.on('draw:deleted', function(e){
        e.layers.eachLayer(function(layer){
            if(layer instanceof L.Polygon) $.post('php/delete_polygon.php',{id:layer.layerId}, function(){ loadPolygons(); });
            else if(layer instanceof L.Polyline) $.post('php/delete_line.php',{id:layer.layerId}, function(){ loadPolylines(); });
        });
    });
}

// ================================
// Show Marker Form (only for LGU)
// ================================
function showMarkerForm(title, data=null){
    if(!canEdit) return;

    $('#formTitle').text(title);
    if(data){
        $('#markerId').val(data.id);
        $('#markerName').val(data.name);
        $('#markerCategory').val(data.category);
        $('#markerDescription').val(data.description);
        $('#markerIconType').val(data.icon_type);
    } else {
        $('#markerId').val('');
        $('#markerName').val('');
        $('#markerCategory').val('');
        $('#markerDescription').val('');
        $('#markerIconType').val('round');
        $('#markerImage').val('');
    }
    $('#markerForm').show();
}

// Marker form buttons (LGU only)
if(canEdit){
    $('#cancelMarker').click(function(){
        $('#markerForm').hide();
        if(tempMarker && !$('#markerId').val()){ map.removeLayer(tempMarker); tempMarker = null; }
    });

    $('#deleteMarker').click(function(){
        if(tempMarker && tempMarker.markerData){
            if(confirm('Are you sure you want to delete this marker?')){
                $.post('php/delete_marker.php', {id: tempMarker.markerData.id}, function(){
                    map.removeLayer(tempMarker);
                    tempMarker = null;
                    $('#markerForm').hide();
                    applyFilters();
                });
            }
        }
    });

    $('#saveMarker').click(function(){
        var formData = new FormData();
        formData.append('id', $('#markerId').val());
        formData.append('name', $('#markerName').val());
        formData.append('category', $('#markerCategory').val());
        formData.append('description', $('#markerDescription').val());
        formData.append('icon_type', $('#markerIconType').val());
        if($('#markerImage')[0].files[0]) formData.append('image', $('#markerImage')[0].files[0]);
        if(tempMarker) { formData.append('lat', tempMarker.getLatLng().lat); formData.append('lng', tempMarker.getLatLng().lng); }

        var url = $('#markerId').val() ? 'php/update_marker.php' : 'php/save_marker.php';
        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(){
                $('#markerForm').hide();
                if(tempMarker){ map.removeLayer(tempMarker); tempMarker=null; }
                applyFilters();
            }
        });
    });
}

// ================================
// Show Shape Form (for lines/polygons)
// ================================
function showShapeForm(type, layer){
    if(!canEdit) return;

    var shapeType = (type === 'polyline') ? "Line" : "Polygon";
    var formHtml = `
        <div id="shapeForm" style="position:absolute; top:50px; left:50px; z-index:2000; background:#fff; padding:15px; border:1px solid #ccc; border-radius:5px;">
            <h3>Add ${shapeType}</h3>
            <label>Name:</label><br>
            <input type="text" id="shapeName"><br><br>
            <label>Description:</label><br>
            <textarea id="shapeDescription" rows="3"></textarea><br><br>
            <label>Choose Color:</label><br>
            <input type="color" id="shapeColor" value="${type==='polyline'?'#0000ff':'#008000'}"><br><br>
            <button id="saveShape">Save</button>
            <button id="cancelShape">Cancel</button>
        </div>
    `;

    $('body').append(formHtml);

    $('#saveShape').on('click', function(){
        var name = $('#shapeName').val();
        var description = $('#shapeDescription').val();
        var color = $('#shapeColor').val();
        if(!name){ alert("Name is required"); return; }

        var coords = (type==='polyline') ? 
            layer.getLatLngs().map(ll=>({lat: ll.lat, lng: ll.lng})) :
            layer.getLatLngs()[0].map(ll=>({lat: ll.lat, lng: ll.lng}));

        var url = (type==='polyline') ? 'php/save_line.php' : 'php/save_polygon.php';
        $.post(url, { name, description, coordinates: JSON.stringify(coords), color }, function(){
            if(type==='polyline') loadPolylines();
            else loadPolygons();
        });

        $('#shapeForm').remove();
    });

    $('#cancelShape').on('click', function(){ $('#shapeForm').remove(); });
}

// ================================
// Load markers (all users can view)
// ================================
function applyFilters(){
    var query = $('#searchBox').val().toLowerCase();
    var checked = $('#categoryFilters input[type=checkbox]:checked').map(function(){return this.value;}).get();

    markerCluster.clearLayers();

    $.getJSON('php/get_markers.php', function(data){
        data.forEach(function(marker){
            var iconUrl = marker.image ? 'uploads/'+marker.image : (marker.icon_type=='square'?'square_icon.png':'circle_icon.png');
            var icon = L.icon({iconUrl:iconUrl, iconSize:[30,30]});
            var popup = "<b>"+marker.name+"</b><br>"+marker.description+"<br>Category: "+marker.category;
            if(marker.image) popup += "<br><img src='uploads/"+marker.image+"' width='100'>";

            var matchesSearch = (query === "" || marker.name.toLowerCase().includes(query) || marker.description.toLowerCase().includes(query));
            var matchesCategory = (checked.length === 0 || checked.includes(marker.category));

            if(matchesSearch && matchesCategory){
                var m = L.marker([marker.lat, marker.lng], {icon: icon})
                    .bindPopup(popup)
                    .bindTooltip("<b>" + marker.name + "</b>", {permanent:true, direction:'top', offset:[0,-10]});
                
                if(canEdit){
                    m.markerData = marker;
                    m.on('click', function(){ showMarkerForm('Edit Marker', marker); tempMarker = m; });
                }
                markerCluster.addLayer(m);
            }
        });
    });
}

// Hook filters
$('#searchBox').on('input', applyFilters);
$('#categoryFilters input[type=checkbox]').on('change', applyFilters);
applyFilters();

// ================================
// Load polylines/polygons (all users)
// ================================
function loadPolylines(){
    $.getJSON('php/get_lines.php', function(data){
        drawnItems.eachLayer(function(l){ if(l instanceof L.Polyline && !(l instanceof L.Polygon)) drawnItems.removeLayer(l); });
        data.forEach(function(line){
            var coords = line.coordinates.map(c=>[c.lat, c.lng]);
            var pl = L.polyline(coords,{color: line.color || 'blue'}).addTo(drawnItems);
            pl.layerId = line.id;

            if(line.name === "Iloilo city" && !cityBoundaryBounds){
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
    $.getJSON('php/get_polygons.php', function(data){
        drawnItems.eachLayer(function(l){ if(l instanceof L.Polygon && !(l instanceof L.Polyline)) drawnItems.removeLayer(l); });
        data.forEach(function(poly){
            var coords = poly.coordinates.map(c=>[c.lat, c.lng]);
            L.polygon(coords,{color: poly.color || 'green'}).addTo(drawnItems);
        });
    });
}
loadPolygons();

function createStallMarker(latlng, labelText) {
    var icon = L.divIcon({
        className: "stall-label stall-occupied",
        html: labelText,
        iconSize: [80, 30],
        iconAnchor: [40, 30]
    });

    return L.marker(latlng, { icon: icon }).addTo(stallLayer);
}



function loadStalls() {
    stallLayer.clearLayers();

    $.getJSON("php/get_stalls.php", function (data) {
        data.forEach(function (stall) {

            // Only show approved/occupied stalls
            if (stall.status !== "occupied") return;

            var name = stall.stall_name ? stall.stall_name : "Occupied";

            var latlng = L.latLng(stall.lat, stall.lng);
            createStallMarker(latlng, name);
        });
    });
}



loadStalls();

// Optional auto-refresh every 15 seconds
setInterval(loadStalls, 15000);

