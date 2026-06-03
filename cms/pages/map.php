<?php
require_once __DIR__ . '/../includes/auth.php';
$activePage = 'map';
$basePath = '../';
$rootPath = '../';
$pagePath = '';
require_once __DIR__ . '/../includes/header.php';

function loadJsonFile($filename) {
    $path = realpath(__DIR__ . '/../../src/data/' . $filename);
    if (!$path || !is_file($path)) {
        return [];
    }
    $content = file_get_contents($path);
    return json_decode($content, true) ?? [];
}

$mapData = loadJsonFile('map.json');
$locations = $mapData['locations'] ?? [];

// also load raw markers file to expose for the inline map initializer
$mapFile = __DIR__ . '/../../src/data/map.json';
$markers = [];
if (file_exists($mapFile)) {
  $raw = json_decode(file_get_contents($mapFile), true) ?? [];
  if (isset($raw['locations']) && is_array($raw['locations'])) {
    $markers = $raw['locations'];
  } elseif (is_array($raw)) {
    $markers = $raw;
  }
} else {
  $markers = $locations;
}
?>
<section class="cms-panel">
  <h1>Map Markers</h1>
  <p class="note">Edit map markers and coordinates used by the Leaflet map.</p>
  <div class="item-actions">
    <a href="map_add.php" class="cms-btn">➕ Add Marker</a>
    <button type="button" id="gps-button" class="btn-secondary">📍 Use my current GPS location</button>
  </div>
  <form id="map-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="map" />
    <input type="hidden" name="data" />
    <div id="map-list" class="cms-grid">
      <?php foreach ($markers as $i => $location):
        $markerLabel = is_array($location['label']) ? ($location['label']['en'] ?? $location['label']['nl'] ?? '') : ($location['label'] ?? '');
      ?>
        <fieldset class="item-card marker-item" data-marker-name="<?= htmlspecialchars($markerLabel) ?>">
          <legend><?= htmlspecialchars($markerLabel ?: ($location['id'] ?? 'Marker')) ?></legend>
          <div class="form-row full">
            <label>Name NL<input type="text" data-field="label.nl" value="<?= htmlspecialchars($location['label']['nl'] ?? $location['label'] ?? '') ?>" /></label>
            <label>Name EN<input type="text" data-field="label.en" value="<?= htmlspecialchars($location['label']['en'] ?? $location['label'] ?? '') ?>" /></label>
          </div>
          <div class="form-row full">
            <label>Type<input type="text" data-field="type" value="<?= htmlspecialchars($location['type'] ?? '') ?>" /></label>
            <label>ID<input type="text" data-field="id" value="<?= htmlspecialchars($location['id'] ?? '') ?>" /></label>
          </div>
          <div class="form-row full">
            <label>Latitude<input id="lat-<?= $i ?>" type="number" step="0.000001" data-field="lat" value="<?= htmlspecialchars($location['lat'] ?? '') ?>" /></label>
            <label>Longitude<input id="lng-<?= $i ?>" type="number" step="0.000001" data-field="lng" value="<?= htmlspecialchars($location['lng'] ?? '') ?>" /></label>
          </div>
          <div class="form-row full">
            <label>Info<textarea data-field="info"><?= htmlspecialchars($location['info'] ?? '') ?></textarea></label>
          </div>
          <div class="item-actions">
            <button type="button" class="btn-secondary" onclick="enablePickMode(<?= $i ?>)">Pick on map</button>
            <button type="button" class="btn-secondary" onclick="useGPS(<?= $i ?>)">📍 Use my GPS</button>
            <button type="button" class="btn-danger remove-item">Delete</button>
          </div>
        </fieldset>
      <?php endforeach; ?>
    </div>
    <div class="item-actions">
      <a href="map_add.php" class="cms-btn">➕ Add Marker</a>
      <button type="submit">Save Map</button>
    </div>
  </form>
  <div id="cms-map" style="width:100%; height:500px; border-radius: 8px; overflow: hidden; margin-top: 1rem;"></div>
  <div id="pick-hint" style="display:none; margin-top:8px; background:#fff3; padding:8px; border-radius:6px;">Click on the map to choose a location for the selected marker.</div>
