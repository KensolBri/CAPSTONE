// accountType is injected from PHP in vendor.php:
// var accountType = "<?php echo $_SESSION['account_type'] ?? ''; ?>";

var canEdit = (accountType === 'lgu'); // vendor = false

// Base folder for PHP APIs
var phpFolder = "tourism/php";

// ================================
// Initialize Map
// ================================
var map = L.map('map', {
    maxZoom: 22      // allow deeper zoom
}).setView([10.7202, 122.5621], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 22,      // how far the user can zoom in
    maxNativeZoom: 19 // highest real OSM zoom; beyond this it upscales tiles
}).addTo(map);


var drawnItems    = new L.FeatureGroup().addTo(map);
var markerCluster = new L.MarkerClusterGroup().addTo(map);
map.addLayer(markerCluster);
var polygonCentersById = new Map();
var polygonColorsById = new Map();
var eventCenterLayer = L.layerGroup().addTo(map);

var tempMarker = null;
var cityBoundaryBounds = null;

function buildEventCenterPinIcon(imageUrl) {
    var safeImage = (imageUrl || '').toString().replace(/"/g, '&quot;');
    var borderColor = '#1e3a8a';
    if (arguments.length > 1) {
        borderColor = darkenHexColor(arguments[1], 0.38);
    }
    var inner = safeImage
        ? '<span style="width:42px;height:42px;border-radius:50%;overflow:hidden;border:2px solid ' + borderColor + ';box-shadow:0 2px 6px rgba(0,0,0,.22);display:inline-flex;"><img src="' + safeImage + '" style="width:100%;height:100%;object-fit:cover"></span>'
        : '<span style="width:42px;height:42px;border-radius:50%;background:' + borderColor + ';border:2px solid ' + borderColor + ';box-shadow:0 2px 6px rgba(0,0,0,.22);display:inline-flex;"></span>';
    var html = '<div style="position:relative;width:53px;height:74px;display:flex;align-items:flex-start;justify-content:center;">' +
        inner +
        '<span style="position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:20px solid ' + borderColor + ';"></span>' +
        '</div>';
    return L.divIcon({
        className: 'event-center-pin-icon',
        html: html,
        iconSize: [53, 74],
        iconAnchor: [26, 72],
        popupAnchor: [0, -64]
    });
}

function darkenHexColor(color, amount) {
    var c = (color || '').toString().trim();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return '#1e3a8a';
    if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    var r = parseInt(c.substr(1, 2), 16);
    var g = parseInt(c.substr(3, 2), 16);
    var b = parseInt(c.substr(5, 2), 16);
    var f = Math.max(0, Math.min(1, amount || 0.38));
    r = Math.max(0, Math.round(r * (1 - f)));
    g = Math.max(0, Math.round(g * (1 - f)));
    b = Math.max(0, Math.round(b * (1 - f)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function loadEventCenterMarkers() {
    if (!eventCenterLayer) return;
    eventCenterLayer.clearLayers();

    $.getJSON(phpFolder + '/get_events.php', function (events) {
        (events || []).forEach(function (ev) {
            var pid = parseInt(ev.polygon_id || 0, 10);
            if (!pid) return;
            var center = polygonCentersById.get(pid);
            if (!center) return;
            var polyColor = polygonColorsById.get(pid) || '#2563eb';

            var marker = L.marker(center, {
                icon: buildEventCenterPinIcon(ev.event_image_display || '', polyColor),
                zIndexOffset: 5000
            }).bindPopup('<b>' + (ev.event_name || 'Event') + '</b><br>' + (ev.location || ''));
            eventCenterLayer.addLayer(marker);
        });
    });
}

// Stall application modal elements
var stallApplyModal  = document.getElementById('stallApplyModal');
var stallApplyForm   = document.getElementById('stallApplyForm');
var stallIdInput     = document.getElementById('stallIdInput');
var stallNameInput   = document.getElementById('stallNameInput');
var productTypeInput = document.getElementById('productTypeInput');
var stallApplyCancel = document.getElementById('stallApplyCancel');

// keep reference to which marker is being applied for
var currentStallMarker = null;
var productViewsChart = null;
var productFavsRatingsChart = null;
var productSalesChart = null;
var vendorReviewsViewsChart = null;
var vendorReviewsFavsRatingsChart = null;

// Used to pre-fill product category when vendor clicks "Add Product" from a specific stall card.
var vendorDefaultProductCategory = '';

function normalizeStallProductType(raw) {
    const t = (raw ?? '').toString().toLowerCase().trim();
    if (!t) return '';
    if (t === 'foods' || t.includes('food') || t.includes('soup') || t.includes('pancit') || t.includes('rice') || t.includes('noodle')) return 'foods';
    if (t === 'beverages' || t.includes('bever') || t.includes('milk') || t.includes('tea') || t.includes('coffee') || t.includes('drink')) return 'beverages';
    if (t === 'merchandise' || t.includes('merch') || t.includes('souvenir')) return 'merchandise';
    if (t === 'others' || t === 'other' || t.includes('misc') || t.includes('shop')) return 'others';
    // If unknown value is stored, default to "others" so submission still works.
    return 'others';
}

// Same idea as normalizeStallProductType, but takes vendor_products.category
function normalizeVendorProductCategory(raw) {
    return normalizeStallProductType(raw);
}

function filterProductsByStallType(products, stallProductType) {
    const target = normalizeStallProductType(stallProductType);
    if (!target) return products || [];
    const filtered = (products || []).filter((p) => {
        return normalizeVendorProductCategory(p.category) === target;
    });
    // Do not fallback to all products; otherwise switching stalls shows misleading data.
    return filtered;
}

// track whether stall form is adding or editing
var stallFormMode = 'add'; // 'add' | 'edit'



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
        polygonCentersById.clear();
        polygonColorsById.clear();

        data.forEach(function(poly){
            var coords = poly.coordinates.map(c => [c.lat, c.lng]);
            var layer = L.polygon(coords, {color: poly.color || 'green'}).addTo(drawnItems);
            var pid = parseInt(poly.id || 0, 10);
            if (pid) {
                polygonCentersById.set(pid, layer.getBounds().getCenter());
                polygonColorsById.set(pid, poly.color || 'green');
            }
        });
        loadEventCenterMarkers();
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

    stallFormMode = 'add';
    $('#applyApplicationId').val('');
    $('#applyStallId').val(m.stallId);
    $('#applyStallName').val('');
    $('#applyProductType').val('');
    $('#applyStallSize').val('');
    $('#applyStallImage').val('');
    $('#applyStallImage').attr('required', true);

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

// =========================================
// VENDOR STALL APPLICATIONS (under map)
// =========================================
function loadVendorStallApplications() {
    var box = document.getElementById('stallApplicationsList');
    if (!box) return;

    box.innerHTML = '<p style="font-size:12px;">Loading your applications…</p>';

    $.getJSON(phpFolder + '/get_vendor_applications.php', function (res) {
        if (!res || res.status !== 'success') {
            box.innerHTML = '<p style="font-size:12px;color:red;">Failed to load applications.</p>';
            return;
        }

        var apps = res.data || [];
        if (!apps.length) {
            box.innerHTML = '<p style="font-size:12px;">You have not applied for any stalls yet.</p>';
            return;
        }

        var html = '<div class="stall-app-table-wrap"><table class="stall-app-table">' +
                   '<thead><tr>' +
                     '<th>Stall</th>' +
                     '<th>Product type</th>' +
                     '<th>Size</th>' +
                     '<th>Status</th>' +
                     '<th>Applied at</th>' +
                     '<th>Actions</th>' +
                   '</tr></thead><tbody>';

        apps.forEach(function (a) {
            var canModify = (a.status === 'pending');
            html += '<tr ' +
                      'data-app-id="' + a.id + '" ' +
                      'data-stall-id="' + a.stall_id + '" ' +
                      'data-stall-name="' + (a.stall_name || '') + '" ' +
                      'data-product-type="' + (a.product_type || '') + '" ' +
                      'data-stall-size="' + (a.stall_size || '') + '">' +

                '<td>' + (a.stall_name || '(no name)') + '</td>' +
                '<td>' + (a.product_type || '') + '</td>' +
                '<td>' + (a.stall_size || '') + '</td>' +
                '<td><span class="stall-app-status ' + a.status + '">' + a.status + '</span></td>' +
                '<td>' + (a.applied_at || '') + '</td>' +
                '<td class="stall-app-actions">';

            if (canModify) {
                html += '<button class="stall-app-edit-btn" data-role="edit">Edit</button>' +
                        '<button class="stall-app-cancel-btn" data-role="cancel">Cancel</button>';
            } else {
                html += '<span style="font-size:11px;color:#999;">No actions</span>';
            }

            html +=  '</td></tr>';
        });

        html += '</tbody></table></div>';

        box.innerHTML = html;

        bindStallApplicationRowHandlers();
    }).fail(function () {
        box.innerHTML = '<p style="font-size:12px;color:red;">Server error while loading applications.</p>';
    });
}

function bindStallApplicationRowHandlers() {
    var rows = document.querySelectorAll('#stallApplicationsList tr[data-app-id]');
    rows.forEach(function (row) {
        var appId   = row.getAttribute('data-app-id');
        var stallId = row.getAttribute('data-stall-id');

        // Edit button
        var editBtn = row.querySelector('button[data-role="edit"]');
        if (editBtn) {
            editBtn.onclick = function () {
                stallFormMode = 'edit';

                $('#applyApplicationId').val(appId);
                $('#applyStallId').val(stallId);
                $('#applyStallName').val(row.getAttribute('data-stall-name') || '');
                $('#applyProductType').val(normalizeStallProductType(row.getAttribute('data-product-type') || ''));
                $('#applyStallSize').val(row.getAttribute('data-stall-size') || '');

                // Image optional when editing
                $('#applyStallImage').removeAttr('required');
                $('#applyStallImage').val('');

                $('#stallApplyModal').show();
            };
        }

        // Cancel button
        var cancelBtn = row.querySelector('button[data-role="cancel"]');
        if (cancelBtn) {
            cancelBtn.onclick = function () {
                if (!confirm('Cancel this stall application? This will free the stall again.')) return;

                $.post(phpFolder + '/cancel_stall_application.php', { application_id: appId }, function (res) {
                    if (typeof res === 'string') {
                        try { res = JSON.parse(res); } catch (e) { res = null; }
                    }
                    if (res && res.status === 'success') {
                        loadVendorStallApplications();
                        loadStallsForVendors(); // refresh stall statuses on map
                    } else {
                        alert((res && res.message) || 'Failed to cancel application.');
                    }
                }).fail(function () {
                    alert('Server error while cancelling application.');
                });
            };
        }
    });
}

// ================================
// Stall application form handlers
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

    var fd = new FormData(this);

    // Decide endpoint
    var url = (stallFormMode === 'edit')
        ? phpFolder + '/update_stall_application.php'
        : phpFolder + '/apply_for_stall.php';

    $.ajax({
        url: url,
        method: 'POST',
        data: fd,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: function (res) {
            if (res.status === 'success') {
                alert(res.message || 'Application saved!');
                $('#stallApplyModal').hide();

                // refresh list + map
                loadVendorStallApplications();
                loadStallsForVendors();
            } else {
                alert(res.message || 'Failed to save application.');
            }
        },
        error: function () {
            alert('Server error while saving stall application.');
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

// ================================
// DASHBOARD VIEW SWITCHING
// ================================
document.addEventListener('DOMContentLoaded', function () {
    var appContent   = document.getElementById('appContent');
    var iconContent  = document.getElementById('iconContent');
    var iconItems    = document.querySelectorAll('.icon-item');
    var fullSections = document.querySelectorAll('.full-content');
    var backButtons  = document.querySelectorAll('.back-btn');

    function showSection(id) {
        // show second view, hide main dashboard
        appContent.style.display  = 'none';
        iconContent.style.display = 'block';

        fullSections.forEach(function (sec) {
            if (sec.id === id) {
                sec.classList.remove('hidden');
            } else {
                sec.classList.add('hidden');
            }
        });

        // Map view
        if (id === 'mapView' && typeof map !== 'undefined') {
            setTimeout(function () {
                map.invalidateSize();

                if (cityBoundaryBounds) {
                    map.fitBounds(cityBoundaryBounds);
                    map.options.minZoom = map.getZoom();
                    map.setMaxBounds(cityBoundaryBounds);
                } else {
                    map.setView([10.7202, 122.5621], 14);
                }
            }, 200);

            loadVendorStallApplications();
        }

        // Products view
        if (id === 'placeholder-products') {
            loadVendorProducts();
        }

        // Analytics view
        if (id === 'placeholder-sales') {
            loadVendorAnalytics();
        }

        // Reviews & Ratings view
        if (id === 'vendor-reviews') {
            loadVendorReviewsAndRatings();
        }
    }
    // Expose for functions declared outside DOMContentLoaded
    window.showSection = showSection;

    iconItems.forEach(function (item) {
        item.addEventListener('click', function () {
            var contentId = item.getAttribute('data-content');
            if (!contentId) return;
            showSection(contentId);
        });
    });

    backButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var backTo = btn.getAttribute && btn.getAttribute('data-back-to');
            if (backTo) {
                showSection(backTo);
            } else {
                iconContent.style.display = 'none';
                appContent.style.display  = 'block';
            }
        });
    });

    // Menu actions (placeholder-menu)
    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.vendor-menu-item[data-action]');
        if (!btn) return;

        var action = btn.getAttribute('data-action');
        // For now these are placeholders; wire to real screens later.
        if (action === 'events') {
            showSection('vendor-events');
            loadVendorEvents();
            return;
        }
        if (action === 'reviews') {
            showSection('vendor-reviews');
            return;
        }
        if (action === 'your_stalls') {
            showSection('vendor-your-stalls');
            loadVendorYourStalls();
            return;
        }
        if (action === 'registration') {
            alert('Registration Validity: coming soon.');
            return;
        }
        if (action === 'general') {
            var gsModal = document.getElementById('vendorGeneralSettingsModal');
            if (gsModal) gsModal.style.display = 'flex';
            return;
        }
        if (action === 'help') {
            alert('Help and Support: coming soon.');
            return;
        }
    });

    // Vendor change name and change password (vendor-general-settings)
    (function initVendorSettings() {
        var changeNameBtn = document.getElementById('vendorChangeNameBtn');
        var newNameInput = document.getElementById('vendorNewName');
        if (changeNameBtn && newNameInput) {
            changeNameBtn.addEventListener('click', function () {
                var newName = newNameInput.value.trim();
                if (!newName) {
                    alert('Please enter a new name.');
                    return;
                }
                var fd = new FormData();
                fd.append('new_name', newName);
                fetch('vendor_change_name.php', { method: 'POST', body: fd })
                    .then(function (r) { return r.json(); })
                    .then(function (res) {
                        if (res && res.status === 'success') {
                            alert(res.message || 'Name updated.');
                            var profileTitle = document.querySelector('.vendor-menu-profile-title');
                            if (profileTitle) profileTitle.textContent = res.fullName;
                            newNameInput.value = '';
                        } else {
                            alert((res && res.message) || 'Failed to update name.');
                        }
                    })
                    .catch(function () { alert('Failed to update name.'); });
            });
        }

        var changePasswordBtn = document.getElementById('vendorChangePasswordBtn');
        var currentPwd = document.getElementById('vendorCurrentPassword');
        var newPwd = document.getElementById('vendorNewPassword');
        var confirmPwd = document.getElementById('vendorConfirmPassword');
        if (changePasswordBtn && currentPwd && newPwd && confirmPwd) {
            changePasswordBtn.addEventListener('click', function () {
                var curr = currentPwd.value;
                var np = newPwd.value;
                var conf = confirmPwd.value;
                if (!curr || !np || !conf) {
                    alert('Please fill in all password fields.');
                    return;
                }
                if (np !== conf) {
                    alert('New password and confirm password do not match.');
                    return;
                }
                var fd = new FormData();
                fd.append('current_password', curr);
                fd.append('new_password', np);
                fd.append('confirm_password', conf);
                fetch('vendor_change_password.php', { method: 'POST', body: fd })
                    .then(function (r) { return r.json(); })
                    .then(function (res) {
                        if (res && res.status === 'success') {
                            alert(res.message || 'Password updated.');
                            currentPwd.value = '';
                            newPwd.value = '';
                            confirmPwd.value = '';
                        } else {
                            alert((res && res.message) || 'Failed to update password.');
                        }
                    })
                    .catch(function () { alert('Failed to update password.'); });
            });
        }
    })();

    // Vendor avatar presets + upload (placeholder-menu)
    (function initVendorAvatarPicker() {
        var avatarBtn   = document.getElementById('vendorAvatarBtn');
        var avatarImg   = document.getElementById('vendorAvatarPreview');
        var modal       = document.getElementById('vendorAvatarModal');
        var modalClose  = document.getElementById('vendorAvatarModalClose');
        var presetList  = document.getElementById('vendorAvatarPresetList');
        var uploadBtn   = document.getElementById('vendorAvatarUploadBtn');
        var saveBtn     = document.getElementById('vendorAvatarSaveBtn');
        var fileInput   = document.getElementById('vendorAvatarFileInput');

        if (!avatarBtn || !modal || !presetList || !saveBtn || !uploadBtn || !fileInput) return;

        var AVATAR_PRESETS = [
            { id: 'avatar-happy',  label: 'Alex',      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' },
            { id: 'avatar-cool',   label: 'Michael',   imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael' },
            { id: 'avatar-nerd',   label: 'Alexander', imageUrl: 'https://api.dicebear.com/9.x/toon-head/svg?seed=Alexander' },
            { id: 'avatar-artist', label: 'Valentina', imageUrl: 'https://api.dicebear.com/9.x/toon-head/svg?seed=Valentina' },
            { id: 'avatar-mentor', label: 'Kimberly',  imageUrl: 'https://api.dicebear.com/9.x/toon-head/svg?seed=Jack' },
            { id: 'avatar-wizard', label: 'Jack',      imageUrl: 'https://api.dicebear.com/9.x/toon-head/svg?seed=Kimberly' }
        ];

        var selectedPresetUrl = '';
        var avatarSource = 'none'; // preset | upload

        function openModal() {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }

        function closeModal() {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }

        function renderPresets() {
            presetList.innerHTML = '';
            AVATAR_PRESETS.forEach(function (p) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'vendor-avatar-preset';
                btn.dataset.url = p.imageUrl;
                btn.innerHTML =
                    '<img src="' + p.imageUrl + '" alt="' + p.label + '">' +
                    '<span>' + p.label + '</span>';

                btn.addEventListener('click', function () {
                    avatarSource = 'preset';
                    selectedPresetUrl = p.imageUrl;
                    fileInput.value = '';

                    Array.prototype.forEach.call(
                        presetList.querySelectorAll('.vendor-avatar-preset'),
                        function (el) { el.classList.remove('selected'); }
                    );
                    btn.classList.add('selected');

                    if (avatarImg) avatarImg.src = p.imageUrl;
                });

                presetList.appendChild(btn);
            });
        }

        avatarBtn.addEventListener('click', function () {
            openModal();
        });

        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }

        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        uploadBtn.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', function () {
            var file = fileInput.files && fileInput.files[0];
            if (!file) return;
            avatarSource = 'upload';
            selectedPresetUrl = '';

            Array.prototype.forEach.call(
                presetList.querySelectorAll('.vendor-avatar-preset'),
                function (el) { el.classList.remove('selected'); }
            );

            var reader = new FileReader();
            reader.onload = function (ev) {
                if (avatarImg && ev.target && typeof ev.target.result === 'string') {
                    avatarImg.src = ev.target.result;
                }
            };
            reader.readAsDataURL(file);
        });

        saveBtn.addEventListener('click', function () {
            var fd = new FormData();
            fd.append('avatar_source', avatarSource);

            if (avatarSource === 'preset') {
                fd.append('avatar_preset_url', selectedPresetUrl);
            } else if (avatarSource === 'upload') {
                var file = fileInput.files && fileInput.files[0];
                if (file) fd.append('profile_image', file);
            }

            fetch('vendor_update_profile.php', {
                method: 'POST',
                body: fd
            })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res && res.status === 'success') {
                    if (res.avatar && avatarImg) avatarImg.src = res.avatar;
                    closeModal();
                } else {
                    alert((res && res.message) || 'Failed to update profile picture.');
                }
            })
            .catch(function () {
                alert('Failed to update profile picture.');
            });
        });

        renderPresets();
    })();

    // Vendor General Settings modal - close
    var gsClose = document.getElementById('vendorGeneralSettingsClose');
    var gsModal = document.getElementById('vendorGeneralSettingsModal');
    if (gsClose && gsModal) {
        gsClose.addEventListener('click', function () { gsModal.style.display = 'none'; });
        gsModal.addEventListener('click', function (e) {
            if (e.target === gsModal) gsModal.style.display = 'none';
        });
    }

    // Welcome popup (after login)
    if (typeof vendorShowWelcome !== 'undefined' && vendorShowWelcome) {
        var w = document.getElementById('vendorWelcomePopup');
        if (w) {
            w.style.display = 'flex';
            w.onclick = function () { w.style.display = 'none'; };
        }
    }
});


