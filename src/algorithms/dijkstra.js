import { MinPriorityQueue } from './utils/minHeap.js';
import { reconstructPath }  from './utils/pathUtils.js';

/**
 * Dijkstra's Algorithm
 *
 * Expands nodes in order of cumulative distance from source.
 * Guaranteed shortest path on non-negative weighted graphs.
 * Visual: expands as a "distance bubble" stretching along low-cost edges.
 *
 * @param {import('../core/graph.js').Graph} graph
 * @param {string}                           sourceId
 * @param {string}                           targetId
 * @param {Map<string, object>}              _nodesMap  (unused by Dijkstra)
 * @returns {{ steps: object[], path: string[], visited: Map<string,number> }}
 */
export function dijkstra(graph, sourceId, targetId, _nodesMap) {
  const dist    = new Map();
  const parent  = new Map();
  const settled = new Set();
  const steps   = [];
  const pq      = new MinPriorityQueue();

  // Initialise all distances to Infinity
  for (const id of graph.nodes()) {
    dist.set(id, Infinity);
  }
  dist.set(sourceId, 0);
  pq.enqueue(sourceId, 0);

  while (!pq.isEmpty()) {
    const { element: current, priority: currentDist } = pq.dequeue();

    // Skip stale entries (lazy deletion)
    if (settled.has(current)) continue;
    settled.add(current);

    steps.push({ type: 'visit', node: current, dist: currentDist });

    if (current === targetId) break;

    for (const { id: neighbour, weight } of graph.neighbours(current)) {
      if (settled.has(neighbour)) continue;

      const newDist = currentDist + weight;
      if (newDist < dist.get(neighbour)) {
        dist.set(neighbour, newDist);
        parent.set(neighbour, current);
        pq.enqueue(neighbour, newDist);

        steps.push({ type: 'relax', node: neighbour, from: current, dist: newDist });
      }
    }
  }

  const path = reconstructPath(parent, sourceId, targetId);
  return { steps, path, visited: dist };
}
