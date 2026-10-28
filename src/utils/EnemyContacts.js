const GAP = 1;
const rect = b => ({ x: b.x, y: b.y, width: b.width, height: b.height });
const right = b => b.x + b.width;
const bottom = b => b.y + b.height;
const overlaps = (a, b) => a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;

// Relative swept bounds also catch a fast roll or dash that crosses a body in one frame.
export function contactSeparation(a, b, previousA = a, previousB = b) {
  const dx = a.x - previousA.x - (b.x - previousB.x);
  const dy = a.y - previousA.y - (b.y - previousB.y);
  const axis = (minA, maxA, minB, maxB, delta) => delta > 0
    ? [(minB - maxA) / delta, (maxB - minA) / delta]
    : delta < 0 ? [(maxB - minA) / delta, (minB - maxA) / delta]
      : minA < maxB && maxA > minB ? [-Infinity, Infinity] : [Infinity, -Infinity];
  if (!overlaps(previousA, previousB)) {
    const [ex, xx] = axis(previousA.x, right(previousA), previousB.x, right(previousB), dx);
    const [ey, xy] = axis(previousA.y, bottom(previousA), previousB.y, bottom(previousB), dy);
    const entry = Math.max(ex, ey), exit = Math.min(xx, xy);
    if (entry >= 0 && entry <= 1 && entry <= exit) {
      if (ex > ey) return { x: dx > 0 ? b.x - right(a) - GAP : right(b) - a.x + GAP, y: 0 };
      return { x: 0, y: dy > 0 ? b.y - bottom(a) - GAP : bottom(b) - a.y + GAP };
    }
  }
  if (!overlaps(a, b)) return null;
  return [
    { x: b.x - right(a) - GAP, y: 0 }, { x: right(b) - a.x + GAP, y: 0 },
    { x: 0, y: b.y - bottom(a) - GAP }, { x: 0, y: bottom(b) - a.y + GAP },
  ].sort((c, d) => Math.abs(c.x || c.y) - Math.abs(d.x || d.y))[0];
}

export function getContactEnemies(scene) {
  const result = [], now = scene.worldTime ?? scene.time.now;
  const add = (enemy, bounds, hit, harmless = false) => {
    if (!enemy || enemy.active === false || enemy.hidden || enemy.getData?.("emerging")) return;
    result.push({ enemy, bounds: rect(bounds), hit, harmless });
  };
  if (Array.isArray(scene.monkeys)) {
    [...scene.monkeys, ...(scene.boss ? [scene.boss] : [])].forEach(m =>
      add(m, scene.enemyBounds(m), () => scene.takeJungleHit(1),
        now < (m.stunnedUntil || 0) || (m.isBoss && !m.awake)));
  }
  scene.batsGroup?.getChildren().forEach(bat => add(bat, scene.batSystem.getBounds(bat),
    () => scene.applyFlyingEnemyHit(1), now < (bat.getData("stunnedUntil") || 0)));
  scene.molesGroup?.getChildren().forEach(mole => add(mole, mole.body || mole.getBounds(),
    () => scene.applyMoleAttack(mole), now < (mole.getData("stunnedUntil") || 0)));
  scene.stoneMonstersGroup?.getChildren().forEach(stone => {
    const state = stone.getData("stoneState");
    // A returning boss is travelling behind the level rather than attacking.
    if (state === "returning") return;
    const dropping = state === "dropping", boss = stone.getData("isStoneBoss");
    add(stone, scene.getStoneMonsterHitbox(stone),
      () => scene.applyStoneMonsterPlayerHit(stone, boss ? (dropping ? 3 : 2) : 1, !dropping),
      !["dropping", "rolling"].includes(state));
  });
  scene.monsters?.getChildren().forEach(monster => add(monster, monster.body || monster.getBounds(),
    () => scene.handlePlayerHit(scene.player, monster), now < (monster.getData("stunnedUntil") || 0)));
  return result;
}

export default class EnemyContacts {
  constructor(scene) { this.scene = scene; this.previous = null; this.enemies = new Map(); this.touching = new Set(); }

