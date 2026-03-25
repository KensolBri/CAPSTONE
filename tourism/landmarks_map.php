<?php
session_start();

$accountType = $_SESSION['account_type'] ?? 'tourist'; // lgu, tourist, vendor
$canEdit = ($accountType === 'lgu');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LGU Landmarks Map</title>

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css"/>

  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #fff; }

    #landmarksMap { height: 92vh; width: 100%; }

    /* Marker form overlay */
    #landmarkForm {
      display: none;
      position: absolute;
      z-index: 2000;
      background: #fff;
      padding: 14px;
      border: 1px solid #ccc;
      border-radius: 10px;
      width: 340px;
      max-width: 92vw;
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    #landmarkForm .form-title { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
    #landmarkForm label { font-size: 12px; font-weight: 700; display: block; margin-top: 10px; }
    #landmarkForm input[type="text"], #landmarkForm textarea {
      width: 100%;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #ccc;
      font-size: 13px;
      margin-top: 6px;
      box-sizing: border-box;
    }
    #landmarkForm textarea { resize: vertical; min-height: 70px; }
    #landmarkForm input[type="file"] { width: 100%; margin-top: 6px; }
    #landmarkForm .form-row { margin-top: 6px; }
    #landmarkForm .form-actions { display: flex; gap: 10px; margin-top: 12px; }
    #landmarkForm .btn {
      border: none;
      border-radius: 999px;
      padding: 10px 12px;
      font-weight: 800;
      cursor: pointer;
    }
    #landmarkForm .btn-primary { background: #1e88e5; color: #fff; }
    #landmarkForm .btn-danger { background: #e53935; color: #fff; }
    #landmarkForm .btn-secondary { background: #e0e0e0; color: #111; }

    /* Thumbnail / gallery previews */
    #landmarkThumbnailPreview {
      display: block;
      width: 100%;
      height: 160px;
      object-fit: cover;
      border-radius: 8px;
      background: #f5f5f5;
      border: 1px solid rgba(0,0,0,0.08);
      margin-top: 6px;
    }
    #landmarkPicturesPreview {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    #landmarkPicturesPreview img {
      width: 68px;
      height: 68px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,0.08);
      background: #fafafa;
    }

    /* Landmark pin marker (fixed box so anchor doesn't drift) */
    .landmark-pin-icon { background: transparent; border: none; }
    .landmark-pin-wrapper {
      position: relative;
      width: 150px;
      height: 76px;
      pointer-events: none;
    }
    .landmark-pin-label {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 800;
      background: rgba(255,255,255,0.92);
      border-radius: 999px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      max-width: 150px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .landmark-pin {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%) rotate(-45deg);
      width: 46px;
      height: 46px;
      border-radius: 50% 50% 50% 0;
      background: #fff;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .landmark-pin img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: rotate(45deg);
    }
  </style>
</head>
<body>
  <div id="landmarksMap"></div>

  <div id="landmarkForm">
    <div class="form-title" id="landmarkFormTitle">Add Landmark</div>

    <input type="hidden" id="landmarkId" value="" />

    <label>Landmark Photo / Thumbnail</label>
    <img id="landmarkThumbnailPreview" src="" alt="" style="display:none;" />
    <input type="file" id="landmarkThumbnail" accept="image/*" />

    <label>Landmark Name:</label>
    <input type="text" id="landmarkName" />

    <label>Landmark Address:</label>
    <input type="text" id="landmarkAddress" />

    <label>Landmark Description:</label>
    <textarea id="landmarkDescription"></textarea>

    <label>Landmark Pictures (Optional):</label>
    <input type="file" id="landmarkPictures" accept="image/*" multiple />

    <div id="landmarkPicturesPreview"></div>

    <div class="form-actions">
      <button class="btn btn-primary" id="saveLandmark" type="button">Save</button>
      <button class="btn btn-danger" id="deleteLandmark" type="button" style="display:none;">Delete</button>
      <button class="btn btn-secondary" id="cancelLandmark" type="button">Cancel</button>
    </div>
  </div>

  <script>
    var accountType = "<?php echo htmlspecialchars($accountType, ENT_QUOTES); ?>";
    var canEdit = <?php echo $canEdit ? 'true' : 'false'; ?>;
  </script>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

  <script src="landmarksMapScript.js?v=8"></script>
</body>
</html>

