# AGENTS.md — Shortest Path Visualizer V1

## What This Project Is
A browser-only web app that visualizes shortest-path algorithms (BFS, Dijkstra, A*, Greedy Best-First, Bellman-Ford) on a static city graph. No backend. No API keys. No costs.

---

## Stack
- **Build:** Vite (vanilla JS, ES Modules — no React, no Vue)
- **Styling:** Tailwind CSS v3 via CDN in index.html (no PostCSS build step)
- **Map:** Leaflet.js with CartoDB Dark Matter tiles
- **Data:** Static `src/data/cities.json` bundled at build time
- **Deploy:** Vercel (free tier)

---

## Project Structure
```
shortest-path-viz/
├── public/favicon.ico
├── src/
│   ├── data/cities.json              # ~500 cities: { id, name, country, lat, lng } + edges
│   ├── algorithms/
│   │   ├── bfs.js
│   │   ├── dijkstra.js
│   │   ├── astar.js
│   │   ├── greedy.js
│   │   ├── bellman-ford.js
│   │   └── utils/
│   │       ├── minHeap.js            # MinPriorityQueue used by Dijkstra, A*, Greedy
│   │       ├── haversine.js          # haversine(a, b) → distance in km
│   │       └── pathUtils.js          # reconstructPath(parent, source, target) → id[]
│   ├── map/
│   │   ├── mapInit.js                # Leaflet map setup, tile layer
│   │   ├── canvasOverlay.js          # Custom Leaflet canvas layer for animations
│   │   └── renderer.js              # Renderer class — draws/updates nodes and edges
│   ├── ui/
│   │   ├── controls.js              # City autocomplete, algo dropdown, speed slider, buttons
│   │   ├── statsPanel.js            # Live counters: nodes visited, distance, steps, time
│   │   ├── speedControl.js          # Speed slider (100ms → 0ms)
│   │   ├── algoInfo.js              # Algorithm description card
│   │   └── toast.js                 # showError(msg) / showInfo(msg)
│   ├── core/
│   │   ├── graph.js                 # Graph class
│   │   └── animator.js              # Animator class
│   ├── main.js                      # App entry point
│   └── style.css                    # Tailwind directives + CSS custom properties
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Core Data Contracts

### cities.json shape
```js
// Node
{ id: "mumbai", name: "Mumbai", country: "India", lat: 19.076, lng: 72.877}
// Edge
{ source: "mumbai", target: "pune", distance: 149 }
// File structure
{ nodes: [...], edges: [...] }
```
Edges are bidirectional. Each city has 4–6 edges to nearest neighbours (Haversine).

### Graph class (src/core/graph.js)
```js
graph.neighbours(id)       // → [{ id, weight }]
graph.nodes()              // → string[]
graph.allEdges()           // → [{ source, target, weight }]
graph.getNode(id)          // → { id, lat, lng, name, country }
```

### Algorithm function signature (all 5 algorithms)
```js
fn(graph, sourceId, targetId, nodesMap) → { steps, path, visited }
// steps: Array of step objects (see below)
// path:  string[] of node IDs source→target, empty if no path
// visited: Set or Map of visited node IDs
```

### Step object types
```js
{ type: 'visit',     node: id, dist?: number, g?: number, h?: number }
{ type: 'explore',   node: id, from: id }
{ type: 'relax',     node: id, from: id, dist?: number, f?: number, round?: number }
{ type: 'iteration', round: number }   // Bellman-Ford only
```

### Renderer class (src/map/renderer.js)
```js
renderer.renderBase()                  // draws all nodes + edges at rest state
renderer.setSource(id)                 // green marker
renderer.setTarget(id)                 // rose marker
renderer.markVisited(id, color)        // dim algo color
renderer.markFrontier(id, color)       // bright algo color + pulse
renderer.highlightEdge(fromId, toId, color)
renderer.drawFinalPath(nodeIds)        // golden polyline, animated
renderer.clear()                       // reset everything to base state
```

### Animator class (src/core/animator.js)
```js
new Animator(steps, renderer, speedMs)
animator.play()
animator.pause()
animator.reset()
animator.setSpeed(ms)
// speedMs === 0 → skip animation, jump to final state
```

---

## Design Tokens
```
Background:      #0f1117
Surface:         #1a1f2e
Border:          #2a3142
Accent:          #6366f1  (indigo)
Accent light:    #818cf8

Algorithm colors:
  BFS:           #38bdf8  (sky)
  Dijkstra:      #34d399  (emerald)
  A*:            #f59e0b  (amber)
  Greedy:        #f87171  (red)
  Bellman-Ford:  #a78bfa  (purple)

Source node:     #4ade80  (green)
Destination:     #f43f5e  (rose)
Final path:      #fbbf24  (gold)
Visited (dim):   algo color @ 40% opacity
Frontier:        algo color @ 100% + pulse
```

Map tiles: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`

---

## Layout
- **Desktop:** 320px fixed left sidebar + full-height map
- **Mobile:** Full-screen map + bottom drawer (drag handle, slides up)
- Sidebar bg: `#1a1f2e`, page bg: `#0f1117`

---

## Key Behaviours & Rules

**Never break these:**
- All algorithm logic is pure JS — no side effects, no DOM access
- Algorithms pre-compute the full `steps` array before animation starts
- Renderer only mutates Leaflet layers — never re-builds the graph
- `cities.json` is loaded once at startup and never re-fetched
- Tailwind is CDN-only — do not add a PostCSS pipeline in V1

**Error states (use toast, never alert):**
- Source === destination → "Source and destination must be different."
- No path found → "No path found between these cities." + mark explored nodes grey
- Bellman-Ford > 2000 steps → cap, show "Skipping to result..."

**URL state:**
- Share URL format: `?from=mumbai&to=delhi&algo=dijkstra`
- On load: parse params → pre-fill form → auto-start visualization

**Performance rules:**
- Debounce city search input: 150ms
- Canvas overlay (not SVG) for all animation rendering
- Page Visibility API: pause animation when tab is hidden

---

## Algorithm Specifics

| Algorithm | Heap? | Weights? | Optimal? | Unique visual |
|-----------|-------|----------|----------|---------------|
| BFS | No (queue) | No | No | Concentric rings outward |
| Dijkstra | MinHeap | Yes | Yes | Distance bubble |
| A* | MinHeap | Yes + heuristic | Yes | Laser-focused toward target |
| Greedy | MinHeap | Heuristic only | No | Rushes straight, often wrong |
| Bellman-Ford | No | Yes | Yes | Waves/rounds pulsing outward |

A* heuristic: `haversine(currentNode, targetNode)` — straight-line km distance.

Bellman-Ford animation: group steps by `round` — show a "wave" per round rather than individual relaxations.

---

## Current Phase Tracker
Update this as phases complete:

- [x] Phase 1 — Scaffold & Map
- [ ] Phase 2 — City Dataset & Graph
- [ ] Phase 3 — Render Cities on Map
- [ ] Phase 4 — UI Controls
- [ ] Phase 5 — Algorithm Implementations
- [ ] Phase 6 — Animation Engine
- [ ] Phase 7 — Polish & Mobile
- [ ] Phase 8 — Deploy & Share

---

## Commands
```bash
npm run dev      # start dev server (localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

---

## Do Not
- Do not add React, Vue, or any component framework
- Do not add a backend or serverless functions
- Do not require an API key for any feature
- Do not use `alert()`, `confirm()`, or `prompt()`
- Do not use SVG layers for animation (use Canvas)
- Do not fetch cities.json more than once per session
