export const INTRO_DURATION = 27800;
export const INTRO_JUMP = { prepare: 20000, launch: 20450, land: 21700, settle: 22300 };
// Coordinates are in the 960 × 600 film frame. Only this patch of the room's
// wooden floor receives the projected silhouette from the open window.
export const INTRO_FLOOR_LIGHT = [
  { x: 443, y: 478 }, { x: 719, y: 444 }, { x: 944, y: 526 }, { x: 579, y: 572 },
];
// Foreground pieces are copied from the same exterior painting, above the
// flying layer: nearby window masonry, then the two closest castle towers.
export const INTRO_EXTERIOR_FOREGROUND = [
  [{x:0,y:0},{x:170,y:0},{x:149,y:36},{x:128,y:91},{x:109,y:150},{x:90,y:232},
    {x:82,y:320},{x:86,y:400},{x:96,y:477},{x:178,y:490},{x:272,y:514},
    {x:384,y:539},{x:506,y:568},{x:670,y:600},{x:0,y:600}],
  [{x:77,y:272},{x:97,y:233},{x:134,y:190},{x:151,y:173},{x:152,y:137},
    {x:155,y:137},{x:155,y:145},{x:191,y:151},{x:188,y:165},{x:156,y:159},
    {x:155,y:174},{x:174,y:206},{x:209,y:238},{x:240,y:260},{x:225,y:274},{x:226,y:455},{x:77,y:455}],
  [{x:236,y:354},{x:252,y:319},{x:280,y:295},{x:284,y:269},{x:288,y:269},
    {x:288,y:276},{x:310,y:279},{x:309,y:290},{x:288,y:285},{x:287,y:295},
    {x:300,y:312},{x:323,y:330},{x:346,y:347},{x:333,y:355},{x:333,y:455},{x:236,y:455}],
];
export const INTRO_CUES = [
  [400, 'snore'], [1300, 'snore'], [2000, 'whoosh'],
  [3200, 'hop'], [3800, 'hop'], [4500, 'hop'],
  [6500, 'whoosh'], [8100, 'whoosh'], [9700, 'whoosh'], [11300, 'whoosh'],
  [13100, 'hop'], [14600, 'hop'], [15400, 'boing'], [16300, 'boing'], [17200, 'boing'],
  [18000, 'yawn'], [20450, 'hop'], [21700, 'chime'],
];

const clamp = n => Math.max(0, Math.min(1, n));
const progress = (time, start, end) => clamp((time - start) / (end - start));
const smooth = n => n * n * (3 - 2 * n);
const mix = (a, b, p) => a + (b - a) * p;
const fade = (time, start, end, duration = 500) => Math.min(progress(time, start, start + duration), 1 - progress(time, end - duration, end));
function hop(from, to, p, count, height) {
  const groundY = mix(from.y, to.y, smooth(p));
  const lift = Math.abs(Math.sin(p * count * Math.PI));
  return { x: mix(from.x, to.x, smooth(p)), y: groundY - lift * height, groundY, stretch: 1 + lift * .08 };
}

