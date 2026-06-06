import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { haversine } from '../src/algorithms/utils/haversine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const citiesTxtPath = resolve(rootDir, '.cache/geonames/cities500.txt');
const outputPath = resolve(rootDir, 'src/data/cities.json');
const CITY_COUNT = 500;
const NEAREST_NEIGHBOURS = 5;

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

function slugify(value, usedIds) {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let id = base || 'city';
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function parseGeoNamesRow(row) {
  const columns = row.split('\t');

  return {
    name: columns[1],
    lat: Number(columns[4]),
    lng: Number(columns[5]),
    featureClass: columns[6],
    countryCode: columns[8],
    population: Number(columns[14] || 0),
  };
}

function buildNearestNeighbourEdges(nodes) {
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
      .slice(0, NEAREST_NEIGHBOURS);

    for (const neighbour of nearest) {
      const [source, target] = [city.id, neighbour.id].sort();
      const key = `${source}:${target}`;

      if (!edges.has(key)) {
        edges.set(key, {
          source,
          target,
          distance: Math.round(neighbour.distance),
        });
      }
    }
  }

  connectComponents(nodes, edges, nodesById);

  return [...edges.values()].sort((a, b) =>
    a.source === b.source ? a.target.localeCompare(b.target) : a.source.localeCompare(b.source),
  );
}

function connectComponents(nodes, edges, nodesById) {
  let components = findComponents(nodes, edges);

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

    components = findComponents(nodes, edges);
  }
}

function findComponents(nodes, edges) {
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

async function main() {
  const citiesTxt = await readFile(citiesTxtPath, 'utf8');
  const usedIds = new Set();

  const nodes = citiesTxt
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseGeoNamesRow)
    .filter((city) => city.featureClass === 'P')
    .filter((city) => Number.isFinite(city.lat) && Number.isFinite(city.lng))
    .filter((city) => city.population >= 500_000)
    .sort((a, b) => b.population - a.population)
    .slice(0, CITY_COUNT)
    .map((city) => ({
      id: slugify(city.name, usedIds),
      name: city.name,
      country: countryNames.of(city.countryCode) || city.countryCode,
      lat: Number(city.lat.toFixed(6)),
      lng: Number(city.lng.toFixed(6)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (nodes.length !== CITY_COUNT) {
    throw new Error(`Expected ${CITY_COUNT} cities, received ${nodes.length}.`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify({ nodes, edges: buildNearestNeighbourEdges(nodes) }, null, 2)}\n`,
    'utf8',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
