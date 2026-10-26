// Film coordinates measured on the two gold carpet borders. Furniture shares
// this ground plane; post columns stay vertical when the sprite is registered.
export const INTRO_RUG_BORDERS = {
  upper: { slope: .19958 * 600 * 1586 / (992 * 960), intercept: 682.92 * 600 / 992 },
  lower: { slope: .27848 * 600 * 1586 / (992 * 960), intercept: 823.09 * 600 / 992 },
};
export const INTRO_BED_FEET = {
  headFar: { x: 277.73, y: 468.44 }, headNear: { x: 470.02, y: 506.79 },
  footNear: { x: 243.12, y: 565.49 }, footFar: { x: 43.57, y: 509.96 },
};
// Opaque bottom pixels of the three visible posts in bed-rug-aligned.png.
export const INTRO_BED_SOURCE_FEET = [{ x: 136, y: 821 }, { x: 724.5, y: 961 }, { x: 1369.5, y: 790 }];
const visibleFeet = [INTRO_BED_FEET.footFar, INTRO_BED_FEET.footNear, INTRO_BED_FEET.headNear];
function solveThree(rows, values) {
  const a = rows.map((row, i) => [...row, values[i]]);
  for (let i = 0; i < 3; i++) {
    let pivot = i;
    for (let j = i + 1; j < 3; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const divisor = a[i][i];
    if (Math.abs(divisor) < 1e-10) throw new Error('Degenerate intro bed anchors');
    a[i] = a[i].map(v => v / divisor);
    for (let j = 0; j < 3; j++) if (j !== i) {
      const factor = a[j][i]; a[j] = a[j].map((v, k) => v - factor * a[i][k]);
    }
  }
  return a.map(row => row[3]);
}
export function fitUprightBedProjection(source = INTRO_BED_SOURCE_FEET, target = visibleFeet) {
  const [a, c, g] = solveThree(source.map(({ x }, i) => [x, 1, -target[i].x * x]), target.map(p => p.x));
  const [d, e, f] = solveThree(source.map(({ x, y }) => [x, y, 1]), source.map(({ x }, i) => target[i].y * (g * x + 1)));
  return { a, c, g, d, e, f };
}
export function projectIntroBedPoint(matrix, x, y) {
  const denominator = matrix.g * x + 1;
  return { x: (matrix.a * x + matrix.c) / denominator,
    y: (matrix.d * x + matrix.e * y + matrix.f) / denominator };
}
export const INTRO_BED_PROJECTION = fitUprightBedProjection();
