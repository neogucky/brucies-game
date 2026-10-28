export const DRAGON_CLUES = {
  desert: { level: 'Fremdweg', map: 'DessertMapScene', background: 'story-desert', duration: 19000 },
  underground: { level: 'Kristalltiefen', map: 'UndergroundMapScene', background: 'story-underground', duration: 18500 },
  jungle: { level: 'Lianenpfad', map: 'JungleMapScene', background: 'story-jungle', duration: 18500 },
};

// These are marks already in the landscape, rather than clues spawned by the actors.
export const DRAGON_TRACKS = {
  desert: [[510, 466], [566, 437], [625, 409], [685, 378], [737, 350], [788, 324]],
  jungle: [[420, 480], [486, 455], [550, 430], [614, 407], [675, 387], [729, 369]],
};

export const DRAGON_CLUE_CUES = {
  desert: [[700, 'hop'], [1600, 'hop'], [2300, 'chime'], [3500, 'hop'], [4200, 'hop'], [4900, 'hop'],
    [5600, 'hop'], [9600, 'hop'], [10600, 'hop'], [11800, 'hop'], [13000, 'hop'], [14300, 'hop'], [15500, 'hop']],
  underground: [[700, 'hop'], [1700, 'hop'], [2500, 'chime'], [3500, 'hop'], [4200, 'hop'], [5000, 'hop'],
    [7600, 'paper'], [9000, 'chime'], [13600, 'hop'], [14800, 'hop'], [16000, 'hop']],
  jungle: [[700, 'hop'], [1600, 'hop'], [2200, 'chime'], [3200, 'hop'], [3900, 'hop'], [4700, 'hop'],
    [8300, 'hop'], [9500, 'hop'], [10800, 'hop'], [12200, 'splash'], [12800, 'boing'], [14300, 'chime']],
};

export function queueDragonClue(save, world) {
  if (!DRAGON_CLUES[world] || save.storyCluesSeen?.includes(world)) return save;
  return { ...save, pendingDragonClues: [...new Set([...(save.pendingDragonClues || []), world])] };
}

export function completeDragonClue(save, world) {
  return { ...save, pendingDragonClues: (save.pendingDragonClues || []).filter(id => id !== world),
    storyCluesSeen: [...new Set([...(save.storyCluesSeen || []), world])] };
}

export function startPendingDragonClue(scene, world) {
  const save = scene.registry.get('saveData') || {};
  if (!save.pendingDragonClues?.includes(world) || save.storyCluesSeen?.includes(world)) return false;
  scene.scene.start('DragonClueScene', { world }); return true;
}

const clamp = n => Math.max(0, Math.min(1, n));
const progress = (t, start, end) => clamp((t - start) / (end - start));
const smooth = n => n * n * (3 - 2 * n);
const mix = (a, b, p) => a + (b - a) * p;
function storyHop(from, to, p, hops, height) {
  const groundY = mix(from.y, to.y, smooth(p)), lift = Math.abs(Math.sin(p * hops * Math.PI));
  return { x: mix(from.x, to.x, smooth(p)), y: groundY - lift * height, groundY, stretch: 1 + lift * .06 };
}

function followTrail(t, stops, hopping, motion) {
  const i = Math.max(1, stops.findIndex(stop => t < stop.at));
  const [from, to] = t >= stops.at(-1).at ? stops.slice(-2) : [stops[i - 1], stops[i]];
  const p = progress(t, from.at, to.at);
  const moving = t > stops[0].at && t < stops.at(-1).at && (from.x !== to.x || from.y !== to.y);
  return hopping ? { ...storyHop(from, to, p, to.hops || 3, moving ? (to.height || 18) * motion : 0), hopping: moving }
    : { x: mix(from.x, to.x, p), y: mix(from.y, to.y, p), walking: moving };
}

