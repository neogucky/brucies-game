export const MAP_GROUND_OFFSET = 32;
export const MAP_TRAVEL_SPEED = 260;

// Visible departures and keyboard directions share these cardinal ports.
export const JUNGLE_PATH_PORTS = {
  Urwaldkronen: { UrwaldShop: 'right', Urwaldexperte: 'down', '@underground': 'left' },
  UrwaldShop: { Urwaldkronen: 'left', Lianenpfad: 'right' },
  Lianenpfad: { UrwaldShop: 'left', '@water': 'right', Wipfelschatz: 'up' },
  Wipfelschatz: { Lianenpfad: 'down' },
  Urwaldexperte: { Urwaldkronen: 'left' },
};

export const WORLD_MAP_EXITS = {
  desert: { underground: { id: "@underground", x: 720, y: 570 } },
  underground: {
    desert: { id: "@desert", x: 467, y: -30 },
    jungle: { id: "@jungle", x: 990, y: 444 },
  },
  jungle: { underground: { id: "@underground", x: 72, y: 219 }, water: { id: '@water', x: 990, y: 350 } },
  water: { jungle: { id: '@jungle', x: -35, y: 305 } },
};

// These bends are shared by the painted trail and the characters following it.
const BENDS = {
  desert: [
    ["Wuestenruine", "Taverne", [[245, 530], [308, 506], [352, 452]]],
    ["Taverne", "DesertEndless", [[482, 400], [536, 381], [553, 307]]],
    ["Taverne", "Fremdweg", [[478, 464], [535, 510], [624, 518]]],
    ["Wuestenruine", "Wuestenexperte", [[150, 466], [135, 410], [171, 365]]],
    ["Fremdweg", "@underground", [[760, 534], [752, 574]]],
    ['DesertEndless', 'Wuestenschatz', [[704, 283], [765, 252], [792, 225]]],
  ],
  underground: [
    ["UnderShop", "UnderDig", [[412, 163], [330, 153], [256, 145]]],
    ["UnderShop", "Schluesseltor", [[520, 185], [490, 218]]],
    ["Schluesseltor", "Schluesselweg", [[385, 268], [348, 311], [309, 355], [264, 391]]],
    ["Schluesselweg", "Kristalltiefen", [[314, 409], [406, 417], [491, 427], [554, 430], [621, 434], [658, 459]]],
    ["UnderShop", "Unterweltexperte", [[625, 167], [695, 158]]],
    ["UnderShop", "@desert", [[530, 142], [488, 113], [466, 89], [467, 43]]],
    ["Kristalltiefen", "@jungle", [[778, 485], [850, 477], [924, 476]]],
    ['UnderDig', 'Kristallschatz', [[135, 185], [101, 237]]],
  ],
  jungle: [
    ["Urwaldkronen", "UrwaldShop", [[410, 361], [440, 320], [390, 285]]],
    ["UrwaldShop", "Lianenpfad", [[602, 292], [573, 320], [590, 373]]],
    ["Urwaldkronen", "Urwaldexperte", [[292, 510], [342, 482]]],
    ["Urwaldkronen", "@underground", [[132, 352], [149, 322], [173, 300], [119, 288], [90, 275]]],
    ["Lianenpfad", "@water", [[894, 402], [952, 384]]],
    ['Lianenpfad', 'Wipfelschatz', [[773, 263], [790, 245]]],
  ],
  water: [["Seeufer", "@jungle", [[158, 313], [108, 303], [54, 318]]]],
};

