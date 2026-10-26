import { EXPERT_CARDS } from './expertKnowledge.js';
import { saveProgress } from '../saveManager.js';

export function knownDiscoveryIds(save = {}) {
  return new Set((Array.isArray(save.discoveries) ? save.discoveries : []).filter(id => Object.hasOwn(EXPERT_CARDS, id)));
}

export function ownedDiscoveryIds(save = {}) {
  const inventory = save.inventory || {};
  return [
    ...Object.entries(inventory.weapons || {}).filter(([, owned]) => owned).map(([id]) => id),
    ...Object.entries(inventory.passives || {}).filter(([, owned]) => owned).map(([id]) => id),
    ...(inventory.consumables?.honey > 0 || save.consumables?.honey > 0 ? ['honey'] : []),
    ...(inventory.companions?.default ? ['companion'] : []),
    ...(save.equipment?.shield ? ['shield'] : []), ...(save.equipment?.shoes ? ['shoes'] : []),
  ].filter(id => Object.hasOwn(EXPERT_CARDS, id));
}

export function recordDiscoveries(scene, ids) {
  const save = scene.registry.get('saveData');
  if (!save) return false;
  const known = knownDiscoveryIds(save), previousSize = known.size;
  ids.forEach(id => { if (Object.hasOwn(EXPERT_CARDS, id)) known.add(id); });
  if (known.size === previousSize) return false;
  const next = { ...save, discoveries: [...known] };
  scene.registry.set('saveData', next); saveProgress(next);
  return true;
}

export function isVisibleDiscovery(sprite, view) {
  if (!sprite || sprite.active === false || sprite.visible === false || sprite.alpha === 0 || !view) return false;
  const bounds = sprite.getBounds();
  return bounds.x < view.x + view.width && bounds.x + bounds.width > view.x
    && bounds.y < view.y + view.height && bounds.y + bounds.height > view.y;
}

export function sceneDiscoveryIds(scene) {
  // Loading screens, dialogs and hidden enemies do not count as encounters.
  if (scene.isLoading || scene.startScreen?.visible || scene.isPaused || scene.isGameOver || scene.dialog?.container?.visible) return [];
  const view = scene.cameras?.main?.worldView, result = [];
  const visible = sprite => isVisibleDiscovery(sprite, view);
  const children = group => group?.getChildren?.() || [];
  children(scene.monsters).forEach(enemy => {
    if (!enemy.getData('emerging') && visible(enemy)) result.push('mole-' + (enemy.getData('type') || 'normal'));
  });
  children(scene.rollingStones).forEach(enemy => { if (visible(enemy)) result.push('rolling-rock'); });
  children(scene.molesGroup).forEach(enemy => { if (visible(enemy)) result.push('mole-normal'); });
  children(scene.stoneMonstersGroup).forEach(enemy => {
    if (visible(enemy)) result.push(!enemy.getData('isStoneBoss') ? 'stone'
      : enemy.getData('bossConfig')?.isSuperBoss ? 'stone-titan' : 'stone-guardian');
  });
  children(scene.batsGroup).forEach(enemy => { if (visible(enemy)) result.push('bat'); });
  [...(scene.monkeys || []), ...(scene.boss ? [scene.boss] : [])].forEach(enemy => {
    if (enemy.active && !enemy.hidden && visible(enemy.sprite)) result.push(enemy.isBoss ? 'monkey-king' : 'monkey-' + enemy.kind);
  });
  (scene.hazards?.projectiles || []).forEach(projectile => {
    if (projectile.kind === 'stone' && visible(projectile.sprite)) result.push('stone');
  });
  return result;
}

const nextScan = new WeakMap();
export function trackSceneDiscoveries(scene) {
  const now = scene.time.now;
  if (now < (nextScan.get(scene) || 0)) return;
  nextScan.set(scene, now + 200);
  recordDiscoveries(scene, [...ownedDiscoveryIds({ inventory: scene.inventory }), ...sceneDiscoveryIds(scene)]);
}
