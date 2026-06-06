## Implementation Plan — V1

Each phase is designed to be completable in a single Claude Code / AI session (~1–2 hours).

---

### Phase 1 — Project Scaffold & Map

**Goal:** Get Vite + Tailwind + Leaflet running with a map on screen.

**Tasks:**
- Init Vite project: `npm create vite@latest shortest-path-viz -- --template vanilla`
- Install dependencies: `leaflet`, `tailwindcss` (via CDN in index.html for simplicity)
- Create `index.html` with dark background, two-column layout (sidebar + map)
- Initialize Leaflet map centered on world view with dark tile layer
- Add basic Tailwind dark theme CSS variables

**Acceptance Criteria:**
- [ ] `npm run dev` starts without errors
- [ ] Map renders with dark tiles (use CartoDB Dark Matter: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`)
- [ ] Sidebar and map take correct proportions on desktop
- [ ] No console errors

---

### Phase 2 — City Dataset & Graph

**Goal:** Generate the cities.json dataset and build the Graph class.

**Tasks:**
- Write a one-time Node.js script to generate `cities.json` from a hardcoded list of ~500 world cities with lat/lng
- Implement Haversine distance formula utility
- For each city, compute edges to its 5 nearest cities
- Build `src/core/graph.js` with methods: `neighbours(id)`, `nodes()`, `allEdges()`, `getNode(id)`
- Write a simple test to verify the graph is connected

**Acceptance Criteria:**
- [ ] `cities.json` contains >= 400 cities with correct lat/lng
- [ ] Every city has at least 3 edges
- [ ] `graph.neighbours('mumbai')` returns an array of `{ id, weight }` objects
- [ ] Haversine distance between Mumbai and Delhi ≈ 1150 km (±50)

---

### Phase 3 — Render Cities on Map

**Goal:** Display city dots and edges on the Leaflet map.

**Tasks:**
- Create `src/map/renderer.js`
- Use Leaflet's `L.CircleMarker` to render city nodes as small dots
- Use `L.Polyline` to render all edges as thin gray lines on load
- On hover, highlight the city and show a tooltip
- Distinguish between regular, source, destination, visited, and frontier node states visually

**Acceptance Criteria:**
- [ ] All ~500 cities show as small dots on the map
- [ ] Edges visible as thin lines connecting nearby cities
- [ ] Hovering a city shows a tooltip with name and country
- [ ] Source node is green, destination is rose/red

---

### Phase 4 — UI Controls

**Goal:** City search autocomplete + algorithm dropdown + speed slider.

**Tasks:**
- Create `src/ui/controls.js`
- Implement city search with autocomplete (filter from cities.json)
- Algorithm dropdown with 5 options
- Speed slider (Turtle → Instant)
- Visualize / Pause / Reset buttons
- Wire up source/destination selection to renderer

**Acceptance Criteria:**
- [ ] Typing in source field filters city list live
- [ ] Selecting a city pans map to it and places correct marker
- [ ] Algorithm dropdown shows all 5 algorithms
- [ ] Speed slider has 5 notches with labels
- [ ] Visualize button is disabled unless both source + destination are set
- [ ] Reset clears the map back to base state

---

### Phase 5 — Algorithm Implementations

**Goal:** Implement all 5 algorithms, each returning a `steps` array.

**Tasks:**
- Implement BFS, Dijkstra, A*, Greedy Best-First, Bellman-Ford
- Each returns `{ steps, path, visited }` where steps is a list of `{ type, node, from?, dist?, round? }` events
- Implement MinPriorityQueue (min-heap) utility
- Implement `reconstructPath(parent, source, target)` utility

**Acceptance Criteria:**
- [ ] All 5 algorithms return a non-empty `steps` array
- [ ] Dijkstra and A* return the same optimal path for Mumbai → Delhi
- [ ] BFS returns a valid path (not necessarily shortest by distance)
- [ ] Greedy often returns a suboptimal path
- [ ] Bellman-Ford steps include `{ type: 'iteration', round: N }` markers
- [ ] Each algorithm completes in < 50ms for any city pair

---

### Phase 6 — Animation Engine

**Goal:** Wire algorithms to the renderer with step-by-step playback.

**Tasks:**
- Create `src/core/animator.js` with play/pause/reset/setSpeed
- Wire the Visualize button to: run selected algorithm → get steps → start animator
- Stats panel updates live: nodes visited counter, current distance
- Handle the `instant` speed mode (no animation, just final state)

**Acceptance Criteria:**
- [ ] Clicking Visualize starts the animation at selected speed
- [ ] Pause/Resume works mid-animation
- [ ] Reset clears the map
- [ ] Nodes visited counter increments live during animation
- [ ] "Instant" mode shows only the final path with no intermediate steps
- [ ] Animation completes with the golden path drawn

---

### Phase 7 — Algorithm Info Panel & Polish

**Goal:** Add educational content, tooltips, and visual polish.

**Tasks:**
- Algorithm info card with description, complexity, and "best for" text
- Comparison mode: run two algorithms side-by-side and compare stats
- Toast notifications for error states (no path, same city, etc.)
- Smooth path draw animation (nodes light up one by one along final path)
- Mobile responsive: bottom drawer for controls
- Loading indicator while graph initializes

**Acceptance Criteria:**
- [ ] Each algorithm has a description card that updates on dropdown change
- [ ] Error states show non-intrusive toast messages
- [ ] Final path animates with a "drawing" effect (not instant pop-in)
- [ ] Mobile layout uses bottom drawer, map is full-screen
- [ ] No layout overflow on 375px wide viewport

---

### Phase 8 — Deploy & Share

**Goal:** Deploy to Vercel and add sharing features.

**Tasks:**
- Add `vite.config.js` with correct base path
- Create a "Share" button that encodes current source/destination/algorithm in URL params
- Add README with screenshots
- Deploy to Vercel via GitHub

**Acceptance Criteria:**
- [ ] `npm run build` produces a `dist/` folder with no errors
- [ ] App loads correctly on Vercel URL
- [ ] Share URL like `?from=mumbai&to=delhi&algo=dijkstra` pre-fills the form
- [ ] README has a live demo link and screenshots

---

## 10. Estimated Total Time

| Phase | Estimated time |
|---|---|
| Phase 1: Scaffold | 30–45 min |
| Phase 2: Dataset & Graph | 45–60 min |
| Phase 3: Render on Map | 45–60 min |
| Phase 4: UI Controls | 45–60 min |
| Phase 5: Algorithms | 60–90 min |
| Phase 6: Animation | 45–60 min |
| Phase 7: Polish | 60–90 min |
| Phase 8: Deploy | 20–30 min |
| **Total** | **~7–9 hours** |

Each phase is independent enough to be a single focused AI coding session.
