export const BONUS_DURATION = 60000;
const BONUS_LAYOUT_VERSION = 2;
export const BONUS_CHALLENGES = {
  desert: { id: 'Wuestenschatz', name: 'Goldoase', map: 'DessertMapScene', field: 'desertNode', parent: 'DesertEndless',
    hiddenScene: 'DesertEndlessScene', hiddenLevel: 'DesertEndless', lever: { x: 440, y: 535 },
    cover: { kind: 'bush', texture: 'desert-shrub', tint: 0xf0e59b, offsetX: -8, offsetY: 6, width: 116, height: 86, alpha: .84 },
    background: 'story-desert', color: 0xd3a457, marker: 'map-desert-tunnel',
    tip: 'Spring über die Sandsteinsäulen und folge den goldenen Bögen!' },
  underground: { id: 'Kristallschatz', name: 'Funkelkammer', map: 'UndergroundMapScene', field: 'undergroundNode', parent: 'UnderDig',
    hiddenScene: 'UndergroundDigScene', hiddenLevel: 'UnderDig', lever: { x: 475, y: 152 },
    cover: { kind: 'earth', col: 12, row: 3, tint: 0xbad5ae },
    background: 'underground-bg', color: 0x6cc7d1, marker: 'map-underground-depths',
    tip: 'Sprungfedern bringen dich hoch hinauf!\nTippe zweimal schnell nach unten, um eine Ebene hinabzufallen.' },
  jungle: { id: 'Wipfelschatz', name: 'Goldwipfel', map: 'JungleMapScene', field: 'jungleNode', parent: 'Lianenpfad',
    hiddenScene: 'JungleScene', hiddenLevel: 'Lianenpfad', lever: { x: 130, y: 1670 },
    cover: { kind: 'bush', texture: 'jungle-foliage', tint: 0xc5dc8b },
    background: 'jungle-background', color: 0x72a95d, marker: 'map-jungle-vines',
    tip: 'Klettere an den Lianen und sammle zwischen den Baumwipfeln!' },
};

export function bonusState(save, world) {
  const config = BONUS_CHALLENGES[world]; if (!config) return { status: 'locked' };
  const state = save.bonusChallenges?.[world];
  if (state) {
    // Two new upper shelves move the cave down by 210 px. A saved runner
    // stays at the same height above the floor, without losing any coins.
    if (world === 'underground' && state.status === 'running' && state.layoutVersion !== BONUS_LAYOUT_VERSION && Number.isFinite(state.y)) {
      return { ...state, y: state.y + 210, layoutVersion: BONUS_LAYOUT_VERSION };
    }
    return state;
  }
  return { status: save.completedLevels?.includes(config.id) ? 'complete' : save.unlockedLevels?.includes(config.id) ? 'ready' : 'locked',
    remainingMs: BONUS_DURATION, collected: [] };
}

export function unlockBonus(save, world) {
  const config = BONUS_CHALLENGES[world];
  if (!config || bonusState(save, world).status !== 'locked') return save;
  return { ...save, unlockedLevels: [...new Set([...(save.unlockedLevels || []), config.id])],
    ...(save.debugProgress?.switches?.[world] === false ? { debugProgress: { ...save.debugProgress,
      switches: { ...save.debugProgress.switches, [world]: true } } } : {}),
    bonusChallenges: { ...save.bonusChallenges, [world]: { status: 'ready', remainingMs: BONUS_DURATION, collected: [], layoutVersion: BONUS_LAYOUT_VERSION } } };
}

export function beginBonus(save, world) {
  const state = bonusState(save, world);
  if (!['ready', 'running'].includes(state.status)) return null;
  return { ...save, bonusChallenges: { ...save.bonusChallenges, [world]: { ...state, status: 'running', layoutVersion: BONUS_LAYOUT_VERSION } } };
}

export function checkpointBonus(save, world, frame) {
  const state = bonusState(save, world);
  if (state.status !== 'running') return save;
  const validIds = new Set(createBonusLayout(world).coins.map(coin => coin.id));
  const previous = new Set((state.collected || []).filter(id => validIds.has(id)));
  const collected = new Set(previous);
  (frame.collected || []).forEach(id => { if (validIds.has(id)) collected.add(id); });
  const remainingMs = Math.max(0, Math.min(state.remainingMs ?? BONUS_DURATION, Number(frame.remainingMs) || 0));
  const position = Number.isFinite(frame.x) && Number.isFinite(frame.y) ? { x: frame.x, y: frame.y } : {};
  return { ...save, coins: (save.coins || 0) + collected.size - previous.size,
    bonusChallenges: { ...save.bonusChallenges, [world]: { ...state, ...position, remainingMs, collected: [...collected] } } };
}

export function finishBonus(save, world) {
  const state = bonusState(save, world), config = BONUS_CHALLENGES[world];
  if (state.status !== 'running' || !config) return save;
  const ids = new Set(state.collected || []);
  const allCollected = createBonusLayout(world).coins.every(coin => ids.has(coin.id));
  const elapsedMs = BONUS_DURATION - Math.max(0, Math.min(BONUS_DURATION, state.remainingMs ?? BONUS_DURATION));
  return { ...save, completedLevels: [...new Set([...(save.completedLevels || []), config.id])],
    bonusChallenges: { ...save.bonusChallenges, [world]: { ...state, status: 'complete', remainingMs: 0, elapsedMs, allCollected,
      ...(allCollected ? { recordMs: elapsedMs } : {}) } } };
}

export function createBonusLayout(world) {
  const desert = world === 'desert', cave = world === 'underground';
  const width = desert ? 2400 : 960, height = desert ? 680 : cave ? 1790 : 2100;
  const floor = { x: 0, y: height - 55, width, floor: true }, platforms = [floor], vines = [];
  const rows = desert ? 10 : 14;
  for (let i = 0; i < rows; i++) {
    if (desert) platforms.push({ x: 210 + i * 195, y: height - 145 - i % 4 * 75, width: 140 });
    else if (cave) platforms.push({ x: i % 2 ? 530 : 100, y: height - 170 - i * 105, width: 300, spring: i % 3 === 0 });
    else platforms.push({ x: [20, 350, 680, 350][i % 4], y: height - 170 - i * 120, width: 260 });
  }
  if (!desert && !cave) vines.push({ x: 110, top: 370, bottom: floor.y }, { x: 850, top: 370, bottom: floor.y });
  const coins = [], shelfCoins = desert ? 6 : cave ? 6 : 5;
  platforms.slice(1).forEach((shelf, row) => {
    for (let i = 0; i < shelfCoins; i++) coins.push({ id: 's' + row + ':' + i,
      x: shelf.x + 22 + i * (shelf.width - 44) / (shelfCoins - 1), y: shelf.y - 30 - Math.sin(i / (shelfCoins - 1) * Math.PI) * 25 });
  });
  // Keep every existing coin ID; the two new cave shelves add twelve coins.
  const groundCoins = cave ? 18 : 90 - coins.length;
  for (let i = 0; i < groundCoins; i++) coins.push({ id: 'g:' + i, x: 60 + i * (width - 120) / (groundCoins - 1), y: floor.y - 25 });
  return { width, height, platforms, vines, coins, spawn: { x: 85, y: floor.y - 3 } };
}
