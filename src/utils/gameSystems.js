import ControlLabels from './ControlLabels.js';
import WeaponSwitch from "./WeaponSwitch.js";
import { useBeltPotion } from "./potions.js";
import EnemyContacts from "./EnemyContacts.js";
import BowManager from "./BowManager.js";
import PortableControls from "./PortableControls.js";
import MeleeAnimation from "./MeleeAnimation.js";
import HammerCharge from "./HammerCharge.js";
import { offerHammerTraining } from "./hammerTraining.js";
import { trackSceneDiscoveries } from './expertDiscovery.js';
import PlayerHealthFeedback from './PlayerHealthFeedback.js';
import DebugMenu from '../ui/DebugMenu.js';

export function installGameSystems(game) {
  const controls = new PortableControls(game), installed = new WeakSet(), potionScenes = new WeakSet(), labels = new WeakMap();
  game.portableControls = controls;
  game.debugMenu = new DebugMenu(game);
  const step = (_time, delta) => {
    game.scene.getScenes(true).forEach(scene => {
      if (!labels.has(scene)) {
        const formatter = new ControlLabels(scene); labels.set(scene, formatter);
        scene.events.once('shutdown', () => { formatter.destroy(); labels.delete(scene); });
      }
      labels.get(scene).update(controls.getProfile());
      scene.hud?.syncEquipment?.(scene.equipped, scene.inventory);
      if (scene.hud && scene.inventory && !potionScenes.has(scene)) {
        potionScenes.add(scene);
        const potionKey = () => useBeltPotion(scene, 'consumable2');
        scene.input.keyboard.on('keydown-G', potionKey);
        scene.events.once('shutdown', () => { scene.input.keyboard.off('keydown-G', potionKey); potionScenes.delete(scene); });
      }
      const key = scene.sys.settings.key;
      if (scene.isInteractingWithLever) { scene.healthFeedback?.update(delta || 16); return; }
      if (!["JungleScene", "UndergroundDigScene", "DesertRuinScene", "DesertEndlessScene", "DesertTunnelScene", "HammerTrainingScene"].includes(key) || !scene.player || !scene.equipped) return;
      if (key !== 'HammerTrainingScene') trackSceneDiscoveries(scene);
      if (!installed.has(scene)) {
        installed.add(scene); scene.weaponSwitch = new WeaponSwitch(scene); scene.bow = new BowManager(scene);
        scene.enemyContacts = new EnemyContacts(scene);
        scene.hammerCharge = new HammerCharge(scene); scene.meleeAnimation = new MeleeAnimation(scene);
        if (key !== 'HammerTrainingScene') scene.healthFeedback = new PlayerHealthFeedback(scene);
        scene.events.once('shutdown', () => { scene.healthFeedback?.destroy(); scene.healthFeedback = null; });
        scene.events.once("shutdown", () => { scene.hammerCharge?.destroy(); scene.hammerCharge = null; scene.meleeAnimation?.destroy(); scene.meleeAnimation = null; scene.weaponSwitch?.destroy(); scene.weaponSwitch = null; scene.bow?.destroy(); scene.bow = null; scene.enemyContacts?.destroy(); scene.enemyContacts = null; installed.delete(scene); });
      }
      if (key !== 'HammerTrainingScene' && scene.equipped.weapon === 'powerHammer') offerHammerTraining(scene, { resume: true });
      scene.weaponSwitch.update((delta || game.loop.delta || 16) / 1000);
      scene.hammerCharge.update((delta || game.loop.delta || 16) / 1000);
      scene.enemyContacts.update();
      scene.bow.update((delta || game.loop.delta || 16) / 1000);
      scene.meleeAnimation?.update();
      scene.hammerCharge.drawEffects();
      scene.healthFeedback?.update(delta || game.loop.delta || 16);
    });
    controls.update();
  };
  game.events.on("poststep", step);
  game.events.once("destroy", () => { game.events.off("poststep", step); game.debugMenu.destroy(); controls.destroy(); });
  return controls;
}
