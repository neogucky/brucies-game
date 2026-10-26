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
  { id: 'normal', title: 'Der schnelle Schlag', holdMs: 75, text: 'Tippe {attack} nur kurz an und lass gleich los. So haust du auch beim Springen Steine weg.' },
  { id: 'quick', title: 'Gelbe Funken', holdMs: 400, text: 'Halte {attack}, bis gelbe Blitze am Hammer tanzen. Lass dann los: ein schneller, verstärkter Schlag!' },
  { id: 'power', title: 'Der Power-Schlag', holdMs: 1050, text: 'Halte {attack}, bis die Blitze rot leuchten, und lass dann los. Das gibt ordentlich Wumms!' },
  { id: 'super', title: 'Der Super-Power-Schlag', holdMs: 1750, text: 'Warte auf die blauen Blitze und lass los. Jetzt trifft auch die kleine Druckwelle Gegner um dich herum!' },
  { id: 'slam', title: 'Der Sprung-Hammerschlag', holdMs: 0, text: 'Springe mit {jump} und drücke in der Luft ↓. Bei der Landung kracht dein Hammer auf den Boden!' },
];
export function hammerTrainingFeedback(expected, actual, hit = true) {
  if (!hit) return 'Fast! Geh an die Markierung vor der Puppe. Dein Hammer muss sie auch erreichen. Ich zeige es noch einmal.';
  if (expected === actual) return null;
  if (expected === 'slam') return 'Für den Sprung-Hammerschlag springst du zuerst und drückst dann in der Luft nach unten. Schau noch einmal zu!';
  const rank = { normal: 0, quick: 1, power: 2, super: 3 };
  const tooLong = (rank[actual] ?? 0) > rank[expected];
  const cue = { normal: 'Tippe nur kurz an und lass gleich los', quick: 'Lass schon bei den gelben Blitzen los',
    power: 'Lass genau bei den roten Blitzen los', super: 'Warte auf die blauen Blitze und lass dann los' }[expected];
  return (tooLong ? 'Das war zu lange aufgeladen. ' : 'Das war noch zu kurz aufgeladen. ')
    + cue + '. Ich mache es dir noch einmal vor!';
}
