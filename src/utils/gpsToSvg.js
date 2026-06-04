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

  // Sort by latitude for north-south mapping
  const byLat = [...anchors].sort((a, b) => b.lat - a.lat);
  const northAnchor = byLat[0];
  const southAnchor = byLat[byLat.length - 1];

  // Sort by longitude for east-west mapping
  const byLng = [...anchors].sort((a, b) => a.lng - b.lng);
  const westAnchor = byLng[0];
  const eastAnchor = byLng[byLng.length - 1];

  return {
    /**
     * Convert GPS latitude to SVG Y coordinate
     */
    latToSvgY: (lat) => {
      if (northAnchor.lat === southAnchor.lat) {
        return (northAnchor.svg_y + southAnchor.svg_y) / 2;
      }
      // Linear interpolation
      const ratio = (lat - northAnchor.lat) / (southAnchor.lat - northAnchor.lat);
      return northAnchor.svg_y + ratio * (southAnchor.svg_y - northAnchor.svg_y);
    },

    /**
     * Convert GPS longitude to SVG X coordinate
     */
    lngToSvgX: (lng) => {
      if (westAnchor.lng === eastAnchor.lng) {
        return (westAnchor.svg_x + eastAnchor.svg_x) / 2;
      }
      // Linear interpolation
      const ratio = (lng - westAnchor.lng) / (eastAnchor.lng - westAnchor.lng);
      return westAnchor.svg_x + ratio * (eastAnchor.svg_x - westAnchor.svg_x);
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
