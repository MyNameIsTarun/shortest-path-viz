import L from 'leaflet';

const CARTODB_DARK_MATTER_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const CARTODB_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function initMap(elementId) {
  const map = L.map(elementId, {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    worldCopyJump: true,
    zoomControl: true,
  });

  L.tileLayer(CARTODB_DARK_MATTER_URL, {
    attribution: CARTODB_ATTRIBUTION,
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map);

  return map;
}
