# Book-film artwork

Generated on 2026-10-29 with the built-in image generation tool (no fallback CLI).
These assets are used by the production intro, story films and cinema.
Character animation uses the existing game sprites; page geometry and animation are rendered in code.

## Files

- `open-book.png`: blank book shared by all films and cinema. Edit reference: `../common/menu/adventure-book.png`.
- `underworld-page.png`: underground chapter illustration. Style reference: `../common/menu/adventure-book.png`.
- `jungle-page.png`: jungle chapter illustration. Style reference: `underworld-page.png`.
- `water-page.png`: water chapter illustration. Style reference: `underworld-page.png`.
- `jungle-shore.png`: clean shore for the floating-chest animation. Edit reference: `../story/jungle-shore.jpg`.

## Exact prompts

### Empty book

Use case: precise-object-edit
Asset type: reusable empty open-storybook background for animated game story pages.
Input image is the edit target.
Keep exactly the same framing, book position, page geometry, wood desk, candle, quill, red cloth cover and red bottom spine bookmark. Remove ALL of the illustration on the LEFT page: remove knight, companion, dragon, castle and landscape and replace seamlessly with blank warm cream parchment matching the RIGHT page. Both left and right pages must now be blank parchment ready for animated illustrations. Remove the large top and bottom central crowns on the right page, keeping only a subtle thin hand-painted ornamental border. Give the left page the same fine restrained border. No text or symbols in the page interiors. Preserve paper texture, fold shading and slight curvature. Landscape 8:5. Do not add anything; no characters, no lettering, no watermarks. This is a clean background asset, not a mockup with controls.

### Underground chapter

Use case: illustration-story
Asset type: portrait chapter illustration for the RIGHT page of a children's illustrated adventure book, roughly 4:5 proportions.
Input image is a style reference for the clear, colorful, painterly shapes, not an edit target. Produce ONE standalone page illustration, not another image of a book.
A beautiful mildly spooky underground cavern: inviting but mysterious, deep blue and teal stone arching overhead, stalactites, a winding descending stone footpath toward a small warm amber light deep inside. Gentle glowing purple and blue crystals, a few warm gold coins partly hidden beside a rock. Strong depth, clear shapes, child-friendly adventure, no horror. No characters, no dragon.
The painted illustration occupies the upper four-fifths, with irregular soft watercolor-like edges blending into warm cream parchment. At the bottom, a clean readable chapter wordmark in one line, exact text "Untergrundwelt", big bold playful rounded storybook lettering, warm golden yellow with dark deep-teal outline and a restrained amber shade, matching the game title style. No other text. Leave generous safe margins for placing the entire illustration inside a real book page. No book binding or desk, no external border, no UI, no watermark.

### jungle

Use case: illustration-story. Input image is a style and layout reference for a chapter page in the same children's adventure book. Create a NEW portrait page, roughly 4:5. Replace the cave with a lush tropical jungle: tall welcoming trees, thick climbable vines, branches, leafy canopy, hints of ancient stone ruins and a sunlit clearing. Depth and adventure, clear shapes with rich hand-painted color. No characters, no footprints. Preserve the reference's warm cream parchment, soft irregular painted edges, generous safe margins and elegant page composition. At the bottom the ONLY text must read exactly "Urwaldwelt" in one line, big friendly golden-yellow storybook letters with deep teal outline, matching the title of the reference. No book binding, no desk, no UI, no watermark.

### water

Use case: illustration-story. Input image is a style and layout reference for a chapter page in the same children's adventure book. Create a NEW portrait page, roughly 4:5. An enchanting blue-green tropical freshwater lake seen from just below the surface, sunbeams filtering into clear water, smooth rocks, water plants, friendly small fish, a winding sunken stone stair and one distant small treasure glint. The leafy jungle bank is a thin strip above the rippling surface at the top. Inviting child-friendly mystery with clear shapes and rich painterly colors. No characters or dragon, no ocean sharks. Warm cream parchment and softly irregular painted edges, generous margins, same layout as the reference. At the bottom the ONLY text must read exactly "Wasserwelt" in one line, big friendly golden-yellow storybook letters with deep teal outline. No book binding, no desk, no UI, no watermark.

### shore

Use case: precise-object-edit. Input image is the edit target. Preserve its landscape 8:5 composition, tropical lake, trees, sandy shore, rocks, lighting and all terrain exactly. Remove only the trail of footprints in the sand, the green dragon scale on the left shore and the empty twig nest beside it. Fill those places seamlessly with undisturbed sand and matching natural foliage. This becomes the background for a floating treasure-chest scene, so no tracks or other clue objects should remain. Do not paint a chest or people: these will be animated separately. No text, no watermark, keep the exact camera and waterline.


### Portrait reading shot

`underground-reading-portrait.png` was recomposed from `../story/underground-reading.jpg`
with the built-in tool, so the whole leaflet and both characters retain natural proportions
on a portrait page. Exact prompt:

