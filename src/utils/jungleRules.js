export const JUNGLE_LEVEL = "Urwaldkronen";
export const JUNGLE_WORLD = "jungle";
export const JUNGLE_LEVELS = {
  Urwaldkronen: { name: "Kokoskronen", subtitle: "Erklimme die Äste · Besiege den Affenkönig", reward: 300,
    boss: true, monkeys: [
      { x: 235, y: 480, kind: "brown", perches: [480, 320, 165] },
      { x: 725, y: 320, kind: "red", perches: [480, 320, 165] },
      { x: 235, y: 165, kind: "blue", perches: [480, 320, 165] },
    ] },
  Lianenpfad: { name: "Lianenpfad", subtitle: "Vertreibe alle Affen · Erreiche die goldene Kokosnuss", reward: 200,
    boss: false, monkeys: [
      { x: 210, y: 480, kind: "brown", perches: [480, 320, 165] },
      { x: 750, y: 480, kind: "brown", perches: [480, 320, 165] },
      { x: 290, y: 320, kind: "red", perches: [480, 320, 165] },
      { x: 680, y: 320, kind: "blue", perches: [480, 320, 165] },
      { x: 240, y: 165, kind: "blue", perches: [480, 320, 165] },
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
