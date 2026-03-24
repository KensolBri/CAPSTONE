// Determine user type from PHP session
// ================================
var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>"; // LGU, tourist, vendor
var canEdit = (accountType === 'lgu');
// ================================
// Initialize Map (free zoom-in, limited zoom-out)
// ================================
var map = L.map('map', {
    zoomControl: true,
    maxZoom: 22          // allow zoom levels up to 22
    // no minZoom here – we only limit zoom OUT by fitBounds
}).setView([10.7202, 122.5621], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxNativeZoom: 19,   // real OSM tiles stop at 19
    maxZoom: 22          // but Leaflet can keep zooming by scaling tiles
}).addTo(map);


var drawnItems   = new L.FeatureGroup().addTo(map);
var markerCluster = new L.MarkerClusterGroup().addTo(map);
var tempMarker   = null;
var cityBoundaryBounds = null;
var stallLayer   = L.layerGroup().addTo(map);

var userMarker = null;
var userAccuracyCircle = null;
var isFollowingUser = false;

// User pin: red teardrop + avatar (or userPin.png when guest/no profile) inside the pin circle
// NOTE: map.php lives in /tourism/, but assets are stored under /CAPSTONE/tourism/.
// Using "../tourism/..." keeps the path valid even when the app is served from /CAPSTONE/.
var DEFAULT_PIN_ICON = '../tourism/uploads/userPin.png';

function getUserAvatarPinIcon() {
    var avatarUrl = typeof userAvatarUrl !== 'undefined' ? userAvatarUrl : '';
    var fullName = typeof userFullName !== 'undefined' ? userFullName : '';
    var isGuest = !fullName || fullName.trim() === '';
    var useDefaultPin = isGuest || !avatarUrl || avatarUrl.trim() === '';
    var imgSrc = useDefaultPin ? DEFAULT_PIN_ICON : avatarUrl.replace(/"/g, '&quot;');

    // Always use the same red teardrop pin; put avatar or default icon inside the circle
    var avatarHtml = '<img src="' + imgSrc + '" alt="You"/>';
    var html = '<div class="user-avatar-pin">' +
        '<svg viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M22 0 C34 0 44 12 44 22 C44 34 22 56 22 56 C22 56 0 34 0 22 C0 12 10 0 22 0 Z" fill="#E53935" stroke="#C62828" stroke-width="1"/>' +
        '</svg>' +
        '<div class="pin-avatar">' + avatarHtml + '</div>' +
        '</div>';
    return L.divIcon({
        html: html,
        className: 'leaflet-div-icon user-pin-icon',
        iconSize: [44, 56],
        iconAnchor: [22, 56]
    });
}

// ================================
// Draw Controls (only for LGU)
// ================================

// When location is found
map.on('locationfound', function (e) {
    var role = (typeof userRole !== 'undefined') ? userRole : accountType;
    var useAvatarPin = (role === 'tourist' || role === '');

    if (userMarker) {
        userMarker.setLatLng(e.latlng);
        if (useAvatarPin && userMarker.setIcon) {
            userMarker.setIcon(getUserAvatarPinIcon());
        }
    } else {
        if (useAvatarPin) {
            userMarker = L.marker(e.latlng, { icon: getUserAvatarPinIcon() })
                .addTo(map)
                .bindPopup("You are here");
        } else {
            userMarker = L.marker(e.latlng).addTo(map).bindPopup("You are here");
        }
    }

    if (userAccuracyCircle) {
        userAccuracyCircle.setLatLng(e.latlng).setRadius(e.accuracy || 30);
    } else {
        userAccuracyCircle = L.circle(e.latlng, {
            radius: e.accuracy || 30
        }).addTo(map);
    }

    if (isFollowingUser) {
        map.setView(e.latlng, Math.max(map.getZoom(), 17));
    }
});


// Called when user presses the button
function locateUser() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    map.locate({
        setView: true,
        watch: true,            // <– keep tracking
        maxZoom: 18,
        enableHighAccuracy: true
    });
}


function stopLocateUser() {
    isFollowingUser = false;
    map.stopLocate();           // stops Leaflet’s internal watchPosition
}



document.addEventListener('DOMContentLoaded', function () {
    var role = (typeof userRole !== 'undefined') ? userRole : accountType;
    if (role !== 'tourist') return;

    var btn = document.getElementById('locateBtn');
    if (btn) {
        btn.style.display = 'inline-block';
        btn.addEventListener('click', locateUser);
    }
});


