import { ALGO_LIST, AlgoInfo } from './algoInfo.js';
import { StatsPanel }          from './statsPanel.js';
import cities                  from '../data/cities.json' with { type: 'json' };

// ─── Constants ────────────────────────────────────────────────────────────────
const SPEED_STEPS = [
  { label: 'Slow',    ms: 100 },
  { label: '',        ms: 50  },
  { label: '',        ms: 20  },
  { label: '',        ms: 5   },
  { label: 'Instant', ms: 0   },
];

const AUTOCOMPLETE_DEBOUNCE_MS = 150;
const AUTOCOMPLETE_MAX_RESULTS = 8;

// ─── Controls class ───────────────────────────────────────────────────────────
export class Controls {
  /**
   * @param {HTMLElement}                           rootEl   – sidebar container
   * @param {import('../core/graph.js').Graph}      graph
   * @param {import('leaflet').Map}                 map
   */
  constructor(rootEl, graph, map) {
    this._root   = rootEl;
    this._graph  = graph;
    this._map    = map;

    // State
    this._sourceId  = null;
    this._targetId  = null;
    this._algoId    = 'dijkstra';
    this._speedMs   = 20;
    this._uiState   = 'idle'; // 'idle' | 'running' | 'paused'

    // All city nodes as flat array for search
    this._allCities = cities.nodes.slice().sort((a, b) => a.name.localeCompare(b.name));

    this._render();
    this._bindEvents();
    // Set initial slider track fill
    this._updateSliderTrack(document.getElementById('speed-slider'));
  }

  // ─── Public getters ─────────────────────────────────────────────────────────

  get sourceId()  { return this._sourceId; }
  get targetId()  { return this._targetId; }
  get algorithm() { return this._algoId; }
  get speedMs()   { return this._speedMs; }

  /**
   * Programmatically set source (e.g. from URL params or map click).
   * @param {string} id
   */
  setSource(id) {
    const node = this._graph.getNode(id);
    if (!node) return;
    this._sourceId = id;
    this._setInputValue('source', node.name);
    this._updateVisualizeButton();
    this._emit('sourceChanged', { id, node });
  }

  /**
   * Programmatically set target.
   * @param {string} id
   */
  setTarget(id) {
    const node = this._graph.getNode(id);
    if (!node) return;
    this._targetId = id;
    this._setInputValue('target', node.name);
    this._updateVisualizeButton();
    this._emit('targetChanged', { id, node });
  }

  /**
   * Programmatically set algorithm.
   * @param {string} id
   */
  setAlgorithm(id) {
    const meta = ALGO_LIST.find(a => a.id === id);
    if (!meta) return;
    this._algoId = id;
    this._syncAlgoButton(id);
    this._algoInfo?.setAlgorithm(id);
    this._emit('algoChanged', { algorithm: id });
  }

  /**
   * Switch button state: 'idle' | 'running' | 'paused'
   * @param {'idle'|'running'|'paused'} state
   */
  setButtonState(state) {
    this._uiState = state;
    this._syncButtons();
  }

  /** Update the stats panel. */
  updateStats(patch) {
    this._statsPanel?.update(patch);
  }

