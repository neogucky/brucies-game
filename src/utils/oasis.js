// Water follows the painted upper-right pool in oasis-v1.png (960×600 world).
export const OASIS_WATER = [
  { x: 782, y: 12, width: 104, height: 65 },
  { x: 756, y: 63, width: 148, height: 82 },
  { x: 776, y: 138, width: 114, height: 50 },
];

export function safeOasisSpawn(x, y, padding = 40) {
  const nearWater = OASIS_WATER.some(r => x + padding > r.x && x - padding < r.x + r.width
    && y + padding > r.y && y - padding < r.y + r.height);
  return { x, y: nearWater ? Math.max(...OASIS_WATER.map(r => r.y + r.height)) + padding + 6 : y };
}
