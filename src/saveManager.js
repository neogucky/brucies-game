import { normalizeInventory } from "./utils/inventory.js";

const STORAGE_KEY = "brucies_game_save_v1";

export const defaultSave = {
  currentLevel: "Wuestenruine",
  currentWorld: "desert",
  unlockedWorlds: ["desert"],
  unlockedLevels: ["Wuestenruine"],
  completedLevels: [],
  repairedRuinShown: false,
  health: 5,
  coins: 0,
  consumables: {
    honey: 0,
  },
  inventory: {
    weapons: { sword: true },
    passives: {},
    consumables: { honey: 0 },
    companions: { default: true },
  },
  equipped: {
    weapon: "sword",
    passive: null,
    consumable: null,
    companion: "default",
  },
  equipment: {
    shield: false,
    shoes: false,
  },
  settings: {
    autoAim: false,
  },
  playerGender: "male",
  mapState: {
    desertNode: "Wuestenruine",
    undergroundNode: "UnderShop",
    jungleNode: "UrwaldShop",
  },
  lastPlayed: null,
};

export const WORLD_LEVELS = {
  desert: ["Wuestenruine", "Taverne", "DesertEndless", "Fremdweg"],
  underground: ["UnderShop", "UnderDig", "Schluesseltor", "Schluesselweg", "Kristalltiefen"],
  jungle: ["UrwaldShop", "Urwaldkronen", "Lianenpfad"],
};

export function worldForLevel(level) {
  return Object.keys(WORLD_LEVELS).find(world => WORLD_LEVELS[world].includes(level));
}

// Older saves used "Urwald" as a level on the underground map. Preserve the
// unlock and location while moving it into the separate world progression.
export function normalizeWorldProgress(save) {
  const levels = new Set((save.unlockedLevels || []).filter(id => id !== "Urwald"));
  const completed = (save.completedLevels || []).filter(id => id !== "Urwald");
  const worlds = new Set(["desert", ...(save.unlockedWorlds || []).filter(id => WORLD_LEVELS[id])]);
  for (const world of ["underground", "jungle"]) {
    if (WORLD_LEVELS[world].some(id => levels.has(id) || completed.includes(id))) worlds.add(world);
  }
  const resumedWorld = worldForLevel(save.currentLevel);
  if (resumedWorld) { worlds.add(resumedWorld); levels.add(save.currentLevel); }
  if (completed.includes("Fremdweg")) worlds.add("underground");
  if (completed.includes("Kristalltiefen") || save.unlockedLevels?.includes("Urwald") ||
    save.currentLevel === "Urwald" || save.mapState?.undergroundNode === "Urwald") worlds.add("jungle");
  if (worlds.has("jungle")) {
    worlds.add("underground"); levels.add("UrwaldShop"); levels.add("Urwaldkronen");
  }
  if (completed.includes("Urwaldkronen")) levels.add("Lianenpfad");
  const mapState = { ...save.mapState };
  if (mapState.undergroundNode === "Urwald") mapState.undergroundNode = "Kristalltiefen";
  if (!WORLD_LEVELS.jungle.includes(mapState.jungleNode)) mapState.jungleNode = "UrwaldShop";
  const currentLevel = save.currentLevel === "Urwald" ? mapState.jungleNode : save.currentLevel;
  if (worldForLevel(currentLevel)) levels.add(currentLevel);
  if (worldForLevel(currentLevel) === "jungle") mapState.jungleNode = currentLevel;
  const currentWorld = worldForLevel(currentLevel) || (WORLD_LEVELS[save.currentWorld] ? save.currentWorld : "desert");
  worlds.add(currentWorld);
  return { ...save, currentWorld, currentLevel, unlockedWorlds: [...worlds], unlockedLevels: [...levels],
    completedLevels: completed, mapState };
}

export function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const normalized = normalizeInventory(defaultSave);
    return normalizeWorldProgress({ ...defaultSave, inventory: normalized.inventory, equipped: normalized.equipped });
  }

  try {
    const data = JSON.parse(raw);
    const merged = {
      ...defaultSave,
      ...data,
    };
    if (!Number.isFinite(merged.health) || merged.health <= 0) {
      merged.health = defaultSave.health;
    }
    const normalized = normalizeInventory(data || {});
    return normalizeWorldProgress({ ...merged, inventory: normalized.inventory, equipped: normalized.equipped });
  } catch (error) {
    const normalized = normalizeInventory(defaultSave);
    return normalizeWorldProgress({ ...defaultSave, inventory: normalized.inventory, equipped: normalized.equipped });
  }
}

export function saveProgress(saveData) {
  const payload = {
    ...normalizeWorldProgress(saveData),
    lastPlayed: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}
