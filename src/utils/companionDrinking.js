export function canHelperDrink(helper, puddle) {
  return Boolean(helper?.visible && puddle && Math.abs(helper.y - puddle.y) <= 12 &&
    Math.hypot(helper.x - puddle.x, helper.y - puddle.y) < 48);
}

export function companionDrinkTexture(elapsedMs) {
  return `companion-drinking-${Math.floor(Math.max(0, elapsedMs) / 140) % 4}`;
}
