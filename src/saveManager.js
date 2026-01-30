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
    return { ...defaultSave };
  }

  try {
    const data = JSON.parse(raw);
    return {
      ...defaultSave,
      ...data,
    };
  } catch (error) {
    return { ...defaultSave };
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
