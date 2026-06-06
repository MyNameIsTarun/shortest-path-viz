// ─── Stats Panel ──────────────────────────────────────────────────────────────
// Shows live counters: nodes visited, path distance, steps taken, elapsed time

export class StatsPanel {
  /**
   * @param {HTMLElement} containerEl
   */
  constructor(containerEl) {
    this._el = containerEl;
    this._stats = {
      nodesVisited: 0,
      distanceKm:   null,
      steps:        0,
      timeMs:       null,
      pathLength:   null,
    };
    this._render();
  }

  /** Update any subset of stats and re-render. */
  update(patch) {
    Object.assign(this._stats, patch);
    this._renderValues();
  }

  /** Reset all stats to zero / null. */
  reset() {
    this._stats = {
      nodesVisited: 0,
      distanceKm:   null,
      steps:        0,
      timeMs:       null,
      pathLength:   null,
    };
    this._renderValues();
  }

  _render() {
    this._el.innerHTML = `
      <div class="grid grid-cols-2 gap-2">
        <div class="spv-stat-card" id="stat-nodes">
          <div class="spv-stat-label">Nodes Visited</div>
          <div class="spv-stat-value" id="stat-nodes-val">—</div>
        </div>
        <div class="spv-stat-card" id="stat-steps">
          <div class="spv-stat-label">Steps</div>
          <div class="spv-stat-value" id="stat-steps-val">—</div>
        </div>
        <div class="spv-stat-card" id="stat-dist">
          <div class="spv-stat-label">Path Distance</div>
          <div class="spv-stat-value" id="stat-dist-val">—</div>
        </div>
        <div class="spv-stat-card" id="stat-time">
          <div class="spv-stat-label">Calc Time</div>
          <div class="spv-stat-value" id="stat-time-val">—</div>
        </div>
      </div>
      <div id="stat-hops" class="mt-2 text-xs text-slate-500 text-center hidden">
        Path: <span id="stat-hops-val" class="text-slate-300 font-medium"></span> hops
      </div>
    `;
    this._renderValues();
  }

  _renderValues() {
    const s = this._stats;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('stat-nodes-val', s.nodesVisited > 0 ? s.nodesVisited.toLocaleString() : '—');
    set('stat-steps-val', s.steps > 0 ? s.steps.toLocaleString() : '—');
    set('stat-dist-val',  s.distanceKm != null ? `${Math.round(s.distanceKm).toLocaleString()} km` : '—');
    set('stat-time-val',  s.timeMs != null ? `${s.timeMs.toFixed(1)} ms` : '—');

    const hopsRow = document.getElementById('stat-hops');
    if (hopsRow && s.pathLength != null && s.pathLength > 0) {
      hopsRow.classList.remove('hidden');
      set('stat-hops-val', String(s.pathLength - 1));
    } else if (hopsRow) {
      hopsRow.classList.add('hidden');
    }
  }
}
