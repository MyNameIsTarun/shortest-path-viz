/**
 * MinPriorityQueue — binary min-heap keyed by priority.
 *
 * Operations:
 *   enqueue(element, priority)  O(log n)
 *   dequeue()                   O(log n) → { element, priority }
 *   isEmpty()                   O(1)
 *   size                        O(1)
 */
export class MinPriorityQueue {
  constructor() {
    /** @type {Array<{element: any, priority: number}>} */
    this._heap = [];
  }

  get size() {
    return this._heap.length;
  }

  isEmpty() {
    return this._heap.length === 0;
  }

  /**
   * Add an element with the given priority.
   * Duplicate elements are allowed (lazy-deletion pattern used by callers).
   * @param {any}    element
   * @param {number} priority
   */
  enqueue(element, priority) {
    this._heap.push({ element, priority });
    this._bubbleUp(this._heap.length - 1);
  }

  /**
   * Remove and return the element with the lowest priority.
   * @returns {{ element: any, priority: number } | undefined}
   */
  dequeue() {
    if (this.isEmpty()) return undefined;

    const min  = this._heap[0];
    const last = this._heap.pop();

    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._siftDown(0);
    }

    return min;
  }

  /** @private */
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._heap[parent].priority <= this._heap[i].priority) break;
      this._swap(parent, i);
      i = parent;
    }
  }

  /** @private */
  _siftDown(i) {
    const n = this._heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;

      if (l < n && this._heap[l].priority < this._heap[smallest].priority) smallest = l;
      if (r < n && this._heap[r].priority < this._heap[smallest].priority) smallest = r;
      if (smallest === i) break;

      this._swap(i, smallest);
      i = smallest;
    }
  }

  /** @private */
  _swap(a, b) {
    [this._heap[a], this._heap[b]] = [this._heap[b], this._heap[a]];
  }
}
