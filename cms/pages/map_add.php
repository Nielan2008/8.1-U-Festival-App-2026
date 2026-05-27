<?php
require_once __DIR__ . '/../includes/auth.php';
$activePage = 'map';
$basePath = '../';
$rootPath = '../';
$pagePath = '';
require_once __DIR__ . '/../includes/header.php';

$mapFile = __DIR__ . '/../../src/data/map.json';
$raw = [];
$locations = [];
if (file_exists($mapFile)) {
  $raw = json_decode(file_get_contents($mapFile), true) ?? [];
  if (isset($raw['locations']) && is_array($raw['locations'])) {
    $locations = $raw['locations'];
  } elseif (is_array($raw)) {
    $locations = $raw;
  }
}

?>
<section class="cms-panel">
  <h1>Add Map Marker</h1>
  <p class="note">Add a new marker. You can pick a location on the map or use your device GPS.</p>
  <form id="map-add-form" action="../save.php" method="post">
    <input type="hidden" name="type" value="map" />
    <input type="hidden" name="data" />
    <div class="form-row full">
      <label>Name NL<input type="text" id="name-nl" /></label>
      <label>Name EN<input type="text" id="name-en" /></label>
    </div>
    <div class="form-row full">
      <label>Type<select id="type"><option value="stage">stage</option><option value="food">food</option><option value="toilet">toilet</option><option value="info">info</option><option value="other">other</option></select></label>
      <label>ID<input type="text" id="id" placeholder="optional identifier" /></label>
    </div>
    <div class="form-row full">
      <label>Latitude<input id="lat-new" type="number" step="0.000001" /></label>
      <label>Longitude<input id="lng-new" type="number" step="0.000001" /></label>
    </div>
    <div class="item-actions">
      <button type="button" id="gps-new" class="btn-secondary">📍 Use my GPS</button>
      <button type="button" id="pick-new" class="btn-secondary">Pick on map</button>
    </div>
    <div class="item-actions">
      <button type="submit" class="btn-primary">💾 Save</button>
      <a href="map.php" class="cms-btn">← Back</a>
    </div>
  </form>
  <div id="cms-map" style="width:100%; height:500px; border-radius: 8px; overflow: hidden; margin-top: 1rem;"></div>
  <div id="pick-hint" style="display:none; margin-top:8px; background:#fff3; padding:8px; border-radius:6px;">Click on the map to choose a location for the new marker.</div>
</section>

<script>
  const existingRaw = <?php echo json_encode($raw ?? [], JSON_UNESCAPED_UNICODE); ?>;
  const existingLocations = <?php echo json_encode($locations ?? [], JSON_UNESCAPED_UNICODE); ?>;
  let map;
  document.addEventListener('DOMContentLoaded', function(){
    if (typeof L === 'undefined') return;
    map = L.map('cms-map').setView([51.9845, 5.0540], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    existingLocations.forEach(function(m){
      const lat = parseFloat(m.lat);
      const lng = parseFloat(m.lng);
      if (!isFinite(lat) || !isFinite(lng)) return;
      L.marker([lat, lng]).addTo(map).bindPopup(m.label?.en || m.label?.nl || m.id || 'Marker');
    });

    let pickMode = false;
    document.getElementById('pick-new').addEventListener('click', function(){
      if (!map) return; pickMode = true; map.getContainer().style.cursor = 'crosshair'; document.getElementById('pick-hint').style.display = 'block';
    });

    map.on('click', function(e){
      if (!pickMode) return; var lat = e.latlng.lat.toFixed(6); var lng = e.latlng.lng.toFixed(6);
      document.getElementById('lat-new').value = lat; document.getElementById('lng-new').value = lng; pickMode = false; map.getContainer().style.cursor = ''; document.getElementById('pick-hint').style.display = 'none';
    });

    document.getElementById('gps-new').addEventListener('click', function(){
      if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
      navigator.geolocation.getCurrentPosition(function(position){
        document.getElementById('lat-new').value = position.coords.latitude.toFixed(6);
        document.getElementById('lng-new').value = position.coords.longitude.toFixed(6);
      }, function(err){ alert('Unable to get location: ' + (err.message || 'error')); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });

    document.getElementById('map-add-form').addEventListener('submit', function(e){
      e.preventDefault();
      const nameNl = document.getElementById('name-nl').value;
      const nameEn = document.getElementById('name-en').value;
      const type = document.getElementById('type').value;
      let id = document.getElementById('id').value.trim();
      const lat = parseFloat(document.getElementById('lat-new').value);
      const lng = parseFloat(document.getElementById('lng-new').value);
      if (!isFinite(lat) || !isFinite(lng)) { alert('Please provide valid coordinates'); return; }
      if (!id) { id = (nameEn || nameNl || 'marker-' + Date.now()).toString().replace(/\s+/g,'-'); }
      const entry = { id: id, label: { nl: nameNl, en: nameEn }, type: type, lat: lat, lng: lng };

      // build new payload preserving raw structure
      let payload;
      if (existingRaw && typeof existingRaw === 'object' && Array.isArray(existingRaw.locations)) {
        payload = Object.assign({}, existingRaw);
        payload.locations = payload.locations.slice();
        payload.locations.push(entry);
      } else if (Array.isArray(existingRaw)) {
        payload = existingRaw.slice();
        payload.push(entry);
      } else {
        payload = { locations: existingLocations.concat([entry]) };
      }

      this.querySelector('[name="data"]').value = JSON.stringify(payload, null, 2);
      const form = this;
      fetch(form.action, { method: 'POST', body: new FormData(form) })
        .then(res => res.json())
        .then(result => {
          if (result.success) { alert('Saved successfully'); window.location.href = 'map.php'; }
          else { alert('Save failed: ' + (result.error || 'unknown')); }
        }).catch(err => { alert('Save failed: ' + err.message); });
    });
  });
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
