<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Landmarks Location</title>

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css"/>

  <style>
    :root {
      --bg: #ffffff;
      --muted: #666;
      --card: #fff;
      --border: rgba(0,0,0,0.08);
      --shadow: 0 6px 18px rgba(0,0,0,0.10);
      --accent: #FFD740;
      --accent2: #FFC107;
    }

    html, body { height: 100%; }
    body {
      margin: 0;
      background: var(--bg);
      font-family: Arial, sans-serif;
      color: #111;
    }

    .wrap {
      width: 100%;
      margin: 0;
      padding: 0;
    }

    #landmarksTouristMap {
      width: 100%;
      height: 54vh;
      min-height: 320px;
    }

    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
      margin: 0;
      padding: 12px 12px 10px;
      background: #fff;
      border-bottom: 1px solid var(--border);
    }

    .loc-btn {
      border: none;
      background: var(--accent);
      color: #000;
      padding: 10px 16px;
      border-radius: 14px;
      cursor: pointer;
      font-weight: 800;
      box-shadow: none;
      white-space: nowrap;
    }
    .loc-btn:hover { background: var(--accent2); }
    .loc-hint {
      flex: 1;
      font-size: 13px;
      font-weight: 700;
      color: var(--muted);
      padding-left: 4px;
    }

    .cards {
      margin-top: 0;
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }

    .lm-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: none;
      cursor: pointer;
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 10px;
      align-items: center;
      padding: 10px;
    }

    .lm-thumb {
      width: 88px;
      height: 88px;
      border-radius: 12px;
      object-fit: cover;
      background: #f1f1f1;
      border: 1px solid rgba(0,0,0,0.06);
    }

    .lm-meta { min-width: 0; }
    .lm-name {
      font-weight: 950;
      font-size: 14px;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lm-addr {
      font-size: 12px;
      font-weight: 700;
      color: rgba(0,0,0,0.70);
      line-height: 1.25;
      max-height: 2.5em;
      overflow: hidden;
    }
    .lm-dist {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #555;
    }

    .empty {
      text-align: center;
      padding: 14px 0;
      color: var(--muted);
      font-weight: 800;
      font-size: 13px;
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

    @media (max-width: 480px) {
      #landmarksTouristMap { height: 52vh; }
      .controls { padding: 12px 12px 10px; }
      .cards { padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div id="landmarksTouristMap"></div>

    <div class="controls">
      <button type="button" id="touristLocateBtn" class="loc-btn">Turn on location</button>
      <div class="loc-hint" id="touristLocateHint">Enable location to see how far each landmark is.</div>
    </div>

    <div id="landmarkCards" class="cards">
      <div class="empty">Loading landmarks...</div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

  <script src="tourist_landmarks_location.js?v=1"></script>
</body>
</html>

