import EnemyContacts from "./EnemyContacts.js";
import BowManager from "./BowManager.js";
import PortableControls from "./PortableControls.js";

export function installGameSystems(game) {
  const controls = new PortableControls(game), installed = new WeakSet();
  game.portableControls = controls;
  const step = (_time, delta) => {
    game.scene.getScenes(true).forEach(scene => {
      const key = scene.sys.settings.key;
      if (!["JungleScene", "UndergroundDigScene", "DesertRuinScene", "DesertEndlessScene", "DesertTunnelScene"].includes(key) || !scene.player || !scene.equipped) return;
      if (!installed.has(scene)) {
        installed.add(scene); scene.bow = new BowManager(scene);
        scene.enemyContacts = new EnemyContacts(scene);
        scene.events.once("shutdown", () => { scene.bow?.destroy(); scene.bow = null; scene.enemyContacts?.destroy(); scene.enemyContacts = null; installed.delete(scene); });
      }
      scene.enemyContacts.update();
      scene.bow.update((delta || game.loop.delta || 16) / 1000);
    });
    controls.update();
  };
  game.events.on("poststep", step);
  game.events.once("destroy", () => { game.events.off("poststep", step); controls.destroy(); });
  return controls;
}
