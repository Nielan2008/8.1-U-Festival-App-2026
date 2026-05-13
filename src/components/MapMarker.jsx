import L from 'leaflet';

export function createStageMarker(stage) {
  return new L.DivIcon({
    html: `<div class="map-marker"><span>${stage}</span></div>`,
    className: 'custom-stage-marker',
    iconSize: [110, 38],
    iconAnchor: [55, 38]
  });
}
