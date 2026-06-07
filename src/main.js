import 'leaflet/dist/leaflet.css';
import './style.css';

import { initMap }  from './map/mapInit.js';
import { Graph }    from './core/graph.js';
import { Renderer } from './map/renderer.js';
import { Controls } from './ui/controls.js';
import { Animator } from './core/animator.js';
import { bfs } from './algorithms/bfs.js';
import { dijkstra } from './algorithms/dijkstra.js';
import { astar } from './algorithms/astar.js';
import { greedy } from './algorithms/greedy.js';
import { bellmanFord } from './algorithms/bellman-ford.js';
import { ALGO_LIST } from './ui/algoInfo.js';
import { showError, showWarning } from './ui/toast.js';

const ALGORITHMS = {
  'bfs': bfs,
  'dijkstra': dijkstra,
  'astar': astar,
  'greedy': greedy,
  'bellman-ford': bellmanFord
};

let currentAnimator = null;

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

// ─── Animator Control ──────────────────────────────────────────────────────────
controlsRoot.addEventListener('visualize', (e) => {
  const { sourceId, targetId, algorithm, speedMs } = e.detail;

  if (currentAnimator) {
    currentAnimator.reset();
  }

  if (sourceId === targetId) {
    showError('Source and destination must be different.');
    return;
  }

  renderer.clear();
  renderer.renderBase();
  renderer.setSource(sourceId);
  renderer.setTarget(targetId);
  controls.resetStats();
  controls.setButtonState('running');

  const algoFn = ALGORITHMS[algorithm];
  if (!algoFn) return;

  const startMs = performance.now();
  const result = algoFn(graph, sourceId, targetId, graph.nodeMap);
  const calcTimeMs = performance.now() - startMs;

  const meta = ALGO_LIST.find(a => a.id === algorithm);
  const algoColor = meta ? meta.color : '#6366f1';

  currentAnimator = new Animator(
    { steps: result.steps, path: result.path, algoColor },
    renderer,
    speedMs,
    (patch) => {
      controls.updateStats({ ...patch, timeMs: calcTimeMs });
    },
    () => {
      controls.setButtonState('idle');
      if (result.path.length === 0) {
        showError('No path found between these cities.');
      } else if (result.capped) {
        showWarning('Skipping to result...');
      }
    }
  );

  currentAnimator.play();
});

controlsRoot.addEventListener('pause', () => {
  if (currentAnimator) {
    currentAnimator.pause();
    controls.setButtonState('paused');
  }
});

controlsRoot.addEventListener('resume', () => {
  if (currentAnimator) {
    currentAnimator.play();
    controls.setButtonState('running');
  }
});

controlsRoot.addEventListener('reset', () => {
  if (currentAnimator) {
    currentAnimator.reset();
    currentAnimator = null;
  }
  renderer.clear();
  controls.setButtonState('idle');
  controls.resetStats();
  // Re-apply source / target markers if still set
  if (controls.sourceId) renderer.setSource(controls.sourceId);
  if (controls.targetId) renderer.setTarget(controls.targetId);
});

controlsRoot.addEventListener('speedChanged', (e) => {
  if (currentAnimator) {
    currentAnimator.setSpeed(e.detail.speedMs);
  }
});

// ─── Map click to select cities ───────────────────────────────────────────────
map.on('click', () => {
  // Close any open autocomplete dropdowns
  document.getElementById('ac-list-source')?.classList.add('hidden');
  document.getElementById('ac-list-target')?.classList.add('hidden');
  document.getElementById('algo-list')?.classList.add('hidden');
  
  // Close mobile drawer if open
  if (isDrawerOpen && window.innerWidth < 768) {
    isDrawerOpen = false;
    sidebar.classList.add('translate-y-[calc(100%-48px)]');
    sidebar.classList.remove('translate-y-0');
  }
});

// ─── Mobile Drawer Control ────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const drawerHandle = document.getElementById('drawer-handle');

let isDrawerOpen = false;

drawerHandle.addEventListener('click', () => {
  isDrawerOpen = !isDrawerOpen;
  if (isDrawerOpen) {
    sidebar.classList.remove('translate-y-[calc(100%-48px)]');
    sidebar.classList.add('translate-y-0');
  } else {
    sidebar.classList.add('translate-y-[calc(100%-48px)]');
    sidebar.classList.remove('translate-y-0');
  }
});

// ─── Expose for dev-console testing ──────────────────────────────────────────
window.__spv = { map, graph, renderer, controls };