export function mapFoot(node) {
  return node.walkAnchor ? { ...node.walkAnchor } : { x: node.x, y: node.y + MAP_GROUND_OFFSET };
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
  const portAnchors = (node, other, arriving) => {
    const direction = world === 'jungle' && JUNGLE_PATH_PORTS[node.id]?.[other.id];
    if (!direction) return [];
    const vector = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction], foot = mapFoot(node);
    return (arriving ? [110, 60] : [60, 110]).map(distance => ({ x: foot.x + vector[0] * distance, y: foot.y + vector[1] * distance }));
  };
  const anchors = [mapFoot(start), ...portAnchors(start, end, false),
    ...(entry?.[2] || []).map(([x, y]) => ({ x, y })), ...portAnchors(end, start, true), mapFoot(end)];
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
  desert: { edge: 0x99753f, earth: 0xc79450, dust: 0xd4a45e, marks: 0x956c3d, plants: 0x788447 },
  underground: { edge: 0x4c3425, earth: 0x715036, dust: 0x9c7346, marks: 0xb08a54, plants: 0x69b7bc },
  jungle: { edge: 0x475630, earth: 0xb38a4d, dust: 0xd2ad6a, marks: 0x80613a, plants: 0x3b6a37 },
  water: { marks: 0x80613a },
};

function jungleTrailPainter(scene) {
  const key = 'map-jungle-footpaths';
  const texture = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, 960, 600);
  const ctx = texture.getContext(); ctx.clearRect(0, 0, 960, 600);
  // Brush the trail with the landscape's own sandy clearing. Its grain and
  // colour match the painting, while the runtime path stays exactly walkable.
  const source = scene.textures.get('worldmap-jungle-bg').getSourceImage();
  const brush = document.createElement('canvas'); brush.width = 92; brush.height = 56;
  brush.getContext('2d').drawImage(source, source.width * 352 / 1586, source.height * 548 / 992,
    source.width * 92 / 1586, source.height * 56 / 992, 0, 0, 92, 56);
  const soil = ctx.createPattern(brush, 'repeat');
  const image = scene.add.image(0, 0, key).setOrigin(0).setDepth(-1.1);
  return {
    clear() { ctx.clearRect(0, 0, 960, 600); },
    paint(left, right, opacity) {
      const polygon = [...left, ...right.slice().reverse()];
      ctx.save(); ctx.globalAlpha = opacity * .7; ctx.fillStyle = soil;
      ctx.shadowColor = 'rgba(167, 137, 79, .65)'; ctx.shadowBlur = 6;
      ctx.beginPath(); polygon.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath(); ctx.fill(); ctx.restore();
      // Let the original painting's ground grain and foliage show through the
      // worn trail, rather than leaving a flat, sharply cut sandy stripe.
      ctx.save(); ctx.globalAlpha = opacity * .5;
      ctx.beginPath(); polygon.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath(); ctx.clip(); ctx.drawImage(source, 0, 0, 960, 600); ctx.restore();
    },
    refresh() { texture.refresh(); },
    destroy() { image.destroy(); },
  };
}

