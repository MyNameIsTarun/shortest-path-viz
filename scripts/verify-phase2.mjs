import { Graph } from '../src/core/graph.js';
import { haversine } from '../src/algorithms/utils/haversine.js';

const graph = new Graph();
const nodeIds = graph.nodes();
const mumbai = graph.getNode('mumbai');
const delhi = graph.getNode('delhi');
const mumbaiToDelhiKm = haversine(mumbai, delhi);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countReachableNodes(source) {
  const visited = new Set([source]);
  const queue = [source];

  while (queue.length > 0) {
    const current = queue.shift();

    for (const neighbour of graph.neighbours(current)) {
      if (!visited.has(neighbour.id)) {
        visited.add(neighbour.id);
        queue.push(neighbour.id);
      }
    }
  }

  return visited.size;
}

assert(nodeIds.length >= 400, `Expected at least 400 cities, found ${nodeIds.length}.`);
assert(mumbai, 'Expected city id "mumbai" to exist.');
assert(delhi, 'Expected city id "delhi" to exist.');
assert(
  nodeIds.every((id) => graph.neighbours(id).length >= 3),
  'Expected every city to have at least 3 edges.',
);
assert(
  graph.neighbours('mumbai').every((neighbour) => 'id' in neighbour && 'weight' in neighbour),
  'Expected Mumbai neighbours to use { id, weight } objects.',
);
assert(
  mumbaiToDelhiKm >= 1100 && mumbaiToDelhiKm <= 1200,
  `Expected Mumbai-Delhi distance near 1150 km, got ${Math.round(mumbaiToDelhiKm)} km.`,
);
assert(
  countReachableNodes(nodeIds[0]) === nodeIds.length,
  'Expected the generated graph to be connected.',
);

console.log(
  JSON.stringify(
    {
      cities: nodeIds.length,
      edges: graph.allEdges().length,
      minDegree: Math.min(...nodeIds.map((id) => graph.neighbours(id).length)),
      mumbaiNeighbours: graph.neighbours('mumbai'),
      mumbaiToDelhiKm: Math.round(mumbaiToDelhiKm),
      connected: true,
    },
    null,
    2,
  ),
);
