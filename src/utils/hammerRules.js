export const HAMMER_CHARGE = { quickMs: 180, powerMs: 750, superMs: 1500, moveFactor: .8, waveRadius: 76 };
export const HAMMER_STAGES = {
  normal: { id: 'normal', label: 'Schneller Schlag', color: 0xcbdfe8 },
  quick: { id: 'quick', label: 'Geladen', color: 0xffdf52 },
  power: { id: 'power', label: 'Power', color: 0xff6253 },
  super: { id: 'super', label: 'Super Power', color: 0x67d8ff },
};
export function hammerAttackForHold(milliseconds = 0) {
  const holdMs = Math.max(0, Number.isFinite(milliseconds) ? milliseconds : 0), c = HAMMER_CHARGE;
  const id = holdMs < c.quickMs ? 'normal' : holdMs < c.powerMs ? 'quick' : holdMs < c.superMs ? 'power' : 'super';
  const multiplier = id === 'normal' ? 1 : id === 'quick'
    ? 1.25 + .75 * (holdMs - c.quickMs) / (c.powerMs - c.quickMs)
    : id === 'power' ? 2 + (holdMs - c.powerMs) / (c.superMs - c.powerMs) : 3;
  return { ...HAMMER_STAGES[id], holdMs, multiplier, charged: id !== 'normal', superCharge: id === 'super',
    progress: Math.min(1, holdMs / c.superMs) };
}
export function hammerTrainingState(save = {}) {
  return { offered: Boolean(save.tutorials?.powerHammer?.offered), completed: Boolean(save.tutorials?.powerHammer?.completed) };
}
export function withHammerTrainingState(save, changes) {
  return { ...save, tutorials: { ...save.tutorials, powerHammer: { ...hammerTrainingState(save), ...changes } } };
}
export const HAMMER_DRILLS = [
  { id: 'normal', title: 'Der normale Schlag', holdMs: 110, keys: ['attack'],
    text: 'Tippe {attack} kurz an und lass los. Triff die Puppe vor dir!',
    success: 'Genau! Ein kurzer Tipp, ein schneller Schlag.' },
  { id: 'super', title: 'Volle Hammerkraft', holdMs: 1750, keys: ['attack'],
    text: 'Halte {attack}, bis die Blitze blau leuchten. Lass dann los – das gibt einen Riesen-Krach!',
    success: 'Wunderbar! Ganz aufgeladen! Der Schlag macht sogar eine Druckwelle.' },
  { id: 'slam', title: 'Der Sprungschlag', holdMs: 0, keys: ['up', 'down'],
    text: 'Springe zuerst mit {jump}. Drücke dann in der Luft {down}. Bei der Landung kracht es!',
    success: 'Saubere Landung! Jetzt kannst du alle drei Angriffe.' },
];

// The displayed keys and the mentor's movement use the same jump timeline.
export const HAMMER_JUMP_DEMO = { jumpPressMs: 140, slamAtMs: 340, downPressMs: 140, landAtMs: 600, endMs: 1500 };
export function hammerJumpDemonstration(milliseconds) {
  const t = Math.max(0,milliseconds), timing = HAMMER_JUMP_DEMO;
  const rising = Math.min(1,t/timing.slamAtMs);
  const falling = Math.max(0,Math.min(1,(t-timing.slamAtMs)/(timing.landAtMs-timing.slamAtMs)));
  return { up: t < timing.jumpPressMs,
    down: t >= timing.slamAtMs && t < timing.slamAtMs+timing.downPressMs,
    height: t < timing.slamAtMs ? 105*Math.sin(rising*Math.PI/2) : 105*(1-falling*falling),
    slamming: t >= timing.slamAtMs && t < timing.landAtMs, landed: t >= timing.landAtMs };
}
export function hammerTrainingFeedback(expected, actual, hit = true) {
  if (!hit) return 'Fast! Geh an die Markierung vor der Puppe. Dein Hammer muss sie auch erreichen. Ich zeige es noch einmal.';
  if (expected === actual) return null;
  if (expected === 'slam') return 'Für den Sprung-Hammerschlag springst du zuerst und drückst dann in der Luft nach unten. Schau noch einmal zu!';
  if (actual === 'slam') return 'Das war ein Sprungschlag! Diesmal üben wir mit beiden Füßen auf dem Boden. Schau noch einmal zu.';
  const rank = { normal: 0, quick: 1, power: 2, super: 3 };
  const tooLong = (rank[actual] ?? 0) > rank[expected];
  const cue = { normal: 'Tippe nur kurz an und lass gleich los', quick: 'Lass schon bei den gelben Blitzen los',
    power: 'Lass genau bei den roten Blitzen los', super: 'Warte auf die blauen Blitze und lass dann los' }[expected];
  return (tooLong ? 'Das war zu lange aufgeladen. ' : 'Das war noch zu kurz aufgeladen. ')
    + cue + '. Ich mache es dir noch einmal vor!';
}