// ================================
// PRODUCTS LOGIC
// ================================

// Render product cards from array
function renderProducts(products) {
    var list = document.getElementById('productList');
    if (!list) return;

    list.innerHTML = '';

    if (!products || !products.length) {
        list.innerHTML = '<p style="font-size:12px;">No products yet. Click "Add Product" to create one.</p>';
        return;
    }

    products.forEach(function (p) {
        // treat '', null, '0' as "no image"
        var hasImage = p.image && p.image !== '0';
        var imgSrc = hasImage
            ? 'tourism/uploads/products/' + p.image
            : 'tourism/uploads/default_product.png';

        var card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id          = p.id;
        card.dataset.name        = p.name || '';
        card.dataset.price       = p.price || 0;
        card.dataset.category    = p.category || '';
        card.dataset.description = p.description || '';
        card.dataset.image       = hasImage ? p.image : '';

        card.innerHTML =
            '<div class="product-card-top">' +
              '<img class="product-card-img" src="' + imgSrc + '" alt="Product">' +
              '<div class="product-card-actions">' +
                '<button class="product-card-icon edit-product" title="Edit">✎</button>' +
                '<button class="product-card-icon delete-product" title="Delete">🗑</button>' +
              '</div>' +
            '</div>' +
            '<div class="product-card-body">' +
              '<div class="product-name">' + (p.name || '') + '</div>' +
              '<div class="product-line"><span>Description:</span> ' + (p.description || '') + '</div>' +
              '<div class="product-line"><span>Price:</span> ₱ ' + (p.price || 0) + '</div>' +
            '</div>';

        list.appendChild(card);
    });
}


