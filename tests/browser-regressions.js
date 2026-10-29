import { defaultSave, unlockAllForTesting, SECRET_LEVELS } from '../src/saveManager.js';
import { bookShotStarts, BOOK_FILMS } from '../src/utils/bookTimeline.js';
import { BOOK_PAGE_SHAPES } from '../src/utils/BookPresentation.js';

const frame = document.getElementById('game-frame'), results = document.getElementById('results');
const buttons = [document.getElementById('run'), document.getElementById('preview')];
const root = new URL('../', location.href).href;
const params = new URLSearchParams(location.search);
let game, win, navigationCount = 0,
  chosenWorld = ['desert','underground','jungle'].includes(params.get('lever')) ? params.get('lever') : 'desert',
  chosenGender = params.get('gender') === 'female' ? 'female' : 'male', lever;
frame.addEventListener('load', () => navigationCount++);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = async (condition, message, timeout = 15000) => {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > timeout) throw new Error('Zeitüberschreitung: ' + message);
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
};
const steps = async (count = 4) => {
  for (let i = 0; i < count; i++) await new Promise(resolve => game.events.once('poststep', resolve));
};
const active = () => game?.portableControls?.activeScene();
const sceneIs = key => active()?.sys.settings.key === key;
const key = (code, down = true, repeat = false, target = game.canvas) => {
  const event = new win.KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code === 'Space' ? ' ' : code,
    bubbles: true, cancelable: true, repeat });
  target.dispatchEvent(event); return event;
};
const tap = code => { key(code); key(code, false); };
const seed = (world = 'desert') => ({ ...unlockAllForTesting(structuredClone(defaultSave), world),
  lastPlayed: '2026-10-29T12:00:00Z', coins: 73, health: 5, playerGender: chosenGender,
  tutorials: { powerHammer: { offered: true, completed: true } }, settings: { controlProfile: 'ipadKeyboard' } });

async function loadGame() {
  if (game) { game.destroy(true); await new Promise(resolve => requestAnimationFrame(resolve)); }
  game = null; navigationCount = 0;
  const html = await (await fetch(new URL('index.html', root), { cache: 'no-store' })).text();
  const previousDocument = frame.contentDocument;
  const instrumentation = `<script>
    const memory = new Map([['brucies_game_save_v1', ${JSON.stringify(JSON.stringify(seed()))}]]);
    Object.defineProperty(window, 'localStorage', {value:{getItem:k=>memory.get(k)??null,
      setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()}});
    window.qaErrors=[];window.addEventListener('error',e=>window.qaErrors.push(e.message));
    window.addEventListener('unhandledrejection',e=>window.qaErrors.push(String(e.reason)));
    const RealGame=Phaser.Game;
    Phaser.Game=class extends RealGame{constructor(config){super(config);window.qaGame=this;window.qaTrace=[];
      this.events.on('poststep',()=>{const key=this.portableControls?.activeScene()?.sys.settings.key;
        if(key&&window.qaTrace.at(-1)!==key)window.qaTrace.push(key);});}};
  </script>`;
  // Load the production HTML, import map, main module, scenes and assets. Only
  // storage and observations are isolated; no copied config or fake finish().
  frame.srcdoc = html.replace('<head>', '<head><base href="' + root + '">')
    .replace('<!-- Version local modules', instrumentation + '\n<!-- Version local modules');
  await wait(() => frame.contentDocument !== previousDocument && frame.contentWindow?.qaGame?.portableControls, 'Spielstart');
  win = frame.contentWindow; game = win.qaGame;
}

async function skipAndContinue(code, loading) {
  await loadGame();
  if (!loading) await wait(() => sceneIs('IntroScene'), 'Intro');
  else assert(!sceneIs('IntroScene'), 'Die frühe Taste muss während des Ladens ankommen.');
  assert(key(code, true, false, win).defaultPrevented, 'Taste wird auch direkt am Fenster abgefangen.');
  key(code, true, true, win); key(code, true, false, win);
  await wait(() => sceneIs('MainMenuScene'), 'Überspringen zum Menü');
  await steps(); key(code, true, true, win); key(code, true, false, win); await steps();
  assert(sceneIs('MainMenuScene'), 'Eine gehaltene Taste muss im Menü verbraucht bleiben.');
  key(code, false, false, win); tap('Enter');
  await wait(() => sceneIs('DessertMapScene'), 'Weiterspielen'); await steps(8);
  assert(win.qaTrace.filter(key => key === 'IntroScene').length <= 1, 'Intro darf nicht wieder starten.');
  assert(game.registry.get('storyPreview') == null, 'Kein Filmauftrag beim Weiterspielen.');
  assert(navigationCount === 1, 'Keine erneute Seitennavigation / kein neues Ladebild.');
  assert(!win.qaErrors.length, win.qaErrors.join('\n'));
}

