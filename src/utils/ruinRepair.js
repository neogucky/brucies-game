export const RUIN_REPAIR_COST = 100;
export const RUIN_REPAIR_PAD = { x: 480, y: 370, width: 172, height: 64 };
const RUIN_REPAIR_TEXTURES = ['desert-ruin-v2', 'desert-ruin-foundation-v3', 'desert-ruin-walls-v3', 'desert-ruin-repaired-v2'];

export function ruinRepairState(coins, stored = 0, completed = false) {
  const paid = completed ? RUIN_REPAIR_COST : Math.max(0, Math.min(RUIN_REPAIR_COST, Math.floor(Number(stored) || 0)));
  const remaining = RUIN_REPAIR_COST - paid;
  const amount = Math.min(10, remaining, Math.max(0, Math.floor(Number(coins) || 0)));
  const stage = Math.floor(paid * 3 / RUIN_REPAIR_COST);
  return { paid, remaining, amount, ready: amount > 0, complete: !remaining,
    texture: RUIN_REPAIR_TEXTURES[stage] };
}

// The visible oval and the interaction use the same ground coordinates.
// A raised sword, cape or helmet must not decide whether the knight is on it.
export function feetOnRepairPad(body, pad = RUIN_REPAIR_PAD) {
  if (!body?.center || !Number.isFinite(body.bottom)) return false;
  return ((body.center.x - pad.x) / (pad.width / 2)) ** 2 + ((body.bottom - pad.y) / (pad.height / 2)) ** 2 <= 1;
}