// Load products from server
function loadVendorProducts() {
    var list = document.getElementById('productList');
    if (!list) return;

    list.innerHTML = '<p style="font-size:12px;">Loading products...</p>';

    $.getJSON(phpFolder + '/get_products.php', function (res) {
        if (res && res.status === 'success') {
            renderProducts(res.data || []);
        } else {
            list.innerHTML = '<p style="font-size:12px;color:red;">Failed to load products.</p>';
        }
    }).fail(function () {
        list.innerHTML = '<p style="font-size:12px;color:red;">Server error while loading products.</p>';
    });
}


// ================================
// YOUR STALLS (Manage)
// ================================

function loadVendorYourStalls() {
    var listEl = document.getElementById('vendorStallsList');
    if (!listEl) return;

    listEl.innerHTML = '<p style="font-size:12px;">Loading stalls…</p>';

    $.getJSON(phpFolder + '/get_vendor_applications.php', function (res) {
        if (!res || res.status !== 'success') {
            listEl.innerHTML = '<p style="font-size:12px;color:red;">Failed to load your stalls.</p>';
            return;
        }

        var apps = res.data || [];
        var approved = apps.filter((a) => a.status === 'approved');

        if (!approved.length) {
            listEl.innerHTML = '<p style="font-size:12px;color:#555;">No approved stalls yet.</p>';
            return;
        }

        listEl.innerHTML = approved.map(function (a) {
            var imgSrc = a.stall_image
                ? 'tourism/uploads/stalls/' + a.stall_image
                : 'tourism/uploads/stalls/noimg.png';

            return `
                <div class="vendor-stall-card"
                    data-stall-id="${a.stall_id || ''}"
                    data-stall-name="${escapeHtml(a.stall_name || 'Stall')}"
                    data-stall-image="${a.stall_image || ''}">
                  <div class="vendor-stall-card-row">
                    <img src="${imgSrc}" alt="${escapeHtml ? escapeHtml(a.stall_name || 'Stall') : (a.stall_name || 'Stall')}" class="vendor-stall-card-img" />
                    <div style="flex:1;">
                      <div class="vendor-stall-card-title">${a.stall_name || 'Stall'}</div>
                      <div style="font-size:12px; color:#555; font-weight:800; margin-bottom:4px;">Type: ${a.product_type || ''}</div>
                      <div style="font-size:12px; color:#777;">Status: ${a.status}</div>
                    </div>
                    <button type="button"
                      class="vendor-stall-attach-product"
                      data-stall-id="${a.stall_id || ''}"
                      style="border:none; background:#FFD740; padding:10px 12px; border-radius:12px; font-weight:900; cursor:pointer;"
                      data-no-open="1">
                      Attach Product
                    </button>
                  </div>
                </div>
            `;
        }).join('');

        // Bind clicks once (simple delegation)
        listEl.onclick = function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('.vendor-stall-attach-product') : null;
            if (btn) {
                e.stopPropagation();
                var stallId = btn.getAttribute('data-stall-id') || '';
                if (!stallId) return;
                openAttachProductsModal(stallId);
                return;
            }

            var card = e.target && e.target.closest ? e.target.closest('.vendor-stall-card') : null;
            if (!card) return;
            var cardStallId = card.getAttribute('data-stall-id') || '';
            if (!cardStallId) return;
            openStallManageModal({
                id: cardStallId,
                name: card.getAttribute('data-stall-name') || 'Stall',
                image: card.getAttribute('data-stall-image') || ''
            });
        };
    });
}

