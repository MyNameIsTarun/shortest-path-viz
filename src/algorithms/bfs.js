import { reconstructPath } from './utils/pathUtils.js';

/**
 * Breadth-First Search
 *
 * Explores nodes level by level (concentric rings outward).
 * Ignores edge weights — every hop is treated equally.
 * NOT guaranteed to find the shortest path by distance.
 *
 * @param {import('../core/graph.js').Graph} graph
 * @param {string}                           sourceId
 * @param {string}                           targetId
 * @param {Map<string, object>}              _nodesMap  (unused by BFS)
 * @returns {{ steps: object[], path: string[], visited: Set<string> }}
 */
export function bfs(graph, sourceId, targetId, _nodesMap) {
  const visited = new Set();
  const parent  = new Map();
  const steps   = [];

  visited.add(sourceId);
  const queue = [sourceId];

  while (queue.length > 0) {
    const current = queue.shift();

    // Mark as visited
    steps.push({ type: 'visit', node: current });

    if (current === targetId) break;

    for (const { id: neighbour } of graph.neighbours(current)) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        parent.set(neighbour, current);

        // Exploring a new node from current
        steps.push({ type: 'explore', node: neighbour, from: current });

        queue.push(neighbour);
      }
    }
  }

  const path = reconstructPath(parent, sourceId, targetId);
  return { steps, path, visited };
}
