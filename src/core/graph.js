import cities from '../data/cities.json' with { type: 'json' };
import { haversine } from '../algorithms/utils/haversine.js';

const DEFAULT_NEAREST_NEIGHBOURS = 5;

export class Graph {
  constructor(data = cities, nearestNeighbours = DEFAULT_NEAREST_NEIGHBOURS) {
    this.nodeMap = new Map(data.nodes.map((node) => [node.id, node]));
    this.adjacency = new Map(data.nodes.map((node) => [node.id, []]));

    const edges = data.edges?.length
      ? data.edges
      : this.#buildNearestNeighbourEdges(data.nodes, nearestNeighbours);

    for (const edge of edges) {
      this.#addEdge(edge.source, edge.target, edge.distance ?? edge.weight);
    }
  }

  neighbours(id) {
    return [...(this.adjacency.get(id) ?? [])];
  }

  nodes() {
    return [...this.nodeMap.keys()];
  }

  allEdges() {
    const seen = new Set();
    const edges = [];

    for (const [source, neighbours] of this.adjacency.entries()) {
      for (const { id: target, weight } of neighbours) {
        const key = [source, target].sort().join(':');

        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ source, target, weight });
        }
      }
    }

    return edges;
  }

  getNode(id) {
    return this.nodeMap.get(id);
  }

  #addEdge(source, target, weight) {
    if (!this.adjacency.has(source) || !this.adjacency.has(target)) {
      return;
    }

    const roundedWeight = Math.round(weight);
    this.#addNeighbour(source, target, roundedWeight);
    this.#addNeighbour(target, source, roundedWeight);
  }

  #addNeighbour(source, target, weight) {
    const neighbours = this.adjacency.get(source);

    if (!neighbours.some((neighbour) => neighbour.id === target)) {
      neighbours.push({ id: target, weight });
      neighbours.sort((a, b) => a.weight - b.weight || a.id.localeCompare(b.id));
    }
  }

  #buildNearestNeighbourEdges(nodes, nearestNeighbours) {
    const edges = new Map();
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    for (const city of nodes) {
      const nearest = nodes
        .filter((candidate) => candidate.id !== city.id)
        .map((candidate) => ({
          id: candidate.id,
          distance: haversine(city, candidate),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, nearestNeighbours);

      for (const neighbour of nearest) {
        const [source, target] = [city.id, neighbour.id].sort();
        edges.set(`${source}:${target}`, {
          source,
          target,
          distance: Math.round(neighbour.distance),
        });
      }
    }

    this.#connectComponents(nodes, edges, nodesById);

    return [...edges.values()];
  }

  #connectComponents(nodes, edges, nodesById) {
    let components = this.#findComponents(nodes, edges);

    while (components.length > 1) {
      const largest = components[0];
      const otherComponents = components.slice(1);
      let bestBridge = null;

      for (const component of otherComponents) {
        for (const sourceId of largest) {
          for (const targetId of component) {
            const source = nodesById.get(sourceId);
            const target = nodesById.get(targetId);
            const distance = haversine(source, target);

            if (!bestBridge || distance < bestBridge.distance) {
              bestBridge = { source: sourceId, target: targetId, distance };
            }
          }
        }
      }

      const [source, target] = [bestBridge.source, bestBridge.target].sort();
      edges.set(`${source}:${target}`, {
        source,
        target,
        distance: Math.round(bestBridge.distance),
      });

      components = this.#findComponents(nodes, edges);
    }
  }

  #findComponents(nodes, edges) {
    const adjacency = new Map(nodes.map((node) => [node.id, []]));

    for (const edge of edges.values()) {
      adjacency.get(edge.source).push(edge.target);
      adjacency.get(edge.target).push(edge.source);
    }

    const seen = new Set();
    const components = [];

    for (const node of nodes) {
      if (seen.has(node.id)) {
        continue;
      }

      const component = [];
      const queue = [node.id];
      seen.add(node.id);

      while (queue.length > 0) {
        const current = queue.shift();
        component.push(current);

        for (const neighbour of adjacency.get(current)) {
          if (!seen.has(neighbour)) {
            seen.add(neighbour);
            queue.push(neighbour);
          }
        }
      }

      components.push(component);
    }

    return components.sort((a, b) => b.length - a.length);
  }
}

export default Graph;
