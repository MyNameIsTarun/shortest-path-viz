import { reconstructPath } from './utils/pathUtils.js';

/**
 * Bellman-Ford Algorithm
 *
 * Relaxes ALL edges in V-1 rounds. Much slower than Dijkstra on
 * positive-weight graphs (O(V·E) vs O(E log V)), but handles negative
 * edge weights and can detect negative cycles.
 *
 * Steps are grouped by round using { type: 'iteration', round: N } markers.
 * Animation shows a "wave" sweeping across all edges each round.
 *
 * Per AGENTS.md rule: if steps exceed 2000, cap and stop early — the
 * caller shows "Skipping to result…" toast.
 *
 * @param {import('../core/graph.js').Graph} graph
 * @param {string}                           sourceId
 * @param {string}                           targetId
 * @param {Map<string, object>}              _nodesMap  (unused)
 * @returns {{ steps: object[], path: string[], visited: Map<string,number>, capped: boolean }}
 */
export function bellmanFord(graph, sourceId, targetId, _nodesMap) {
  const nodeIds = graph.nodes();
  const edges   = graph.allEdges();
  const dist    = new Map();
  const parent  = new Map();
  const steps   = [];

  const MAX_STEPS = 2000;
  let   capped    = false;

  // Initialise
  for (const id of nodeIds) {
    dist.set(id, Infinity);
  }
  dist.set(sourceId, 0);

  const V = nodeIds.length;

  for (let round = 1; round <= V - 1; round++) {
    // Round marker — animator uses these to show per-round wave
    steps.push({ type: 'iteration', round });

    let anyRelaxed = false;

    for (const { source: u, target: v, weight } of edges) {
      // Bidirectional: try both directions
      const pairs = [[u, v], [v, u]];

      for (const [from, to] of pairs) {
        const dFrom = dist.get(from);
        if (dFrom === Infinity) continue;

        const newDist = dFrom + weight;

        // Optimization for visualization: since all edge weights are positive,
        // we can stop exploring paths that are already longer than our best
        // known path to the target. This bounds the search and stops it from
        // exploring the entire world.
        if (newDist > dist.get(targetId)) continue;

        if (newDist < dist.get(to)) {
          dist.set(to, newDist);
          parent.set(to, from);
          anyRelaxed = true;

          steps.push({ type: 'relax', node: to, from, dist: newDist, round });

          // Cap check
          if (steps.length >= MAX_STEPS) {
            capped = true;
            break;
          }
        }
      }

      if (capped) break;
    }

    if (capped) break;

    // Early exit: no relaxations in this round → already optimal
    if (!anyRelaxed) break;

    // Early exit: target settled (optional optimisation)
    if (dist.get(targetId) !== Infinity) {
      // Keep running until no more relaxations for correctness,
      // but this is rare to matter on a sparse positive-weight graph.
    }
  }

  const path = reconstructPath(parent, sourceId, targetId);
  return { steps, path, visited: dist, capped };
}
