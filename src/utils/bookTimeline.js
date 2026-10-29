// A shot owns one immutable camera. Only actors and paper move.
const shot = (id, from, to, duration, view, extra = {}) => ({ id, from, to, duration, view, ...extra });
export const BOOK_TURN_DURATION = 1200;
export const BOOK_FILMS = {
  intro: [
    shot('moon', -2400, -1, 2400, null, { texture: 'book-moon' }),
    shot('bedroom', 0, 6199, 6200, [220, 0, 500, 600]),
    shot('exterior', 6200, 12799, 6600, [25, 0, 500, 600]),
    shot('wake', 12800, 22699, 9900, [220, 0, 500, 600]),
    shot('menu-title', 22699, 22699, 450, null, { menu: true }),
  ],
  adventure: [
    shot('bedroom', 0, 6199, 6200, [220, 0, 500, 600]),
    shot('exterior', 6200, 12799, 6600, [25, 0, 500, 600]),
    shot('wake', 12800, 22699, 9900, [220, 0, 500, 600]),
    shot('desert-title', 22699, 22699, 4500, null, { title: true, texture: 'book-desert' }),
  ],
  desert: [
    shot('walk', 0, 6199, 6200, [40, 0, 500, 600]),
    shot('tracks', 6200, 9399, 5000, [337, 285, 250, 300]),
    shot('cave', 9400, 18600, 9500, [340, 0, 500, 600]),
    shot('underworld-title', 18600, 18600, 6100, null, { title: true, texture: 'book-underworld' }),
  ],
  underground: [
    shot('find', 0, 8999, 9000, [300, 0, 500, 600]),
    shot('read', 9000, 12599, 4800, null, { texture: 'book-reading' }),
    shot('passage', 12600, 18499, 5900, [440, 0, 500, 600]),
    shot('jungle-title', 18499, 18499, 4500, null, { title: true, texture: 'book-jungle' }),
  ],
  jungle: [
    shot('treasure', 0, 6499, 6500, [460, 0, 500, 600]),
    shot('reach', 6500, 11999, 5500, [662, 235, 275, 330]),
    shot('drift', 12000, 20000, 8000, [460, 0, 500, 600]),
    shot('water-title', 20000, 20000, 4500, null, { title: true, texture: 'book-water' }),
  ],
};
export const bookEase = n => { n = Math.max(0, Math.min(1, n)); return n * n * (3 - 2 * n); };
export function bookIntroCredit(time) {
  const credit=time<6200?{text:'Spielidee von Brucy',from:300,to:3600,x:34,y:76,align:'left'}
    :{text:'Entwickelt mit Onkel Tim',from:6800,to:10400,x:566,y:660,align:'right'};
  return {...credit,alpha:Math.min(bookEase((time-credit.from)/500),bookEase((credit.to-time)/500))};
}
export function bookCoverCrop(view,width=600,height=720) {
  const [x,y,w,h]=view,ratio=width/height;
  const cw=Math.min(w,h*ratio),ch=Math.min(h,w/ratio);
  return [x+(w-cw)/2,y+(h-ch)/2,cw,ch];
}
// One turn before each new spread, including the final menu spread.
const hasTurn = i => i > 0 && i % 2 === 0;
export const bookDuration = film => BOOK_FILMS[film].reduce((sum, s, i) => sum + s.duration + (hasTurn(i) ? BOOK_TURN_DURATION : 0), 0);
export function bookShotStarts(film) {
  let time = 0;
  return BOOK_FILMS[film].map((s, i) => {
    if (hasTurn(i)) time += BOOK_TURN_DURATION;
    const at = time; time += s.duration; return at;
  });
}
export function bookFilmFrame(film, milliseconds) {
  const shots = BOOK_FILMS[film], starts = bookShotStarts(film), duration = bookDuration(film);
  const time = Math.max(0, Math.min(duration, Number(milliseconds) || 0));
  const nextIndex = starts.findIndex((at, i) => hasTurn(i) && time >= at - BOOK_TURN_DURATION && time < at);
  const turning = nextIndex !== -1;
  let index = 0;
  for (let i = 1; i < starts.length; i++) if (time >= starts[i]) index = i;
  if (turning) index = nextIndex - 1;
  const shotTime = i => shots[i].from + (shots[i].to - shots[i].from) *
    Math.max(0, Math.min(1, (time - starts[i]) / shots[i].duration));
  const page = (i, active) => ({ index: i, shot: shots[i],
    time: active ? shotTime(i) : shots[i].to,
    desaturation: active ? 0 : .88 * bookEase((time - starts[i + 1]) / 600),
    // A left page has already been revealed on the back of the turning leaf.
    reveal: active && !hasTurn(i) ? bookEase((time - starts[i]) / 550) : 1, active });
  const leftIndex = index - index % 2, left = page(leftIndex, index === leftIndex && !turning);
  const right = index % 2 ? page(index, !turning) : null;
  const turnStart = turning ? starts[nextIndex] - BOOK_TURN_DURATION : 0;
  if (turning) {
    left.desaturation = .88;
    right.desaturation = .88 * bookEase((time - turnStart) / 450);
    right.time = shots[index].to;
  }
  return { time, duration, index, left, right, sourceTime: turning ? shots[index].to : shotTime(index),
    turn: turning ? bookEase((time - turnStart) / BOOK_TURN_DURATION) : null,
    next: turning ? { ...page(nextIndex, true), time: shots[nextIndex].from, reveal: 1 } : null,
    done: time >= duration };
}
// The same actor clock drives both intro variants, so the wake-up mix never
// drifts when a new opening page or a page turn is inserted.
export function bookIntroMusicMix(sourceTime) {
  const awake = bookEase((sourceTime - 17600) / 2100);
  return { sleep: .2 * (1 - awake), title: .35 * awake };
}