async function returnToMenu() {
  active().scene.start('MainMenuScene', {}); await wait(() => sceneIs('MainMenuScene'), 'Hauptmenü'); await steps();
}

async function runTests() {
  buttons.forEach(button => button.disabled = true); results.textContent = 'Tests laufen …';
  let passed = 0;
  const test = async (title, run) => { if(params.get('suite')==='audio'&&!/^(Aufwachen|Musik:)/.test(title))return; await run(); passed++; results.textContent += '\n✓ ' + title; };
  try {
    if(params.get('suite')==='audio'){await loadGame();await wait(()=>sceneIs('IntroScene'),'Intro');tap('Space');await wait(()=>sceneIs('MainMenuScene'),'Menü');await steps();}
    for (const loading of [true, false]) for (const code of ['Space', 'Enter']) {
      await test((loading ? 'Beim Laden' : 'Im Intro') + ': ' + code + ' überspringt einmal, Enter setzt das Spiel fort',
        () => skipAndContinue(code, loading));
    }
    await test('Mehrfach Kino → Intro → Überspringen → Kino → Menü', async () => {
      for (let i = 0; i < 3; i++) {
        await returnToMenu(); active().menuItems[3].text.emit('pointerdown');
        await wait(() => sceneIs('CinemaScene'), 'Kino'); await steps();
        tap('Enter'); await wait(() => sceneIs('IntroScene'), 'Filmwiederholung'); await steps();
        tap('Space'); await wait(() => sceneIs('CinemaScene'), 'Zurück zur Filmkarte'); await steps();
        tap('KeyQ'); await wait(() => sceneIs('MainMenuScene'), 'Zurück zum Hauptmenü'); await steps();
        assert(active().selectedIndex === 3, 'Kino bleibt bei gezielter Rückkehr ausgewählt.');
      }
    });
    await test('Automatisches Intro-Ende öffnet ein frisches Menü mit Weiterspielen', async () => {
      active().scene.start('IntroScene', {}); await wait(() => sceneIs('IntroScene'), 'Intro');
      active().elapsed = active().duration - 40; await wait(() => sceneIs('MainMenuScene'), 'Automatisches Ende'); await steps();
      assert(active().selectedIndex === 0, 'Keine veraltete Kino-Auswahl nach normalem Intro.');
    });
    await test('Tabwechsel setzt das Intro fort; Überspringen per Klick öffnet das Menü nur einmal', async () => {
      active().scene.start('IntroScene', {}); await wait(() => sceneIs('IntroScene'), 'Intro'); await steps();
      const intro = active(); intro.elapsed = 8000;
      win.dispatchEvent(new win.Event('blur')); assert(intro.suspended, 'Tabwechsel pausiert den Film.');
      win.dispatchEvent(new win.Event('focus')); assert(!intro.suspended && intro.elapsed === 8000, 'Rückkehr darf nicht bei null starten.');
      intro.skipButton.emit('pointerdown'); intro.skipButton.emit('pointerdown');
      await wait(() => sceneIs('MainMenuScene'), 'Überspringen per Overlay'); await steps(8);
      assert(sceneIs('MainMenuScene'), 'Kein Rücksprung zum Intro nach dem Klick.');
    });
    for (const [world, destination] of Object.entries({ desert: 'DessertMapScene', underground: 'UndergroundMapScene',
      jungle: 'JungleMapScene', water: 'WaterMapScene' })) {
      for (const input of ['Enter', 'Klick']) await test(world + ': Weiterspielen mit ' + input, async () => {
        game.registry.set('saveData', seed(world)); await returnToMenu();
        const before = win.qaTrace.filter(key => key === 'IntroScene').length;
        if (input === 'Enter') tap('Enter'); else active().menuItems[0].text.emit('pointerdown');
        await wait(() => sceneIs(destination), 'Gespeicherte Welt'); await steps(8);
        assert(win.qaTrace.filter(key => key === 'IntroScene').length === before, 'Weiterspielen darf keinen Film starten.');
        assert(!win.qaErrors.length, win.qaErrors.join('\n'));
      });
    }
    for (const film of ['intro','desert','underground','jungle']) await test(film + ': Buchseiten, Entsättigung und automatisches Filmende', async () => {
      const saveBefore = JSON.stringify(game.registry.get('saveData'));
      game.registry.set('storyPreview', { filmIds: [film], index: 0, returnScene: 'MainMenuScene' });
      active().scene.start(film === 'intro' ? 'IntroScene' : 'DragonClueScene', film === 'intro' ? {} : { world: film });
      await wait(() => active()?.book?.film === film, 'Buchfilm'); await steps();
      const scene = active(), starts = bookShotStarts(film);
      scene.suspendIntro();
      scene.elapsed = starts[1] + 900; scene.drawFrame();
      const frame = scene.book.frameAt(scene.elapsed), previous = scene.book.painter.pages[0];
      for (const page of [previous, scene.book.painter.pages[1]]) {
        const c = page.color.getContext('2d');
        for (const [x, y] of [[1, 1], [598, 1], [1, 718], [598, 718]]) {
          assert(c.getImageData(x, y, 1, 1).data[3] === 255, 'Die Animation muss die Seite bis in alle vier Ecken füllen.');
        }
      }
      assert(frame.left.desaturation === .88 && frame.right.desaturation === 0, 'Nur die abgeschlossene Seite wird entsättigt.');
      assert(previous.grayKey === previous.key, 'Entsättigtes Standbild muss wirklich gezeichnet werden.');
      const freezeKey = previous.key;
      scene.elapsed += 700; scene.drawFrame();
      assert(scene.book.painter.pages[0].key === freezeKey, 'Das vorige Bild muss vollständig stillstehen.');
      for(let i=2;i<starts.length;i+=2){
        if(BOOK_FILMS[film][i].menu)continue;
        for(const offset of [0,16,66,250]){
          scene.elapsed=starts[i]+offset;scene.book.painter.tick=null;scene.drawFrame();
          const settled=scene.book.frameAt(scene.elapsed),painter=scene.book.painter,c=painter.canvas.getContext('2d');
          const actual=c.getImageData(350,250,200,300).data;
          // A fully visible repaint must not bring a disappeared scene back.
          painter.paintPage(0,{...settled.left,reveal:1},BOOK_PAGE_SHAPES.left);
          const visible=c.getImageData(350,250,200,300).data;
          assert(actual.every((value,j)=>value===visible[j]),'Das Bild bleibt direkt nach dem Umblättern sichtbar.');
        }
      }
      if(film!=='intro'){
        assert(scene.canSkip===false&&!scene.skipButton,'Geschichten zeigen keinen Überspringen-Knopf.');
        tap('Space');tap('Enter');game.portableControls.dispatch('confirm');await steps();
        assert(active()===scene&&!scene.leaving,'Leertaste und Enter überspringen keine Weltgeschichte.');
        assert(!game.canvas.getAttribute('aria-label').includes('Überspringen'),'Auch die Lesefassung bietet kein Überspringen an.');
      }
      scene.elapsed = starts[2] - 600; scene.drawFrame();
      assert(scene.book.frameAt(scene.elapsed).turn !== null, 'Der Blattumschlag wird gerendert.');
      scene.elapsed = starts.at(-1) + Math.min(1600, BOOK_FILMS[film].at(-1).duration - 1); scene.drawFrame();
      if (film === 'intro') {
        assert(scene.book.frameAt(scene.elapsed).left.shot.menu, 'Der letzte Umschlag führt links ins Hauptmenü.');
        const painter = scene.book.painter, a = painter.canvas.getContext('2d').getImageData(0,0,1586,992).data;
        const b = painter.menu.getContext('2d').getImageData(0,0,1586,992).data;
        assert(a.every((value,i)=>value===b[i]), 'Die letzte Filmseite muss exakt dem Menü-Hintergrund entsprechen.');
      } else {
        assert(scene.book.painter.pages[1].key.includes('title'), 'Die nächste Welt erscheint rechts.');
        assert(scene.audio.musicEnabled === false, 'Weltfilme spielen nur Effekte.');
      }
      scene.elapsed = scene.duration - 30; scene.startIntro();
      await wait(() => sceneIs('MainMenuScene'), 'Natürliches Buchfilmende'); await steps();
      assert(JSON.stringify(game.registry.get('saveData')) === saveBefore, 'Kinofilme verändern keinen Spielstand.');
      assert(!win.qaErrors.length, win.qaErrors.join('\n'));
    });
    await test('Aufwachen überblendet zur Titelmusik, die im Menü ohne Neustart weiterläuft', async () => {
      active().scene.start('IntroScene', {}); await wait(() => sceneIs('IntroScene'), 'Intro'); await steps();
      const intro = active(); intro.suspendIntro(); intro.updateMusic(18650);
      assert(Math.abs(intro.audio.musicGain.gain.value - .1) < .001, 'Schlafmusik blendet aus.');
      const music = game.sound.get('music-menu');
      // A locked AudioContext applies scheduled gains only once it renders.
      // Check the requested gain in all browsers, and the real node when live.
      assert(music && Math.abs(music.currentConfig.volume - .175) < .001, 'Titelmusik bekommt die überblendete Lautstärke.');
      if(game.sound.context?.state==='running'){
        await steps(4);
        assert(Math.abs(music.volumeNode.gain.value - .175) < .001, 'Der laufende Audioknoten blendet ein.');
      }
      intro.elapsed = intro.duration - 30; intro.startIntro();
      await wait(() => sceneIs('MainMenuScene'), 'Menü nach Musikwechsel'); await steps();
      assert(game.sound.get('music-menu') === music, 'Dieselbe Titelmusik läuft im Menü weiter.');
      assert(Math.abs(music.currentConfig.volume - .35) < .001, 'Menümusik erreicht ihre normale Lautstärke.');
    });
    for (const [phase, sourceTime] of [['vor der Titelmusik',5000],['während der Titelmusik',18650]]) {
      await test('Musik: Intro überspringen ' + phase, async () => {
        active().scene.start('IntroScene', {}); await wait(() => sceneIs('IntroScene'), 'Intro'); await steps();
        const intro=active();intro.suspendIntro();intro.updateMusic(sourceTime);
        const existing=game.sound.sounds.find(s=>s.key==='music-menu'&&!s.pendingRemove);
        let restarts=0,playTime;
        if(existing){
          playTime=existing.playTime;
          const play=existing.play;
          existing.play=function(...args){restarts++;return play.apply(this,args);};
        }
        if(sourceTime<17600)assert(!existing,'Vor dem Aufwachen läuft noch keine Titelmusik.');
        else assert(existing,'Beim Aufwachen läuft bereits Titelmusik.');
        tap('Space');await wait(()=>sceneIs('MainMenuScene'),'Überspringen ins Menü');await steps();
        const music=game.sound.sounds.find(s=>s.key==='music-menu'&&!s.pendingRemove);
        assert(music,'Das Menü spielt die Titelmusik.');
        if(existing){
          assert(music===existing&&restarts===0,'Überspringen darf die laufende Titelmusik nicht neu starten.');
          assert(music.playTime===playTime,'Die Startposition der laufenden Tonspur bleibt erhalten.');
        }else{
          assert(music.config.seek===0,'Beim frühen Überspringen startet die Titelmusik am Anfang.');
        }
        assert(Math.abs(music.currentConfig.volume-.35)<.001,'Im Menü gilt die normale Musiklautstärke.');
        assert(!win.qaErrors.length,win.qaErrors.join('\n'));
      });
    }
    for (const ending of ['Ende', 'Überspringen']) await test('Neues Spiel: Intro ohne Mondseite → Wüstenwelt (' + ending + ')', async () => {
      await returnToMenu(); active().startNewGame();
      await wait(() => sceneIs('CharacterSelectScene'), 'Heldenwahl'); await steps();
      tap('Enter'); await wait(() => active()?.book?.film === 'adventure', 'Intro zum neuen Spiel'); await steps();
      const intro=active();let desertMusic;
      assert(intro.book.frameAt(0).left.shot.id==='bedroom', 'Neue Spiele beginnen direkt im Schlafzimmer.');
      assert(!game.registry.get('storyPreview'), 'Neues Spiel erbt keinen Kinoauftrag.');
      if(ending==='Überspringen')tap('Space');
      else {
        intro.suspendIntro();intro.updateMusic(20500);
        desertMusic=game.sound.sounds.find(s=>s.key==='music-desert'&&!s.pendingRemove);
        assert(desertMusic,'Neues Spiel blendet direkt in die Wüstenmusik über.');
        assert(!game.sound.sounds.some(s=>s.key==='music-menu'&&!s.pendingRemove),'Keine Titelmusik im neuen Abenteuer.');
        intro.elapsed=intro.duration-30;intro.startIntro();
      }
      await wait(() => sceneIs('DessertMapScene'), 'Wüstenwelt nach dem Intro');await steps();
      assert(game.registry.get('saveData').currentLevel==='Wuestenexperte', 'Das Abenteuer beginnt beim Professor.');
      const mapMusic=game.sound.sounds.find(s=>s.key==='music-desert'&&!s.pendingRemove);
      assert(mapMusic,'Die Wüstenkarte spielt Wüstenmusik.');
      if(desertMusic)assert(mapMusic===desertMusic,'Die Wüstenmusik läuft auf der Karte ohne Neustart weiter.');
      assert(!win.qaErrors.length,win.qaErrors.join('\n'));
    });
    results.textContent += '\nBESTANDEN: ' + passed + ' Integrationsprüfungen';
  } catch (error) { results.textContent += '\nFEHLER: ' + error.message; }
  finally { buttons.forEach(button => button.disabled = false); }
}

