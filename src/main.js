import 'leaflet/dist/leaflet.css';
import './style.css';

import { initMap }  from './map/mapInit.js';
import { Graph }    from './core/graph.js';
import { Renderer } from './map/renderer.js';
import { Controls } from './ui/controls.js';

// ─── Init map ─────────────────────────────────────────────────────────────────
const map = initMap('map');

// ─── Build graph ──────────────────────────────────────────────────────────────
const graph = new Graph();

// ─── Render base city layer ───────────────────────────────────────────────────
const renderer = new Renderer(map, graph);
renderer.renderBase();

// ─── Mount controls into sidebar ─────────────────────────────────────────────
const controlsRoot = document.getElementById('controls-root');
const controls     = new Controls(controlsRoot, graph, map);

// ─── Wire control events to renderer ─────────────────────────────────────────
controlsRoot.addEventListener('sourceChanged', (e) => {
  renderer.setSource(e.detail.id);
});

controlsRoot.addEventListener('targetChanged', (e) => {
  renderer.setTarget(e.detail.id);
});

controlsRoot.addEventListener('sourceCleared', () => {
  renderer.clear();
  renderer.renderBase();
  if (controls.targetId) renderer.setTarget(controls.targetId);
});

controlsRoot.addEventListener('targetCleared', () => {
  renderer.clear();
  renderer.renderBase();
  if (controls.sourceId) renderer.setSource(controls.sourceId);
});

controlsRoot.addEventListener('reset', () => {
  renderer.clear();
  controls.setButtonState('idle');
  controls.resetStats();
  // Re-apply source / target markers if still set
  if (controls.sourceId) renderer.setSource(controls.sourceId);
  if (controls.targetId) renderer.setTarget(controls.targetId);
});

// Visualize / Pause / Resume will be wired in Phase 6 (Animator)
controlsRoot.addEventListener('visualize', (e) => {
  console.log('[Phase 4] Visualize triggered:', e.detail);
  // Phase 6: run algorithm + start animator
});

controlsRoot.addEventListener('algoChanged', (e) => {
  console.log('[Phase 4] Algorithm changed:', e.detail.algorithm);
});

controlsRoot.addEventListener('speedChanged', (e) => {
  console.log('[Phase 4] Speed changed:', e.detail.speedMs, 'ms');
});

// ─── Map click to select cities ───────────────────────────────────────────────
map.on('click', () => {
  // Close any open autocomplete dropdowns
  document.getElementById('ac-list-source')?.classList.add('hidden');
  document.getElementById('ac-list-target')?.classList.add('hidden');
  document.getElementById('algo-list')?.classList.add('hidden');
});

// ─── Expose for dev-console testing ──────────────────────────────────────────
window.__spv = { map, graph, renderer, controls };