// Basic HTML escape for the template above.
function escapeHtml(str) {
    return (str ?? '').toString().replace(/[&<>"']/g, function (c) {
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return map[c] || c;
    });
}

// ================================
// Attach Products Modal
// ================================
var attachSelectedStallId = null;
var selectedStallMeta = null;

function openAttachProductsModal(stallId) {
    attachSelectedStallId = String(stallId);
    if (selectedStallMeta) {
        attachSelectedStallId = String(selectedStallMeta.id || stallId);
    }

    var modal = document.getElementById('attachProductsModal');
    var subtitle = document.getElementById('attachProductsModalSubtitle');
    var list = document.getElementById('attachProductsList');
    if (!modal || !list) return;

    if (subtitle) subtitle.textContent = 'Select products to attach to this stall:';

    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');

    list.innerHTML = '<p style="font-size:12px;">Loading products...</p>';

    // 1) Load all vendor products
    $.getJSON(phpFolder + '/get_products.php', function (prodRes) {
        if (!prodRes || prodRes.status !== 'success') {
            list.innerHTML = '<p style="font-size:12px;color:red;">Failed to load products.</p>';
            return;
        }
        var products = prodRes.data || [];

        // 2) Load which products are already attached to this stall
        $.getJSON(
            phpFolder + '/get_stall_attached_product_ids.php',
            { stall_id: stallId },
            function (attachRes) {
                var attachedIds = (attachRes && attachRes.status === 'success') ? (attachRes.data || []) : [];
                var attachedSet = new Set((attachedIds || []).map(function (x) { return String(x); }));

                renderAttachProducts(products, attachedSet);
            }
        ).fail(function () {
            // Still render products even if attachments fail
            renderAttachProducts(products, new Set());
        });
    }).fail(function () {
        list.innerHTML = '<p style="font-size:12px;color:red;">Server error while loading products.</p>';
    });
}

function renderAttachProducts(products, attachedSet) {
    var list = document.getElementById('attachProductsList');
    if (!list) return;

    list.innerHTML = '';

    if (!products || !products.length) {
        list.innerHTML = '<p style="font-size:12px;">No products yet.</p>';
        return;
    }

    var html = '';
    products.forEach(function (p) {
        var hasImage = p.image && p.image !== '0';
        var imgSrc = hasImage
            ? 'tourism/uploads/products/' + p.image
            : 'tourism/uploads/default_product.png';

        var isAttached = attachedSet && attachedSet.has(String(p.id));

        html +=
            '<div class="' + (isAttached ? 'attach-product-item attached' : 'attach-product-item') + '" ' +
            'data-product-id="' + (p.id || '') + '">' +
                '<img class="attach-product-img" src="' + imgSrc + '" alt="' + escapeHtml(p.name || '') + '">' +
                '<div class="attach-product-name">' + escapeHtml(p.name || 'Product') + '</div>' +
            '</div>';
    });

    list.innerHTML = html;
}

function attachProductToStall(productId, itemEl) {
    if (!attachSelectedStallId) return;

    $.ajax({
        url: phpFolder + '/attach_stall_product.php',
        method: 'POST',
        dataType: 'json',
        data: {
            stall_id: attachSelectedStallId,
            product_id: productId
        }
    }).done(function (res) {
        if (res && res.status === 'success') {
            if (itemEl) itemEl.classList.add('attached');
            if (selectedStallMeta) {
                loadStallManageProducts(selectedStallMeta.id);
            }
        } else {
            alert((res && res.message) || 'Failed to attach product.');
        }
    }).fail(function () {
        alert('Server error while attaching product.');
    });
}

// Click any product card in the attach modal to attach it to the selected stall.
document.addEventListener('click', function (e) {
    var item = e.target && e.target.closest ? e.target.closest('.attach-product-item') : null;
    if (!item) return;
    var pid = item.getAttribute('data-product-id');
    if (!pid) return;
    // Only attach when modal is open + a stall is selected.
    var modal = document.getElementById('attachProductsModal');
    var isOpen = modal && modal.style.display !== 'none' && modal.getAttribute('aria-hidden') === 'false';
    if (!isOpen) return;
    attachProductToStall(Number(pid), item);
});

function openStallManageModal(stallMeta) {
    selectedStallMeta = stallMeta || null;
    var modal = document.getElementById('stallManageModal');
    if (!modal || !selectedStallMeta) return;

    var nameEl = document.getElementById('stallManageName');
    var imgEl = document.getElementById('stallManageImage');
    if (nameEl) nameEl.textContent = selectedStallMeta.name || 'Stall';
    if (imgEl) {
        imgEl.src = selectedStallMeta.image
            ? 'tourism/uploads/stalls/' + selectedStallMeta.image
            : 'tourism/uploads/stalls/noimg.png';
    }

    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    loadStallManageProducts(selectedStallMeta.id);
}

function loadStallManageProducts(stallId) {
    var list = document.getElementById('stallManageProductsList');
    if (!list || !stallId) return;
    list.innerHTML = '<p style="font-size:12px;">Loading products...</p>';

    $.getJSON(phpFolder + '/get_stall_products.php', { stall_id: stallId }, function (res) {
        if (!res || res.status !== 'success') {
            list.innerHTML = '<p style="font-size:12px;color:red;">Failed to load stall products.</p>';
            return;
        }
        var products = res.products || [];
        if (!products.length) {
            list.innerHTML = '<p style="font-size:12px;">No attached products yet.</p>';
            return;
        }

        list.innerHTML = products.map(function (p) {
            var imgSrc = p.image && p.image !== '0'
                ? 'tourism/uploads/products/' + p.image
                : 'tourism/uploads/default_product.png';

            return '<div class="stall-manage-product-item" data-product-id="' + (p.id || '') + '">' +
                '<img class="stall-manage-product-img" src="' + imgSrc + '" alt="' + escapeHtml(p.name || 'Product') + '">' +
                '<div style="font-weight:900; font-size:13px;">' + escapeHtml(p.name || 'Product') + '</div>' +
                '<div style="font-size:12px;">Price: ₱ ' + Number(p.price || 0).toFixed(2) + '</div>' +
                '<div style="font-size:12px;">Sold: <b>' + Number(p.total_sold || 0) + '</b></div>' +
                '<div style="font-size:12px;">Sales: <b>₱ ' + Number(p.total_sales || 0).toFixed(2) + '</b></div>' +
                '<div class="stall-stock-row">' +
                    '<label style="font-size:12px;font-weight:700;">Stock</label>' +
                    '<input type="number" min="0" class="stall-stock-input" value="' + Number(p.stock || 0) + '">' +
                    '<button type="button" class="btn-primary stall-stock-save">Save</button>' +
                '</div>' +
                '<div style="margin-top:8px;">' +
                    '<button type="button" class="btn-secondary stall-detach-product">Remove</button>' +
                '</div>' +
            '</div>';
        }).join('');
    }).fail(function () {
        list.innerHTML = '<p style="font-size:12px;color:red;">Server error while loading stall products.</p>';
    });
}