async function showLever() {
  buttons.forEach(button => button.disabled = true);
  try {
    if (!game) { await loadGame(); await wait(() => sceneIs('IntroScene'), 'Intro'); tap('Space'); await wait(() => sceneIs('MainMenuScene'), 'Menü'); }
    game.portableControls.resume();
    game.scene.getScenes(true).forEach(scene => game.scene.stop(scene.sys.settings.key));
    const save = seed(chosenWorld); save.bonusChallenges = {}; save.playerGender = chosenGender;
    save.unlockedLevels = save.unlockedLevels.filter(id => !Object.values(SECRET_LEVELS).includes(id));
    game.registry.set('saveData', save);
    const map = { desert: ['DesertEndlessScene', {}], underground: ['UndergroundDigScene', { levelId: 'UnderDig', mapKey: 'underground-dig-map' }],
      jungle: ['JungleScene', { levelId: 'Lianenpfad' }] }[chosenWorld];
    game.scene.start(...map); await wait(() => active()?.secretSwitch?.ready(), 'Level bereit');
    const scene = active(), sw = scene.secretSwitch, { x, y } = sw.config.lever;
    if (scene.blocks) for (const block of [...scene.blocks.getChildren()]) {
      const col = block.getData('col'), row = block.getData('row');
      if (col >= 9 && col <= 14 && (row <= 3 || (row === 4 && col !== 12))) {
        scene.blocks.remove(block, true, true); scene.blockMap.delete(col + ',' + row);
      }
    }
    if (sw.config.cover.kind === 'bush') sw.cover?.destroy();
    scene.player.setPosition(x - 50, y - 1); scene.player.body.reset(x - 50, y - 1);
    scene.player.y -= scene.player.body.bottom - (y - 1); scene.player.body.reset(scene.player.x, scene.player.y);
    scene.player.body.setVelocity(0, 0); scene.player.body.setAllowGravity(false); scene.cameras.main.stopFollow();
    scene.cameras.main.centerOn(480, chosenWorld === 'jungle' ? y - 200 : 300);
    await steps(); sw.update(); sw.revealedAt = -Infinity;
    assert(sw.activate(), 'Hebel muss sich am echten Standort aktivieren lassen: ' + JSON.stringify({
      ready:sw.ready(),near:sw.near,clear:sw.clear,covered:sw.covered,bottom:scene.player.body.bottom,
      centerX:scene.player.body.center.x,lever:sw.config.lever,paused:scene.isPaused,swing:scene.isSwinging,
      bonus:game.registry.get('saveData').bonusChallenges,keys:scene.sys.settings.key }));
    lever = sw.interaction; lever.renderFrame = lever.update.bind(lever); lever.update = () => {};
    setFrame(1100);
    document.getElementById('lever-tools').style.display = 'block';
    results.textContent = 'Nahaufnahme: ' + chosenWorld + ' / ' + chosenGender;
  } catch (error) { results.textContent = 'FEHLER: ' + error.message; }
  finally { buttons.forEach(button => button.disabled = false); }
}

function setFrame(time) {
  lever.elapsed = time; lever.renderFrame(0);
  const actor = lever.actor;
  document.getElementById('metrics').textContent = JSON.stringify({ upperWidth: actor.upper.scaleY * actor.parts.upper.height,
    forearmWidth: actor.forearm.scaleY * actor.parts.forearm.height, handHeight: actor.hand.scaleY * actor.parts.hand.height,
    gripError: Math.hypot(actor.grip.x - lever.lever.handle.x, actor.grip.y - lever.lever.handle.y), errors: win.qaErrors });
}
document.getElementById('run').onclick = runTests;
document.getElementById('preview').onclick = showLever;
document.querySelectorAll('[data-world]').forEach(button => button.onclick = () => { chosenWorld = button.dataset.world; showLever(); });
document.querySelectorAll('[data-gender]').forEach(button => button.onclick = () => { chosenGender = button.dataset.gender; showLever(); });
document.querySelectorAll('[data-frame]').forEach(button => button.onclick = () => setFrame(Number(button.dataset.frame)));
document.getElementById('hide').onclick = () => document.getElementById('tools').hidden = true;
document.addEventListener('keydown', event => { if (event.code === 'KeyH') document.getElementById('tools').hidden = false; });
if (params.has('lever')) showLever();
