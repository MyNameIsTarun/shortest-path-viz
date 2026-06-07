import L from 'leaflet';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BASE_NODE_COLOR   = '#4a5568';
const BASE_NODE_FILL    = '#4a5568';
const BASE_EDGE_COLOR   = '#2a3142';
const SOURCE_COLOR      = '#4ade80';  // green
const TARGET_COLOR      = '#f43f5e';  // rose
const FINAL_PATH_COLOR  = '#fbbf24';  // gold

const BASE_RADIUS        = 4;
const HIGHLIGHT_RADIUS   = 6;
const FINAL_PATH_WEIGHT  = 3;
const BASE_EDGE_WEIGHT   = 1;
const BASE_EDGE_OPACITY  = 0.5;

// CSS class injected once for the pulse animation
const PULSE_STYLE_ID = 'spv-pulse-style';

function ensurePulseStyle() {
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes spv-pulse {
      0%   { stroke-opacity: 1;   stroke-width: 2; }
      50%  { stroke-opacity: 0.4; stroke-width: 6; }
      100% { stroke-opacity: 1;   stroke-width: 2; }
    }
    .spv-frontier path,
    .spv-frontier circle {
      animation: spv-pulse 1s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
export class Renderer {
  /**
   * @param {L.Map}   map
   * @param {import('../core/graph.js').Graph} graph
   */
  constructor(map, graph) {
    this._map   = map;
    this._graph = graph;

    /** @type {Map<string, L.CircleMarker>} */
    this._nodeMarkers = new Map();

    /** @type {L.Polyline[]} */
    this._edgeLines = [];

    /** @type {L.Polyline[]} */
    this._finalPathLines = [];
    this._finalPathTimer = null;

    /** Track which node is currently source / target */
    this._sourceId = null;
    this._targetId = null;

    ensurePulseStyle();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Render all nodes and edges at base (rest) state. */
  renderBase() {
    this._clearEdges();
    this._clearNodes();
    this._clearFinalPath();

    // Draw edges first so nodes appear on top
    for (const edge of this._graph.allEdges()) {
      this._drawEdge(edge.source, edge.target);
    }

    // Draw nodes
    for (const id of this._graph.nodes()) {
      this._drawNode(id);
    }
  }

  /** Highlight the source node in green. */
  setSource(id) {
    // Reset previous source
    if (this._sourceId && this._sourceId !== this._targetId) {
      this._resetNode(this._sourceId);
    }
    this._sourceId = id;
    this._styleNode(id, {
      color:       SOURCE_COLOR,
      fillColor:   SOURCE_COLOR,
      fillOpacity: 1,
      radius:      HIGHLIGHT_RADIUS,
      weight:      2,
    });
    this._bringNodeToFront(id);
  }

  /** Highlight the target node in rose. */
  setTarget(id) {
    // Reset previous target
    if (this._targetId && this._targetId !== this._sourceId) {
      this._resetNode(this._targetId);
    }
    this._targetId = id;
    this._styleNode(id, {
      color:       TARGET_COLOR,
      fillColor:   TARGET_COLOR,
      fillOpacity: 1,
      radius:      HIGHLIGHT_RADIUS,
      weight:      2,
    });
    this._bringNodeToFront(id);
  }

  /**
   * Mark a node as visited (dim, algorithm colour @ 40% opacity).
   * @param {string} id
   * @param {string} algoColor  hex colour for the current algorithm
   */
  markVisited(id, algoColor) {
    if (id === this._sourceId || id === this._targetId) return;
    this._removePulse(id);
    this._styleNode(id, {
      color:       algoColor,
      fillColor:   algoColor,
      fillOpacity: 0.4,
      radius:      BASE_RADIUS,
      weight:      1,
    });
  }

  /**
   * Mark a node as frontier (full brightness + pulse animation).
   * @param {string} id
   * @param {string} algoColor
   */
  markFrontier(id, algoColor) {
    if (id === this._sourceId || id === this._targetId) return;
    this._styleNode(id, {
      color:       algoColor,
      fillColor:   algoColor,
      fillOpacity: 1,
      radius:      BASE_RADIUS + 1,
      weight:      2,
    });
    this._addPulse(id);
    this._bringNodeToFront(id);
  }

  /**
   * Highlight an edge with the algorithm colour.
   * @param {string} fromId
   * @param {string} toId
   * @param {string} color
   */
  highlightEdge(fromId, toId, color) {
    // Find matching edge line and restyle it
    const fromNode = this._graph.getNode(fromId);
    const toNode   = this._graph.getNode(toId);
    if (!fromNode || !toNode) return;

    // We store the edge key on the line for fast lookup
    for (const line of this._edgeLines) {
      if (line._spvKey === this._edgeKey(fromId, toId)) {
        line.setStyle({ color, weight: 1.5, opacity: 0.8 });
        return;
      }
    }
  }

  /**
   * Draw the final golden path through the given node IDs.
   * @param {string[]} nodeIds
   */
  drawFinalPath(nodeIds) {
    this._clearFinalPath();
    if (nodeIds.length < 2) return;

    let i = 0;
    const drawNext = () => {
      if (i >= nodeIds.length - 1) return;
      
      const idA = nodeIds[i];
      const idB = nodeIds[i + 1];
      const nA = this._graph.getNode(idA);
      const nB = this._graph.getNode(idB);
      
      if (nA && nB) {
        const line = L.polyline([[nA.lat, nA.lng], [nB.lat, nB.lng]], {
          color:   FINAL_PATH_COLOR,
          weight:  FINAL_PATH_WEIGHT,
          opacity: 0.95,
        }).addTo(this._map);
        this._finalPathLines.push(line);
      }
      
      i++;
      this._finalPathTimer = setTimeout(drawNext, 100);
    };
    
    drawNext();
  }

  /** Reset all nodes and edges back to base state. */
  clear() {
    this._sourceId = null;
    this._targetId = null;

    for (const [id, marker] of this._nodeMarkers.entries()) {
      this._removePulse(id);
      marker.setStyle(this._baseNodeStyle());
      marker.setRadius(BASE_RADIUS);
    }

    this._clearFinalPath();

    for (const line of this._edgeLines) {
      line.setStyle(this._baseEdgeStyle());
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  _drawNode(id) {
    const node = this._graph.getNode(id);
    if (!node) return;

    const marker = L.circleMarker([node.lat, node.lng], {
      ...this._baseNodeStyle(),
      radius: BASE_RADIUS,
    }).addTo(this._map);

    marker.bindTooltip(`<b>${node.name}</b><br><span style="color:#94a3b8">${node.country}</span>`, {
      permanent:  false,
      direction:  'top',
      offset:     [0, -6],
      className:  'spv-tooltip',
      opacity:    0.95,
    });

    this._nodeMarkers.set(id, marker);
  }

  _drawEdge(sourceId, targetId) {
    const a = this._graph.getNode(sourceId);
    const b = this._graph.getNode(targetId);
    if (!a || !b) return;

    const line = L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
      ...this._baseEdgeStyle(),
    }).addTo(this._map);

    line._spvKey = this._edgeKey(sourceId, targetId);
    this._edgeLines.push(line);
  }

  _styleNode(id, options) {
    const marker = this._nodeMarkers.get(id);
    if (!marker) return;
    const { radius, ...styleOpts } = options;
    if (radius !== undefined) marker.setRadius(radius);
    marker.setStyle(styleOpts);
  }

  _resetNode(id) {
    this._removePulse(id);
    this._styleNode(id, {
      ...this._baseNodeStyle(),
      radius: BASE_RADIUS,
    });
  }

  _bringNodeToFront(id) {
    const marker = this._nodeMarkers.get(id);
    if (marker && marker.bringToFront) marker.bringToFront();
  }

  _addPulse(id) {
    const marker = this._nodeMarkers.get(id);
    if (!marker) return;
    const el = marker.getElement();
    if (el) el.classList.add('spv-frontier');
  }

  _removePulse(id) {
    const marker = this._nodeMarkers.get(id);
    if (!marker) return;
    const el = marker.getElement();
    if (el) el.classList.remove('spv-frontier');
  }

  _clearNodes() {
    for (const marker of this._nodeMarkers.values()) {
      marker.remove();
    }
    this._nodeMarkers.clear();
  }

  _clearEdges() {
    for (const line of this._edgeLines) {
      line.remove();
    }
    this._edgeLines = [];
  }

  _clearFinalPath() {
    if (this._finalPathTimer) {
      clearTimeout(this._finalPathTimer);
      this._finalPathTimer = null;
    }
    for (const line of this._finalPathLines) {
      line.remove();
    }
    this._finalPathLines = [];
  }

  _baseNodeStyle() {
    return {
      color:       BASE_NODE_COLOR,
      fillColor:   BASE_NODE_FILL,
      fillOpacity: 0.85,
      weight:      1,
      opacity:     0.9,
    };
  }

  _baseEdgeStyle() {
    return {
      color:   BASE_EDGE_COLOR,
      weight:  BASE_EDGE_WEIGHT,
      opacity: BASE_EDGE_OPACITY,
    };
  }

  _edgeKey(a, b) {
    return [a, b].sort().join(':');
  }
}

export default Renderer;