// ================================
// ANALYTICS LOGIC (UPDATED)
// ================================

function loadVendorAnalytics() {
    var stallBox = document.getElementById('analyticsStallSummary');
    var prodBox  = document.getElementById('analyticsProductsSummary');
    var selectEl = document.getElementById('vendorAnalyticsStallSelect');

    if (!stallBox || !prodBox || !selectEl) return;

    stallBox.innerHTML = '<p style="font-size:12px;">Loading analytics…</p>';
    prodBox.innerHTML = '';
    selectEl.innerHTML = '<option value="">Loading…</option>';

    $.getJSON(phpFolder + '/get_vendor_analytics.php', function (res) {
        if (!res || res.status !== 'success') {
            stallBox.innerHTML = '<p style="font-size:12px;color:red;">Failed to load analytics.</p>';
            selectEl.innerHTML = '<option value="">Error</option>';
            return;
        }

        var stalls = res.stalls || [];
        var productsByStall = res.productsByStall || {};

        if (!stalls.length) {
            stallBox.innerHTML = '<p style="font-size:12px;">No approved stall analytics yet.</p>';
            prodBox.innerHTML = '<p style="font-size:12px;">No products yet.</p>';
            selectEl.innerHTML = '<option value="">No stalls</option>';
            return;
        }

        // Populate stall selector
        selectEl.innerHTML = stalls.map(function (s) {
            return '<option value="' + (s.stall_id || s.id) + '">' +
                escapeHtml(s.stall_name || 'Stall') + ' (' + escapeHtml(s.product_type || '') + ')' +
                '</option>';
        }).join('');

        var savedId = '';
        try { savedId = localStorage.getItem('vendorAnalyticsSelectedStallId') || ''; } catch (e) {}
        var defaultStallId = stalls[0].stall_id || stalls[0].id;
        var chosenId = savedId && stalls.some((s) => String(s.stall_id || s.id) === String(savedId))
            ? savedId
            : String(defaultStallId);

        selectEl.value = chosenId;

        function renderChosen() {
            var chosenStall = stalls.find((s) => String(s.stall_id || s.id) === String(selectEl.value)) || stalls[0];
            var filteredProducts = productsByStall[String(selectEl.value)] || [];

            // Stall summary
            stallBox.innerHTML =
                '<div style="background:#fff7c9;border-radius:12px;padding:10px 12px;">' +
                    '<div style="font-weight:700;font-size:14px;">' + escapeHtml(chosenStall.stall_name || 'Your stall') + '</div>' +
                    '<div style="font-size:11px;margin-bottom:4px;">' + escapeHtml(chosenStall.product_type || '') + '</div>' +
                    '<div style="font-size:12px;">' +
                        'Views: <b>' + (chosenStall.views || 0) + '</b><br>' +
                        'Favorites: <b>' + (chosenStall.favorites_count || 0) + '</b><br>' +
                        'Ratings: <b>' + (chosenStall.ratings_count || 0) + '</b><br>' +
                        'Avg rating: <b>' + (Number(chosenStall.avg_rating || 0).toFixed(2)) + '</b>' +
                    '</div>' +
                '</div>';

            // Products table
            if (!filteredProducts.length) {
                prodBox.innerHTML = '<p style="font-size:12px;">No products yet.</p>';
            } else {
                var html = '<div class="analytics-table-wrap"><table class="analytics-table">' +
                    '<thead><tr>' +
                        '<th>Product</th>' +
                        '<th>Price</th>' +
                        '<th>Stock</th>' +
                        '<th>Sold</th>' +
                        '<th>Sales</th>' +
                        '<th>Views</th>' +
                        '<th>Favorites</th>' +
                        '<th>Ratings</th>' +
                        '<th>Avg rating</th>' +
                    '</tr></thead><tbody>';

                filteredProducts.forEach(function (p) {
                    html += '<tr>' +
                        '<td>' + escapeHtml(p.name || '') + '</td>' +
                        '<td>₱ ' + (p.price || 0) + '</td>' +
                        '<td>' + (p.stock || 0) + '</td>' +
                        '<td>' + (p.total_sold || 0) + '</td>' +
                        '<td>₱ ' + Number(p.total_sales || 0).toFixed(2) + '</td>' +
                        '<td>' + (p.views || 0) + '</td>' +
                        '<td>' + (p.favorites_count || 0) + '</td>' +
                        '<td>' + (p.ratings_count || 0) + '</td>' +
                        '<td>' + Number(p.avg_rating || 0).toFixed(2) + '</td>' +
                    '</tr>';
                });

                html += '</tbody></table></div>';
                prodBox.innerHTML = html;
            }

            // Charts
            renderAnalyticsCharts(filteredProducts);

            // Summary cards
            var totalSold = 0;
            var totalSales = 0;
            filteredProducts.forEach(function (p) {
                totalSold += Number(p.total_sold || 0);
                totalSales += Number(p.total_sales || 0);
            });

            function formatPeso(val) {
                return Number(val || 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }

            var salesCardEl = document.getElementById('analyticsSalesCard');
            var soldCardEl  = document.getElementById('analyticsSoldCard');
            if (salesCardEl) {
                salesCardEl.innerHTML =
                    '<div class="summary-header">' +
                        '<span class="summary-title">Total sales</span>' +
                        '<span class="summary-sub">All time</span>' +
                    '</div>' +
                    '<div class="summary-main">' +
                        '<span class="summary-currency">₱</span>' +
                        '<span class="summary-value">' + formatPeso(totalSales) + '</span>' +
                    '</div>';
            }
            if (soldCardEl) {
                soldCardEl.innerHTML =
                    '<div class="summary-header">' +
                        '<span class="summary-title">Items sold</span>' +
                        '<span class="summary-sub">All products</span>' +
                    '</div>' +
                    '<div class="summary-main">' +
                        '<span class="summary-value">' + totalSold + '</span>' +
                        '<span class="summary-label">pcs</span>' +
                    '</div>';
            }
        }

        renderChosen();
        selectEl.addEventListener('change', function () {
            try { localStorage.setItem('vendorAnalyticsSelectedStallId', selectEl.value); } catch (e) {}
            renderChosen();
        });
    }).fail(function () {
        stallBox.innerHTML = '<p style="font-size:12px;color:red;">Server error while loading analytics.</p>';
    });
}

function loadVendorReviewsAndRatings() {
    var stallBox = document.getElementById('vendorReviewsStallSummary');
    var prodBox  = document.getElementById('vendorReviewsProductsSummary');
    var selectEl = document.getElementById('vendorReviewsStallSelect');

    if (!stallBox || !prodBox || !selectEl) return;

    stallBox.innerHTML = '<p style="font-size:12px;">Loading…</p>';
    prodBox.innerHTML = '';
    selectEl.innerHTML = '<option value="">Loading…</option>';

    $.getJSON(phpFolder + '/get_vendor_analytics.php', function (res) {
        if (!res || res.status !== 'success') {
            stallBox.innerHTML = '<p style="font-size:12px;color:red;">Failed to load metrics.</p>';
            selectEl.innerHTML = '<option value="">Error</option>';
            return;
        }

        var stalls = res.stalls || [];
        var productsByStall = res.productsByStall || {};

        if (!stalls.length) {
            stallBox.innerHTML = '<p style="font-size:12px;">No approved stall yet.</p>';
            prodBox.innerHTML = '<p style="font-size:12px;">No products yet.</p>';
            selectEl.innerHTML = '<option value="">No stalls</option>';
            return;
        }

        // Populate selector
        selectEl.innerHTML = stalls.map(function (s) {
            return '<option value="' + (s.stall_id || s.id) + '">' +
                escapeHtml(s.stall_name || 'Stall') + ' (' + escapeHtml(s.product_type || '') + ')' +
                '</option>';
        }).join('');

        var savedId = '';
        try { savedId = localStorage.getItem('vendorReviewsSelectedStallId') || ''; } catch (e) {}
        var defaultStallId = stalls[0].stall_id || stalls[0].id;
        var chosenId = savedId && stalls.some((s) => String(s.stall_id || s.id) === String(savedId))
            ? savedId
            : String(defaultStallId);

        selectEl.value = chosenId;

        function renderChosen() {
            var chosenStall = stalls.find((s) => String(s.stall_id || s.id) === String(selectEl.value)) || stalls[0];
            var filteredProducts = productsByStall[String(selectEl.value)] || [];

            stallBox.innerHTML =
                '<div style="background:#fff7c9;border-radius:12px;padding:10px 12px;">' +
                    '<div style="font-weight:700;font-size:14px;">' + escapeHtml(chosenStall.stall_name || 'Your stall') + '</div>' +
                    '<div style="font-size:11px;margin-bottom:6px;">' + escapeHtml(chosenStall.product_type || '') + '</div>' +
                    '<div style="font-size:12px;line-height:1.45;">' +
                        'Views: <b>' + (chosenStall.views || 0) + '</b><br>' +
                        'Favorites: <b>' + (chosenStall.favorites_count || 0) + '</b><br>' +
                        'Ratings: <b>' + (chosenStall.ratings_count || 0) + '</b><br>' +
                        'Avg rating: <b>' + Number(chosenStall.avg_rating || 0).toFixed(2) + '</b>' +
                    '</div>' +
                '</div>';

            if (!filteredProducts.length) {
                prodBox.innerHTML = '<p style="font-size:12px;">No products yet.</p>';
            } else {
                var html = '<div class="analytics-table-wrap"><table class="analytics-table">' +
                    '<thead><tr>' +
                        '<th>Product</th>' +
                        '<th>Views</th>' +
                        '<th>Favorites</th>' +
                        '<th>Ratings</th>' +
                        '<th>Avg rating</th>' +
                    '</tr></thead><tbody>';

                filteredProducts.forEach(function (p) {
                    html += '<tr>' +
                        '<td>' + escapeHtml(p.name || '') + '</td>' +
                        '<td>' + (p.views || 0) + '</td>' +
                        '<td>' + (p.favorites_count || 0) + '</td>' +
                        '<td>' + (p.ratings_count || 0) + '</td>' +
                        '<td>' + Number(p.avg_rating || 0).toFixed(2) + '</td>' +
                    '</tr>';
                });

                html += '</tbody></table></div>';
                prodBox.innerHTML = html;
            }

            renderVendorReviewsCharts(filteredProducts);
        }

        renderChosen();
        selectEl.addEventListener('change', function () {
            try { localStorage.setItem('vendorReviewsSelectedStallId', selectEl.value); } catch (e) {}
            renderChosen();
        });
    }).fail(function () {
        stallBox.innerHTML = '<p style="font-size:12px;color:red;">Server error while loading metrics.</p>';
    });
}

function renderVendorReviewsCharts(products) {
    var ctxViews       = document.getElementById('vendorReviewsProductViewsChart');
    var ctxFavsRatings = document.getElementById('vendorReviewsProductFavsRatingsChart');
    if (!products || !products.length) return;

    var labels     = products.map(p => p.name);
    var viewsData  = products.map(p => Number(p.views || 0));
    var favsData   = products.map(p => Number(p.favorites_count || 0));
    var ratingData = products.map(p => Number(p.avg_rating || 0));

    if (vendorReviewsViewsChart) vendorReviewsViewsChart.destroy();
    if (vendorReviewsFavsRatingsChart) vendorReviewsFavsRatingsChart.destroy();

    if (ctxViews) {
        vendorReviewsViewsChart = new Chart(ctxViews, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'Views', data: viewsData, borderWidth: 1 }] },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    if (ctxFavsRatings) {
        vendorReviewsFavsRatingsChart = new Chart(ctxFavsRatings, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Favorites', data: favsData, borderWidth: 1 },
                    { label: 'Avg rating', data: ratingData, borderWidth: 1, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y:  { beginAtZero: true, title: { display: true, text: 'Favorites' } },
                    y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'Rating (1–5)' }, max: 5 }
                }
            }
        });
    }
}

