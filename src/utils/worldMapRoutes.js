export const MAP_GROUND_OFFSET = 32;
export const MAP_TRAVEL_SPEED = 260;

export const WORLD_MAP_EXITS = {
  desert: { underground: { id: "@underground", x: 720, y: 570 } },
  underground: {
    desert: { id: "@desert", x: 460, y: -30 },
    jungle: { id: "@jungle", x: 990, y: 450 },
  },
  jungle: { underground: { id: "@underground", x: -34, y: 360 } },
};

// These bends are shared by the painted trail and the characters following it.
const BENDS = {
  desert: [
    ["Wuestenruine", "Taverne", [[245, 530], [308, 506], [352, 452]]],
    ["Taverne", "DesertEndless", [[482, 400], [536, 381], [553, 307]]],
    ["Taverne", "Fremdweg", [[478, 464], [535, 510], [624, 518]]],
    ["Wuestenruine", "Wuestenexperte", [[150, 466], [135, 410], [171, 365]]],
    ["Fremdweg", "@underground", [[760, 534], [752, 574]]],
  ],
  underground: [
    ["UnderShop", "UnderDig", [[374, 234], [309, 201], [265, 165]]],
    ["UnderShop", "Schluesseltor", [[452, 296], [411, 327], [387, 371]]],
    ["Schluesseltor", "Schluesselweg", [[286, 385], [230, 372]]],
    ["Schluesseltor", "Kristalltiefen", [[409, 410], [456, 464], [551, 491], [627, 467]]],
    ["UnderShop", "Unterweltexperte", [[517, 275], [600, 280], [641, 250]]],
    ["UnderShop", "@desert", [[471, 194], [441, 143], [455, 83]]],
    ["Kristalltiefen", "@jungle", [[772, 505], [847, 483], [922, 492]]],
  ],
  jungle: [
    ["UrwaldShop", "Urwaldkronen", [[300, 395], [332, 353], [380, 319], [434, 321]]],
    ["Urwaldkronen", "Lianenpfad", [[559, 292], [579, 345], [666, 352], [713, 381]]],
    ["UrwaldShop", "Urwaldexperte", [[254, 431], [235, 470]]],
    ["UrwaldShop", "@underground", [[142, 416], [79, 394], [15, 409]]],
  ],
};

export function mapFoot(node) {
  return { x: node.x, y: node.y + MAP_GROUND_OFFSET };
}

function smoothPoint(a, b, c, d, t) {
  const t2 = t * t, t3 = t2 * t;
  const axis = key => .5 * (2 * b[key] + (-a[key] + c[key]) * t +
    (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 +
    (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3);
  return { x: axis("x"), y: axis("y") };
}

export function createMapRoute(anchors) {
  if (!anchors.length) throw new Error("A map route needs an anchor");
  const points = [{ ...anchors[0], distance: 0 }];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[Math.max(0, i - 1)], b = anchors[i], c = anchors[i + 1], d = anchors[Math.min(anchors.length - 1, i + 2)];
    const steps = Math.max(16, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / 3));
    for (let j = 1; j <= steps; j++) {
      const p = smoothPoint(a, b, c, d, j / steps), previous = points.at(-1);
      const distance = Math.hypot(p.x - previous.x, p.y - previous.y);
      if (distance > .00001) points.push({ ...p, distance: previous.distance + distance });
    }
  }
  return { points, length: points.at(-1).distance };
}

export function reverseMapRoute(route) {
  return { length: route.length, points: route.points.slice().reverse().map(p => ({ ...p, distance: route.length - p.distance })) };
}

export function getWorldMapRoute(world, from, to) {
  const entry = (BENDS[world] || []).find(([a, b]) => (a === from.id && b === to.id) || (a === to.id && b === from.id));
  // Always build the canonical direction first so the reverse route is identical.
  const reverse = entry && entry[0] !== from.id;
  const start = reverse ? to : from, end = reverse ? from : to;
  const anchors = [mapFoot(start), ...(entry?.[2] || []).map(([x, y]) => ({ x, y })), mapFoot(end)];
  const route = createMapRoute(anchors);
  return reverse ? reverseMapRoute(route) : route;
}

export function pointOnMapRoute(route, distance) {
  const points = route.points, at = Math.max(0, Math.min(route.length, distance));
  let low = 0, high = points.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].distance < at) low = mid + 1; else high = mid;
  }
  const a = points[Math.max(0, low - 1)], b = points[low];
  const t = b.distance === a.distance ? 0 : (at - a.distance) / (b.distance - a.distance);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

const PALETTES = {
  desert: { edge: 0x744a24, earth: 0xbd8241, center: 0xe6b66a, marks: 0xffedba },
  underground: { edge: 0x241c2d, earth: 0x655468, center: 0xa28d9f, marks: 0xffe3a6 },
  jungle: { edge: 0x203b28, earth: 0x9a6934, center: 0xd7b66d, marks: 0xffedb1 },
};

export function drawWorldMapPaths(scene, world, nodes, exits = []) {
  const graphics = scene.add.graphics().setDepth(-1), palette = PALETTES[world];
  const seen = new Set();
  const draw = (from, to) => {
    const key = [from.id, to.id].sort().join("/");
    if (seen.has(key)) return;
    seen.add(key);
    const route = getWorldMapRoute(world, from, to);
    graphics.lineStyle(23, 0x111512, .28).strokePoints(route.points.map(p => ({ x: p.x, y: p.y + 3 })), false);
    graphics.lineStyle(19, palette.edge, .96).strokePoints(route.points, false);
    graphics.lineStyle(14, palette.earth, 1).strokePoints(route.points, false);
    graphics.lineStyle(9, palette.center, 1).strokePoints(route.points, false);
    graphics.lineStyle(2.5, palette.marks, .95);
    for (let distance = 14; distance < route.length - 8; distance += 22) {
      const a = pointOnMapRoute(route, distance), b = pointOnMapRoute(route, Math.min(route.length, distance + 7));
      graphics.lineBetween(a.x, a.y, b.x, b.y);
    }
  };
  nodes.forEach(node => {
    if (!scene.unlocked.has(node.id)) return;
    Object.values(node.neighbors || {}).forEach(id => {
      const next = nodes.find(n => n.id === id);
      if (next && scene.unlocked.has(id)) draw(node, next);
    });
  });
  exits.forEach(([from, to]) => draw(from, to));
  return graphics;
}
