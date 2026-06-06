export class Animator {
  /**
   * @param {Object}   data       { steps, path, algoColor }
   * @param {Renderer} renderer
   * @param {number}   speedMs
   * @param {Function} onStatsUpdate
   * @param {Function} onComplete
   */
  constructor({ steps, path, algoColor }, renderer, speedMs, onStatsUpdate, onComplete) {
    this.steps = steps;
    this.path = path;
    this.algoColor = algoColor;
    this.renderer = renderer;
    this.speedMs = speedMs;
    this.onStatsUpdate = onStatsUpdate;
    this.onComplete = onComplete;

    this.currentStep = 0;
    this.nodesVisited = 0;
    this.currentDist = null;
    this.paused = false;
    this.timer = null;
  }

  play() {
    this.paused = false;

    if (this.speedMs === 0) {
      this._runInstant();
      return;
    }

    this._tick();
  }

  pause() {
    this.paused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  reset() {
    this.pause();
    this.currentStep = 0;
    this.nodesVisited = 0;
    this.currentDist = null;
    this.renderer.clear();
  }

  setSpeed(ms) {
    this.speedMs = ms;
    if (this.speedMs === 0 && !this.paused && this.currentStep < this.steps.length) {
      this.pause();
      this._runInstant();
    }
  }

  _runInstant() {
    // Apply all remaining steps synchronously
    while (this.currentStep < this.steps.length) {
      this._applyStep(this.steps[this.currentStep++]);
    }
    this._finish();
  }

  _tick() {
    if (this.paused) return;

    if (this.currentStep >= this.steps.length) {
      this._finish();
      return;
    }

    const step = this.steps[this.currentStep++];
    this._applyStep(step);

    this.timer = setTimeout(() => {
      // Use requestAnimationFrame to ensure smooth UI updates
      requestAnimationFrame(() => this._tick());
    }, this.speedMs);
  }

  _applyStep(step) {
    if (step.type === 'visit') {
      this.renderer.markVisited(step.node, this.algoColor);
      this.nodesVisited++;
      if (step.dist !== undefined) this.currentDist = step.dist;
      else if (step.g !== undefined) this.currentDist = step.g;
    } else if (step.type === 'explore' || step.type === 'relax') {
      this.renderer.markFrontier(step.node, this.algoColor);
      if (step.from) {
        this.renderer.highlightEdge(step.from, step.node, this.algoColor);
      }
      if (step.dist !== undefined) this.currentDist = step.dist;
    } else if (step.type === 'iteration') {
      // Bellman-Ford round marker
    }

    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        nodesVisited: this.nodesVisited,
        steps: this.currentStep,
        distanceKm: this.currentDist
      });
    }
  }

  _finish() {
    this.renderer.drawFinalPath(this.path);
    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        pathLength: this.path.length
      });
    }
    if (this.onComplete) this.onComplete();
  }
}