  canPlace(bounds) {
    const s = this.scene, world = s.physics?.world?.bounds;
    if (world && (bounds.x < world.x || right(bounds) > right(world) || bounds.y < world.y || bottom(bounds) > bottom(world))) return false;
    if (s.solidScenery?.some(solid => overlaps(bounds, solid))) return false;
    if (s.blockMap && s.tileSize) {
      const tile = s.tileSize;
      for (let y = Math.floor(bounds.y / tile); y <= Math.floor((bottom(bounds) - .01) / tile); y++) {
        for (let x = Math.floor(bounds.x / tile); x <= Math.floor((right(bounds) - .01) / tile); x++) {
          const block = s.blockMap.get(x + "," + y);
          if (block && block.active !== false) return false;
        }
      }
    }
    return true;
  }

  update() {
    const s = this.scene, p = s.player, body = p?.body;
    if (!body || p.active === false || s.isPaused || s.isGameOver || s.isComplete || s.levelCompleted || s.isEditorMode || s.isHitboxEditMode) return;
    const before = this.previous || rect(body), currentEnemies = getContactEnemies(s), live = new Set();
    currentEnemies.forEach(({ enemy, bounds, hit, harmless }) => {
      live.add(enemy);
      const previousEnemy = this.enemies.get(enemy) || bounds;
      const current = rect(body), correction = contactSeparation(current, bounds, before, previousEnemy);
      if (!correction) {
        // Keep the contact latched while pushing against the same enemy. Backing off
        // or jumping clear starts a new encounter; the one-pixel separation does not.
        if (!overlaps(current, { x: bounds.x - 7, y: bounds.y - 7, width: bounds.width + 14, height: bounds.height + 14 })) this.touching.delete(enemy);
        return;
      }
      let move = correction;
      if (!this.canPlace({ ...current, x: current.x + move.x, y: current.y + move.y })) {
        // A falling stone must push sideways when the floor prevents moving down.
        move = [
          { x: bounds.x - right(current) - GAP, y: 0 }, { x: right(bounds) - current.x + GAP, y: 0 },
          { x: 0, y: bounds.y - bottom(current) - GAP }, { x: 0, y: bottom(bounds) - current.y + GAP },
        ].sort((a, b) => Math.abs(a.x || a.y) - Math.abs(b.x || b.y))
          .find(c => this.canPlace({ ...current, x: current.x + c.x, y: current.y + c.y }));
      }
      if (!move && this.previous && this.canPlace(before) && !overlaps(before, previousEnemy)) {
        // In a tight tunnel there may be no room to push the hero. Stop the
        // approaching enemy at the last clear position instead of crushing through.
        const dx = previousEnemy.x - bounds.x, dy = previousEnemy.y - bounds.y;
        enemy.x += dx; enemy.y += dy;
        enemy.sprite?.setPosition(enemy.x, enemy.y);
        if (enemy.body) {
          enemy.body.position.x += dx; enemy.body.position.y += dy;
          enemy.body.updateCenter?.(); enemy.body.setVelocity?.(0, 0);
        }
        Object.assign(bounds, previousEnemy);
        move = { x: before.x - current.x, y: before.y - current.y };
      }
      if (move) {
        body.position.x += move.x; body.position.y += move.y;
        p.x += move.x; p.y += move.y; body.updateCenter?.();
        if (move.x && body.velocity.x * move.x < 0) body.velocity.x = 0;
        if (move.y && body.velocity.y * move.y < 0) body.velocity.y = 0;
        if (move.y < 0 && s.gameMode === "jump" && body.blocked) body.blocked.down = true;
      }
      if (!this.touching.has(enemy) && !harmless) {
        // Projectile and melee attacks keep their own telegraphs/cooldowns. Only
        // automatic body contact is limited to once per continuous encounter.
        if (Array.isArray(s.monkeys)) s.playJungleSound?.("sfx-monster-attack");
        else if (s.batsGroup?.getChildren().includes(enemy) || s.molesGroup?.getChildren().includes(enemy)) s.sfx?.monsterAttack?.play();
        hit();
      }
      this.touching.add(enemy);
    });
    this.enemies = new Map(currentEnemies.map(e => [e.enemy, e.bounds]));
    this.touching.forEach(enemy => { if (!live.has(enemy)) this.touching.delete(enemy); });
    this.previous = rect(body);
  }

  destroy() { this.enemies.clear(); this.touching.clear(); this.previous = null; }
}
