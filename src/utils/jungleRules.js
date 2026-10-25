export const JUNGLE_LEVEL = "Urwaldkronen";
export const JUNGLE_WORLD = "jungle";
const crownsBranches = [{ x: 0, y: 1762, width: 960, ground: true }];
for (let y = 1660, row = 0; y >= 160; y -= 100, row++) {
  if (row % 2) crownsBranches.push({ x: 315, y, width: 330 });
  else crownsBranches.push({ x: 65, y, width: 320 }, { x: 575, y, width: 320 });
}
export const JUNGLE_LEVELS = {
  Urwaldkronen: { name: "Kokoskronen", subtitle: "Erklimme die Baumkronen · Besiege den Affenkönig", reward: 300,
    height: 1820, spawn: { x: 130, y: 1762 }, branches: crownsBranches, boss: true,
    bossPosition: { x: 725, y: 260, perches: [260, 460, 660] },
    monkeys: [
      { x: 285, y: 1660, kind: "brown", perches: [1660, 1460] },
      { x: 725, y: 1460, kind: "brown", hidden: true, perches: [1460, 1260] },
      { x: 235, y: 1260, kind: "red", hidden: true, perches: [1260, 1060] },
      { x: 725, y: 860, kind: "blue", hidden: true, perches: [860, 660] },
      { x: 235, y: 660, kind: "red", hidden: true, perches: [660, 460] },
    ] },
  Lianenpfad: { name: "Lianenpfad", subtitle: "Klettere an den Lianen · Finde die goldene Kokosnuss", reward: 200,
    height: 2120, spawn: { x: 130, y: 2062 }, boss: false, goal: { x: 480, y: 110 },
    branches: [
      { x: 0, y: 2062, width: 960, ground: true }, { x: 65, y: 1960, width: 330 },
      { x: 610, y: 1810, width: 280 }, { x: 80, y: 1670, width: 170 },
      { x: 280, y: 1500, width: 560 }, { x: 100, y: 1040, width: 560 },
      { x: 300, y: 580, width: 580 }, { x: 300, y: 140, width: 420 },
    ],
    vines: [ { x: 350, top: 1495, bottom: 1980 }, { x: 610, top: 1035, bottom: 1525 },
      { x: 350, top: 575, bottom: 1065 }, { x: 610, top: 135, bottom: 605 } ],
    monkeys: [
      { x: 265, y: 1960, kind: "brown", perches: [1960] },
      { x: 725, y: 1810, kind: "red", hidden: true, perches: [1810, 1500] },
      { x: 235, y: 1040, kind: "blue", hidden: true, perches: [1040] },
      { x: 750, y: 580, kind: "red", hidden: true, perches: [580] },
    ] },
};
export const JUNGLE_PHYSICS = { gravity: 1050, jumpSpeed: 480, moveSpeed: 210, slowFactor: .45 };
export const MONKEY_TYPES = {
  brown: { damage: 1, sticky: true, explosive: false, hp: 3, interval: 3300, color: 0xffffff },
  red: { damage: 2, sticky: true, explosive: true, hp: 4, interval: 4100, color: 0xff8175 },
  blue: { damage: 3, sticky: false, explosive: false, hp: 4, interval: 4700, color: 0x7bbfff },
};
export const MONKEY_KING_THROWS = [
  { kind: "brown", warning: "KOKOSNUSS!", color: "#ffe194" },
  { kind: "red", warning: "EXPLOSIV!", color: "#ffaaa0" },
  { kind: "blue", warning: "BLAUE KOKOSNUSS!", color: "#a9dcff" },
  { kind: "stone", warning: "STEIN!", color: "#e6dfca" },
];
export const STICKY_MS = 5000;
export const PUDDLE_MS = 10000;
export const STONE_ROLL_LIMIT = 2880;
export const JUNGLE_BRANCHES = [
  { x: 0, y: 562, width: 960, ground: true },
  { x: 85, y: 480, width: 300 }, { x: 575, y: 480, width: 300 },
  { x: 360, y: 400, width: 240 },
  { x: 85, y: 320, width: 320 }, { x: 555, y: 320, width: 320 },
  { x: 345, y: 240, width: 270 },
  { x: 100, y: 165, width: 310 }, { x: 550, y: 165, width: 310 },
  { x: 350, y: 90, width: 260 },
];

export function canLandOnBranch(body, top) {
  return body.velocity.y >= 0 && body.prev.y + body.height <= top + 3;
}
export function ballisticVelocity(from, to, gravity = 850) {
  const duration = Math.max(.65, Math.min(1.3, Math.abs(to.x - from.x) / 340));
  return { x: (to.x - from.x) / duration,
    y: (to.y - from.y) / duration - .5 * gravity * duration };
}
export function circleTouchesRect(x, y, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(rect.x + rect.width, x));
  const closestY = Math.max(rect.y, Math.min(rect.y + rect.height, y));
  return Math.hypot(x - closestX, y - closestY) <= radius;
}
export function secondsLeft(until, now) {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function planMonkeyClimb(config, monkey, targetY) {
  if (!config?.branches) return null;
  const supports = (surface, x, y, tolerance = 0) => Math.abs(surface.y - y) < 3 && x >= surface.x - tolerance && x <= surface.x + surface.width + tolerance;
  const start = config.branches.find(s => supports(s, monkey.x, monkey.y, 24));
  if (!start) return null;
  const destinations = config.branches.filter(s => Math.abs(s.y - targetY) < 3);
  const anchors = [{ x: 110, top: 0, bottom: config.height }, { x: 850, top: 0, bottom: config.height }, ...(config.vines || [])];
  const candidates = [];
  anchors.forEach(anchor => {
    if (Math.min(monkey.y, targetY) < anchor.top - 8 || Math.max(monkey.y, targetY) > anchor.bottom + 8 || !supports(start, anchor.x, monkey.y, 24)) return;
    destinations.forEach(end => {
      if (!supports(end, anchor.x, targetY, 24)) return;
      candidates.push({ anchorX: anchor.x, targetY, targetX: Math.max(end.x + 24, Math.min(end.x + end.width - 24, monkey.homeX ?? monkey.x)), phase: 'approach' });
    });
  });
  return candidates.sort((a,b) => Math.abs(a.anchorX - monkey.x) - Math.abs(b.anchorX - monkey.x))[0] || null;
}

export function advanceMonkeyClimb(monkey, dt, runSpeed = 180, climbSpeed = 62) {
  const route = monkey.climbRoute; if (!route) return 'done';
  const move = (value, target, speed) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), speed * Math.max(0, Math.min(.05, dt)));
  if (route.phase === 'approach') {
    monkey.x = move(monkey.x, route.anchorX, runSpeed);
    if (Math.abs(monkey.x - route.anchorX) < .1) { monkey.x = route.anchorX; route.phase = 'vertical'; }
  } else if (route.phase === 'vertical') {
    monkey.x = route.anchorX; monkey.y = move(monkey.y, route.targetY, climbSpeed);
    if (Math.abs(monkey.y - route.targetY) < .1) { monkey.y = route.targetY; route.phase = 'depart'; }
  } else if (route.phase === 'depart') {
    monkey.x = move(monkey.x, route.targetX, runSpeed);
    if (Math.abs(monkey.x - route.targetX) < .1) { monkey.x = route.targetX; monkey.climbRoute = null; return 'done'; }
  }
  return route.phase;
}
