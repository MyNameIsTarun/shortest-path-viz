import { MinPriorityQueue } from './utils/minHeap.js';
import { haversine }         from './utils/haversine.js';
import { reconstructPath }   from './utils/pathUtils.js';

/**
 * A* Search
 *
 * Uses f(n) = g(n) + h(n):
 *   g(n) = actual cost from source to n
 *   h(n) = haversine distance from n to target (admissible, never overestimates)
 *
 * Guaranteed optimal and dramatically faster than Dijkstra on geographic graphs.
 * Visual: laser-focused toward the target, skipping irrelevant regions.
 *
 * @param {import('../core/graph.js').Graph} graph
 * @param {string}                           sourceId
 * @param {string}                           targetId
 * @param {Map<string, object>}              nodesMap   nodeId → { lat, lng, ... }
 * @returns {{ steps: object[], path: string[], visited: Map<string,number> }}
 */
export function astar(graph, sourceId, targetId, nodesMap) {
  const targetNode = nodesMap.get(targetId);
  if (!targetNode) return { steps: [], path: [], visited: new Map() };

  /** Haversine heuristic: straight-line km to target */
  const h = (id) => {
    const node = nodesMap.get(id);
    return node ? haversine(node, targetNode) : Infinity;
  };

  const gScore  = new Map();   // actual cost source → n
  const fScore  = new Map();   // g + h
  const parent  = new Map();
  const settled = new Set();
  const steps   = [];
  const pq      = new MinPriorityQueue();

  // Initialise
  for (const id of graph.nodes()) {
    gScore.set(id, Infinity);
    fScore.set(id, Infinity);
  }
  gScore.set(sourceId, 0);
  fScore.set(sourceId, h(sourceId));
  pq.enqueue(sourceId, fScore.get(sourceId));

  while (!pq.isEmpty()) {
    const { element: current } = pq.dequeue();

    // Lazy deletion
    if (settled.has(current)) continue;
    settled.add(current);

    const g = gScore.get(current);
    steps.push({ type: 'visit', node: current, g, h: h(current) });

    if (current === targetId) break;

    for (const { id: neighbour, weight } of graph.neighbours(current)) {
      if (settled.has(neighbour)) continue;

      const tentativeG = g + weight;
      if (tentativeG < gScore.get(neighbour)) {
        parent.set(neighbour, current);
        gScore.set(neighbour, tentativeG);
        const f = tentativeG + h(neighbour);
        fScore.set(neighbour, f);
        pq.enqueue(neighbour, f);

        steps.push({ type: 'relax', node: neighbour, from: current, f, dist: tentativeG });
      }
    }
  }

  const path = reconstructPath(parent, sourceId, targetId);
  return { steps, path, visited: gScore };
}
