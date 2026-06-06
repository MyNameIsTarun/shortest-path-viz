# Shortest Path Visualizer — V1 Design

> **Scope:** City-level graph (pre-built dataset), browser-only, zero backend, fully free.  
> **Stack:** Vite + Vanilla JS + Tailwind CSS + Leaflet.js  
> **Goal:** A beautiful, shareable web app that visualizes BFS, Dijkstra, A*, Greedy Best-First, and Bellman-Ford on a static city graph.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Build tool | Vite | Lightning-fast HMR, zero config, tiny output bundle |
| Language | Vanilla JS (ES Modules) | No framework overhead; algo code stays pure and readable |
| Styling | Tailwind CSS v3 (CDN) | Utility-first, no build step needed for CDN version |
| Map | Leaflet.js | Free, OSM tiles, no API key, great performance |
| Map tiles | OpenStreetMap (via Leaflet default) | 100% free, no key required |
| Animations | Custom canvas overlay on Leaflet | Gives pixel-perfect control over exploration animations |
| Hosting | Vercel / Netlify (free tier) | Git-push deploy, custom domain support, CDN-backed |
| Data | Static JSON file bundled with app | ~500 world cities with lat/lng and pre-computed edges |

**No backend. No API keys. No costs.**

---

## 2. Project Structure

```
shortest-path-viz/
├── public/
│   └── favicon.ico
├── src/
│   ├── data/
│   │   └── cities.json          # Node/edge dataset (~500 cities)
│   ├── algorithms/
│   │   ├── bfs.js
│   │   ├── dijkstra.js
│   │   ├── astar.js
│   │   ├── greedy.js
│   │   └── bellman-ford.js
│   ├── map/
│   │   ├── mapInit.js           # Leaflet setup, tile layer, zoom
│   │   ├── canvasOverlay.js     # Custom Leaflet layer for animations
│   │   └── renderer.js          # Draws nodes, edges, visited, path
│   ├── ui/
│   │   ├── controls.js          # Source/destination pickers, algo dropdown
│   │   ├── statsPanel.js        # Live stats: nodes visited, path length, time
│   │   └── speedControl.js      # Animation speed slider
│   ├── core/
│   │   ├── graph.js             # Graph class: adjacency list, neighbours
│   │   └── animator.js          # Step-by-step playback engine
│   ├── main.js                  # App entry point
│   └── style.css                # Tailwind directives + custom CSS vars
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 3. City Graph Dataset

The dataset lives in `src/data/cities.json`. It is built once (offline script) and shipped as a static file.

### Node structure
```json
{
  "id": "mumbai",
  "name": "Mumbai",
  "country": "India",
  "lat": 19.076,
  "lng": 72.877
}
```

### Edge structure
```json
{
  "source": "mumbai",
  "target": "pune",
  "distance": 149
}
```

### How edges are computed (offline, one-time)
- For each city, find the N nearest cities (N = 4–6) using Haversine distance formula
- Add a bidirectional edge with the Haversine distance as weight
- This creates a realistic sparse graph (not fully connected)
- Total: ~500 nodes, ~1500–2000 edges

### Dataset scope
- ~500 major world cities covering all continents
- Filtered to cities with population > 500,000 for meaningful density
- Special focus on India (home country) with ~80–100 Indian cities

---

## 4. Algorithms

### 4.1 BFS (Breadth-First Search)

```javascript
// src/algorithms/bfs.js
export function bfs(graph, source, target) {
  const visited = new Set();
  const parent = new Map();
  const queue = [source];
  const steps = []; // Each step = { visited: Set, frontier: Set, current: nodeId }

  visited.add(source);

  while (queue.length > 0) {
    const current = queue.shift();
    steps.push({ type: 'visit', node: current, frontier: [...queue] });

    if (current === target) break;

    for (const neighbour of graph.neighbours(current)) {
      if (!visited.has(neighbour.id)) {
        visited.add(neighbour.id);
        parent.set(neighbour.id, current);
        queue.push(neighbour.id);
        steps.push({ type: 'explore', node: neighbour.id, from: current });
      }
    }
  }

  return { steps, path: reconstructPath(parent, source, target), visited };
}
```

**Key visual:** Expands in concentric rings outward from source. Ignores edge weights — treats all roads as equal. Will almost never find the geographically optimal path.

### 4.2 Dijkstra's Algorithm

```javascript
// src/algorithms/dijkstra.js
import { MinPriorityQueue } from './utils/minHeap.js';

