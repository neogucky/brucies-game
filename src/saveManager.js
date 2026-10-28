import { normalizeInventory } from "./utils/inventory.js";

const STORAGE_KEY = "brucies_game_save_v1";

export const defaultSave = {
  currentLevel: "Wuestenexperte",
  currentWorld: "desert",
  unlockedWorlds: ["desert"],
  unlockedLevels: ["Wuestenexperte"],
  completedLevels: [],
  discoveries: [],
  expertRewards: {},
  bonusChallenges: {},
  expertIntroductions: {},
  mapReveals: { desert: { nodes: ['Wuestenexperte'], paths: [] } },
  pendingDragonClues: [],
  storyCluesSeen: [],
  repairedRuinShown: false,
  ruinRepairCoins: 0,
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
    desertNode: "Wuestenexperte",
    undergroundNode: "UnderShop",
    jungleNode: "Urwaldkronen",
    waterNode: "Seeufer",
  },
  lastPlayed: null,
};

export const WORLD_LEVELS = {
  desert: ["Wuestenruine", "Taverne", "DesertEndless", "Fremdweg", "Wuestenexperte", "Wuestenschatz"],
  underground: ["UnderShop", "UnderDig", "Schluesseltor", "Schluesselweg", "Kristalltiefen", "Unterweltexperte", "Kristallschatz"],
  jungle: ["UrwaldShop", "Urwaldkronen", "Lianenpfad", "Urwaldexperte", "Wipfelschatz"],
  water: ['Seeufer'],
};

export const SECRET_LEVELS = { desert: 'Wuestenschatz', underground: 'Kristallschatz', jungle: 'Wipfelschatz' };

// Manual test settings run after the normal progression rules, including the
// unlockAll preview. Ordinary saves have no overrides and keep their behaviour.
export function debugLevelUnlocks(save, ids = save.unlockedLevels || []) {
  const unlocked = new Set(ids);
  for (const [id, value] of Object.entries(save.debugProgress?.levels || {})) {
    if (worldForLevel(id) && typeof value === 'boolean') value ? unlocked.add(id) : unlocked.delete(id);
  }
  for (const [world, value] of Object.entries(save.debugProgress?.switches || {})) {
    const id = SECRET_LEVELS[world];
    if (id && typeof value === 'boolean') value ? unlocked.add(id) : unlocked.delete(id);
  }
  return unlocked;
}

function forgetDebugMapPlaces(save, ids) {
  if (!save.mapReveals) return save;
  const hidden = new Set(ids), mapReveals = {};
  for (const [world, reveal] of Object.entries(save.mapReveals)) {
    mapReveals[world] = { ...reveal, nodes: (reveal.nodes || []).filter(id => !hidden.has(id)),
      paths: (reveal.paths || []).filter(path => !path.split('/').some(id => hidden.has(id))) };
  }
  return { ...save, mapReveals };
}

export function editDebugProgress(save, changes) {
  const debug = save.debugProgress || {};
  const levels = { ...debug.levels }, worlds = { ...debug.worlds }, switches = { ...debug.switches };
  let next = { ...save };
  for (const [id, value] of Object.entries(changes.levels || {})) {
    const world = worldForLevel(id);
    if (!world || typeof value !== 'boolean' || Object.values(SECRET_LEVELS).includes(id)) continue;
    levels[id] = value;
    if (value) worlds[world] = true;
    else next = forgetDebugMapPlaces(next, [id]);
  }
  const switchChanges = [...(Array.isArray(changes.resetSwitches) ? changes.resetSwitches.map(world => [world, false]) : []),
    ...Object.entries(changes.switches || {})];
  for (const [world, value] of switchChanges) {
    const id = SECRET_LEVELS[world];
    if (!id || typeof value !== 'boolean') continue;
    switches[world] = value;
    delete levels[id];
    const bonusChallenges = { ...next.bonusChallenges };
    if (!value) {
      // Remove the whole attempt, including its checkpoint and record. The
      // next real lever pull creates a fresh, playable bonus challenge.
      delete bonusChallenges[world];
      next = forgetDebugMapPlaces({ ...next, unlockedLevels: (next.unlockedLevels || []).filter(level => level !== id),
        completedLevels: (next.completedLevels || []).filter(level => level !== id) }, [id]);
    } else {
      worlds[world] = true;
      if ((!bonusChallenges[world] || bonusChallenges[world].status === 'locked') && !next.completedLevels?.includes(id)) {
        bonusChallenges[world] = { status: 'ready', remainingMs: 60000, collected: [] };
      }
    }
    next.bonusChallenges = bonusChallenges;
  }
  // Explicit world choices take precedence over individual level choices.
  for (const [world, value] of Object.entries(changes.worlds || {})) {
    if (!Object.hasOwn(WORLD_LEVELS, world) || typeof value !== 'boolean') continue;
    worlds[world] = value;
    if (!value) next = forgetDebugMapPlaces(next, [...WORLD_LEVELS[world], '@' + world]);
  }
  return normalizeWorldProgress({ ...next, debugProgress: { levels, worlds, switches } });
}

function applyDebugProgress(save) {
  if (!save.debugProgress) return save;
  const unlockedLevels = [...debugLevelUnlocks(save)], worlds = new Set(save.unlockedWorlds);
  for (const [world, value] of Object.entries(save.debugProgress.worlds || {})) {
    if (Object.hasOwn(WORLD_LEVELS, world) && typeof value === 'boolean') value ? worlds.add(world) : worlds.delete(world);
  }
  const mapState = { ...save.mapState };
  const available = world => WORLD_LEVELS[world].filter(id => unlockedLevels.includes(id));
  for (const world of Object.keys(WORLD_LEVELS)) {
    if (world === 'water' && mapState.waterNode === 'Wasserkante' && unlockedLevels.includes('Seeufer')) continue;
    if (!available(world).includes(mapState[world + 'Node'])) mapState[world + 'Node'] = available(world)[0] || null;
  }
  let currentWorld = save.currentWorld, currentLevel = save.currentLevel;
  if (!worlds.has(currentWorld) || !available(currentWorld).length) {
    currentWorld = [...worlds].find(world => available(world).length) || null;
  }
  if (!currentWorld || worldForLevel(currentLevel) !== currentWorld || !unlockedLevels.includes(currentLevel)) {
    currentLevel = currentWorld ? available(currentWorld).find(id => id === mapState[currentWorld + 'Node']) || available(currentWorld)[0] : null;
  }
  return { ...save, unlockedLevels, unlockedWorlds: [...worlds], currentWorld, currentLevel, mapState };
}

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
  for (const [world, value] of Object.entries(save.debugProgress?.worlds || {})) {
    if (value === true && Object.hasOwn(WORLD_LEVELS, world)) worlds.add(world);
  }
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
  if (save.expertIntroductions?.desert) levels.add('Wuestenruine');
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
  return applyDebugProgress({ ...save, currentWorld, currentLevel, unlockedWorlds: [...worlds], unlockedLevels: [...levels],
    completedLevels: completed, mapState });
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
    // Old saves already visited their unlocked places. They retain that view,
    // while new saves explicitly start with only the professor discovered.
    if (!Object.hasOwn(data, 'mapReveals')) merged.mapReveals = null;
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
