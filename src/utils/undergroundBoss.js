export const UNDERGROUND_BOSSES = {
  Schluesselweg: {
    name: "Der Steinwächter", maxHp: 20, rollSpeed: 230, dropSpeed: 520,
    speedPerStage: 35, windowMs: 1100, reward: 200, unlock: "Kristalltiefen",
  },
  Kristalltiefen: {
    name: "Obsidian-Titan", maxHp: 36, rollSpeed: 270, dropSpeed: 580,
    speedPerStage: 40, windowMs: 950, reward: 400, isSuperBoss: true,
  },
};

export function getBossStageFloor(maxHp, stage) {
  return stage >= 3 ? 0 : Math.ceil(maxHp * (3 - stage) / 3);
}
