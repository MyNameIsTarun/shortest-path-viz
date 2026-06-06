import { MinPriorityQueue } from './utils/minHeap.js';
import { haversine }         from './utils/haversine.js';
import { reconstructPath }   from './utils/pathUtils.js';

/**
 * Greedy Best-First Search
 *
 * Uses only the heuristic h(n) to choose the next node — ignores actual
 * path cost entirely. Rushes straight toward the target but often takes
 * dramatically wrong routes. NOT guaranteed to be optimal.
 *
 * Visual: beelines toward the destination, gets trapped in dead ends,
 * produces entertainingly wrong paths. Great for educational contrast.
 *
 * @param {import('../core/graph.js').Graph} graph
 * @param {string}                           sourceId
 * @param {string}                           targetId
 * @param {Map<string, object>}              nodesMap   nodeId → { lat, lng, ... }
 * @returns {{ steps: object[], path: string[], visited: Set<string> }}
 */
export function greedy(graph, sourceId, targetId, nodesMap) {
  const targetNode = nodesMap.get(targetId);
  if (!targetNode) return { steps: [], path: [], visited: new Set() };

  /** Haversine heuristic: straight-line km to target */
  const h = (id) => {
    const node = nodesMap.get(id);
    return node ? haversine(node, targetNode) : Infinity;
  };

  const visited = new Set();
  const parent  = new Map();
  const steps   = [];
  const pq      = new MinPriorityQueue();

  visited.add(sourceId);
  pq.enqueue(sourceId, h(sourceId));

  while (!pq.isEmpty()) {
    const { element: current } = pq.dequeue();

    steps.push({ type: 'visit', node: current });

    if (current === targetId) break;

    for (const { id: neighbour } of graph.neighbours(current)) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        parent.set(neighbour, current);
        pq.enqueue(neighbour, h(neighbour));

        steps.push({ type: 'explore', node: neighbour, from: current });
      }
    }
  }

  const path = reconstructPath(parent, sourceId, targetId);
  return { steps, path, visited };
}
