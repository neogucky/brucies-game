export const UNDERGROUND_BOSSES = {
  Schluesselweg: {
    name: "Der Steinwächter", maxHp: 12, rollSpeed: 180, dropSpeed: 420,
    speedPerStage: 20, windowMs: 1800, reward: 200, unlock: "Kristalltiefen",
  },
  Kristalltiefen: {
    name: "Obsidian-Titan", maxHp: 36, rollSpeed: 270, dropSpeed: 580,
    speedPerStage: 40, windowMs: 950, reward: 400, isSuperBoss: true, unlock: "Urwaldkronen", unlockWorld: "jungle",
  },
};

export function getBossStageFloor(maxHp, stage) {
  return stage >= 3 ? 0 : Math.ceil(maxHp * (3 - stage) / 3);
}
