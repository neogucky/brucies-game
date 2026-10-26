import { normalizeInventory } from "./utils/inventory.js";

const STORAGE_KEY = "brucies_game_save_v1";

export const defaultSave = {
  currentLevel: "Wuestenruine",
  currentWorld: "desert",
  unlockedWorlds: ["desert"],
  unlockedLevels: ["Wuestenruine", "Wuestenexperte"],
  completedLevels: [],
  discoveries: [],
  expertIntroductions: {},
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
    controlProfile: "ipadKeyboard",
  },
  playerGender: "male",
  tutorials: { powerHammer: { offered: false, completed: false } },
  mapState: {
    desertNode: "Wuestenruine",
    undergroundNode: "UnderShop",
    jungleNode: "Urwaldkronen",
    waterNode: "Seeufer",
  },
  lastPlayed: null,
};

export const WORLD_LEVELS = {
  desert: ["Wuestenruine", "Taverne", "DesertEndless", "Fremdweg", "Wuestenexperte"],
  underground: ["UnderShop", "UnderDig", "Schluesseltor", "Schluesselweg", "Kristalltiefen", "Unterweltexperte"],
  jungle: ["UrwaldShop", "Urwaldkronen", "Lianenpfad", "Urwaldexperte"],
  water: ['Seeufer'],
};

export function worldForLevel(level) {
  return Object.keys(WORLD_LEVELS).find(world => WORLD_LEVELS[world].includes(level));
}

export function isWorldUnlocked(save, world) {
  return normalizeWorldProgress(save).unlockedWorlds.includes(world);
}

// Preview mode opens the real routes and gates without pretending bosses have
// been defeated. Keep the requested world's last valid map location.
export function unlockAllForTesting(save, requestedWorld = 'underground') {
  const world = Object.hasOwn(WORLD_LEVELS, requestedWorld) ? requestedWorld : 'underground';
  const mapKey = world + 'Node';
  const fallback = { desert: 'Wuestenruine', underground: 'Schluesselweg', jungle: 'Urwaldkronen', water: 'Seeufer' }[world];
  const currentLevel = WORLD_LEVELS[world].includes(save.mapState?.[mapKey]) ? save.mapState[mapKey] : fallback;
  return normalizeWorldProgress({ ...save, currentWorld: world, currentLevel,
    unlockedLevels: [...new Set([...(save.unlockedLevels || []), ...Object.values(WORLD_LEVELS).flat()])],
    unlockedWorlds: Object.keys(WORLD_LEVELS), undergroundKeyCollected: true, health: 5,
    mapState: { ...save.mapState, [mapKey]: currentLevel } });
}

// Older saves used "Urwald" as a level on the underground map. Preserve the
// unlock and location while moving it into the separate world progression.
export function normalizeWorldProgress(save) {
  const levels = new Set((save.unlockedLevels || []).filter(id => id !== "Urwald"));
  const completed = (save.completedLevels || []).filter(id => id !== "Urwald");
  const worlds = new Set(["desert", ...(save.unlockedWorlds || []).filter(id => WORLD_LEVELS[id])]);
  for (const world of ["underground", "jungle", 'water']) {
    if (WORLD_LEVELS[world].some(id => levels.has(id) || completed.includes(id))) worlds.add(world);
  }
  const resumedWorld = worldForLevel(save.currentLevel);
  if (resumedWorld) { worlds.add(resumedWorld); levels.add(save.currentLevel); }
  if (completed.includes("Fremdweg")) worlds.add("underground");
  if (completed.includes("Kristalltiefen") || save.unlockedLevels?.includes("Urwald") ||
    save.currentLevel === "Urwald" || save.mapState?.undergroundNode === "Urwald") worlds.add("jungle");
  if (completed.includes('Lianenpfad')) worlds.add('water');
  if (worlds.has('water')) { worlds.add('jungle'); levels.add('Seeufer'); }
  if (worlds.has("jungle")) {
    worlds.add("underground"); levels.add("Urwaldkronen");
  }
  if (completed.includes("Urwaldkronen")) { levels.add("UrwaldShop"); levels.add("Lianenpfad"); }
  levels.add("Wuestenexperte");
  if (worlds.has("underground")) levels.add("Unterweltexperte");
  if (worlds.has("jungle")) levels.add("Urwaldexperte");
  const mapState = { ...save.mapState };
  if (mapState.undergroundNode === "Urwald") mapState.undergroundNode = "Kristalltiefen";
  if (!WORLD_LEVELS.jungle.includes(mapState.jungleNode)) mapState.jungleNode = "Urwaldkronen";
  if (!['Seeufer', 'Wasserkante'].includes(mapState.waterNode)) mapState.waterNode = 'Seeufer';
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