  /** Reset the stats panel to blank. */
  resetStats() {
    this._statsPanel?.reset();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  _render() {
    this._root.innerHTML = `
      <!-- ── Header ── -->
      <div class="mb-6">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-400">Pathfinder</p>
            <h1 class="mt-1.5 text-xl font-bold text-white leading-tight">Shortest Path<br>Visualizer</h1>
          </div>
          <button id="btn-share" class="p-2 mt-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Share current state">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
        </div>
        <p class="mt-1.5 text-xs text-slate-500 leading-relaxed">
          Visualize BFS, Dijkstra, A*, Greedy &amp; Bellman-Ford on a world city graph.
        </p>
      </div>

      <!-- ── City pickers ── -->
      <div class="space-y-3 mb-5">
        <div class="spv-field-label">Source City</div>
        ${this._autocompleteHTML('source', 'From city…')}

        <div class="flex justify-center">
          <button id="btn-swap" title="Swap source and destination"
            class="p-1.5 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
            aria-label="Swap source and destination">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
            </svg>
          </button>
        </div>

        <div class="spv-field-label">Destination City</div>
        ${this._autocompleteHTML('target', 'To city…')}
      </div>

      <!-- ── Algorithm dropdown ── -->
      <div class="mb-5">
        <div class="spv-field-label">Algorithm</div>
        <div class="relative" id="algo-dropdown-wrapper">
          <button id="algo-btn" aria-haspopup="listbox" aria-expanded="false"
            class="w-full flex items-center gap-2 px-3 py-2.5 rounded text-sm text-left
                   bg-background border border-border hover:border-indigo-500/60
                   focus:outline-none focus:border-indigo-500 transition-colors">
            <span id="algo-color-dot" class="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"></span>
            <span id="algo-label" class="flex-1 font-medium text-slate-200"></span>
            <svg class="w-4 h-4 text-slate-500 shrink-0 transition-transform" id="algo-chevron"
                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <ul id="algo-list" role="listbox" aria-label="Algorithm"
              class="absolute z-50 w-full mt-1 rounded border border-border shadow-2xl shadow-black/50 hidden overflow-hidden"
              style="background:#1a1f2e">
            ${ALGO_LIST.map(a => `
              <li role="option" data-algo-id="${a.id}"
                  class="algo-option flex items-center gap-3 px-3 py-2.5 cursor-pointer
                         hover:bg-white/5 transition-colors"
                  style="border-left: 3px solid ${a.color}">
                <span class="w-2 h-2 rounded-full shrink-0" style="background:${a.color}"></span>
                <span class="text-sm font-medium text-slate-200">${a.label}</span>
                <span class="text-xs text-slate-500 ml-auto">${a.badge ?? ''}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      <!-- ── Speed slider ── -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <div class="spv-field-label">Speed</div>
          <span id="speed-label-display" class="text-xs text-indigo-400 font-medium"></span>
        </div>
        <input id="speed-slider" type="range"
               min="0" max="${SPEED_STEPS.length - 1}" step="1" value="2"
               class="spv-slider w-full"
               aria-label="Animation speed">
        <div class="flex justify-between mt-1.5">
          <span class="text-[10px] text-slate-600">Slow</span>
          <span class="text-[10px] text-slate-600">Instant</span>
        </div>
      </div>

      <!-- ── Action buttons ── -->
      <div class="space-y-2 mb-6">
        <button id="btn-visualize"
          class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded
                 font-semibold text-sm text-white transition-all duration-200
                 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          disabled aria-disabled="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
               fill="currentColor" class="shrink-0" id="viz-btn-icon">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
          <span id="viz-btn-label">Visualize</span>
        </button>

        <div class="grid grid-cols-2 gap-2">
          <button id="btn-pause"
            class="flex items-center justify-center gap-1.5 py-2 px-3 rounded
                   text-sm font-medium text-slate-300
                   bg-surface border border-border hover:border-slate-500 hover:text-white
                   active:scale-[0.97] transition-all duration-150
                   disabled:opacity-40 disabled:cursor-not-allowed"
            disabled aria-disabled="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="currentColor" id="pause-btn-icon">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
            <span id="pause-btn-label">Pause</span>
          </button>

          <button id="btn-reset"
            class="flex items-center justify-center gap-1.5 py-2 px-3 rounded
                   text-sm font-medium text-slate-300
                   bg-surface border border-border hover:border-slate-500 hover:text-white
                   active:scale-[0.97] transition-all duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Reset
          </button>
        </div>
      </div>

      <!-- ── Stats panel ── -->
      <div class="mb-5 border-t border-border pt-4">
        <div class="spv-field-label mb-3">Stats</div>
        <div id="stats-mount"></div>
      </div>

      <!-- ── Algo info card ── -->
      <div class="border-t border-border pt-4 pb-2">
        <div class="spv-field-label mb-3">Algorithm Info</div>
        <div id="algo-info-mount"></div>
      </div>
    `;

    // Mount sub-components
    this._statsPanel = new StatsPanel(document.getElementById('stats-mount'));
    this._algoInfo   = new AlgoInfo(document.getElementById('algo-info-mount'));

    // Initialise dropdown to default algo
    this._syncAlgoButton(this._algoId);
    this._syncSpeedLabel();
  }

  _autocompleteHTML(role, placeholder) {
    return `
      <div class="spv-autocomplete" id="ac-wrap-${role}" data-role="${role}">
        <div class="relative">
          <input id="ac-input-${role}"
                 type="text"
                 autocomplete="off"
                 spellcheck="false"
                 placeholder="${placeholder}"
                 aria-label="${role === 'source' ? 'Source' : 'Destination'} city"
                 aria-autocomplete="list"
                 aria-controls="ac-list-${role}"
                 class="w-full px-3 py-2.5 rounded text-sm text-slate-200 placeholder-slate-600
                        bg-background border border-border
                        hover:border-slate-500 focus:border-indigo-500 focus:outline-none
                        transition-colors pr-8">
          <button id="ac-clear-${role}" aria-label="Clear ${role}"
                  class="absolute right-2 top-1/2 -translate-y-1/2 hidden
                         text-slate-600 hover:text-slate-300 transition-colors p-0.5 rounded"
                  tabindex="-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <ul id="ac-list-${role}" role="listbox" aria-label="${role} city list"
            class="ac-dropdown hidden w-full mt-1 rounded border border-border
                   shadow-2xl shadow-black/60 overflow-hidden"
            style="background:#1a1f2e; max-height:240px; overflow-y:auto; position:absolute; z-index:100; width: calc(100% - 0px)">
        </ul>
      </div>
    `;
  }

  // ─── Events & interactions ──────────────────────────────────────────────────

  _bindEvents() {
    // Autocomplete inputs
    this._bindAutocomplete('source');
    this._bindAutocomplete('target');

    // Swap button
    document.getElementById('btn-swap')?.addEventListener('click', () => this._swap());

    // Algorithm dropdown
    this._bindAlgoDropdown();

    // Share button
    document.getElementById('btn-share')?.addEventListener('click', () => {
      this._emit('share', {
        sourceId: this._sourceId,
        targetId: this._targetId,
        algorithm: this._algoId,
      });
    });

    // Speed slider
    const slider = document.getElementById('speed-slider');
    slider?.addEventListener('input', () => {
      const idx = parseInt(slider.value, 10);
      this._speedMs = SPEED_STEPS[idx].ms;
      this._syncSpeedLabel();
      this._updateSliderTrack(slider);
      this._emit('speedChanged', { speedMs: this._speedMs });
    });

    // Action buttons
    document.getElementById('btn-visualize')?.addEventListener('click', () => {
      if (this._uiState === 'running') return;
      this._emit('visualize', {
        sourceId:  this._sourceId,
        targetId:  this._targetId,
        algorithm: this._algoId,
        speedMs:   this._speedMs,
      });
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      if (this._uiState === 'running') {
        this._emit('pause', {});
      } else if (this._uiState === 'paused') {
        this._emit('resume', {});
      }
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      this._emit('reset', {});
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#ac-wrap-source'))  this._closeDropdown('source');
      if (!e.target.closest('#ac-wrap-target'))  this._closeDropdown('target');
      if (!e.target.closest('#algo-dropdown-wrapper')) this._closeAlgoList();
    });
  }

  // ─── Autocomplete ──────────────────────────────────────────────────────────

  _bindAutocomplete(role) {
    const input   = document.getElementById(`ac-input-${role}`);
    const clearBtn = document.getElementById(`ac-clear-${role}`);
    if (!input) return;

    let debounceTimer = null;
    let highlightIdx  = -1;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const q = input.value.trim();
        this._renderDropdown(role, q, highlightIdx);
        clearBtn.classList.toggle('hidden', !q);
      }, AUTOCOMPLETE_DEBOUNCE_MS);

      // Clear stored selection if user edits
      if (role === 'source') this._sourceId = null;
      else                   this._targetId = null;
      this._updateVisualizeButton();
    });

    input.addEventListener('focus', () => {
      const q = input.value.trim();
      this._renderDropdown(role, q, -1);
    });

    input.addEventListener('keydown', (e) => {
      const list = document.getElementById(`ac-list-${role}`);
      const items = list?.querySelectorAll('li[role="option"]') ?? [];
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightIdx = Math.min(highlightIdx + 1, items.length - 1);
        this._updateHighlight(items, highlightIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightIdx = Math.max(highlightIdx - 1, 0);
        this._updateHighlight(items, highlightIdx);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIdx >= 0 && items[highlightIdx]) {
          items[highlightIdx].click();
        }
      } else if (e.key === 'Escape') {
        this._closeDropdown(role);
        input.blur();
      }
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      if (role === 'source') { this._sourceId = null; this._emit('sourceCleared', {}); }
      else                   { this._targetId = null; this._emit('targetCleared', {}); }
      this._updateVisualizeButton();
      this._closeDropdown(role);
      input.focus();
    });
  }

  _renderDropdown(role, query, highlightIdx = -1) {
    const list = document.getElementById(`ac-list-${role}`);
    if (!list) return;

    const otherSelected = role === 'source' ? this._targetId : this._sourceId;

    let results = query
      ? this._allCities.filter(c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.country.toLowerCase().includes(query.toLowerCase())
        ).slice(0, AUTOCOMPLETE_MAX_RESULTS)
      : this._allCities.slice(0, AUTOCOMPLETE_MAX_RESULTS);

    if (!results.length) {
      list.innerHTML = `<li class="px-3 py-2.5 text-xs text-slate-500 italic">No cities found</li>`;
      list.classList.remove('hidden');
      return;
    }

    list.innerHTML = results.map((c, i) => {
      const isDisabled = c.id === otherSelected;
      const isActive   = i === highlightIdx;
      return `
        <li role="option" data-city-id="${c.id}" data-role="${role}"
            aria-selected="${isActive}"
            class="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm transition-colors
                   ${isActive ? 'bg-indigo-600/30 text-white' : 'text-slate-300 hover:bg-white/5'}
                   ${isDisabled ? 'opacity-40 pointer-events-none' : ''}">
          <span class="flex-1 font-medium truncate">${this._highlight(c.name, query)}</span>
          <span class="text-xs text-slate-500 shrink-0">${c.country}</span>
        </li>
      `;
    }).join('');

    list.classList.remove('hidden');

    // Bind click on each item
    list.querySelectorAll('li[data-city-id]').forEach(li => {
      li.addEventListener('click', () => {
        const cityId = li.dataset.cityId;
        const node   = this._graph.getNode(cityId);
        if (!node) return;

        this._setInputValue(role, node.name);
        document.getElementById(`ac-clear-${role}`)?.classList.remove('hidden');
        this._closeDropdown(role);

        if (role === 'source') {
          this._sourceId = cityId;
          this._emit('sourceChanged', { id: cityId, node });
        } else {
          this._targetId = cityId;
          this._emit('targetChanged', { id: cityId, node });
        }

        this._updateVisualizeButton();

        // Pan map to selected city
        this._map.flyTo([node.lat, node.lng], Math.max(this._map.getZoom(), 4), {
          duration: 0.8,
        });
      });
    });
  }

  _updateHighlight(items, idx) {
    items.forEach((li, i) => {
      li.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      if (i === idx) {
        li.classList.add('bg-indigo-600/30', 'text-white');
        li.classList.remove('text-slate-300');
        li.scrollIntoView({ block: 'nearest' });
      } else {
        li.classList.remove('bg-indigo-600/30', 'text-white');
        li.classList.add('text-slate-300');
      }
    });
  }

  _highlight(text, query) {
    if (!query) return text;
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark style="background:transparent;color:#818cf8;font-weight:600">$1</mark>');
  }

  _closeDropdown(role) {
    document.getElementById(`ac-list-${role}`)?.classList.add('hidden');
  }

  _setInputValue(role, value) {
    const input = document.getElementById(`ac-input-${role}`);
    if (input) input.value = value;
    const clearBtn = document.getElementById(`ac-clear-${role}`);
    if (clearBtn) clearBtn.classList.toggle('hidden', !value);
  }

  // ─── Swap ──────────────────────────────────────────────────────────────────

  _swap() {
    const prevSource = this._sourceId;
    const prevTarget = this._targetId;
    const srcInput   = document.getElementById('ac-input-source')?.value ?? '';
    const tgtInput   = document.getElementById('ac-input-target')?.value ?? '';

    // Swap input text
    this._setInputValue('source', tgtInput);
    this._setInputValue('target', srcInput);

    this._sourceId = prevTarget;
    this._targetId = prevSource;

    this._updateVisualizeButton();

    if (this._sourceId) this._emit('sourceChanged', { id: this._sourceId, node: this._graph.getNode(this._sourceId) });
    if (this._targetId) this._emit('targetChanged', { id: this._targetId, node: this._graph.getNode(this._targetId) });
  }

  // ─── Algorithm dropdown (custom) ──────────────────────────────────────────

  _bindAlgoDropdown() {
    const btn  = document.getElementById('algo-btn');
    const list = document.getElementById('algo-list');
    if (!btn || !list) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !list.classList.contains('hidden');
      if (isOpen) {
        this._closeAlgoList();
      } else {
        list.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        document.getElementById('algo-chevron')?.classList.add('rotate-180');
      }
    });

    list.querySelectorAll('.algo-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const id = opt.dataset.algoId;
        this._algoId = id;
        this._syncAlgoButton(id);
        this._closeAlgoList();
        this._algoInfo?.setAlgorithm(id);
        this._emit('algoChanged', { algorithm: id });
      });
    });
  }

  _syncAlgoButton(algoId) {
    const meta = ALGO_LIST.find(a => a.id === algoId);
    if (!meta) return;
    const dot   = document.getElementById('algo-color-dot');
    const label = document.getElementById('algo-label');
    if (dot)   dot.style.background = meta.color;
    if (label) label.textContent = meta.label;

    // Mark active option in list
    document.querySelectorAll('.algo-option').forEach(opt => {
      const isActive = opt.dataset.algoId === algoId;
      opt.style.background = isActive ? 'rgba(99,102,241,0.12)' : '';
      opt.querySelector('span.text-sm')?.classList.toggle('text-white', isActive);
    });
  }

  _closeAlgoList() {
    document.getElementById('algo-list')?.classList.add('hidden');
    document.getElementById('algo-btn')?.setAttribute('aria-expanded', 'false');
    document.getElementById('algo-chevron')?.classList.remove('rotate-180');
  }

  // ─── Speed slider ─────────────────────────────────────────────────────────

  _syncSpeedLabel() {
    const idx = SPEED_STEPS.findIndex(s => s.ms === this._speedMs);
    const meta = SPEED_STEPS[idx >= 0 ? idx : 2];
    const el   = document.getElementById('speed-label-display');
    if (!el) return;
    el.textContent = meta.ms === 0 ? 'Instant' : `${meta.ms}ms / step`;
  }

  /** Update the filled-track gradient so it always matches the thumb position. */
  _updateSliderTrack(slider) {
    if (!slider) return;
    const min  = parseFloat(slider.min)  || 0;
    const max  = parseFloat(slider.max)  || 1;
    const val  = parseFloat(slider.value);
    const pct  = ((val - min) / (max - min)) * 100;
    slider.style.background =
      `linear-gradient(to right, #6366f1 0%, #6366f1 ${pct}%, #2a3142 ${pct}%)`;
  }

  // ─── Visualize button state ────────────────────────────────────────────────

  _updateVisualizeButton() {
    const btn   = document.getElementById('btn-visualize');
    const ready = !!(this._sourceId && this._targetId && this._sourceId !== this._targetId);
    if (!btn) return;
    btn.disabled          = !ready;
    btn.setAttribute('aria-disabled', String(!ready));
  }

  _syncButtons() {
    const vizBtn    = document.getElementById('btn-visualize');
    const pauseBtn  = document.getElementById('btn-pause');
    const vizLabel  = document.getElementById('viz-btn-label');
    const pauseLabel = document.getElementById('pause-btn-label');
    const vizIcon   = document.getElementById('viz-btn-icon');
    const pauseIcon = document.getElementById('pause-btn-icon');

    switch (this._uiState) {
      case 'idle':
        // Visualize: enabled (if cities set), normal play icon
        vizLabel.textContent  = 'Visualize';
        vizIcon.innerHTML     = '<polygon points="5,3 19,12 5,21"/>';
        vizBtn.classList.remove('animate-pulse', 'bg-indigo-700');
        vizBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');

        // Pause: disabled
        pauseBtn.disabled     = true;
        pauseBtn.setAttribute('aria-disabled', 'true');
        pauseLabel.textContent = 'Pause';
        pauseIcon.innerHTML    = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

        this._updateVisualizeButton();
        break;

      case 'running':
        // Visualize: show "Running…" with pulse
        vizBtn.disabled       = true;
        vizBtn.setAttribute('aria-disabled', 'true');
        vizLabel.textContent  = 'Running…';
        vizBtn.classList.add('animate-pulse', 'bg-indigo-700');
        vizBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');

        // Pause: enabled
        pauseBtn.disabled     = false;
        pauseBtn.setAttribute('aria-disabled', 'false');
        pauseLabel.textContent = 'Pause';
        pauseIcon.innerHTML    = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        break;

      case 'paused':
        // Visualize: stays disabled during pause
        vizBtn.disabled       = true;
        vizBtn.setAttribute('aria-disabled', 'true');
        vizLabel.textContent  = 'Paused';
        vizBtn.classList.remove('animate-pulse');

        // Pause -> becomes Resume
        pauseBtn.disabled     = false;
        pauseBtn.setAttribute('aria-disabled', 'false');
        pauseLabel.textContent = 'Resume';
        // Replace pause icon with play icon
        pauseIcon.innerHTML    = '<polygon points="5,3 19,12 5,21"/>';
        break;
    }
  }

  // ─── Event emitter ─────────────────────────────────────────────────────────

  _emit(eventName, detail) {
    this._root.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
  }
}
