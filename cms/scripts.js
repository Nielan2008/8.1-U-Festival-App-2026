function setObjectByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  parts.forEach((part, index) => {
    const isNumeric = String(Number(part)) === part;
    const isLast = index === parts.length - 1;
    if (isLast) {
      current[part] = value;
      return;
    }

    const nextPart = parts[index + 1] || '';
    const nextIsNumeric = String(Number(nextPart)) === nextPart;

    if (current[part] === undefined || typeof current[part] !== 'object') {
      current[part] = nextIsNumeric ? [] : {};
    }
    current = current[part];
  });
}

function buildJsonPayload(containerSelector, isObject = false) {
  let result = isObject ? {} : [];
  let useObject = isObject;

  document.querySelectorAll(containerSelector + ' .item-card').forEach((card) => {
    const item = {};
    card.querySelectorAll('[data-field]').forEach((field) => {
      let value = field.value;
      if (field.type === 'number') {
        value = field.value === '' ? 0 : Number(field.value);
      }
      setObjectByPath(item, field.dataset.field, value);
    });

    if (card.dataset.keyName) {
      useObject = true;
      const keyField = card.dataset.keyName;
      const keyInput = card.querySelector(`[data-field="${keyField}"]`);
      const keyValue = keyInput ? keyInput.value.trim() : '';
      if (keyValue) {
        result[keyValue] = item;
      } else {
        const fallbackKey = Object.keys(result).length.toString();
        result[fallbackKey] = item;
      }
      return;
    }

    if (useObject) {
      const autoKey = Object.keys(result).length.toString();
      result[autoKey] = item;
    } else {
      result.push(item);
    }
  });

  return result;
}

function showCmsMessage(form, message, type = 'success') {
  let messageNode = form.querySelector('.cms-message');
  if (!messageNode) {
    messageNode = document.createElement('div');
    messageNode.className = 'cms-message';
    form.insertBefore(messageNode, form.firstChild);
  }
  messageNode.textContent = message;
  messageNode.className = 'cms-message ' + (type === 'error' ? 'error-message' : 'success-message');
}

async function handleCmsSave(formSelector, containerSelector, isObject = false) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const dataInput = form.querySelector('[name="data"]');
    if (!dataInput) return;
    const payload = buildJsonPayload(containerSelector, isObject);
    dataInput.value = JSON.stringify(payload, null, 2);

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form)
      });
      const result = await response.json();
      if (result.success) {
        showCmsMessage(form, 'Saved successfully.');
      } else {
        showCmsMessage(form, result.error || 'Unable to save.', 'error');
      }
    } catch (error) {
      showCmsMessage(form, error.message || 'Unable to save.', 'error');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function addItemCard(buttonSelector, containerSelector, templateSelector) {
  const button = document.querySelector(buttonSelector);
  if (!button) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const container = document.querySelector(containerSelector);
    const template = document.querySelector(templateSelector);
    if (!container || !template) return;
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);
  });
}

function removeItemButtons(containerSelector) {
  document.addEventListener('click', (event) => {
    if (event.target.matches('.remove-item')) {
      event.preventDefault();
      const card = event.target.closest('.item-card');
      if (card) card.remove();
    }
  });
}

function initCmsPage(formSelector, containerSelector, addButtonSelector, templateSelector, isObject = false) {
  document.addEventListener('DOMContentLoaded', () => {
    handleCmsSave(formSelector, containerSelector, isObject);
    addItemCard(addButtonSelector, containerSelector, templateSelector);
    removeItemButtons(containerSelector);
  });
}

function fillLatLng(fieldPrefix, lat, lng) {
  const latInput = document.querySelector(`[name="${fieldPrefix}[lat]"]`);
  const lngInput = document.querySelector(`[name="${fieldPrefix}[lng]"]`);
  if (latInput) latInput.value = lat;
  if (lngInput) lngInput.value = lng;
}

function initMapPicker(mapId, markerClass, latFieldName, lngFieldName) {
  const mapContainer = document.getElementById(mapId);
  if (!mapContainer || typeof L === 'undefined') return;

  const map = L.map(mapId).setView([52.0907, 5.1214], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let activeMarker = null;
  let clickMode = false;
  const toggleButton = document.getElementById('map-pick-toggle');

  document.querySelectorAll('.marker-item').forEach((item) => {
    const lat = Number(item.querySelector('[data-field="lat"]').value);
    const lng = Number(item.querySelector('[data-field="lng"]').value);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    L.marker([lat, lng]).addTo(map).bindPopup(item.dataset.markerName || 'Marker');
  });

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      clickMode = !clickMode;
      toggleButton.textContent = clickMode ? 'Click on map to pick location' : 'Pick on map';
      map.getContainer().style.cursor = clickMode ? 'crosshair' : '';
    });
  }

  map.on('click', (event) => {
    if (!clickMode) return;
    if (activeMarker) activeMarker.remove();
    activeMarker = L.marker(event.latlng).addTo(map).bindPopup('Selected location').openPopup();
    const activeRow = document.querySelector('.marker-item.active');
    if (activeRow) {
      const latField = activeRow.querySelector('[data-field="lat"]');
      const lngField = activeRow.querySelector('[data-field="lng"]');
      if (latField) latField.value = event.latlng.lat.toFixed(6);
      if (lngField) lngField.value = event.latlng.lng.toFixed(6);
    }
  });
}
