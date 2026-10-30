# Level movement artwork

Generated with the built-in ImageGen tool, transparent PNG mode, using the existing knight and helper designs as visual references. No external animation runtime is required. `frames.json` records measured separate silhouettes rather than assuming that the generated atlas has perfectly even gutters. `tools/inspect-motion-atlases.py` only measures the original files; the game registers cutouts with Canvas at load time.

## Runtime assets

- `knight-rig.png`: four torsos (male/female, upright/running), separate near/far thighs, shins and boots, plus joint plates. The two feet have opposite planted/swing phases. The running gait has a longer stride, higher feet and a forward torso lean.
- `knight-poses.png`: sixteen poses for each character: neutral, blink, looking, helmet adjustment, stretching, half crouch, crouch, jump compression, rise, apex, fall, landing compression, recovery, glove inspection, looking at the helper and stretch finish.
- `helper-actions.png`: calm/blink/look/yawn/wiggle/wave; six hop poses; sniff/discover/pick up/carry/offer/celebrate; concern/anger/windup/dash/impact/recover.
- `knight-locomotion.png`: original illustrated eight-frame walking/running candidate, retained as the fallback pose sequence. The final normal gait uses the separate limbs so that the same leg cannot always lead.
- `../../scenery/healing-berry.png`: painted red healing berry with green leaves, replacing the old red circle.

The original generated files remain under the task's generated-images directory. Source identifiers: poses `8d4d96a9-e7a3-44fc-95b3-5db248223387`, locomotion `ef3dc751-bcfc-4258-80bb-c33f2ed927e5`, helper `8e039e00-99b6-4feb-b674-c5a0484a96ba`, rig `e10cb149-8dba-4c68-9d0e-f09f068f0dd6`, berry `32950a03-7c5a-4763-b05c-00a75e75b12e`.

## Generation briefs

Pose atlas brief: transparent 8-column by 4-row atlas, male poses in the first two rows and female poses in the last two rows. All characters face left, wear matching silver/blue armor, a blue plume and red cape, and hold no weapon or shield. Sixteen distinct full-body poses cover idle gestures, crouch, rising, apex, falling and landing, with consistent proportions and clear silhouettes.

Helper atlas brief: transparent 6-column by 4-row atlas of the existing cute yellow helper, round yellow body, dark antenna tips and orange cheeks. The four rows cover quiet idles, bouncy locomotion, gathering/delivering a red berry, and a clearly announced protective pounce. Keep the face friendly even when determined; no weapons, captions or scenery.

Final helper transparency edit prompt:

> Keep every character drawing and every pose in exactly the same 6 columns by 4 rows sprite atlas layout. Remove ALL brown/golden background, ALL glow, ALL haze and ALL drop shadows from behind and between the characters. Background must be completely transparent alpha=0 everywhere outside the actual crisp yellow character silhouette. No checkerboard texture, no colored gradient. Preserve clean opaque character colors and dark outlines. Do not move, resize, crop, merge, or alter the 24 separate poses. Output transparent PNG.

Final rig generation prompt:

> Create a TRANSPARENT PNG production sprite-parts atlas for a 2D storybook platform game. Exactly 4 columns x 3 rows, generous transparent gutters, each object isolated and not touching. Match the knight in the reference precisely: friendly child knight, silver/blue plate armor, blue plume, red cape, brown boots/gloves, warm painted outlined cartoon. ALL parts face LEFT. NO weapons, NO shields, NO text, NO ground, NO shadows, NO glow. Top row has four UPPER-BODY cutouts, STOPPING CLEANLY AT THE BELT/WAIST, NO LEGS AT ALL: male upright upper body; male running forward lean upper body; female blonde ponytail upright upper body; female running forward lean upper body. Include both arms, with front fist resting at waist height in all four torsos, not raised to face. Show full plume and full cape behind torso, but the body itself stops at the belt. Second row has four separate limb components: near armored THIGH from hip joint to knee, far armored THIGH from hip joint to knee, near armored SHIN from knee to ankle, far armored SHIN from knee to ankle. These are individual slender silver plate armoured legs with blue fabric joints and rounded overlapping plates, vertical neutral orientation, each fully disconnected. Third row: near brown BOOT facing LEFT; far brown BOOT facing LEFT; small circular silver KNEECAP plate; blue fabric round HIP joint. No complete legs in any cell. This is a reusable skeletal animation puppet: smooth motion will come from rotating thighs/shins/boots separately. Crisp fully opaque artwork, pure transparent background outside every object. Keep male/female identical costume proportions. 1536x1152.

Berry brief: single red healing berry, two green leaves, chunky painted outlines matching the existing game, isolated on a transparent background.

## Motion direction and review

The gait is drawn separately from the original 150×150 physics host. Feet, weapon grip and shoulder are explicit anchors; changing a picture never changes a collider. Armor widths and glove sizes stay constant during foreshortening. Attack reach, damage, switch delay and charge thresholds retain their existing rules.

The attack revision follows the weight/anticipation/body-chain principles described by [Animation Mentor](https://www.animationmentor.com/blog/animation-tips-tricks-what-makes-or-breaks-a-good-body-mechanics-shot/) and [their anticipation guide](https://www.animationmentor.com/blog/anticipation-the-12-basic-principles-of-animation/). Layering torso and leg motion is also illustrated by the [official Spineboy example](https://en.esotericsoftware.com/spine-examples-spineboy); the game does not depend on Spine.

`tests/level-animation-review.html` loads the production HTML, modules and assets into an iframe with a memory-only save. It provides real-key action probes and production-rendered pose galleries. Only that review page suppresses focus auto-pause. Production focus/pause behavior and the player's saved game remain unchanged.

Original action sounds are generated reproducibly with `tools/generate-motion-sounds.py`; ordinary footsteps use a low volume, while running, landing, cloth movement, bow release, hammer movement and helper cues have separate sounds.

## Proportions correction

Walking/running thighs and shins retain uniform scaling in both axes. Boots also keep their painted aspect ratio; the ankle pivot is at 42% of the cutout height so the original boot cuff does not change the planted sole. No fixed narrow armor width is applied.

The final upper/lower legs are cut directly from the same standing-pose artwork in `knight-poses.png`, retaining its armor silhouette. Walking and running use identical upper/lower bone lengths and only vary stride/lift. The torso/boots still come from `knight-rig.png`.