// Build charts using Chart.js
function renderAnalyticsCharts(products) {
    var ctxViews       = document.getElementById('productViewsChart');
    var ctxFavsRatings = document.getElementById('productFavsRatingsChart');
    var ctxSales       = document.getElementById('productSalesChart');   // NEW

    if (!products || !products.length) return;

    var labels     = products.map(p => p.name);
    var viewsData  = products.map(p => Number(p.views || 0));
    var favsData   = products.map(p => Number(p.favorites_count || 0));
    var ratingData = products.map(p => Number(p.avg_rating || 0));
    var salesData  = products.map(p => Number(p.total_sales || 0));      // NEW

    // destroy old instances if they exist
    if (productViewsChart) productViewsChart.destroy();
    if (productFavsRatingsChart) productFavsRatingsChart.destroy();
    if (productSalesChart) productSalesChart.destroy();                 // NEW

    // Views bar chart
    if (ctxViews) {
        productViewsChart = new Chart(ctxViews, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Views',
                    data: viewsData,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Favorites vs avg rating
    if (ctxFavsRatings) {
        productFavsRatingsChart = new Chart(ctxFavsRatings, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Favorites',
                        data: favsData,
                        borderWidth: 1
                    },
                    {
                        label: 'Avg rating',
                        data: ratingData,
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Favorites' }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: { display: true, text: 'Rating (1–5)' },
                        max: 5
                    }
                }
            }
        });
    }

    // NEW: Sales per product (bar chart)
    if (ctxSales) {
        productSalesChart = new Chart(ctxSales, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sales (₱)',
                    data: salesData,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '₱ Sales' }
                    }
                }
            }
        });
    }
}