export function dijkstra(graph, source, target) {
  const dist = new Map();
  const parent = new Map();
  const steps = [];
  const pq = new MinPriorityQueue();

  for (const node of graph.nodes()) dist.set(node, Infinity);
  dist.set(source, 0);
  pq.enqueue(source, 0);

  while (!pq.isEmpty()) {
    const { element: current, priority: currentDist } = pq.dequeue();
    steps.push({ type: 'visit', node: current, dist: currentDist });

    if (current === target) break;

    for (const { id, weight } of graph.neighbours(current)) {
      const newDist = currentDist + weight;
      if (newDist < dist.get(id)) {
        dist.set(id, newDist);
        parent.set(id, current);
        pq.enqueue(id, newDist);
        steps.push({ type: 'relax', node: id, from: current, dist: newDist });
      }
    }
  }

  return { steps, path: reconstructPath(parent, source, target), dist, visited: dist };
}
```

**Key visual:** Expands greedily by shortest known distance. Forms a "distance bubble" that's not a perfect circle — highways make it stretch in certain directions.

### 4.3 A* (A-Star)

```javascript
// src/algorithms/astar.js
import { MinPriorityQueue } from './utils/minHeap.js';
import { haversine } from './utils/haversine.js';

export function astar(graph, source, target, nodes) {
  const gScore = new Map(); // Cost from source
  const fScore = new Map(); // gScore + heuristic
  const parent = new Map();
  const steps = [];
  const pq = new MinPriorityQueue();
  const targetNode = nodes.get(target);

  const h = (nodeId) => haversine(nodes.get(nodeId), targetNode); // Straight-line distance

  for (const node of graph.nodes()) {
    gScore.set(node, Infinity);
    fScore.set(node, Infinity);
  }
  gScore.set(source, 0);
  fScore.set(source, h(source));
  pq.enqueue(source, fScore.get(source));

  while (!pq.isEmpty()) {
    const { element: current } = pq.dequeue();
    steps.push({ type: 'visit', node: current, g: gScore.get(current), h: h(current) });

    if (current === target) break;

    for (const { id, weight } of graph.neighbours(current)) {
      const tentativeG = gScore.get(current) + weight;
      if (tentativeG < gScore.get(id)) {
        parent.set(id, current);
        gScore.set(id, tentativeG);
        fScore.set(id, tentativeG + h(id));
        pq.enqueue(id, fScore.get(id));
        steps.push({ type: 'relax', node: id, from: current, f: fScore.get(id) });
      }
    }
  }

  return { steps, path: reconstructPath(parent, source, target), gScore };
}
```

**Key visual:** Looks almost laser-focused toward the destination. Explores far fewer nodes than Dijkstra. The most satisfying to watch.

### 4.4 Greedy Best-First Search

```javascript
// src/algorithms/greedy.js
export function greedyBestFirst(graph, source, target, nodes) {
  const visited = new Set();
  const parent = new Map();
  const steps = [];
  const pq = new MinPriorityQueue();
  const targetNode = nodes.get(target);

  const h = (nodeId) => haversine(nodes.get(nodeId), targetNode);

  pq.enqueue(source, h(source));
  visited.add(source);

  while (!pq.isEmpty()) {
    const { element: current } = pq.dequeue();
    steps.push({ type: 'visit', node: current });

    if (current === target) break;

    for (const { id } of graph.neighbours(current)) {
      if (!visited.has(id)) {
        visited.add(id);
        parent.set(id, current);
        pq.enqueue(id, h(id));
        steps.push({ type: 'explore', node: id, from: current });
      }
    }
  }

  return { steps, path: reconstructPath(parent, source, target), visited };
}
```

**Key visual:** Rushes directly toward the destination — often takes a clearly wrong path. Great for showing why heuristic-only approaches fail. Entertaining to watch.

### 4.5 Bellman-Ford

```javascript
// src/algorithms/bellman-ford.js
export function bellmanFord(graph, source, target) {
  const dist = new Map();
  const parent = new Map();
  const steps = [];
  const edges = graph.allEdges();
  const nodes = graph.nodes();

  for (const node of nodes) dist.set(node, Infinity);
  dist.set(source, 0);

  const V = nodes.length;

  for (let i = 0; i < V - 1; i++) {
    let relaxed = false;
    steps.push({ type: 'iteration', round: i + 1 });

    for (const { source: u, target: v, weight } of edges) {
      if (dist.get(u) + weight < dist.get(v)) {
        dist.set(v, dist.get(u) + weight);
        parent.set(v, u);
        steps.push({ type: 'relax', node: v, from: u, dist: dist.get(v), round: i + 1 });
        relaxed = true;
      }
    }

    if (!relaxed) break; // Early exit optimization
    if (dist.get(target) !== Infinity) {
      // Optionally break early once target is settled
    }
  }

  return { steps, path: reconstructPath(parent, source, target), dist };
}
```

**Key visual:** Relaxes edges in waves/rounds — unique "pulsing" animation unlike other algorithms. Visually shows why it's slower (O(VE) vs Dijkstra's O(E log V)).

---

## 5. UI/UX Design

### 5.1 Visual Theme

**Concept:** "Dark map, glowing paths" — think a mission control screen or a live flight tracker.

```
Background:     #0f1117  (near-black, easy on eyes)
Surface:        #1a1f2e  (dark navy for panels)
Border:         #2a3142  (subtle separation)
Accent primary: #6366f1  (indigo — modern, distinct)
Accent glow:    #818cf8  (lighter indigo for active states)

