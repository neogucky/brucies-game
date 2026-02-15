export const GAME_MODES = {
  ISOMETRIC: "isometric",
  JUMP: "jump",
};

export const ITEM_DEFS = {
  sword: { supportedModes: [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP] },
  shield: { supportedModes: [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP] },
  shoes: { supportedModes: [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP] },
  honey: { supportedModes: [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP] },
  default: { supportedModes: [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP] },
};

export function isItemSupported(itemId, mode) {
  if (!itemId) return true;
  const def = ITEM_DEFS[itemId];
  if (!def || !def.supportedModes) return true;
  return def.supportedModes.includes(mode);
}

export function applyItemModeSupport(hud, equipped, mode) {
  if (!hud) return;
  hud.setItemModeSupported("active", isItemSupported(equipped?.weapon, mode));
  hud.setItemModeSupported("passive", isItemSupported(equipped?.passive, mode));
  hud.setItemModeSupported("consumable", isItemSupported(equipped?.consumable, mode));
}
