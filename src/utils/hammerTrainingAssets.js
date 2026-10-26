import { registerMeleeBodyRow } from './MeleeAnimation.js';

// Each pose shares a boot anchor. The open shoulder socket takes the same
// articulated hammer arm as the hero, so the trainer demonstrates real swings.
const COACH_CUTS = [
  [68, 77, 404, 605, 270, 675, 120, 350],
  [569, 104, 434, 578, 790, 675, 610, 372],
  [1079, 157, 433, 525, 1300, 675, 1121, 417],
];

export function registerHammerTrainingTextures(scene) {
  if (scene.textures.exists('training-dummy')) return;
  const atlas = scene.textures.get('hammer-coach-civilian').getSourceImage();
  const assets = scene.registry.get('melee-animation-assets');
  assets.bodies['trainer-stand'] = registerMeleeBodyRow(scene, atlas, COACH_CUTS, 'trainer-stand', .225);
  const cutPart = (id, rect, pivot, end, height, wristRatio) => {
    const [x, y, width, sourceHeight] = rect, key = 'melee-trainer-' + id;
    const texture = scene.textures.createCanvas(key, width, sourceHeight);
    texture.getContext().drawImage(atlas, x, y, width, sourceHeight, 0, 0, width, sourceHeight); texture.refresh();
    const dx = pivot[0] - end[0], dy = end[1] - pivot[1];
    return { key, originX: (pivot[0] - x) / width, originY: (pivot[1] - y) / sourceHeight,
      length: Math.hypot(dx, dy), angle: Math.atan2(dy, dx), height, wristRatio };
  };
  assets.trainerParts = { ...assets.parts,
    upper: cutPart('upper', [140, 762, 292, 192], [173, 864], [402, 858], 192),
    forearm: cutPart('forearm', [621, 793, 314, 153], [895, 869], [653, 874], 153),
    hand: cutPart('hand', [1181, 797, 227, 155], [1378, 877], [1242, 877], 155, 1.1),
  };
  const texture = scene.textures.createCanvas('training-dummy', 150, 190);
  const dummyAtlas = scene.textures.get('hammer-training-atlas').getSourceImage();
  texture.getContext().drawImage(dummyAtlas, 704, 635, 484, 585, 3, 2, 144, 186);
  texture.refresh();
}
