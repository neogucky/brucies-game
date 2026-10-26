import JungleMapScene from '../jungle/JungleMapScene.js';
import WorldMapTravel from '../../utils/WorldMapTravel.js';
import { drawWorldMapPaths, mapFoot, WORLD_MAP_EXITS } from '../../utils/worldMapRoutes.js';
import { normalizeWorldProgress, saveProgress } from '../../saveManager.js';
import { applyInventoryToSave, normalizeInventory } from '../../utils/inventory.js';
import { applyWeaponAppearance } from '../../utils/weapons.js';
import { GAME_MODES } from '../../utils/itemRegistry.js';
import InventoryOverlay from '../../ui/InventoryOverlay.js';
import { playMusic } from '../../soundManager.js';

// These are walking positions on the shore, not playable levels or level markers.
export const WATER_SHORE = [
  { id: 'Seeufer', x: 210, y: 288, neighbors: ['Wasserkante'] },
  { id: 'Wasserkante', x: 275, y: 318, neighbors: ['Seeufer'] },
];
const labelStyle = { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px',
  color: '#fff2c9', stroke: '#183b25', strokeThickness: 4 };

export default class WaterMapScene extends JungleMapScene {
  constructor() { super('WaterMapScene'); }
  init(data) { this.entryFromJungle = Boolean(data?.fromJungle); if (data) delete data.fromJungle; }

