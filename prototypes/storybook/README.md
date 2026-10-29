# Book-film preview

Open [the preview](http://127.0.0.1:8765/prototypes/storybook/) and choose Intro → Menü, Neues Spiel,
Wüste, Untergrund or Urwald. A direct link can select a film, for example
`?film=jungle`.

The viewer loads the actual game, assets, scenes and shared book renderer in an
isolated frame. Its save is memory-only: it never changes the player's progress.
Unlike normal playback, the viewer holds the final frame so it can be inspected.

Controls: play/pause (Space), restart, scrubber and direct shot selection
(also left/right arrows). Enter activates a focused button. Selecting a shot
pauses it. Hiding the page pauses playback.

Every shot has a fixed camera. It fills the area within the drawn page border
and bends with the paper, with a narrow, fixed dry-brush edge and without letterboxing. Fixed
portrait crops preserve the original proportions; only the paper's actual
curvature deforms the picture. The borders were traced from the book artwork.
The startup intro credits appear briefly at different positions and fade out
before a page freezes. The new-game version has no credits. A finished
page freezes and becomes desaturated while the next one animates. Page turns
use the same projection as the resting pages; reduced-motion mode crossfades.

The implementation lives in `src/utils/bookTimeline.js`, `BookShots.js`,
`BookPresentation.js` and `BookFilm.js`. Production scenes preserve their
normal skipping, completion and save behavior.

Run `node --test tests/book-films.test.cjs tests/intro.test.cjs` for the timing,
camera, rendering and animation checks. The browser tests in
`tests/browser-regressions.html` also verify all four films, the new-adventure intro, and uninterrupted title music with real Phaser.

[Generated assets and exact prompts](../../assets/storybook/README.md).

The startup intro opens on the moonlit window, then turns to the actual menu
illustration on the final left page. New games (after choosing a hero) omit
that opening page and finish with Wüstenwelt on the right. Sleep music fades
out as the knight wakes. The startup intro fades in the menu theme and keeps it
playing into the menu; the new-game version uses desert music and carries it
into the desert map. World-clue films use effects only. Original generated
sounds `hero-leap.wav` and `reveal.wav` are reproducible with
`tools/generate_intro_audio.py`.

When the startup intro is skipped before the title theme begins, the menu starts
that theme from the beginning. If it is already playing (including during the
crossfade), the menu keeps the same sound instance and playback position and
sets the normal menu volume. Normal completion uses the same handoff.

Only the intro offers a skip overlay (at the lower edge). World-story films run
to their automatic ending; Space, Enter and confirm actions do not skip them.
After a page turn, the new left page stays fully visible instead of starting a
second fade from blank paper. The browser suite checks actual rendered pixels
at the first resting frames of each story's page turn.

The opening now animates a 4.4-second night-to-day transition behind a single
transparent castle foreground. The helmet stays on the sleeping knight's head.
The moon fades in place as the sky brightens, stars disappear, and the sun
emerges just above the mountain ridge. The finished page holds daylight.
The left exterior wall's foreground boundary follows the original painting.
The production cinema prints two selectable films per curved page; the secret
editor stores movie overrides separately from level and story progress.
