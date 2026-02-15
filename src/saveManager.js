import { normalizeInventory } from "./utils/inventory.js";

const STORAGE_KEY = "brucies_game_save_v1";

export const defaultSave = {
  currentLevel: "Wuestenruine",
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
  },
  lastPlayed: null,
};

export function loadSave() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const normalized = normalizeInventory(defaultSave);
    return { ...defaultSave, inventory: normalized.inventory, equipped: normalized.equipped };
  }

  try {
    const data = JSON.parse(raw);
    const merged = {
      ...defaultSave,
      ...data,
    };
    const normalized = normalizeInventory(merged);
    return { ...merged, inventory: normalized.inventory, equipped: normalized.equipped };
  } catch (error) {
    const normalized = normalizeInventory(defaultSave);
    return { ...defaultSave, inventory: normalized.inventory, equipped: normalized.equipped };
  }
}

export function saveProgress(saveData) {
  const payload = {
    ...saveData,
    lastPlayed: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}