  create() {
    this.isMoving = false; this.inventoryOpen = false; this.gameMode = GAME_MODES.ISOMETRIC;
    const save = normalizeWorldProgress(this.registry.get('saveData') || {});
    if (!save.unlockedWorlds.includes('water')) { this.scene.start('JungleMapScene'); return; }
    const normalized = normalizeInventory(save);
    this.inventory = normalized.inventory; this.equipped = normalized.equipped;
    this.health = save.health ?? 5; this.maxHealth = 5;
    this.registry.set('saveData', save);
    this.unlocked = new Set(WATER_SHORE.map(n => n.id));
    this.currentNode = WATER_SHORE.find(n => n.id === (!this.entryFromJungle && save.mapState?.waterNode)) || WATER_SHORE[0];
    this.add.image(480, 300, 'worldmap-water-bg').setDisplaySize(960, 600).setDepth(-3);
    drawWorldMapPaths(this, 'water', WATER_SHORE, [[WATER_SHORE[0], WORLD_MAP_EXITS.water.jungle]]);
    this.createPlayerMarker(); this.createUI(save); this.locationText.setText('Wasserwelt · Urwaldsee');
    this.createSnorkelSign();
    this.add.text(68, 359, '← Urwald', labelStyle).setOrigin(.5).setDepth(6)
      .setInteractive({ useHandCursor: true }).on('pointerdown', () => this.returnToJungle());
    this.add.zone(285, 355, 130, 60).setDepth(3).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startCurrentLevel());
    this.saveLocation(); playMusic(this, 'music-world');
    this.cursors = this.input.keyboard.createCursorKeys(); this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-ENTER', () => this.startCurrentLevel());
    this.input.keyboard.on('keydown-T', () => this.useConsumable());
    this.input.keyboard.on('keydown-ESC', () => { if (this.inventoryOpen) this.closeInventory(); else if (!this.isMoving) this.scene.start('MainMenuScene'); });
    this.input.keyboard.on('keydown-TAB', () => this.toggleInventory());
    this.input.keyboard.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    this.inventoryOverlay = new InventoryOverlay(this, {
      onEquip: (slot, id) => this.handleInventoryEquip(slot, id), onClose: () => this.closeInventory(),
    });
    this.events.once('shutdown', () => this.inventoryOverlay.destroy());
    if (this.entryFromJungle) {
      this.entryFromJungle = false;
      const exit = WORLD_MAP_EXITS.water.jungle, point = mapFoot(exit);
      this.playerMarker.setPosition(point.x, point.y); this.companionMarker.setPosition(point.x - 28, point.y);
      this.mapTravel.travel(exit, this.currentNode);
    }
  }

  createPlayerMarker() {
    const point = mapFoot(this.currentNode), save = this.registry.get('saveData') || {};
    this.playerMarker = this.add.image(point.x, point.y, save.playerGender === 'female' ? 'knight-female-standing' : 'knight-standing')
      .setOrigin(.5, 1).setScale(.46).setDepth(5);
    applyWeaponAppearance(this, this.playerMarker);
    this.companionMarker = this.add.image(point.x - 28, point.y, 'companion-running')
      .setOrigin(.5, 1).setScale(.46).setDepth(5).setVisible(Boolean(this.equipped.companion));
    this.mapTravel = new WorldMapTravel(this, 'water');
  }

  createSnorkelSign() {
    const g = this.add.graphics().setDepth(4), x = 340, y = 272;
    g.fillStyle(0x442b17, .25).fillEllipse(x + 2, y + 63, 78, 12);
    g.fillStyle(0x694221).fillRoundedRect(x - 5, y + 26, 11, 38, 2);
    g.fillStyle(0x59371e).fillRoundedRect(x - 49, y - 42, 98, 82, 6);
    g.fillStyle(0xb78243).fillRoundedRect(x - 46, y - 39, 92, 75, 5);
    g.lineStyle(1.5, 0x81532b, .65);
    for (const dy of [-27, -8, 14, 28]) g.lineBetween(x - 40, y + dy, x + 40, y + dy + 2);
    // A red requirement ring around swimming goggles and a snorkel, without a
    // prohibition slash: the equipment opens this route in a future adventure.
    g.lineStyle(4, 0xbd3435).strokeCircle(x, y - 1, 30);
    g.fillStyle(0x173b48).fillRoundedRect(x - 20, y - 7, 34, 16, 6);
    g.lineStyle(3, 0xe3f7f3).strokeRoundedRect(x - 20, y - 7, 34, 16, 6);
    g.fillStyle(0x76d7e5, .95).fillRoundedRect(x - 15, y - 3, 9, 7, 2).fillRoundedRect(x + 1, y - 3, 8, 7, 2);
    g.lineStyle(5, 0x46bbc9).lineBetween(x + 17, y + 8, x + 22, y + 8).lineBetween(x + 22, y + 8, x + 22, y - 20).lineBetween(x + 22, y - 20, x + 16, y - 20);
    for (const dx of [-38, 38]) for (const dy of [-30, 27]) g.fillStyle(0x50331e).fillCircle(x + dx, y + dy, 2);
    this.add.zone(x, y, 112, 94).setDepth(6).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startCurrentLevel());
    this.add.text(x + 5, y + 79, 'Schnorchel benötigt', { ...labelStyle, fontSize: '16px' }).setOrigin(.5).setDepth(6);
  }

  saveLocation() {
    const save = this.registry.get('saveData') || {};
    const next = applyInventoryToSave({ ...save, currentWorld: 'water', currentLevel: 'Seeufer', health: this.health,
      mapState: { ...save.mapState, waterNode: this.currentNode.id } }, this.inventory, this.equipped);
    this.registry.set('saveData', next); saveProgress(next);
    this.locationText?.setText('Wasserwelt · Urwaldsee');
  }
  startCurrentLevel() {
    if (this.isMoving || this.inventoryOpen) return;
    if (this.currentNode.id === 'Seeufer') this.walkTo(WATER_SHORE[1]);
    else this.showHint('Mit einem Schnorchel kannst du hier später unter Wasser weiterreisen.');
  }
  tryMove(direction) {
    if (direction.x < 0) {
      if (this.currentNode.id === 'Wasserkante') this.walkTo(WATER_SHORE[0]); else this.returnToJungle();
    } else if (direction.x > 0) this.startCurrentLevel();
  }
  returnToJungle() {
    if (this.isMoving || this.inventoryOpen) return;
    const leave = () => {
      const save = this.registry.get('saveData') || {};
      const next = { ...save, currentWorld: 'jungle', currentLevel: 'Lianenpfad',
        mapState: { ...save.mapState, jungleNode: 'Lianenpfad', waterNode: 'Seeufer' } };
      this.registry.set('saveData', next); saveProgress(next);
      this.mapTravel.travel(WATER_SHORE[0], WORLD_MAP_EXITS.water.jungle, () => this.scene.start('JungleMapScene', { fromWater: true }));
    };
    if (this.currentNode.id === 'Seeufer') leave(); else this.mapTravel.travel(this.currentNode, WATER_SHORE[0], leave);
  }
}
