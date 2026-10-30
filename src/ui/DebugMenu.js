import { WORLD_LEVELS, SECRET_LEVELS, editDebugProgress, normalizeWorldProgress, saveProgress } from '../saveManager.js';
import { STORY_PREVIEW, unlockedStoryFilms } from '../utils/storyPreview.js';
import { resetSceneKeys } from '../utils/PortableControls.js';

const WORLD_NAMES = { desert: 'Wüste', underground: 'Unterwelt', jungle: 'Urwald', water: 'Wasserwelt' };
const LEVEL_NAMES = { Wuestenruine: 'Ruine', Taverne: 'Taverne', DesertEndless: 'Oase', Fremdweg: 'Steinbruch',
  Wuestenexperte: 'Wüstenexperte', Wuestenschatz: 'Goldoase', UnderShop: 'Taverne', UnderDig: 'Lehmhöhle',
  Schluesseltor: 'Schlüsseltor', Schluesselweg: 'Mine', Kristalltiefen: 'Kristalltiefen',
  Unterweltexperte: 'Unterweltexperte', Kristallschatz: 'Funkelkammer', UrwaldShop: 'Urwald-Shop',
  Urwaldkronen: 'Kokoskronen', Lianenpfad: 'Lianenpfad', Urwaldexperte: 'Urwaldexperte', Wipfelschatz: 'Goldwipfel', Seeufer: 'Seeufer' };