export function drawWorldMapPaths(scene, world, nodes, exits = []) {
  const graphics = scene.add.graphics().setDepth(-1), palette = PALETTES[world];
  const painter = world === 'jungle' ? jungleTrailPainter(scene) : null;
  let seen;
  const draw = (from, to) => {
    const key = [from.id, to.id].sort().join("/");
    if (seen.has(key)) return;
    seen.add(key);
    if (!scene.unlocked.has(from.id) || (!to.id.startsWith('@') && !scene.unlocked.has(to.id))) return;
    const discovery = scene.mapDiscovery;
    if (discovery && !discovery.visiblePaths.has(key)) return;
    const reveal = discovery?.progress.get(key);
    let route = getWorldMapRoute(world, from, to);
    if (reveal) {
      if (reveal.from !== from.id) route = reverseMapRoute(route);
      const length = route.length * reveal.fraction;
      route = { length, points: [...route.points.filter(p => p.distance < length), { ...pointOnMapRoute(route, length), distance: length }] };
    }
    if (world === 'water') {
      // The landscape already contains its trails. Do not paint a second path
      // over it: just leave occasional footprints on the very same walk route.
      for (let d = 18, i = 0; d < route.length - 15; d += 36, i++) {
        const p = pointOnMapRoute(route, d);
        graphics.fillStyle(palette.marks, .5).fillEllipse(p.x + (i % 2 ? -2 : 2), p.y, 4, 5);
      }
      return;
    }
    const tunnel = world === 'underground';
    const opacity = 1;
    if (!painter) graphics.lineStyle(tunnel ? 51 : 37, palette.edge, (tunnel ? .45 : .08) * opacity).strokePoints(route.points, false);
    const left = [], right = [];
    for (let d = 0; d <= route.length; d += 3) {
      const p = pointOnMapRoute(route, d), a = pointOnMapRoute(route, d - 2), b = pointOnMapRoute(route, d + 2);
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
      const width = (tunnel ? 20 : 13) + Math.sin(d / 29) * 3 + Math.sin(d / 8) * 1.8;
      left.push({ x: p.x + nx * width, y: p.y + ny * width });
      right.push({ x: p.x - nx * (width + Math.sin(d / 17) * 3), y: p.y - ny * (width + Math.sin(d / 17) * 3) });
    }
    if (painter) painter.paint(left, right, opacity);
    else graphics.fillStyle(palette.earth, (tunnel ? .85 : .6) * opacity).fillPoints([...left, ...right.reverse()], true);
    // Overlapping, uneven dabs blend into the terrain. No kerbs or centre stripe.
    for (let d = 0, i = 0; d < route.length; d += 5, i++) {
      const p = pointOnMapRoute(route, d), width = (tunnel ? 30 : 25) + Math.sin(i * 1.7) * 5;
      graphics.fillStyle(palette.dust, (tunnel ? .045 : .04) * opacity).fillEllipse(p.x, p.y, width, width * .73);
    }
    for (let d = 16, i = 0; d < route.length - 12; d += 18, i++) {
      const p = pointOnMapRoute(route, d), next = pointOnMapRoute(route, d + 2);
      const length = Math.hypot(next.x - p.x, next.y - p.y) || 1;
      const nx = -(next.y - p.y) / length, ny = (next.x - p.x) / length;
      const side = i % 2 ? 1 : -1;
      if (tunnel) {
        // Rough rock rims make a continuous walkable tunnel through the cave.
        for (const s of [-1, 1]) {
          const offset = s * (23 + Math.sin(d / 29) * 3 + Math.sin(i * 2.1) * 3);
          const x = p.x + nx * offset, y = p.y + ny * offset;
          graphics.fillStyle(palette.edge, .9).fillEllipse(x + 1, y + 2, 16 + i % 6, 11 + i % 5);
          graphics.fillStyle(0x89613a, .9).fillEllipse(x, y, 13 + i % 6, 9 + i % 4);
          graphics.fillStyle(palette.marks, .55).fillEllipse(x - 2, y - 3, 9, 3);
        }
        if (i % 6 === 2) {
          const x = p.x + nx * side * 27, y = p.y + ny * side * 27;
          graphics.fillStyle(palette.plants, .9).fillTriangle(x - 3, y + 3, x, y - 7, x + 4, y + 3);
        }
      } else {
        const edge = 18 + Math.sin(i * 1.9) * 4;
        graphics.fillStyle(palette.plants, .65 * opacity).fillEllipse(p.x + nx * side * edge, p.y + ny * side * edge, world === 'jungle' ? 9 : 4, 4);
      }
      // Occasional paired footprints and pebbles, never a dashed road marking.
      if (!tunnel) graphics.fillStyle(palette.marks, .3 * opacity)
        .fillEllipse(p.x + nx * side * 3, p.y + ny * side * 3, 3, 5);
      if (i % 3 === 0) graphics.fillStyle(palette.marks, .45 * opacity).fillEllipse(p.x - nx * 10, p.y - ny * 10, 4, 2);
    }
  };
  const redraw = () => {
  seen = new Set(); graphics.clear(); painter?.clear();
  nodes.forEach(node => {
    if (!scene.unlocked.has(node.id)) return;
    Object.values(node.neighbors || {}).forEach(id => {
      const next = nodes.find(n => n.id === id);
      if (next && scene.unlocked.has(id)) draw(node, next);
    });
  });
  exits.forEach(([from, to]) => draw(from, to));
  painter?.refresh();
  };
  graphics.redraw = redraw;
  graphics.once('destroy', () => painter?.destroy());
  redraw();
  return graphics;
}