function desertClue(f, t, motion) {
  f.shot = t >= 6200 && t < 9400 ? 'closeup' : 'wide';
  f.cameraZoom = f.shot === 'closeup' ? 2.35 : 1;
  f.cameraX = f.shot === 'closeup' ? 465 : 480;
  f.cameraY = f.shot === 'closeup' ? 414 : 300;
  f.surprise = t >= 2300 && t < 3250;
  f.beat = t < 2300 ? 'walk' : t < 3250 ? 'notice' : t < 5350 ? 'find' :
    t < 9400 ? 'show' : t < 15100 ? 'follow' : 'enter';
  f.helper = followTrail(t, [
    { at: 0, x: 220, y: 486 }, { at: 2300, x: 300, y: 480, hops: 3 },
    { at: 3250, x: 300, y: 480 }, { at: 5100, x: 465, y: 473, hops: 3, height: 24 },
    { at: 9600, x: 465, y: 473 }, { at: 12000, x: 603, y: 418, hops: 3 },
    { at: 15100, x: 755, y: 342, hops: 3 }, { at: 16700, x: 815, y: 315, hops: 2, height: 12 },
  ], true, motion);
  if (t >= 5100 && t < 5500) f.helper.pose = 'observe';
  else if (t >= 5500 && t < 6500) f.helper.pose = 'beckon';
  else if (t >= 6500 && t < 9400) f.helper.pose = 'point';
  f.helper.angle = f.helper.pose === 'beckon' ? Math.sin(t / 90) * 4 * motion : 0;
  f.hero = followTrail(t, [
    { at: 0, x: 120, y: 492 }, { at: 2300, x: 215, y: 496 },
    { at: 3950, x: 215, y: 496 }, { at: 6100, x: 398, y: 490 },
    { at: 10000, x: 398, y: 490 }, { at: 12900, x: 582, y: 432 },
    { at: 16700, x: 752, y: 344 }, { at: 18300, x: 812, y: 316 },
  ], false, motion);
  if (t >= 6500 && t < 9100) f.hero.pose = 'inspect';
  else if (t >= 9400 && t < 10000) f.hero.pose = 'point';
  for (const actor of [f.hero, f.helper]) {
    actor.caveDepth = progress(actor.x, 775, 815);
    actor.opacity = 1 - smooth(progress(actor.x, 788, 812));
  }
  return f;
}

function undergroundClue(f, t, motion) {
  f.beat = t < 2500 ? 'walk' : t < 3250 ? 'notice' : t < 6500 ? 'find' : t < 9000 ? 'pickup' : t < 12600 ? 'read' : t < 13800 ? 'show' : 'follow';
  f.shot = t >= 9000 && t < 12600 ? 'shoulder' : 'wide';
  f.readProgress = progress(t, 9000, 12600);
  f.surprise = t >= 2500 && t < 3250;
  f.groundBrochure = t < 6500;
  f.helper = followTrail(t, [
    { at: 0, x: 330, y: 470 }, { at: 2500, x: 475, y: 480, hops: 3 },
    { at: 3250, x: 475, y: 480 }, { at: 5000, x: 650, y: 493, hops: 3 },
    { at: 13400, x: 650, y: 493 }, { at: 15800, x: 740, y: 414, hops: 3 }, { at: 17200, x: 814, y: 367, hops: 2 },
  ], true, motion);
  if (t >= 5000 && t < 5450) f.helper.pose = 'observe';
  else if (t >= 5450 && t < 6500) f.helper.pose = 'beckon';
  else if (t >= 6500 && t < 9000) f.helper.pose = 'point';
  else if (t >= 12600 && t < 13400) f.helper.pose = 'beckon';
  f.helper.flipX = f.helper.pose === 'observe' || f.helper.pose === 'point';
  f.hero = followTrail(t, [
    { at: 0, x: 220, y: 480 }, { at: 2500, x: 365, y: 500 },
    { at: 4100, x: 365, y: 500 }, { at: 6500, x: 548, y: 485 },
    { at: 13800, x: 548, y: 485 }, { at: 16600, x: 735, y: 418 }, { at: 18100, x: 811, y: 369 },
  ], false, motion);
  if (t >= 6500 && t < 7700) { f.hero.pose = 'pick'; f.hero.nextPose = 'lift'; f.hero.blend = smooth(progress(t, 7350, 7700)); }
  else if (t >= 7700 && t < 8500) { f.hero.pose = 'lift'; f.hero.nextPose = 'read'; f.hero.blend = smooth(progress(t, 8150, 8500)); }
  else if (t >= 8500 && t < 13200) f.hero.pose = 'read';
  else if (t >= 13200 && t < 13800) f.hero.pose = 'point';
  for (const actor of [f.hero, f.helper]) {
    actor.caveDepth = progress(actor.x, 765, 815);
    actor.opacity = 1 - smooth(progress(actor.x, 790, 814));
  }
  return f;
}

