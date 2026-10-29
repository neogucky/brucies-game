import { DRAGON_CLUES } from './dragonStory.js';

// Shared playback for the cinema and the complete URL preview. Neither saves progress.
export const STORY_PREVIEW = [
  { id: 'intro', title: 'Intro', thumbnail: 'intro-exterior', scene: 'IntroScene' },
  { id: 'desert', title: 'Spuren im Sand', thumbnail: 'story-desert', scene: 'DragonClueScene', world: 'desert' },
  { id: 'underground', title: 'Das Drachenloch', thumbnail: 'story-underground', scene: 'DragonClueScene', world: 'underground' },
  { id: 'jungle', title: 'Die schwimmende Schatztruhe', thumbnail: 'book-shore', scene: 'DragonClueScene', world: 'jungle' },
];

export function unlockedStoryFilms(save = {}, unlockAll = false) {
  return STORY_PREVIEW.filter(film => film.id === 'intro' || unlockAll ||
    save.storyCluesSeen?.includes(film.world) || save.pendingDragonClues?.includes(film.world) ||
    save.completedLevels?.includes(DRAGON_CLUES[film.world].level));
}

function showEntry(scene, state) {
  const entry = STORY_PREVIEW.find(film => film.id === state.filmIds[state.index]);
  scene.registry.set('storyPreview', state);
  scene.scene.start(entry.scene, entry.world ? { world: entry.world } : {});
}

export function startStoryPreview(scene, options = {}) {
  const filmIds = STORY_PREVIEW.filter(film => !options.filmIds || options.filmIds.includes(film.id)).map(film => film.id);
  if (!filmIds.length) return false;
  showEntry(scene, { filmIds, index: 0, returnScene: options.returnScene === 'CinemaScene' ? 'CinemaScene' : 'MainMenuScene',
    selectedFilmId: options.selectedFilmId || filmIds[0] });
  return true;
}

export function advanceStoryPreview(scene) {
  const preview = scene.registry?.get?.('storyPreview');
  const entry = STORY_PREVIEW.find(film => film.id === preview?.filmIds?.[preview.index]);
  if (!entry || entry.scene !== scene.sys?.settings?.key || (entry.world && entry.world !== scene.clueWorld)) return false;
  const index = preview.index + 1;
  if (index < preview.filmIds.length) showEntry(scene, { ...preview, index });
  else {
    scene.registry.set('storyPreview', null);
    if (preview.returnScene === 'CinemaScene') scene.scene.start('CinemaScene', { selectedFilmId: preview.selectedFilmId });
    else scene.scene.start('MainMenuScene', {});
  }
  return true;
}