const CSS = `
#debug-progress-menu { box-sizing: border-box; width: min(1020px, 96vw); max-height: 94dvh; padding: 0;
  color: #fff4d6; background: #17323d; border: 1px solid #bba277; border-radius: 16px;
  font: 15px/1.4 "Trebuchet MS", sans-serif; box-shadow: 0 20px 80px #0009; }
#debug-progress-menu::backdrop { background: #061015c9; }
#debug-progress-menu * { box-sizing: border-box; }
#debug-progress-menu header, #debug-progress-menu footer { padding: 18px 24px; }
#debug-progress-menu header { border-bottom: 1px solid #ffffff1a; position: sticky; top: 0; z-index: 1; background: #17323d; }
#debug-progress-menu h1 { font: bold 27px Georgia, serif; margin: 0 0 5px; }
#debug-progress-menu p { margin: 5px 0 0; color: #c5d4d4; }
#debug-progress-menu .debug-worlds { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding: 18px 24px; }
#debug-progress-menu section { background: #102833; border: 1px solid #48606a; border-radius: 11px; padding: 14px; }
#debug-progress-menu h2 { margin: 0 0 8px; font-size: 20px; }
#debug-progress-menu label { display: flex; align-items: center; gap: 9px; min-height: 32px; cursor: pointer; }
#debug-progress-menu input { width: 18px; height: 18px; accent-color: #e7c180; flex-shrink: 0; }
#debug-progress-menu fieldset { padding: 8px 0 0; margin: 8px 0 0; border: 0; border-top: 1px solid #ffffff20; }
#debug-progress-menu fieldset:disabled { opacity: .4; }
#debug-progress-menu .debug-films { grid-column: 1 / -1; }
#debug-progress-menu .debug-film-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 20px; }
#debug-progress-menu .debug-state { margin-left: auto; font-size: 12px; color: #9fc4ab; }
#debug-progress-menu .debug-secret { border-top: 1px solid #ffffff20; padding-top: 9px; margin-top: 8px; }
#debug-progress-menu .debug-secret small { display: block; margin: 0 0 8px 27px; color: #bbccce; }
#debug-progress-menu button { font: inherit; border-radius: 7px; padding: 9px 15px; border: 1px solid #69808a;
  color: #fff4d6; background: #294853; cursor: pointer; }
#debug-progress-menu button:hover { background: #365b68; }
#debug-progress-menu button:focus-visible, #debug-progress-menu input:focus-visible { outline: 3px solid #e7c180; outline-offset: 3px; }
#debug-progress-menu button:disabled { opacity: .4; cursor: default; }
#debug-progress-menu button.debug-small { padding: 5px 10px; font-size: 13px; margin-top: 6px; }
#debug-progress-menu button.debug-apply { background: #dfbd78; color: #102833; border-color: #f2d49c; font-weight: bold; }
#debug-progress-menu footer { border-top: 1px solid #ffffff1a; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  position: sticky; bottom: 0; background: #17323d; z-index: 1; }
#debug-progress-menu .debug-note { padding: 0 24px 16px; font-size: 13px; }
#debug-progress-menu .debug-error { color: #ffb7a3; }
#debug-progress-menu .debug-spacer { flex: 1; }
@media (max-width: 620px) { #debug-progress-menu .debug-worlds { grid-template-columns: 1fr; padding: 12px; }
  #debug-progress-menu header, #debug-progress-menu footer { padding: 14px; } }
`;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export default class DebugMenu {
  constructor(game) { this.game = game; this.isOpen = false; }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  open() {
    if (this.isOpen) return;
    const scene = this.game.portableControls.activeScene();
    if (!scene || scene.isInteractingWithLever || !this.game.registry.get('saveData')) return;
    this.scene = scene; this.wasPaused = scene.sys.isPaused();
    this.game.portableControls.clearHeld(); resetSceneKeys(scene);
    if (!this.wasPaused) scene.scene.pause();
    // Pausing a running bonus level saves its current checkpoint first.
    this.baseSave = normalizeWorldProgress(this.game.registry.get('saveData'));
    this.changes = { worlds: {}, levels: {}, switches: {}, films: {} }; this.isOpen = true;
    this.onShutdown = () => this.close(false);
    scene.events.once('shutdown', this.onShutdown);
    this.styles = element('style'); this.styles.textContent = CSS; document.head.append(this.styles);
    this.dialog = element('dialog'); this.dialog.id = 'debug-progress-menu';
    this.dialog.setAttribute('aria-labelledby', 'debug-progress-title');
    const header = element('header'), title = element('h1', 'Geheimer Testmodus'); title.id = 'debug-progress-title';
    header.append(title, element('p', 'Freischaltungen bearbeiten. Übernehmen speichert den Spielstand und öffnet das Hauptmenü.'));
    this.worlds = element('div', null, 'debug-worlds');
    this.error = element('p', null, 'debug-note debug-error'); this.error.setAttribute('role', 'alert'); this.error.hidden = true;
    const note = element('p', 'Gesperrte Welten behalten ihren Fortschritt. Ein Schalter-Reset löscht auch Versuch und Rekord des Geheimlevels.', 'debug-note');
    const footer = element('footer');
    if (typeof scene.toggleEditorMode === 'function') {
      footer.append(this.button(scene.isEditorMode ? 'Level-Editor beenden' : 'Level bearbeiten', () => {
        this.close(); scene.toggleEditorMode();
      }));
    }
    footer.append(element('span', null, 'debug-spacer'), this.button('Abbrechen', () => this.close()));
    this.applyButton = this.button('Übernehmen', () => this.apply(), 'debug-apply'); this.applyButton.disabled = true;
    footer.append(this.applyButton);
    this.dialog.append(header, this.worlds, note, this.error, footer);
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    (document.getElementById('play-shell') || document.body).append(this.dialog);
    this.render(); this.dialog.showModal();
  }

  button(label, action, className) {
    const button = element('button', label, className); button.type = 'button'; button.addEventListener('click', action); return button;
  }

  checkbox(id, text, checked, change) {
    const label = element('label'), input = element('input'); input.type = 'checkbox'; input.id = id; input.checked = checked;
    input.addEventListener('change', () => change(input.checked));
    label.append(input, element('span', text)); return label;
  }

  change(kind, id, value) {
    if (kind === 'switches' && !value) this.changes.resetSwitches = [...new Set([...(this.changes.resetSwitches || []), id])];
    this.changes[kind][id] = value;
    this.applyButton.disabled = false; this.error.hidden = true; this.render();
  }

  render() {
    const focusId = document.activeElement?.id;
    const save = editDebugProgress(this.baseSave, this.changes);
    this.worlds.replaceChildren();
    for (const [world, ids] of Object.entries(WORLD_LEVELS)) {
      const open = save.unlockedWorlds.includes(world), card = element('section');
      card.append(element('h2', WORLD_NAMES[world]), this.checkbox('debug-world-' + world, 'Welt freigeschaltet', open,
        value => this.change('worlds', world, value)));
      const levels = element('fieldset'); levels.disabled = !open;
      for (const id of ids.filter(id => id !== SECRET_LEVELS[world])) {
        const row = this.checkbox('debug-level-' + id, LEVEL_NAMES[id] || id, save.unlockedLevels.includes(id),
          value => this.change('levels', id, value));
        if (save.completedLevels?.includes(id)) row.append(element('small', 'Geschafft', 'debug-state'));
        levels.append(row);
      }
      levels.append(this.button('Alle Orte freischalten', () => {
        for (const id of ids.filter(id => id !== SECRET_LEVELS[world])) this.changes.levels[id] = true;
        this.change('worlds', world, true);
      }, 'debug-small'));
      card.append(levels);
      const secretId = SECRET_LEVELS[world];
      if (secretId) {
        const secret = element('div', null, 'debug-secret');
        const row = this.checkbox('debug-switch-' + world, 'Geheimschalter · ' + LEVEL_NAMES[secretId], save.unlockedLevels.includes(secretId),
          value => this.change('switches', world, value));
        row.firstChild.disabled = !open;
        const state = save.bonusChallenges?.[world]?.status || (save.completedLevels?.includes(secretId) ? 'complete' : save.unlockedLevels.includes(secretId) ? 'ready' : 'locked');
        secret.append(row, element('small', { locked: 'Nicht freigeschaltet · noch nicht gespielt', ready: 'Geheimlevel bereit · noch nicht gespielt',
          running: 'Geheimlevel: Versuch läuft', complete: 'Geheimlevel bereits gespielt' }[state] || state),
        this.button('Schalter zurücksetzen', () => this.change('switches', world, false), 'debug-small'));
        card.append(secret);
      }
      this.worlds.append(card);
    }
    const cinema=element('section',null,'debug-films'),list=element('div',null,'debug-film-list');
    const available=new Set(unlockedStoryFilms(save,this.game.registry.get('unlockAllForTesting')).map(film=>film.id));
    cinema.append(element('h2','Kinofilme'),element('p','Filme freischalten, ohne dafür ein Level abzuschließen.'));
    for(const film of STORY_PREVIEW){
      const row=this.checkbox('debug-film-'+film.id,film.title,available.has(film.id),value=>this.change('films',film.id,value));
      if(film.id==='intro')row.firstChild.disabled=true;
      list.append(row);
    }
    cinema.append(list,this.button('Alle Filme freischalten',()=>{
      for(const film of STORY_PREVIEW)if(film.id!=='intro')this.changes.films[film.id]=true;
      this.change('films','desert',true);
    },'debug-small'));
    this.worlds.append(cinema);
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }

  apply() {
    const changes = this.changes, scene = this.scene, game = this.game;
    // Write once before leaving so an unavailable/full browser store can be
    // reported without discarding the draft or the running scene.
    try { saveProgress(editDebugProgress(game.registry.get('saveData'), changes)); }
    catch { this.error.textContent = 'Der Spielstand konnte nicht gespeichert werden.'; this.error.hidden = false; return; }
    this.close(false);
    const controls = game.portableControls;
    controls.pausedScene = null;
    if (controls.overlay) controls.overlay.hidden = true;
    scene.scene.stop();
    // Shutdown handlers (notably a running bonus checkpoint) finish before
    // the edits are applied to the freshest save. They cannot undo a reset.
    game.events.once('poststep', () => {
      const save = editDebugProgress(game.registry.get('saveData'), changes);
      game.registry.set('saveData', save); saveProgress(save);
      game.scene.start('MainMenuScene');
    });
  }

  close(resume = true) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.scene.events.off('shutdown', this.onShutdown);
    this.dialog.close(); this.dialog.remove(); this.styles.remove();
    this.game.portableControls.clearHeld(); resetSceneKeys(this.scene);
    if (resume && !this.wasPaused) this.scene.scene.resume();
    this.game.portableControls.focus();
  }

  destroy() { this.close(); }
}