// ================================
// PRODUCT MODAL (unchanged)
// ================================
document.addEventListener('DOMContentLoaded', function () {
    var addBtn     = document.getElementById('addProductBtn');
    var modal      = document.getElementById('productModal');
    var modalClose = document.getElementById('productModalClose');
    var cancelBtn  = document.getElementById('productCancelBtn');
    var form       = document.getElementById('productForm');
    var titleEl    = document.getElementById('productModalTitle');
var existingImgInput = document.getElementById('productExistingImage');

function openModal(mode, product) {
    if (!modal || !form) return;

    form.reset();
    form.dataset.mode = mode;

    if (mode === 'add') {
        titleEl.textContent = 'Add New Product';
        document.getElementById('productId').value = '';
        if (existingImgInput) existingImgInput.value = '';

        // If user clicked "Add Product" from a specific stall card,
        // pre-fill the category so the product belongs to that stall type.
        if (vendorDefaultProductCategory) {
            var catEl = document.getElementById('productCategory');
            if (catEl) catEl.value = vendorDefaultProductCategory;
            vendorDefaultProductCategory = '';
        }
    } else if (product) {
        titleEl.textContent = 'Edit Product';
        document.getElementById('productId').value          = product.id;
        document.getElementById('productName').value        = product.name || '';
        document.getElementById('productPrice').value       = product.price || 0;
        document.getElementById('productCategory').value    = product.category || '';
        document.getElementById('productDescription').value = product.description || '';
        if (existingImgInput) existingImgInput.value = product.image || '';
    }

    modal.style.display = 'block';
}


    function closeModal() {
        if (modal) modal.style.display = 'none';
    }

    if (addBtn) {
        addBtn.addEventListener('click', function () {
            openModal('add');
        });
    }
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (cancelBtn)  cancelBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
    }

    // Attach Products Modal close handlers
    var attachModal = document.getElementById('attachProductsModal');
    var attachClose = document.getElementById('attachProductsModalClose');
    var stallManageModal = document.getElementById('stallManageModal');
    var stallManageClose = document.getElementById('stallManageModalClose');
    var stallManageAttachBtn = document.getElementById('stallManageAttachBtn');
    if (attachModal && attachClose) {
        attachClose.addEventListener('click', function () {
            attachModal.style.display = 'none';
            attachModal.setAttribute('aria-hidden', 'true');
            attachSelectedStallId = null;
        });

        attachModal.addEventListener('click', function (e) {
            if (e.target === attachModal) {
                attachModal.style.display = 'none';
                attachModal.setAttribute('aria-hidden', 'true');
                attachSelectedStallId = null;
            }
        });
    }

    if (stallManageModal && stallManageClose) {
        stallManageClose.addEventListener('click', function () {
            stallManageModal.style.display = 'none';
            stallManageModal.setAttribute('aria-hidden', 'true');
            selectedStallMeta = null;
        });
        stallManageModal.addEventListener('click', function (e) {
            if (e.target === stallManageModal) {
                stallManageModal.style.display = 'none';
                stallManageModal.setAttribute('aria-hidden', 'true');
                selectedStallMeta = null;
            }
        });
    }
    if (stallManageAttachBtn) {
        stallManageAttachBtn.addEventListener('click', function () {
            if (!selectedStallMeta || !selectedStallMeta.id) return;
            openAttachProductsModal(selectedStallMeta.id);
        });
    }

    // submit add / edit (with image upload)
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            var mode = form.dataset.mode || 'add';
            var fd   = new FormData(form);

            var url = (mode === 'add')
                ? phpFolder + '/add_product.php'
                : phpFolder + '/update_product.php';

            $.ajax({
                url: url,
                method: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function (res) {
                    if (res && res.status === 'success') {
                        closeModal();
                        loadVendorProducts();
                    } else {
                        alert((res && res.message) || 'Failed to save product.');
                    }
                },
                error: function () {
                    alert('Server error while saving product.');
                }
            });
        });
    }

    // delegate edit/delete clicks on cards
    document.addEventListener('click', function (e) {
        var cardBtn = e.target;

        // Edit
        if (cardBtn.classList.contains('edit-product')) {
            var card = cardBtn.closest('.product-card');
            if (!card) return;

            var product = {
                id:          card.dataset.id,
                name:        card.dataset.name,
                price:       card.dataset.price,
                category:    card.dataset.category,
                description: card.dataset.description,
                image:       card.dataset.image
            };
            openModal('edit', product);
        }

        // Delete
        if (cardBtn.classList.contains('delete-product')) {
            var card = cardBtn.closest('.product-card');
            if (!card) return;
            var id = card.dataset.id;

            if (!confirm('Delete this product?')) return;

            $.post(phpFolder + '/delete_product.php', { id: id }, function (res) {
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (e) { res = null; }
                }
                if (res && res.status === 'success') {
                    loadVendorProducts();
                } else {
                    alert((res && res.message) || 'Failed to delete product.');
                }
            }).fail(function () {
                alert('Server error while deleting product.');
            });
        }

        // Save stock on stall-managed product.
        if (cardBtn.classList.contains('stall-stock-save')) {
            var stallCard = cardBtn.closest('.stall-manage-product-item');
            if (!stallCard || !selectedStallMeta) return;
            var productId = stallCard.getAttribute('data-product-id');
            var stockInput = stallCard.querySelector('.stall-stock-input');
            var stockVal = stockInput ? Number(stockInput.value) : NaN;
            if (!productId || !Number.isFinite(stockVal) || stockVal < 0) {
                alert('Please enter a valid stock value.');
                return;
            }

            $.post(phpFolder + '/update_stall_product_stock.php', {
                stall_id: selectedStallMeta.id,
                product_id: productId,
                stock: Math.floor(stockVal)
            }, function (res) {
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (e) { res = null; }
                }
                if (res && res.status === 'success') {
                    loadStallManageProducts(selectedStallMeta.id);
                } else {
                    alert((res && res.message) || 'Failed to update stock.');
                }
            }).fail(function () {
                alert('Server error while updating stock.');
            });
        }

        // Remove attached product from this stall.
        if (cardBtn.classList.contains('stall-detach-product')) {
            var sCard = cardBtn.closest('.stall-manage-product-item');
            if (!sCard || !selectedStallMeta) return;
            var pid = sCard.getAttribute('data-product-id');
            if (!pid) return;
            if (!confirm('Remove this product from this stall?')) return;

            $.post(phpFolder + '/detach_stall_product.php', {
                stall_id: selectedStallMeta.id,
                product_id: pid
            }, function (res) {
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); } catch (e) { res = null; }
                }
                if (res && res.status === 'success') {
                    loadStallManageProducts(selectedStallMeta.id);
                } else {
                    alert((res && res.message) || 'Failed to remove product.');
                }
            }).fail(function () {
                alert('Server error while removing product.');
            });
        }
    });
});

function formatEventDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
}
function formatEventDateRange(startStr, endStr) {
    if (!startStr) return formatEventDate(endStr) || '';
    if (!endStr) return formatEventDate(startStr) || '';
    var s = new Date(startStr);
    var e = new Date(endStr);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
        return months[s.getMonth()] + ' ' + s.getDate() + '\u2013' + e.getDate();
    }
    return formatEventDate(startStr) + ' \u2013 ' + formatEventDate(endStr);
}

function loadVendorEvents() {
    var listEl = document.getElementById('vendorEventsList');
    if (!listEl) return;
    listEl.innerHTML = '<div class="festivities-loading">Loading events...</div>';

    $.getJSON(phpFolder + '/get_events.php', function (events) {
        if (!events || events.length === 0) {
            listEl.innerHTML = '<p class="festivities-empty">No events at the moment.</p>';
            return;
        }
        listEl.innerHTML = '';
        events.forEach(function (ev) {
            var img = ev.event_image_display || 'dagyang.jpg';
            var dateStr = ev.start_date && ev.end_date
                ? 'Start date: ' + formatEventDateRange(ev.start_date, ev.end_date)
                : ev.start_date ? 'Start date: ' + formatEventDate(ev.start_date) : '';
            var avgRating = parseFloat(ev.avg_rating) || 0;
            var ratingsCount = parseInt(ev.ratings_count, 10) || 0;
            var isFav = !!(ev.is_favorite && ev.is_favorite !== '0');
            var myRating = parseInt(ev.my_rating, 10) || 0;

            var card = document.createElement('div');
            card.className = 'event-card';
            card.dataset.ev = JSON.stringify(ev);
            card.innerHTML =
                '<img src="' + img + '" alt="' + (ev.event_name || 'Event') + '" class="event-img" onerror="this.src=\'dagyang.jpg\'" />' +
                '<div class="event-card-top-left">' +
                '<button type="button" class="event-card-fav-btn' + (isFav ? ' active' : '') + '" data-event-id="' + ev.id + '">❤</button>' +
                '<div class="event-card-stars" data-event-id="' + ev.id + '">' +
                [1,2,3,4,5].map(function(r){ return '<span class="event-card-star' + (myRating >= r ? ' filled' : '') + '" data-rating="' + r + '">★</span>'; }).join('') +
                '</div></div>' +
                '<div class="event-card-top-right"><span class="event-card-avg">' + (avgRating > 0 ? avgRating.toFixed(1) : '-') + '</span> ★ (' + ratingsCount + ')</div>' +
                '<div class="event-info"><h3>' + (ev.event_name || 'Event') + '</h3>' + (dateStr ? '<p>' + dateStr + '</p>' : '') + '<p>' + (ev.location || '') + ' ></p></div>' +
                '<div class="event-card-bottom-right">' +
                '<button type="button" class="event-card-review-btn" data-action="leave" data-event-id="' + ev.id + '">Leave a review</button>' +
                '<button type="button" class="event-card-review-btn" data-action="view" data-event-id="' + ev.id + '">View reviews</button>' +
                '</div>';

            card.addEventListener('click', function (e) {
                if (e.target.closest('.event-card-fav-btn, .event-card-star, .event-card-review-btn')) return;
                openVendorEventDetailModal(ev);
            });
            bindVendorEventCardButtons(card, ev);
            listEl.appendChild(card);
        });
    }).fail(function () {
        listEl.innerHTML = '<p class="festivities-empty">Could not load events.</p>';
    });
}