Algorithm colors:
  BFS:          #38bdf8  (sky blue — explores wide)
  Dijkstra:     #34d399  (emerald green — balanced)
  A*:           #f59e0b  (amber — fast, focused)
  Greedy:       #f87171  (red-ish — impulsive)
  Bellman-Ford: #a78bfa  (purple — methodical)

Path (final):   #fbbf24  (golden — reward)
Visited nodes:  dim version of algo color (opacity 0.3)
Frontier nodes: bright version of algo color
Source node:    #4ade80  (green)
Destination:    #f43f5e  (rose)
```

### 5.2 Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  🗺 PathFinder                          [GitHub] [Share]    │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   CONTROLS   │                                              │
│   ─────────  │              MAP (Leaflet)                   │
│   From: [__] │                                              │
│   To:   [__] │         City nodes as dots                   │
│              │         Edges as thin lines                  │
│   Algorithm  │         Animated exploration                 │
│   [Dijkstra▾]│         Bold golden final path               │
│              │                                              │
│   Speed  [●──]│                                              │
│              │                                              │
│   [▶ Visualize]│                                            │
│   [⏸] [↺ Reset]│                                           │
│              │                                              │
│   ─────────  │                                              │
│   STATS      │                                              │
│   Nodes:  42 │                                              │
│   Dist: 2341km│                                             │
│   Steps: 156 │                                              │
│   Time: 0.4s │                                              │
│              │                                              │
│   ─────────  │                                              │
│  ALGO INFO   │                                              │
│  "Dijkstra   │                                              │
│  explores by │                                              │
│  lowest dist"│                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### 5.3 Layout (Mobile)

Controls collapse into a bottom drawer. Map takes full screen. Drawer has a drag handle and slides up to reveal controls. Stats show as a floating mini-panel at top-right.

### 5.4 Control Panel Details

**City search (autocomplete):**
- Type to filter cities by name
- Dropdown shows city name + country flag emoji
- Clicking a city also pans the map to it and places a marker

**Algorithm dropdown:**
- Shows algorithm name + a one-line description
- Color-coded left border matching the algo's theme color
- A "?" tooltip explains time complexity and best use case

**Speed slider:**
- Range: "Turtle" (50ms/step) to "Instant" (0ms)
- Default: ~15ms/step — fast enough to be fun, slow enough to follow

**Visualize button:**
- Disabled if source or destination not selected
- Pulses with a glow animation while algorithm is running
- Becomes "Stop" mid-animation

### 5.5 Map Interactions

- Scroll/pinch to zoom
- Click any visible city dot to set it as source (first click) or destination (second click)
- Hover over a city shows a tooltip with name, country, and current distance (if algo ran)
- Hover over an edge during animation shows the edge weight

### 5.6 Algorithm Info Panel

A small collapsible card below stats. Shows:
- Algorithm name + badge (Weighted / Unweighted / Heuristic)
- One paragraph plain-language explanation
- Time complexity: O(?)
- Space complexity: O(?)
- Best for: "Guarantees shortest path on weighted graphs"
- Fun fact about the algorithm

---

## 6. Animation Engine

### How it works

Each algorithm returns a `steps` array — a list of events in the order they happened. The animator plays through these steps at the configured speed.

```javascript
// src/core/animator.js
export class Animator {
  constructor(steps, renderer, speed) {
    this.steps = steps;
    this.renderer = renderer;
    this.speed = speed; // ms per step
    this.currentStep = 0;
    this.paused = false;
    this.timer = null;
  }