</section>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#map-form');
    const list = document.querySelector('#map-list');
    const gpsButton = document.querySelector('#gps-button');
    const markers = <?php echo json_encode($markers ?? $locations, JSON_UNESCAPED_UNICODE); ?>;
    let activeMarkerCard = document.querySelector('.marker-item');

    if (activeMarkerCard) {
      activeMarkerCard.classList.add('active');
    }

    list.addEventListener('click', (event) => {
      const card = event.target.closest('.marker-item');
      if (!card) return;
      document.querySelectorAll('.marker-item').forEach((node) => node.classList.remove('active'));
      card.classList.add('active');
      activeMarkerCard = card;
    });

    // adding markers is done on the separate add page; list page keeps edit/delete only

    let map;
    let currentLocationMarker = null;
    const initMap = () => {
      if (typeof L === 'undefined') return;
      map = L.map('cms-map').setView([51.9845, 5.0540], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      markers.forEach((marker) => {
        const lat = Number(marker.lat ?? marker.latitude ?? 0);
        const lng = Number(marker.lng ?? marker.longitude ?? 0);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        L.marker([lat, lng]).addTo(map).bindPopup((marker.label?.en || marker.label?.nl || marker.id || 'Marker'));
      });
    };

    initMap();

    // pick-on-map mode: enablePickMode(index) will turn on crosshair and set the active index
    let pickMode = false;
    let activePickIndex = null;
    window.enablePickMode = function(index) {
      if (!map) { alert('Map is not initialized yet.'); return; }
      pickMode = true;
      activePickIndex = index;
      map.getContainer().style.cursor = 'crosshair';
      const hint = document.getElementById('pick-hint');
      if (hint) hint.style.display = 'block';
    };

    map?.on && map.on('click', function(e) {
      if (!pickMode || activePickIndex === null) return;
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      const latEl = document.getElementById('lat-' + activePickIndex);
      const lngEl = document.getElementById('lng-' + activePickIndex);
      if (latEl) latEl.value = lat;
      if (lngEl) lngEl.value = lng;
      pickMode = false;
      activePickIndex = null;
      map.getContainer().style.cursor = '';
      const hint = document.getElementById('pick-hint');
      if (hint) hint.style.display = 'none';
    });

    gpsButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (activeMarkerCard) {
          activeMarkerCard.querySelector('[data-field="lat"]').value = lat.toFixed(6);
          activeMarkerCard.querySelector('[data-field="lng"]').value = lng.toFixed(6);
        }
        if (map) {
          if (currentLocationMarker) {
            currentLocationMarker.remove();
          }
          currentLocationMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#F03228',
            fillColor: '#F03228',
            fillOpacity: 0.35,
            weight: 2
          }).addTo(map).bindPopup('Your location').openPopup();
          map.setView([lat, lng], 17, { animate: true, duration: 0.8 });
        }
      }, (error) => {
        alert('Unable to retrieve GPS location: ' + (error.message || 'unknown error'));
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

    // global helper used by inline onclicks and dynamically added gps buttons
    window.useGPS = function(index) {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var latEl = document.getElementById('lat-' + (index !== undefined ? index : 'new'));
        var lngEl = document.getElementById('lng-' + (index !== undefined ? index : 'new'));
        if (latEl) latEl.value = lat.toFixed(6);
        if (lngEl) lngEl.value = lng.toFixed(6);
      }, function(error) {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            alert('Location permission denied. Please allow location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location unavailable. Make sure GPS is enabled on your device.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out. Try again.');
            break;
          default:
            alert('An unknown error occurred getting your location.');
        }
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const locations = [];
      document.querySelectorAll('#map-list .marker-item').forEach((card) => {
        const labelNl = card.querySelector('[data-field="label.nl"]').value;
        const labelEn = card.querySelector('[data-field="label.en"]').value;
        const type = card.querySelector('[data-field="type"]').value;
        const id = card.querySelector('[data-field="id"]').value;
        const lat = Number(card.querySelector('[data-field="lat"]').value);
        const lng = Number(card.querySelector('[data-field="lng"]').value);
        const info = card.querySelector('[data-field="info"]').value;
        if (!id) return;
        locations.push({ id, label: { nl: labelNl, en: labelEn }, type, lat, lng, info });
      });
      form.querySelector('[name="data"]').value = JSON.stringify({ locations }, null, 2);
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      fetch(form.action, { method: 'POST', body: new FormData(form) })
        .then((res) => res.json())
        .then((result) => {
          const message = form.querySelector('.cms-message') || document.createElement('div');
          message.className = 'cms-message ' + (result.success ? 'success-message' : 'error-message');
          message.textContent = result.success ? 'Saved successfully.' : result.error || 'Unable to save.';
          form.insertBefore(message, form.firstChild);
        })
        .catch((err) => {
          const message = form.querySelector('.cms-message') || document.createElement('div');
          message.className = 'cms-message error-message';
          message.textContent = err.message || 'Unable to save.';
          form.insertBefore(message, form.firstChild);
        })
        .finally(() => {
          if (submitButton) submitButton.disabled = false;
        });
    });
  });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>