// Rendering and audio share this clock, so pausing never skips a story beat.
export function getIntroFrame(milliseconds, reducedMotion = false) {
  const t = Math.max(0, Math.min(INTRO_DURATION, Number(milliseconds) || 0));
  const motion = reducedMotion ? .45 : 1;
  const outside = t >= 6200 && t < 12800;
  const f = {
    time: t, stage: outside ? 'exterior' : 'bedroom', beat: 'sleep',
    occupant: { visible: !outside, pose: 'sleep', x: 220, y: 365, angle: 0, scaleX: 1,
      scaleY: 1 + Math.sin(t / 650) * .009 * motion },
    helper: { x: 625, y: 526, groundY: 526, pose: 'sleep', stretch: 1 + Math.sin(t / 650) * .025 },
    knight: { visible: false, x: 565, y: 535, pose: 'ready', angle: 0, scaleX: 1, scaleY: 1, behindBed: false },
    shadow: { x: mix(310, 1010, progress(t, 2000, 3800)), y: 516,
      width: 370, height: 94, angle: -10, frame: Math.floor(t / 280) % 2,
      alpha: fade(t, 2000, 3800, 250) * .38 },
    dragon: { x: mix(-260, 1250, progress(t, 6200, 12600)), y: 183 + Math.sin(t / 450) * 8 * motion,
      width: 430, height: 320, frame: Math.floor(t / 280) % 2 },
    credit: '', creditAlpha: 0, titleAlpha: progress(t, 22700, 23900),
    transition: Math.max(fade(t, 5850, 6550, 350), fade(t, 12450, 13150, 350), progress(t, 27300, INTRO_DURATION)),
    musicVolume: .2 * Math.min(progress(t, 0, 1000), 1 - progress(t, 25800, INTRO_DURATION)),
    helperSurprised: t >= 2500 && t < 3100,
    done: t >= INTRO_DURATION,
  };
  if (t >= 300 && t <= 3600) { f.credit = 'Spielidee von Brucy'; f.creditAlpha = fade(t, 300, 3600); }
  if (t >= 6800 && t <= 10400) { f.credit = 'Entwickelt mit Onkel Tim'; f.creditAlpha = fade(t, 6800, 10400); }
  if (t >= 2500) { f.beat = 'shadow'; f.helper.pose = 'awake'; }
  if (t >= 3100 && t < 4200) {
    f.beat = 'window'; f.helper = { ...hop({ x: 625, y: 526 }, { x: 665, y: 526 }, progress(t, 3100, 4200), 2, 42 * motion), pose: 'hop' };
  } else if (t >= 4200 && t < 6200) {
    f.beat = 'window'; f.helper = { ...hop({ x: 665, y: 526 }, { x: 764, y: 370 }, progress(t, 4200, 5800), 1, 95 * motion), pose: t >= 5800 ? 'peek' : 'hop' };
  } else if (outside) {
    f.beat = 'dragon'; f.helper = { x: 112, y: 494, groundY: 494, pose: 'peek', stretch: 1 + Math.sin(t / 230) * .015 * motion };
  } else if (t >= 12800 && t < 14400) {
    f.beat = 'return'; f.helper = { ...hop({ x: 764, y: 370 }, { x: 465, y: 510 }, progress(t, 12900, 14400), 1, 80 * motion), pose: 'hop' };
  } else if (t >= 14400 && t < 15300) {
    f.beat = 'wake'; f.helper = { ...hop({ x: 465, y: 510 }, { x: 280, y: 405 }, progress(t, 14400, 15300), 1, 90 * motion), pose: 'hop' };
  } else if (t >= 15300 && t < 18300) {
    f.beat = 'wake'; f.helper = { ...hop({ x: 280, y: 405 }, { x: 280, y: 405 }, progress(t, 15300, 18300), 3, 65 * motion), pose: 'hop' };
  } else if (t >= 18300 && t < 20300) {
    f.beat = 'yawn'; f.helper = { ...hop({ x: 280, y: 405 }, { x: 430, y: 515 }, progress(t, 18300, 20000), 2, 55 * motion), pose: 'awake' };
  } else if (t >= 20300) {
    f.beat = 'ready'; f.helper = { ...hop({ x: 430, y: 515 }, { x: 695, y: 535 }, progress(t, 20300, 22000), 2, 70 * motion), pose: 'hop' };
  }
  if (t >= 17600) f.occupant.pose = 'yawn';
  if (t >= 19300) f.occupant.pose = 'awake';
  if (t >= INTRO_JUMP.prepare) {
    const p = progress(t, INTRO_JUMP.prepare, INTRO_JUMP.launch);
    f.occupant.pose = 'prepare'; f.occupant.x += smooth(p) * 25;
    f.occupant.y += Math.sin(p * Math.PI) * 7 * motion;
    f.occupant.scaleX = 1 + Math.sin(p * Math.PI) * .025 * motion;
    f.occupant.scaleY = 1 - Math.sin(p * Math.PI) * .06 * motion;
    f.occupant.angle = Math.sin(p * Math.PI) * 3 * motion;
  }
  if (t >= INTRO_JUMP.launch) {
    f.occupant.visible = false;
    const p = progress(t, INTRO_JUMP.launch, INTRO_JUMP.land);
    const flight = hop({ x: 245, y: 430 }, { x: 565, y: 535 }, p, 1, 110 + 35 * motion);
    f.knight = { ...f.knight, ...flight, visible: true,
      pose: p < .2 ? 'push' : p < .75 ? 'air' : 'ready',
      angle: Math.sin(p * Math.PI * 2) * 9 * motion,
      scaleX: 1 - Math.sin(p * Math.PI) * .025 * motion,
      scaleY: 1 + Math.sin(p * Math.PI) * .04 * motion,
      behindBed: p < .5 && flight.y > 365 };
    if (f.knight.pose === 'air') f.knight.scaleY *= mix(.9, 1, progress(t, INTRO_JUMP.launch + 250, INTRO_JUMP.launch + 410));
    if (t >= INTRO_JUMP.land) {
      const impact = Math.sin(progress(t, INTRO_JUMP.land, INTRO_JUMP.land + 280) * Math.PI);
      f.knight.pose = t < INTRO_JUMP.land + 300 ? 'land' : 'ready';
      f.knight.scaleX = 1 + impact * .08 * motion; f.knight.scaleY = 1 - impact * .1 * motion;
      if (t >= INTRO_JUMP.land + 300 && t < INTRO_JUMP.settle) {
        const rise = smooth(progress(t, INTRO_JUMP.land + 300, INTRO_JUMP.settle));
        f.knight.scaleX = mix(1.05, 1, rise); f.knight.scaleY = mix(.8, 1, rise);
      }
      if (t >= INTRO_JUMP.settle) f.knight.scaleY = 1 + Math.sin((t - INTRO_JUMP.settle) / 650) * .008 * motion;
    }
  }
  f.sleepSymbols = [0, 1, 2].map(i => {
    const p = (t / 1900 + i / 3) % 1;
    return { x: 245 + p * 95, y: 290 - p * 140, scale: .8 + p * .5,
      alpha: !outside && t < 17600 ? Math.sin(p * Math.PI) * .9 * (1 - progress(t, 17300, 17600)) : 0 };
  });
  return f;
}

export function introCuesBetween(previous, next) {
  return INTRO_CUES.filter(([at]) => previous < at && at <= next);
}

export function introReturnScene() {
  return 'MainMenuScene';
}
