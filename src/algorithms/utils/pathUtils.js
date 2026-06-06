/**
 * Reconstruct the path from source to target using the parent map.
 * Returns an empty array if no path exists.
 *
 * @param {Map<string, string>} parent   nodeId → parentId
 * @param {string}              source
 * @param {string}              target
 * @returns {string[]}                   [source, ..., target]
 */
export function reconstructPath(parent, source, target) {
  if (!parent.has(target) && target !== source) return [];

  const path = [];
  let current = target;

  while (current !== undefined) {
    path.unshift(current);
    if (current === source) break;
    current = parent.get(current);
    // Guard against cycles / broken parent chains
    if (path.length > 10_000) return [];
  }

  // Verify the path actually starts at source
  if (path[0] !== source) return [];

  return path;
}
