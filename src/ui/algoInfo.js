// ─── Algorithm metadata ───────────────────────────────────────────────────────
export const ALGO_META = {
  bfs: {
    id:          'bfs',
    label:       'BFS',
    fullName:    'Breadth-First Search',
    color:       '#38bdf8',
    weighted:    false,
    optimal:     false,
    badge:       'Unweighted',
    badgeBg:     '#0e3a54',
    complexity:  { time: 'O(V + E)', space: 'O(V)' },
    bestFor:     'Unweighted graphs, finding shortest hop count',
    description: 'Explores all neighbors level by level, expanding outward in concentric rings. Ignores edge weights — every hop counts equally. Fast on sparse graphs but misses geographically shorter routes.',
    funFact:     'BFS was first described by Konrad Zuse in 1945 (for his computer Plankalkül), and independently rediscovered by Edward Moore in 1959.',
  },
  dijkstra: {
    id:          'dijkstra',
    label:       'Dijkstra',
    fullName:    "Dijkstra's Algorithm",
    color:       '#34d399',
    weighted:    true,
    optimal:     true,
    badge:       'Weighted · Optimal',
    badgeBg:     '#0a3328',
    complexity:  { time: 'O((V + E) log V)', space: 'O(V)' },
    bestFor:     'Guarantees shortest path on non-negative weighted graphs',
    description: 'Always expands the node with the lowest cumulative distance. Forms a distance bubble — not a perfect circle, since highways stretch it in certain directions. The gold standard for road networks.',
    funFact:     'Edsger Dijkstra designed this algorithm in ~20 minutes in a café in Amsterdam in 1956, without pencil and paper.',
  },
  astar: {
    id:          'astar',
    label:       'A*',
    fullName:    'A* Search',
    color:       '#f59e0b',
    weighted:    true,
    optimal:     true,
    badge:       'Heuristic · Optimal',
    badgeBg:     '#2d1e00',
    complexity:  { time: 'O(E log V)', space: 'O(V)' },
    bestFor:     'Fastest optimal pathfinding when a good heuristic exists',
    description: 'Uses f(n) = g(n) + h(n): actual cost from start plus straight-line distance to goal. Laser-focused toward the destination, skipping huge swaths of the graph. The most satisfying to watch.',
    funFact:     'A* was invented at Stanford Research Institute in 1968 by Hart, Nilsson, and Raphael, originally for the Shakey robot navigation system.',
  },
  greedy: {
    id:          'greedy',
    label:       'Greedy',
    fullName:    'Greedy Best-First',
    color:       '#f87171',
    weighted:    false,
    optimal:     false,
    badge:       'Heuristic · Suboptimal',
    badgeBg:     '#2d0f0f',
    complexity:  { time: 'O(E log V)', space: 'O(V)' },
    bestFor:     'Speed over accuracy — illustrates why heuristic-only fails',
    description: 'Rushes directly toward the goal using only the straight-line heuristic, ignoring actual path cost. Often dramatically wrong — gets trapped in dead ends. Great for understanding why optimality matters.',
    funFact:     'Greedy best-first is essentially what you would do if you always drove in the compass direction of your destination, ignoring roads.',
  },
  'bellman-ford': {
    id:          'bellman-ford',
    label:       'Bellman-Ford',
    fullName:    'Bellman-Ford',
    color:       '#a78bfa',
    weighted:    true,
    optimal:     true,
    badge:       'Weighted · Optimal',
    badgeBg:     '#1e1040',
    complexity:  { time: 'O(V × E)', space: 'O(V)' },
    bestFor:     'Graphs with negative edge weights; detecting negative cycles',
    description: 'Relaxes ALL edges in waves, round by round. Much slower than Dijkstra on positive-weight graphs, but the only algorithm that handles negative edge weights correctly. Visually unique pulsing animation.',
    funFact:     'Richard Bellman (1958) and Lester Ford Jr. (1956) developed this independently. Alfonso Shimbel described the algorithm even earlier in 1955.',
  },
};

export const ALGO_LIST = [
  ALGO_META.bfs,
  ALGO_META.dijkstra,
  ALGO_META.astar,
  ALGO_META.greedy,
  ALGO_META['bellman-ford'],
];

// ─── AlgoInfo panel ───────────────────────────────────────────────────────────
export class AlgoInfo {
  /**
   * @param {HTMLElement} containerEl  – element to render into
   */
  constructor(containerEl) {
    this._el = containerEl;
    this._currentAlgo = 'dijkstra';
    this._render();
  }

  setAlgorithm(algoId) {
    this._currentAlgo = algoId;
    this._render();
  }

  _render() {
    const meta = ALGO_META[this._currentAlgo] ?? ALGO_META.dijkstra;

    this._el.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-semibold" style="color:${meta.color}">${meta.fullName}</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium" 
                style="background:${meta.badgeBg}; color:${meta.color}; border: 1px solid ${meta.color}40">
            ${meta.badge}
          </span>
        </div>

        <p class="text-xs leading-relaxed text-slate-400">${meta.description}</p>

        <div class="grid grid-cols-2 gap-2">
          <div class="rounded p-2" style="background:#0f1117; border:1px solid #2a3142">
            <div class="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Time</div>
            <div class="text-xs font-mono text-slate-300">${meta.complexity.time}</div>
          </div>
          <div class="rounded p-2" style="background:#0f1117; border:1px solid #2a3142">
            <div class="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Space</div>
            <div class="text-xs font-mono text-slate-300">${meta.complexity.space}</div>
          </div>
        </div>

        <div class="rounded p-2 text-xs text-slate-400 italic leading-relaxed"
             style="background:#0f1117; border-left: 2px solid ${meta.color}60">
          💡 ${meta.funFact}
        </div>
      </div>
    `;
  }
}
