import 'leaflet/dist/leaflet.css';
import './style.css';

import { initMap }  from './map/mapInit.js';
import { Graph }    from './core/graph.js';
import { Renderer } from './map/renderer.js';

// ─── Initialise map ───────────────────────────────────────────────────────────
const map = initMap('map');

// ─── Build graph ──────────────────────────────────────────────────────────────
const graph = new Graph();

// ─── Render base city layer ───────────────────────────────────────────────────
const renderer = new Renderer(map, graph);
renderer.renderBase();

// ─── Expose for dev-console testing (Phase 3 acceptance criteria) ─────────────
window.__spv = { map, graph, renderer };
