export const INTRO_DURATION = 30500;
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
  [600, 'snore'], [3100, 'snore'], [4700, 'whoosh'],
  [5900, 'hop'], [6500, 'hop'], [7200, 'hop'],
  [9200, 'whoosh'], [10800, 'whoosh'], [12400, 'whoosh'], [14000, 'whoosh'],
  [15800, 'hop'], [17300, 'hop'], [18100, 'boing'], [19000, 'boing'], [19900, 'boing'],
  [20700, 'yawn'], [23200, 'hop'], [24500, 'chime'],
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
  const outside = t >= 8900 && t < 15500;
  const f = {
    time: t, stage: outside ? 'exterior' : 'bedroom', beat: 'sleep', bedPose: 'sleep',
    helper: { x: 625, y: 526, groundY: 526, pose: 'sleep', stretch: 1 + Math.sin(t / 650) * .025 },
    knight: { visible: false, x: 510, y: 535 },
    shadow: { x: mix(310, 1010, progress(t, 4700, 6500)), y: 516,
      width: 370, height: 94, angle: -10, frame: Math.floor(t / 280) % 2,
      alpha: fade(t, 4700, 6500, 250) * .38 },
    dragon: { x: mix(-260, 1250, progress(t, 8900, 15300)), y: 183 + Math.sin(t / 450) * 8 * motion,
      width: 430, height: 320, frame: Math.floor(t / 280) % 2 },
    credit: '', creditAlpha: 0, titleAlpha: progress(t, 25400, 26600),
    transition: Math.max(fade(t, 8550, 9250, 350), fade(t, 15150, 15850, 350), progress(t, 30000, INTRO_DURATION)),
    musicVolume: .2 * Math.min(progress(t, 0, 1000), 1 - progress(t, 28500, INTRO_DURATION)),
    done: t >= INTRO_DURATION,
  };
  if (t >= 1000 && t <= 4300) { f.credit = 'Spielidee von Brucy'; f.creditAlpha = fade(t, 1000, 4300); }
  if (t >= 9500 && t <= 13100) { f.credit = 'Entwickelt mit Onkel Tim'; f.creditAlpha = fade(t, 9500, 13100); }
  if (t >= 5200) { f.beat = 'shadow'; f.helper.pose = 'awake'; }
  if (t >= 5800 && t < 6900) {
    f.beat = 'window'; f.helper = { ...hop({ x: 625, y: 526 }, { x: 665, y: 526 }, progress(t, 5800, 6900), 2, 42 * motion), pose: 'hop' };
  } else if (t >= 6900 && t < 8900) {
    f.beat = 'window'; f.helper = { ...hop({ x: 665, y: 526 }, { x: 764, y: 370 }, progress(t, 6900, 8500), 1, 95 * motion), pose: t >= 8500 ? 'peek' : 'hop' };
  } else if (outside) {
    f.beat = 'dragon'; f.helper = { x: 112, y: 494, groundY: 494, pose: 'peek', stretch: 1 + Math.sin(t / 230) * .015 * motion };
  } else if (t >= 15500 && t < 17100) {
    f.beat = 'return'; f.helper = { ...hop({ x: 764, y: 370 }, { x: 465, y: 510 }, progress(t, 15600, 17100), 1, 80 * motion), pose: 'hop' };
  } else if (t >= 17100 && t < 18000) {
    f.beat = 'wake'; f.helper = { ...hop({ x: 465, y: 510 }, { x: 280, y: 405 }, progress(t, 17100, 18000), 1, 90 * motion), pose: 'hop' };
  } else if (t >= 18000 && t < 21000) {
    f.beat = 'wake'; f.helper = { ...hop({ x: 280, y: 405 }, { x: 280, y: 405 }, progress(t, 18000, 21000), 3, 65 * motion), pose: 'hop' };
  } else if (t >= 21000 && t < 23000) {
    f.beat = 'yawn'; f.helper = { ...hop({ x: 280, y: 405 }, { x: 430, y: 515 }, progress(t, 21000, 22700), 2, 55 * motion), pose: 'awake' };
  } else if (t >= 23000) {
    f.beat = 'ready'; f.helper = { ...hop({ x: 430, y: 515 }, { x: 695, y: 535 }, progress(t, 23000, 24700), 2, 70 * motion), pose: 'hop' };
  }
  if (t >= 20300) f.bedPose = 'yawn';
  if (t >= 22000) f.bedPose = 'awake';
  if (t >= 23150) {
    f.bedPose = 'empty';
    f.knight = { visible: true, ...hop({ x: 235, y: 450 }, { x: 510, y: 535 }, progress(t, 23150, 24700), 1, 110 * motion) };
  }
  return f;
}

export function introCuesBetween(previous, next) {
  return INTRO_CUES.filter(([at]) => previous < at && at <= next);
}

export function introReturnScene() {
  return 'MainMenuScene';
}