  play() {
    this.paused = false;
    this._tick();
  }

  pause() {
    this.paused = true;
    clearTimeout(this.timer);
  }

  reset() {
    this.pause();
    this.currentStep = 0;
    this.renderer.clear();
  }

  _tick() {
    if (this.paused || this.currentStep >= this.steps.length) return;

    const step = this.steps[this.currentStep++];
    this.renderer.applyStep(step);

    this.timer = setTimeout(() => this._tick(), this.speed);
  }
}
```

### Step types and what they render

| Step type | Visual effect |
|---|---|
| `visit` | Node changes to bright algo color, adds a subtle ripple/pulse |
| `explore` | Edge between two nodes lights up in algo color (dim) |
| `relax` | Edge re-lights slightly brighter, distance label updates |
| `iteration` (Bellman-Ford) | A subtle "wave" sweeps across all edges |
| `final_path` | Each edge/node on the path lights up gold in sequence |

---

## 7. Edge Cases & How to Handle Them

| Edge Case | Handling |
|---|---|
| Source === Destination | Show an error toast: "Source and destination must be different." |
| No path exists (disconnected graph) | After algo finishes with no path, show: "No path found between these cities." — highlight explored nodes in gray |
| Very long animation (BFS across continents) | Cap Bellman-Ford animation at 2000 steps; show "Skipping to result..." |
| User clicks Visualize while animation running | Auto-reset first, then start new animation |
| Mobile viewport — panel overlaps map | Bottom-sheet drawer pattern; map stays fully usable |
| City not found in search | Fuzzy search with Levenshtein distance fallback; show "Did you mean...?" |
| Same city selected for source and destination | Prevent in UI — disable already-selected city in the other dropdown |
| Window resize during animation | Leaflet handles map resize; canvas overlay redraws on resize event |
| Browser tab becomes inactive | Pause animation using Page Visibility API; resume on focus |
| Instant speed selected (0ms delay) | Skip animation entirely, jump straight to final path state |

---

## 8. Performance Considerations

- City graph is ~500 nodes — all algorithms run in < 10ms even on slow devices
- Canvas overlay (not SVG) for rendering — handles 1000s of edges without jank
- Steps array is pre-computed before animation starts — no computation during playback
- Leaflet tiles are cached by the browser after first load
- Debounce city search input by 150ms

---