if (canEdit) {
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
if (canEdit) {
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
                
                if (canEdit) {
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
function loadPolylines() {
    $.getJSON('php/get_lines.php', function (data) {
        drawnItems.eachLayer(function (l) {
            if (l instanceof L.Polyline && !(l instanceof L.Polygon)) {
                drawnItems.removeLayer(l);
            }
        });

        data.forEach(function (line) {
            var coords = line.coordinates.map(c => [c.lat, c.lng]);
            var pl = L.polyline(coords, { color: line.color || 'blue' }).addTo(drawnItems);
            pl.layerId = line.id;

            if (line.name === "Iloilo city" && !cityBoundaryBounds) {
                cityBoundaryBounds = pl.getBounds();
                map.setMaxBounds(cityBoundaryBounds);  // lock panning to city
                map.fitBounds(cityBoundaryBounds);
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

// ================================
// STALL MARKER + POPUP + ANALYTICS
// ================================
function createStallMarker(stall) {
    var latlng = L.latLng(stall.lat, stall.lng);
    var name   = stall.stall_name ? stall.stall_name : 'Occupied';

    var imgSrc = stall.stall_image 
        ? 'uploads/stalls/' + stall.stall_image 
        : 'uploads/default_stall.png';

    // Pin HTML (matches your CSS)
    var html =
        '<div class="stall-pin-wrapper">' +
          '<div class="stall-pin-label">' + name + '</div>' +
          '<div class="stall-pin">' +
            '<img src="' + imgSrc + '" alt="' + name + '">' +
          '</div>' +
          '<div class="stall-pin-shadow"></div>' +
        '</div>';

    var icon = L.divIcon({
        className: "stall-pin-icon",
        html: html,
        iconSize: [46, 60],
        iconAnchor: [23, 60]
    });

    var marker = L.marker(latlng, { icon: icon }).addTo(stallLayer);

    // When pin is clicked, open popup + record stall view
    marker.on('click', function () {
        recordView('stall', stall.id);         // 🔹 count stall view
        openStallPopup(stall.id, marker);
    });

    return marker;
}

function openStallPopup(stallId, marker) {
    marker.bindPopup('<div class="stall-popup">Loading…</div>').openPopup();

    $.getJSON('php/get_stall_details.php', { stall_id: stallId }, function (res) {
        if (!res || res.status !== 'success') {
            marker.setPopupContent('<div class="stall-popup-error">Failed to load stall details.</div>');
            return;
        }

        var s        = res.stall || {};
        var products = res.products || [];

        var name  = s.stall_name || 'Stall';
        var ptype = s.product_type || '';
        var img   = s.stall_image
            ? 'uploads/stalls/' + s.stall_image
            : 'uploads/default_stall.png';

        // These MUST be set in get_stall_details.php
        var stallRating   = parseInt(s.my_rating || 0, 10);
        var stallFavorite = !!s.is_favorite;

        var html  = '<div class="stall-popup" data-stall-id="' + stallId + '">';

        // === Stall header: title + favorite ===
        html += '<div class="stall-popup-title-row">';
        html += '  <div class="stall-popup-title">' + name + '</div>';
        html += '  <button class="stall-fav-btn' + (stallFavorite ? ' active' : '') +
                '" data-stall-id="' + stallId + '" title="Favorite stall">❤</button>';
        html += '</div>';

        // === Stall rating stars ===
        html += '<div class="stall-rating" data-stall-id="' + stallId + '">';
        for (var i = 1; i <= 5; i++) {
            var filled = (stallRating >= i) ? ' filled' : '';
            html += '<span class="stall-rating-star' + filled + '" data-rating="' + i + '">★</span>';
        }
        html += '</div>';

        // Stall image + type
        html += '<div class="stall-popup-image"><img src="' + img + '" alt="' + name + '"></div>';

        if (ptype) {
            html += '<div class="stall-popup-type">' + ptype + '</div>';
        }

        // === Products list ===
        if (products.length) {
            html += '<div class="stall-popup-products">';
            html += '  <div class="stall-popup-products-title">Products</div>';

            products.forEach(function (p) {
                var pImg = p.image
                    ? 'uploads/products/' + p.image
                    : 'uploads/default_product.png';

                var pRating   = parseInt(p.my_rating || 0, 10);
                var pFavorite = !!p.is_favorite;

                html +=
                  '<div class="stall-popup-product" ' +
                      'data-product-id="' + p.id + '" ' +
                      'data-stall-id="' + stallId + '" ' +
                      'data-pname="' + (p.name || '') + '" ' +
                      'data-pdesc="' + (p.description || '') + '" ' +
                      'data-pprice="' + (p.price || 0) + '" ' +
                      'data-pimg="' + pImg + '" ' +
                      // 🔹 pass current rating & favorite to modal via data-*
                      'data-prating="' + pRating + '" ' +
                      'data-pfavorite="' + (pFavorite ? 1 : 0) + '"' +
                      '>' +

                    '<img class="stall-popup-product-thumb" src="' + pImg + '" alt="' + (p.name || '') + '">' +
                    '<div class="stall-popup-product-text">' +
                      '<div class="stall-popup-product-name-row">' +
                        '<span class="stall-popup-product-name">' + (p.name || '') + '</span>' +
                        '<button class="product-fav-btn' + (pFavorite ? ' active' : '') +
                            '" data-product-id="' + p.id + '" title="Favorite product">❤</button>' +
                      '</div>' +
                      '<div class="stall-popup-product-desc">' + (p.description || '') + '</div>' +
                      '<div class="stall-popup-product-price">₱ ' +
                            (p.price ? parseFloat(p.price).toFixed(2) : '0.00') +
                      '</div>' +
                      '<div class="product-rating" data-product-id="' + p.id + '">';

                for (var r = 1; r <= 5; r++) {
                    var pFilled = (pRating >= r) ? ' filled' : '';
                    html += '<span class="product-rating-star' + pFilled +
                            '" data-rating="' + r + '">★</span>';
                }

                html +=    '</div>' + // .product-rating
                          '</div>' +  // .stall-popup-product-text
                        '</div>';     // .stall-popup-product
            });

            html += '</div>'; // .stall-popup-products
        } else {
            html += '<div class="stall-popup-products-empty">No products listed yet.</div>';
        }

        html += '</div>'; // .stall-popup

        marker.setPopupContent(html);
        marker.openPopup();

        // count a stall view
        recordView('stall', stallId);

        // attach handlers AFTER DOM exists
        setTimeout(function () {
            initStallFavoriteAndRating(stallId);
            initProductFavoriteAndRating();
            attachProductClickHandlers(); // to open product modal
        }, 50);

    }).fail(function () {
        marker.setPopupContent('<div class="stall-popup-error">Server error while loading stall details.</div>');
    });
}

/* ============================================================
   ⭐ RECORD VIEW
============================================================ */
function recordView(itemType, itemId, stallId) {
    $.post('php/record_view.php', {
        item_type: itemType,
        item_id: itemId,
        stall_id: stallId || 0
    });
}

/* ============================================================
   ❤️⭐ STALL FAVORITE + RATING
============================================================ */
function initStallFavoriteAndRating(stallId) {
    const popup = document.querySelector('.stall-popup[data-stall-id="' + stallId + '"]');
    if (!popup) return;

    // ❤️ favorite stall
    const favBtn = popup.querySelector('.stall-fav-btn');
    if (favBtn) {
        favBtn.onclick = function (e) {
            e.stopPropagation();

            $.ajax({
                url: 'php/toggle_favorite.php',
                method: 'POST',
                data: {
                    item_type: 'stall',
                    item_id: stallId
                },
                dataType: 'json'
            }).done(function (res) {
                if (res.status === 'success') {
                    favBtn.classList.toggle('active', res.favorite === 'added');
                } else {
                    alert(res.message || 'Error toggling favorite.');
                }
            }).fail(function (xhr) {
                if (xhr.status === 401) {
                    alert('Please log in to favorite.');
                } else {
                    alert('Error toggling favorite.');
                }
            });
        };
    }

    // ⭐ rate stall
    popup.querySelectorAll(".stall-rating-star").forEach(star => {
        star.onclick = function (e) {
            e.stopPropagation();

            let rating = parseInt(star.dataset.rating, 10);
            if (!rating) return;

            $.ajax({
                url: "php/rate_item.php",
                method: "POST",
                dataType: "json",
                data: {
                    item_type: "stall",
                    item_id:  stallId,
                    rating:    rating
                }
            }).done(function (res) {
                if (res.status === "success") {
                    highlightStallStars(popup, rating);
                } else {
                    alert(res.message || "Error saving rating.");
                }
            }).fail(function (xhr) {
                if (xhr.status === 401) {
                    alert("Please log in to rate.");
                } else {
                    alert("Error saving rating.");
                }
            });
        };
    });
}

function highlightStallStars(popup, rating) {
    popup.querySelectorAll('.stall-rating-star').forEach(function (star) {
        const r = parseInt(star.dataset.rating, 10);
        star.classList.toggle('filled', r <= rating);
    });
}

/* ============================================================
   ❤️⭐ PRODUCT FAVORITE + RATING (LIST IN POPUP)
============================================================ */
function initProductFavoriteAndRating() {
    document.querySelectorAll('.stall-popup-product').forEach(function (row) {
        const productId = parseInt(row.dataset.productId, 10);
        const stallId = parseInt(row.dataset.stallId, 10) || 0;

        // ❤️ favorite product
        const favBtn = row.querySelector('.product-fav-btn');
        if (favBtn) {
            favBtn.onclick = function (e) {
                e.stopPropagation();

                $.ajax({
                    url: 'php/toggle_favorite.php',
                    method: 'POST',
                    data: {
                        item_type: 'product',
                        item_id: productId,
                        stall_id: stallId
                    },
                    dataType: 'json'
                }).done(function (res) {
                    if (res.status === 'success') {
                        const isFav = (res.favorite === 'added');
                        favBtn.classList.toggle('active', isFav);
                        // 🔹 keep data attribute in sync for modal
                        row.dataset.pfavorite = isFav ? '1' : '0';
                    } else {
                        alert(res.message || 'Error toggling favorite.');
                    }
                }).fail(function (xhr) {
                    if (xhr.status === 401) {
                        alert('Please log in to favorite.');
                    } else {
                        alert('Error toggling favorite.');
                    }
                });
            };
        }

        // ⭐ rate product
        row.querySelectorAll(".product-rating-star").forEach(star => {
            star.onclick = function (e) {
                e.stopPropagation();

                let rating = parseInt(star.dataset.rating, 10);
                if (!rating) return;

                $.ajax({
                    url: "php/rate_item.php",
                    method: "POST",
                    dataType: "json",
                    data: {
                        item_type: "product",
                        item_id:  productId,
                        stall_id: stallId,
                        rating:    rating
                    }
                }).done(function (res) {
                    if (res.status === "success") {
                        highlightProductStars(row, rating);
                        // 🔹 keep data attribute in sync for modal
                        row.dataset.prating = rating;
                    } else {
                        alert(res.message || "Error saving rating.");
                    }
                }).fail(function (xhr) {
                    if (xhr.status === 401) {
                        alert("Please log in to rate.");
                    } else {
                        alert("Error saving rating.");
                    }
                });
            };
        });
    });
}

function highlightProductStars(row, rating) {
    row.querySelectorAll('.product-rating-star').forEach(function (star) {
        const r = parseInt(star.dataset.rating, 10);
        star.classList.toggle('filled', r <= rating);
    });
}

/* ============================================================
   📌 PRODUCT CLICK → OPEN MODAL
============================================================ */
function attachProductClickHandlers() {
    document.querySelectorAll('.stall-popup-product').forEach(function (el) {
        el.onclick = function (e) {
            e.stopPropagation();

            const pid   = el.dataset.productId;
            const stallId = el.dataset.stallId;
            const name  = el.dataset.pname;
            const desc  = el.dataset.pdesc;
            const price = el.dataset.pprice;
            const img   = el.dataset.pimg;
            const rating = parseInt(el.dataset.prating || 0, 10);
            const isFav  = el.dataset.pfavorite === '1';

            recordView('product', pid, stallId);

            showProductModal({
                id: pid,
                name: name,
                description: desc,
                price: price,
                image: img,
                rating: rating,
                isFavorite: isFav,
                stallId: stallId
            });
        };
    });
}

/* ============================================================
   🪟 PRODUCT DETAIL MODAL (WITH RATING + FAVORITE)
============================================================ */
function showProductModal(p) {
    let modal = document.getElementById('productDetailModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productDetailModal';
        modal.className = 'product-detail-modal';
        modal.innerHTML = `
            <div class="product-detail-content">
                <span class="product-detail-close">&times;</span>

                <div class="product-detail-image-wrap">
                    <img class="product-detail-image" src="" alt="">
                </div>

                <div class="product-detail-info">
                    <div class="product-detail-name"></div>
                    <div class="product-detail-price"></div>
                    <div class="product-detail-desc"></div>
                </div>

                <div class="product-detail-controls">
                    <div class="modal-rating-stars">
                        <span class="modal-rating-star" data-value="1">★</span>
                        <span class="modal-rating-star" data-value="2">★</span>
                        <span class="modal-rating-star" data-value="3">★</span>
                        <span class="modal-rating-star" data-value="4">★</span>
                        <span class="modal-rating-star" data-value="5">★</span>
                    </div>
                    <button class="modal-fav-btn">♡ Favorite</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    modal.querySelector('.product-detail-image').src = p.image;
    modal.querySelector('.product-detail-name').textContent  = p.name;
    modal.querySelector('.product-detail-price').textContent =
        '₱ ' + (p.price ? parseFloat(p.price).toFixed(2) : '0.00');
    modal.querySelector('.product-detail-desc').textContent  = p.description;

    // 🔹 pre-fill rating stars based on current rating
    const modalStars = modal.querySelectorAll(".modal-rating-star");
    modalStars.forEach(function (s) {
        const v = parseInt(s.dataset.value, 10);
        s.classList.toggle("active", p.rating && v <= p.rating);
    });

    // 🔹 pre-fill favorite button state
    const favBtn = modal.querySelector('.modal-fav-btn');
    if (p.isFavorite) {
        favBtn.classList.add('favorited');
        favBtn.textContent = '♥ Favorited';
    } else {
        favBtn.classList.remove('favorited');
        favBtn.textContent = '♡ Favorite';
    }

    modal.style.display = 'flex';

    // Close
    modal.querySelector('.product-detail-close').onclick = () => {
        modal.style.display = 'none';
    };
    modal.onclick = function (e) {
        if (e.target === modal) modal.style.display = 'none';
    };

    // ⭐ RATING INSIDE MODAL
    modalStars.forEach(star => {
        star.onclick = function (e) {
            e.stopPropagation();
            let rating = parseInt(star.dataset.value, 10);
            if (!rating) return;

            $.ajax({
                url: "php/rate_item.php",
                method: "POST",
                dataType: "json",
                data: {
                    item_type: "product",
                    item_id:  p.id,
                    stall_id: p.stallId || 0,
                    rating:    rating
                }
            }).done(function (res) {
                if (res.status === "success") {
                    modalStars.forEach(s => {
                        let v = parseInt(s.dataset.value, 10);
                        s.classList.toggle("active", v <= rating);
                    });

                    // 🔹 also update the row stars + data-prating in the stall popup
                    const row = document.querySelector(
                        '.stall-popup-product[data-stall-id="' + (p.stallId || 0) + '"][data-product-id="' + p.id + '"]'
                    );
                    if (row) {
                        row.dataset.prating = rating;
                        highlightProductStars(row, rating);
                    }
                } else {
                    alert(res.message || "Error saving rating.");
                }
            }).fail(function (xhr) {
                if (xhr.status === 401) {
                    alert("Please log in to rate.");
                } else {
                    alert("Error saving rating.");
                }
            });
        };
    });

    // ❤️ favorite inside modal
    favBtn.onclick = function (e) {
        e.stopPropagation();

        $.ajax({
            url: 'php/toggle_favorite.php',
            method: 'POST',
            data: {
                item_type: 'product',
                item_id: p.id,
                stall_id: p.stallId || 0
            },
            dataType: 'json'
        }).done(function (res) {
            if (res.status === 'success') {
                const isFav = (res.favorite === 'added');
                favBtn.classList.toggle('favorited', isFav);
                favBtn.textContent = isFav ? '♥ Favorited' : '♡ Favorite';

                // 🔹 also update row button + data-pfavorite in popup
                const row = document.querySelector(
                    '.stall-popup-product[data-stall-id="' + (p.stallId || 0) + '"][data-product-id="' + p.id + '"]'
                );
                if (row) {
                    row.dataset.pfavorite = isFav ? '1' : '0';
                    const rowFavBtn = row.querySelector('.product-fav-btn');
                    if (rowFavBtn) rowFavBtn.classList.toggle('active', isFav);
                }
            } else {
                alert(res.message || 'Error toggling favorite.');
            }
        }).fail(function (xhr) {
            if (xhr.status === 401) {
                alert('Please log in to favorite.');
            } else {
                alert('Error toggling favorite.');
            }
        });
    };
}

/* ---------------------------
   Stall loading (unchanged)
   --------------------------- */

function loadStalls() {
    stallLayer.clearLayers();

    $.getJSON("php/get_stalls.php", function (res) {
        // res can be an array OR an object
        var data;

        if (Array.isArray(res)) {
            data = res;
        } else if (res && Array.isArray(res.data)) {
            data = res.data;
        } else {
            console.error("Unexpected get_stalls response:", res);
            return;
        }

        data.forEach(function (stall) {
            if (stall.status !== "occupied") return;
            createStallMarker(stall);
        });
    }).fail(function (xhr, status, err) {
        console.error("get_stalls error:", status, err);
    });
}

loadStalls();
setInterval(loadStalls, 15000); // keep if you still want auto-refresh