function jungleClue(f, t, motion) {
  f.beat = t < 2200 ? 'walk' : t < 3000 ? 'notice' : t < 5600 ? 'find' : t < 8000 ? 'show' :
    t < 11600 ? 'follow' : t < 13200 ? 'splash' : t < 15800 ? 'lake' : 'destination';
  f.shot = t >= 5600 && t < 8000 ? 'closeup' : t >= 13200 && t < 15800 ? 'lake' : 'wide';
  f.cameraZoom = f.shot === 'closeup' ? 2.25 : f.shot === 'lake' ? 1.65 : 1;
  f.cameraX = f.shot === 'closeup' ? 405 : f.shot === 'lake' ? 668 : 480;
  f.cameraY = f.shot === 'closeup' ? 425 : f.shot === 'lake' ? 345 : 300;
  f.surprise = (t >= 2200 && t < 3000) || (t >= 12400 && t < 13200);
  f.helper = followTrail(t, [
    { at: 0, x: 245, y: 480 }, { at: 2200, x: 335, y: 490, hops: 3 },
    { at: 3000, x: 335, y: 490 }, { at: 4600, x: 385, y: 485, hops: 2 },
    { at: 8100, x: 385, y: 485 }, { at: 11300, x: 708, y: 395, hops: 5 },
    { at: 11700, x: 708, y: 395 }, { at: 12200, x: 748, y: 374, hops: 1, height: 10 },
    { at: 12400, x: 748, y: 374 }, { at: 13200, x: 705, y: 403, hops: 1, height: 35 },
    { at: 18500, x: 705, y: 403 },
  ], true, motion);
  if (t >= 4600 && t < 4950) f.helper.pose = 'observe';
  else if (t >= 4950 && t < 5750) f.helper.pose = 'beckon';
  else if (t >= 5750 && t < 8000) f.helper.pose = 'point';
  else if (t >= 13200) { f.helper.pose = 'awake'; f.helper.angle = t < 14000 ? Math.sin(t / 65) * 9 * motion : 0; }
  f.hero = followTrail(t, [
    { at: 0, x: 150, y: 495 }, { at: 2200, x: 250, y: 510 },
    { at: 3450, x: 250, y: 510 }, { at: 5550, x: 325, y: 506 },
    { at: 8550, x: 325, y: 506 }, { at: 12100, x: 630, y: 443 }, { at: 18500, x: 630, y: 443 },
  ], false, motion);
  if (t >= 5900 && t < 7750) f.hero.pose = 'inspect';
  else if (t >= 15800) f.hero.pose = 'point';
  f.splash = Math.sin(progress(t, 12200, 12900) * Math.PI);
  f.ripple = progress(t, 12200, 14200);
  f.treasure = .18 + .55 * progress(t, 13200, 15000);
  return f;
}

export function dragonClueFrame(world, milliseconds, reducedMotion = false) {
  const config = DRAGON_CLUES[world] || DRAGON_CLUES.desert;
  const t = Math.max(0, Math.min(config.duration, Number(milliseconds) || 0));
  const motion = reducedMotion ? .25 : 1;
  const f = { time: t, done: t >= config.duration, beat: 'arrive', caption: '', trackCount: DRAGON_TRACKS[world]?.length || 0,
    helper: { x: 280, y: 510, groundY: 510, stretch: 1 }, hero: { x: 150, y: 535, walking: false },
    surprise: false, groundBrochure: false, ripple: 0, splash: 0, treasure: 0,
    shot: 'wide', cameraX: 480, cameraY: 300, cameraZoom: 1,
    fade: Math.max(1 - progress(t, 0, 600), progress(t, config.duration - 650, config.duration)) };
  if (world === 'desert') return desertClue(f, t, motion);
  if (world === 'underground') return undergroundClue(f, t, motion);
  return jungleClue(f, t, motion);
}
