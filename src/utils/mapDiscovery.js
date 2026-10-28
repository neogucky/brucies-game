// A place is playable as soon as it is unlocked, but only becomes visible once
// its trail has finished appearing. Save those two facts separately.
export function mapPathId(from, to) {
  return [typeof from === 'string' ? from : from.id, typeof to === 'string' ? to : to.id].sort().join('/');
}

export function mapConnections(nodes, exits = []) {
  const connections = new Map();
  for (const from of nodes) for (const id of Object.values(from.neighbors || {})) {
    const to = nodes.find(node => node.id === id);
    if (to) connections.set(mapPathId(from, to), [from, to]);
  }
  for (const [from, to] of exits) connections.set(mapPathId(from, to), [from, to]);
  return [...connections.values()];
}

export function planMapDiscovery(save, world, nodes, exits, unlocked, currentId, testing = false) {
  const openNodes = nodes.filter(node => unlocked.has(node.id));
  const edges = mapConnections(openNodes, exits.filter(([from]) => unlocked.has(from.id)));
  const available = new Set([...openNodes.map(node => node.id), ...edges.flat().filter(n => n.id.startsWith('@')).map(n => n.id)]);
  const stored = save.mapReveals?.[world];
  // Existing saves keep their already available landscape. A fresh save has an
  // explicit empty history for each world, so its new places animate normally.
  const legacy = !save.mapReveals;
  const known = new Set(testing || legacy ? available : (stored?.nodes || []).filter(id => available.has(id)));
  if (available.has(currentId)) known.add(currentId);
  const entrance = { underground: '@desert', jungle: '@underground', water: '@jungle' }[world];
  if (!stored && entrance && available.has(entrance)) known.add(entrance);
  const paths = new Set((stored?.paths || []).filter(id => edges.some(([a, b]) => mapPathId(a, b) === id)));
  for (const [a, b] of edges) {
    if (known.has(a.id) && known.has(b.id) && (testing || legacy || !stored)) paths.add(mapPathId(a, b));
  }
  const visibleNodes = new Set(known), visiblePaths = new Set(paths), steps = [];
  // Grow outwards from known places, never revealing a floating, disconnected POI.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of edges) {
      const id = mapPathId(a, b);
      if (paths.has(id) || (!known.has(a.id) && !known.has(b.id))) continue;
      const from = known.has(a.id) ? a : b, to = from === a ? b : a;
      const newNode = known.has(to.id) ? null : to.id;
      steps.push({ id, from, to, newNode });
      known.add(to.id); paths.add(id); changed = true;
    }
  }
  return { visibleNodes, visiblePaths, steps };
}

export function rememberMapDiscovery(save, world, nodes, paths) {
  return { ...save, mapReveals: { ...save.mapReveals,
    [world]: { nodes: [...nodes], paths: [...paths] } } };
}

export function finishExpertIntroduction(save, world) {
  const levels = new Set(save.unlockedLevels || []);
  if (world === 'desert') levels.add('Wuestenruine');
  return { ...save, unlockedLevels: [...levels],
    expertIntroductions: { ...save.expertIntroductions, [world]: true } };
}
