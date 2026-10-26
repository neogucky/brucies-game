export const WEAPON_STATS = {
  sword: { icon: "item-sword", width: 48, height: 38, offset: 24, swingMs: 140, windupMs: 0, damage: 1, stoneMultiplier: 1 },
  powerHammer: { icon: "item-power-hammer", width: 60, height: 44, offset: 30, swingMs: 320, windupMs: 110, damage: 1, stoneMultiplier: 2 },
};

export function isMeleeWeapon(id) {
  return Object.prototype.hasOwnProperty.call(WEAPON_STATS, id);
}

export function getWeaponStats(id) {
  return isMeleeWeapon(id) ? WEAPON_STATS[id] : null;
}

export function getWeaponDamage(id, isStone = false, multiplier = 1) {
  const stats = getWeaponStats(id);
  return stats ? stats.damage * (isStone ? stats.stoneMultiplier : 1) * multiplier : 0;
}

export function getAttackStats(id, attack) {
  const stats = getWeaponStats(id);
  return stats && id === 'powerHammer' && attack?.charged
    ? { ...stats, windupMs: 80, impactMs: 210, swingMs: 360, chargeProgress: attack.progress } : stats;
}

export function getMeleeDamage(scene, isStone = false) {
  return getWeaponDamage(scene.equipped?.weapon, isStone,
    scene.equipped?.weapon === 'powerHammer' ? scene.hammerAttack?.multiplier || 1 : 1);
}

export function getWeaponTextures(id, gender = "male") {
  const prefix = `knight${gender === "female" ? "-female" : ""}${id === "powerHammer" ? "-hammer" : ""}`;
  return {
    standingTexture: `${prefix}-standing`, hitTexture: `${prefix}-hitting`,
    crouchTexture: `${prefix}-crouching`, crouchHitTexture: `${prefix}-crouching-hitting`,
  };
}

export function applyWeaponAppearance(scene, player = scene.player) {
  if (!player) return;
  const save = scene.registry.get("saveData") || {};
  const textures = getWeaponTextures(scene.equipped?.weapon ?? save.equipped?.weapon, save.playerGender);
  Object.entries(textures).forEach(([key, value]) => player.setData(key, value));
  player.setTexture(scene.isSwinging ? textures.hitTexture : scene.isDucking ? textures.crouchTexture : textures.standingTexture);
}
