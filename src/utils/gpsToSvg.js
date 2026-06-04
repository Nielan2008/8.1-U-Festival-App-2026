/**
 * GPS-to-SVG Coordinate Mapping Utility
 * Maps real-world GPS coordinates (lat/lng) to SVG pixel coordinates (x/y)
 * using configurable anchor points for accurate interpolation
 */

/**
 * Creates a GPS-to-SVG coordinate mapper using anchor points
 * @param {Array} anchors - Array of anchor objects with lat, lng, svg_x, svg_y properties
 * @returns {Object|null} Transform object with latToSvgY and lngToSvgX functions, or null if insufficient anchors
 */
export function createGpsTransform(anchors) {
  if (!anchors || anchors.length < 2) {
    console.warn('GPS transform requires at least 2 anchor points');
    return null;
  }

  // compute min/max lat/lng
  const latVals = anchors.map((a) => a.lat);
  const lngVals = anchors.map((a) => a.lng);
  const minLat = Math.min(...latVals);
  const maxLat = Math.max(...latVals);
  const minLng = Math.min(...lngVals);
  const maxLng = Math.max(...lngVals);

  const pickClosest = (arr, key, value) => {
    let best = arr[0];
    let bestDist = Math.abs(arr[0][key] - value);
    for (let i = 1; i < arr.length; i++) {
      const d = Math.abs(arr[i][key] - value);
      if (d < bestDist) {
        best = arr[i];
        bestDist = d;
      }
    }
    return best;
  };

  const topAnchor = pickClosest(anchors, 'lat', maxLat);
  const bottomAnchor = pickClosest(anchors, 'lat', minLat);
  const leftAnchor = pickClosest(anchors, 'lng', minLng);
  const rightAnchor = pickClosest(anchors, 'lng', maxLng);

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;
  const svgYRange = (bottomAnchor.svg_y - topAnchor.svg_y) || 1;
  const svgXRange = (rightAnchor.svg_x - leftAnchor.svg_x) || 1;

  return {
    latToSvgY: (lat) => {
      const t = (lat - maxLat) / (minLat - maxLat);
      return topAnchor.svg_y + t * svgYRange;
    },
    lngToSvgX: (lng) => {
      const t = (lng - minLng) / lngRange;
      return leftAnchor.svg_x + t * svgXRange;
    }
  };
}

/**
 * Converts GPS coordinates to SVG coordinates
 * @param {number} lat - GPS latitude
 * @param {number} lng - GPS longitude
 * @param {Object} transform - Transform object from createGpsTransform()
 * @returns {Object} { x, y } SVG coordinates, or null if transform is unavailable
 */
export function gpsToSvg(lat, lng, transform) {
  if (!transform) return null;
  return {
    x: transform.lngToSvgX(lng),
    y: transform.latToSvgY(lat)
  };
}

/**
 * Clamps a point to the nearest edge of SVG bounds
 * @param {Object} point - { x, y } point to clamp
 * @param {Object} bounds - { x, y, width, height } SVG bounds
 * @param {number} padding - Optional padding from edge (default 0)
 * @returns {Object} Clamped { x, y } coordinates
 */
export function clampToSvgBounds(point, bounds, padding = 0) {
  const minX = bounds.x + padding;
  const maxX = bounds.x + bounds.width - padding;
  const minY = bounds.y + padding;
  const maxY = bounds.y + bounds.height - padding;

  return {
    x: Math.max(minX, Math.min(maxX, point.x)),
    y: Math.max(minY, Math.min(maxY, point.y))
  };
}

/**
 * Clamps a point to screen-space bounds accounting for zoom
 * This ensures markers and user location dot stay on screen
 * @param {Object} point - { x, y } screen coordinates
 * @param {Object} viewport - { width, height } viewport dimensions
 * @param {number} padding - Optional padding from edge (default 5px)
 * @returns {Object} Clamped { x, y } coordinates
 */
export function clampToScreenBounds(point, viewport, padding = 5) {
  return {
    x: Math.max(padding, Math.min(viewport.width - padding, point.x)),
    y: Math.max(padding, Math.min(viewport.height - padding, point.y))
  };
}

/**
 * Calculates screen-space position for a marker given zoom and pan state
 * @param {Object} svgPoint - { x, y } SVG coordinates
 * @param {number} scale - Current zoom level
 * @param {number} baseScale - Base scale to fit map in viewport
 * @param {number} tx - Translation X offset (pan)
 * @param {number} ty - Translation Y offset (pan)
 * @param {Object} viewport - { width, height } viewport dimensions
 * @returns {Object} { x, y } screen coordinates
 */
export function svgToScreenCoordinates(svgPoint, scale, baseScale, tx, ty, viewport) {
  const totalScale = baseScale * scale;
  const screenX = svgPoint.x * totalScale + tx;
  const screenY = svgPoint.y * totalScale + ty;
  return { x: screenX, y: screenY };
}