const progress = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const mix = (a, b, p) => a + (b - a) * p;
export const JUNGLE_BOOK_CUES = [[900, 'hop'], [1900, 'hop'], [2600, 'chime'], [3400, 'hop'],
  [4400, 'hop'], [5400, 'hop'], [8300, 'splash'], [10400, 'splash'], [14100, 'chime']];
export function jungleTreasureFrame(time, reducedMotion = false) {
  const t = Math.max(0, Math.min(20000, time)), motion = reducedMotion ? .25 : 1;
  const arrive = bookEase(progress(t, 0, 2300)), approach = bookEase(progress(t, 3000, 6100));
  const retreat = bookEase(progress(t, 8300, 19500));
  const groundY = mix(425, 401, approach), hop = t >= 3000 && t < 6100 ? Math.abs(Math.sin(approach * Math.PI * 4)) * 22 * motion
    : t >= 7000 && t < 10000 ? Math.abs(Math.sin(progress(t, 7000, 10000) * Math.PI * 3)) * 10 * motion : 0;
  return {
    time: t, surprise: t >= 2600 && t < 3400, bubbles: progress(t, 7800, 8600),
    chest: { x: mix(mix(850, 744, bookEase(progress(t, 0, 6000))), 925, retreat),
      y: mix(mix(300, 356, bookEase(progress(t, 0, 6000))), 238, retreat) + Math.sin(t / 410) * 2 * motion,
      size: 62 - retreat * 21, angle: Math.sin(t / 520) * 4 * motion },
    hero: { x: mix(460, 610, arrive), y: mix(490, 450, arrive), walking: t < 2300, pose: t >= 13500 ? 'point' : null },
    helper: { x: mix(mix(540, 642, arrive), 705, approach), y: mix(465, groundY, arrive) - hop,
      groundY: mix(465, groundY, arrive), stretch: 1 + hop / 400,
      pose: t >= 6100 && t < 11700 ? 'point' : t >= 13500 ? 'observe' : 'hop',
      angle: t >= 6500 && t < 11700 ? 8 * motion : 0 },
  };
}