Use case: compositing / illustration-story.
Input image: edit target and exact character/style reference.
Recompose this SAME scene as a PORTRAIT 5:6 image for one full illustrated book page. Preserve natural proportions, do not squeeze or elongate any person, creature, object or letters.
We look over the little knight's shoulder as he holds the tourist leaflet. The knight's blue plume and silver helmet occupy the lower-left third; his armored hands hold the whole leaflet in the middle. The cute small yellow companion peeks at it from the lower-right third; show both his eyes and antennae, without cutting his face off. Behind them we see the blue underground cave and the dragon-shaped hole in its stone wall, as in the reference. Use extra cave above the figures to make a portrait composition. The leaflet must clearly read exactly "Urlaub im Dschungel" with the same jungle picture.
Fill the entire rectangular image with the scene. No parchment margin, no frame, no feathering, no vignette, no page curvature (the game applies the real paper curvature). Match the reference's warm, friendly, clear painted illustration style. No new characters or captions.
# Opening and new-adventure chapter (2026-10-29)

Generated with the built-in `image_gen` tool, saved as `moon-window.png` and `desert-page.png`. References: `../intro/bedroom.png`, `../common/menu/adventure-book.png`, and `underworld-page.png`. Both are static-camera illustrations. The game paints and bends the illustration onto the page without stretching its content.

Moon/window prompt:

> Use case: illustration-story. Create one new full-bleed PORTRAIT 5:6 game storybook illustration, using image 1 only as the interior/style reference and image 2 only for the exact cute knight and yellow companion identities. No visible physical book, no page border, no text. A fixed camera OUTSIDE a medieval castle at peaceful blue dawn, with a clear crescent moon and a few fading stars in the sky above the stone tower. Most of the picture is a large warmly glowing arched bedroom window; looking through it, clearly see the small brown-haired knight asleep on a pillow in his wooden bed under a blue blanket, his silver helmet with blue plume resting beside the bed. His tiny round yellow companion with little antennae sleeps curled up on the blanket by his feet, like a kitten. No dragon here. Sweet, simple readable shapes, warm painterly children's adventure-game rendering like the references. Natural proportions and coherent perspective, the figures unmistakably lying asleep inside the room, no duplicate figures. Window framing large in lower 3/4, moon in upper 1/4. Illustration fills entire canvas.

Desert chapter prompt:

> Use case: illustration-story. Generate a new matching portrait chapter illustration based on the supplied reference, replacing the underground subject with the Wüstenwelt. Keep the same painterly friendly adventure-game quality, tall roughly 4:5 composition, warm parchment margin with softly ragged painted edges, decorative little crown and flourishes, and gold logo letters with deep teal outline near bottom. Above text: inviting golden desert dunes, a partly ruined sandstone castle, palms and a winding little sandy footpath into the ruins, sunlight, clear chunky forms, no people, no enemies. Exact sole text: "Wüstenwelt". Make text large and beautifully legible and contained with generous side clearance. A bright new adventure, not ominous. This is the individual illustration for a book page, NOT a physical open book.
# Animated sunrise foreground

`castle-window-foreground.png` was edited with the built-in `image_gen` tool from `moon-window.png`, using `../intro/knight-poses.png` as the helmet reference. The outdoor sky is transparent; the game paints the changing sky, stars, stationary fading moon and a sun rising just above the mountain ridge behind this one fixed foreground. The knight wears his helmet throughout the opening.

Exact prompt:

> Use case: precise-object-edit / background-extraction. Edit IMAGE 1 into a registered animation foreground with a genuinely TRANSPARENT SKY. IMAGE 1 is the exact composition/edit target; IMAGE 2 is only the reference for the knight's silver helmet with blue plume (top left sleeping pose). Preserve the dimensions, camera, perspective, scale, castle architecture, arched window, bedroom, bed, pillow, blue blanket, sleeping yellow companion, landscape, mountains, town, river, all positions and painterly style from image 1. Two changes only: (1) The sleeping brown-haired knight must WEAR his silver open-face helmet with blue feather plume, matching the sleeping reference in image 2. Remove the spare helmet sitting next to him, continuing the blue blanket naturally there, so there is exactly ONE helmet, on his head. Keep his face asleep and his head on the pillow, not standing or sitting up. (2) Remove the entire outside SKY including moon, stars, sun, clouds and sky glow: from the left/top canvas edges up to the precise silhouette of the castle roof, castle wall/banner and the distant mountains/town. This sky region must be actual alpha transparency, with carefully cut edges, NOT a painted checkerboard and NOT black. Keep all mountain/town/river surfaces opaque. The bedroom visible through the window stays opaque; it is not sky. Keep the knight and companion exactly in their original bed positions. Do not add any moon, sun, stars, lettering, background, borders or props. The image will be composited over an animated dawn sky. Preserve the original full portrait framing exactly; no crop, no reframing, no new lighting effect.