function bindVendorEventCardButtons(card, ev) {
    var favBtn = card.querySelector('.event-card-fav-btn');
    if (favBtn) {
        favBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            vendorToggleEventFavorite(ev.id, favBtn, loadVendorEvents);
        });
    }
    card.querySelectorAll('.event-card-star').forEach(function (star) {
        star.addEventListener('click', function (e) {
            e.stopPropagation();
            var r = parseInt(star.dataset.rating, 10);
            if (!r) return;
            vendorRateEvent(ev.id, r, loadVendorEvents);
        });
    });
    card.querySelectorAll('.event-card-review-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            openVendorEventDetailModal(ev);
            setTimeout(function () {
                if (btn.dataset.action === 'leave') {
                    document.getElementById('vendorEventDetailLeaveReviewSection').style.display = 'block';
                    document.getElementById('vendorEventDetailReviewsSection').style.display = 'none';
                } else {
                    document.getElementById('vendorEventDetailLeaveReviewSection').style.display = 'none';
                    loadVendorEventReviews(ev.id);
                    document.getElementById('vendorEventDetailReviewsSection').style.display = 'block';
                }
            }, 100);
        });
    });
}

function vendorToggleEventFavorite(eventId, btnEl, onDone) {
    $.post(phpFolder + '/toggle_favorite.php', { item_type: 'event', item_id: eventId })
        .done(function (res) {
            if (res && res.status === 'success') {
                btnEl.classList.toggle('active', res.favorite === 'added');
                if (onDone) onDone();
            } else alert((res && res.message) || 'Please log in to favorite.');
        })
        .fail(function () { alert('Error toggling favorite.'); });
}

function vendorRateEvent(eventId, rating, onDone) {
    $.post(phpFolder + '/rate_item.php', { item_type: 'event', item_id: eventId, rating: rating })
        .done(function (res) {
            if (res && res.status === 'success') { if (onDone) onDone(); }
            else alert((res && res.message) || 'Please log in to rate.');
        })
        .fail(function () { alert('Error saving rating.'); });
}

function openVendorEventDetailModal(ev) {
    var modal = document.getElementById('vendorEventDetailModal');
    if (!modal) return;
    document.getElementById('vendorEventDetailTitle').textContent = ev.event_name || 'Event';
    var start = ev.start_date ? formatEventDate(ev.start_date) : '';
    var end = ev.end_date ? formatEventDate(ev.end_date) : '';
    document.getElementById('vendorEventDetailDate').textContent = (start && end) ? (start + ' \u2013 ' + end) : (start || end || '');
    document.getElementById('vendorEventDetailLocation').textContent = ev.location || '';
    var planWrap = document.getElementById('vendorEventDetailPlanWrap');
    var planImg = document.getElementById('vendorEventDetailPlanImg');
    if (ev.event_plan) {
        planImg.src = ev.event_plan;
        planWrap.style.display = 'block';
        planImg.classList.remove('zoomed');
        planImg.onclick = function () { planImg.classList.toggle('zoomed'); };
    } else planWrap.style.display = 'none';

    var favBtn = document.getElementById('vendorEventDetailFavBtn');
    favBtn.classList.toggle('active', !!(ev.is_favorite && ev.is_favorite !== '0'));
    favBtn.onclick = function () { vendorToggleEventFavorite(ev.id, favBtn, function () { loadVendorEvents(); }); };

    var starsEl = document.getElementById('vendorEventDetailStars');
    var myRating = parseInt(ev.my_rating, 10) || 0;
    starsEl.querySelectorAll('.event-rating-star').forEach(function (s, i) {
        var r = i + 1;
        s.classList.toggle('filled', r <= myRating);
        s.onclick = function () {
            vendorRateEvent(ev.id, r, function () {
                starsEl.querySelectorAll('.event-rating-star').forEach(function (ss, ii) { ss.classList.toggle('filled', (ii + 1) <= r); });
                loadVendorEvents();
            });
        };
    });

    document.querySelector('#vendorEventDetailRatingsSummary .event-avg-rating').textContent = (parseFloat(ev.avg_rating) || 0) > 0 ? (parseFloat(ev.avg_rating).toFixed(1)) : '-';
    document.querySelector('#vendorEventDetailRatingsSummary .event-ratings-count').textContent = '(' + (parseInt(ev.ratings_count, 10) || 0) + ' ratings)';

    document.getElementById('vendorEventDetailReviewsSection').style.display = 'none';
    document.getElementById('vendorEventDetailLeaveReviewSection').style.display = 'none';

    var viewReviewsBtn = document.getElementById('vendorEventDetailViewReviewsBtn');
    document.getElementById('vendorEventDetailLeaveReviewBtn').onclick = function () {
        document.getElementById('vendorEventDetailReviewsSection').style.display = 'none';
        document.getElementById('vendorEventDetailLeaveReviewSection').style.display = 'block';
        document.getElementById('vendorEventDetailReviewText').value = '';
        if (viewReviewsBtn) viewReviewsBtn.textContent = 'View reviews';
    };
    viewReviewsBtn.onclick = function () {
        var revSec = document.getElementById('vendorEventDetailReviewsSection');
        if (revSec.style.display === 'block') {
            revSec.style.display = 'none';
            viewReviewsBtn.textContent = 'View reviews';
        } else {
            document.getElementById('vendorEventDetailLeaveReviewSection').style.display = 'none';
            loadVendorEventReviews(ev.id);
            revSec.style.display = 'block';
            viewReviewsBtn.textContent = 'Hide reviews';
        }
    };
    document.getElementById('vendorEventDetailSubmitReviewBtn').onclick = function () {
        var text = document.getElementById('vendorEventDetailReviewText').value.trim();
        if (!text) { alert('Please enter your review.'); return; }
        $.post(phpFolder + '/add_event_review.php', { event_id: ev.id, review_text: text })
            .done(function (res) {
                if (res && res.status === 'success') {
                    alert('Review submitted!');
                    document.getElementById('vendorEventDetailReviewText').value = '';
                    document.getElementById('vendorEventDetailLeaveReviewSection').style.display = 'none';
                    loadVendorEventReviews(ev.id);
                    document.getElementById('vendorEventDetailReviewsSection').style.display = 'block';
                    if (viewReviewsBtn) viewReviewsBtn.textContent = 'Hide reviews';
                } else alert((res && res.message) || 'Please log in.');
            })
            .fail(function () { alert('Failed to submit review.'); });
    };

    modal.style.display = 'flex';
}

function loadVendorEventReviews(eventId) {
    var listEl = document.getElementById('vendorEventDetailReviewsList');
    if (!listEl) return;
    listEl.innerHTML = '<p>Loading...</p>';
    $.getJSON(phpFolder + '/get_event_reviews.php?event_id=' + eventId)
        .done(function (reviews) {
            if (!reviews || reviews.length === 0) listEl.innerHTML = '<p>No reviews yet.</p>';
            else listEl.innerHTML = reviews.map(function (r) {
                var avatarUrl = (r.reviewer_avatar && r.reviewer_avatar.trim()) ? r.reviewer_avatar : 'tourism/uploads/userPin.png';
                var avatar = '<img src="' + avatarUrl + '" alt="" class="event-reviewer-avatar" onerror="this.src=\'tourism/uploads/userPin.png\'" />';
                return '<div class="event-review-item">' + avatar + '<div class="event-review-content"><strong>' + (r.reviewer_name || 'User') + '</strong> <span class="event-review-date">' + (r.created_at || '') + '</span><p>' + (r.review_text || '').replace(/</g, '&lt;') + '</p></div></div>';
            }).join('');
        })
        .fail(function () { listEl.innerHTML = '<p>Could not load reviews.</p>'; });
}

document.getElementById('vendorEventDetailModalClose') && document.getElementById('vendorEventDetailModalClose').addEventListener('click', function () {
    document.getElementById('vendorEventDetailModal').style.display = 'none';
});
document.getElementById('vendorEventDetailModal') && document.getElementById('vendorEventDetailModal').addEventListener('click', function (e) {
    if (e.target.id === 'vendorEventDetailModal') document.getElementById('vendorEventDetailModal').style.display = 'none';
});


