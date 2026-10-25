import { ITEM_DEFS, GAME_MODES } from "../utils/itemRegistry.js";
import { syncEquipment } from "../utils/inventory.js";
import { getWeaponTextures } from "../utils/weapons.js";

const ITEMS = {
  sword: ['Schwert', 'item-sword'], powerHammer: ['Power Hammer', 'item-power-hammer'],
  bow: ['Bogen', 'item-bow'], shield: ['Schild', 'item-shield'], jungleShield: ['Urwaldschild', 'item-jungle-shield'],
  helmet: ['Ritterhelm', 'item-helmet'], shoes: ['Flügelschuhe', 'item-winged-shoes'], leatherBelt: ['Ledergürtel', 'item-belt'],
  honey: ['Honigsaft', 'item-honey'], default: ['Kleiner Helfer', 'item-companion'],
};
const STYLE = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff0ca' };
export default class InventoryOverlay {
  constructor(scene, { onEquip, onClose } = {}) {
    this.scene = scene; this.onEquip = onEquip; this.onClose = onClose;
    this.isOpen = false; this.keyHandlers = []; this.columns = []; this.selection = { col: 0, row: 0 };
  }
  open(inventory, equipped) {
    this.inventory = inventory; this.equipped = equipped; this.isOpen = true;
    this.selection = { col: 0, row: 0 }; this.resetMovementKeys(); this.build(); this.bindKeys();
  }
  close() { this.isOpen = false; this.container?.setVisible(false); this.unbindKeys(); this.chooser = null; }
  setVisible(value) { this.container?.setVisible(value); }
  destroy() { this.unbindKeys(); this.container?.destroy(true); this.container = null; }
  resetMovementKeys() {
    [...Object.values(this.scene.cursors || {}), ...Object.values(this.scene.wasd || {})].forEach(k => k?.reset?.());
    this.scene.player?.body?.setVelocity(0, 0);
  }
  createColumns() {
    const i = this.inventory || {}, e = this.equipped || {};
    const option = id => ({ id, icon: ITEMS[id]?.[1] || null, label: ITEMS[id]?.[0] || 'Leer',
      supportedModes: ITEM_DEFS[id]?.supportedModes || [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP],
      count: id === 'honey' ? '×' + (i.consumables?.honey || 0) : '' });
    const owned = (ids, group) => [option(null), ...ids.filter(id => group?.[id]).map(option)];
    const potions = () => [option(null), ...(i.consumables?.honey > 0 ? [option('honey')] : [])];
    return [
      { key: 'weapon', title: 'Primärwaffe', x: 200, y: 172, options: owned(['sword', 'powerHammer'], i.weapons) },
      { key: 'secondary', title: 'Sekundärwaffe', x: 200, y: 292, options: owned(['bow'], i.passives) },
      { key: 'shield', title: 'Schild · Rücken', x: 200, y: 412, options: owned(['shield', 'jungleShield'], i.passives) },
      { key: 'helmet', title: 'Helm', x: 760, y: 172, options: owned(['helmet'], i.armor) },
      { key: 'companion', title: 'Begleiter', x: 760, y: 292, options: owned(['default'], i.companions) },
      { key: 'shoes', title: 'Schuhe', x: 760, y: 412, options: owned(['shoes'], i.passives) },
      { key: 'consumable', title: 'Trank 1 · {potion1}', x: 370, y: 468, options: potions() },
      { key: 'belt', title: 'Gürtel', x: 480, y: 468, options: owned(['leatherBelt'], i.armor) },
      { key: 'consumable2', title: 'Trank 2 · {potion2}', x: 590, y: 468, options: potions() },
    ].map(c => ({ ...c, equipped: e[c.key] ?? null }));
  }
  build() {
    this.container?.destroy(true); this.container = this.scene.add.container(0, 0).setDepth(900).setScrollFactor(0);
    const add = obj => { this.container.add(obj); return obj; };
    add(this.scene.add.rectangle(480, 300, 960, 600, 0x08150f, .8).setInteractive());
    add(this.scene.add.rectangle(480, 300, 860, 530, 0x263b30, .99).setStrokeStyle(3, 0xc6a86c));
    add(this.scene.add.text(480, 67, 'DEINE AUSRÜSTUNG', { ...STYLE, fontFamily: 'Georgia, serif', fontSize: '28px' }).setOrigin(.5));
    add(this.scene.add.text(480, 102, 'Alle Plätze sind gleichzeitig aktiv · Platz antippen zum Wechseln', { ...STYLE, fontSize: '15px', color: '#bcd0b2' }).setOrigin(.5));
    add(this.scene.add.ellipse(480, 402, 180, 28, 0x0b2117, .5));
    const gender = this.scene.registry.get('saveData')?.playerGender;
    const texture = getWeaponTextures(this.equipped.weapon, gender).standingTexture;
    this.portrait = add(this.scene.add.image(480, 300, texture).setDisplaySize(245, 245));
    this.columns = this.createColumns();
    this.columns.forEach((c, index) => {
      const current = c.options.find(o => o.id === c.equipped) || c.options[0];
      const frame = add(this.scene.add.rectangle(c.x, c.y, 82, 76, 0xe7d5ac, .13).setStrokeStyle(2, c.equipped ? 0xc8ae68 : 0x687a68));
      frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.chooseSlot(index));
      if (current.icon) add(this.scene.add.image(c.x, c.y, current.icon).setDisplaySize(60, 60));
      else add(this.scene.add.text(c.x, c.y, '+', { ...STYLE, fontSize: '28px', color: '#6d826e' }).setOrigin(.5));
      add(this.scene.add.text(c.x, c.y - 51, c.title, { ...STYLE, fontSize: '16px' }).setOrigin(.5));
      add(this.scene.add.text(c.x, c.y + 47, current.label + (current.count ? ' '+current.count : ''), { ...STYLE, fontSize: '13px', color: '#b9c9ad' }).setOrigin(.5));
      c.frame = frame;
    });
    add(this.scene.add.text(860, 65, 'Schließen × · {back}', { ...STYLE, fontSize: '17px', backgroundColor: '#526044', padding: { x: 10, y: 9 } })
      .setOrigin(1, .5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.close(); this.onClose?.(); }));
    this.refreshHighlights(); this.container.setScrollFactor(0); this.container.list.forEach(child => child.setScrollFactor(0));
  }
  chooseSlot(index, row = 0) {
    this.selection.col = index; this.selection.row = row; this.refreshHighlights();
    this.chooser?.destroy(true);
    const c = this.columns[index];
    this.chooser = this.scene.add.container(0, 0); this.container.add(this.chooser);
    const height = c.options.length * 62 + 60;
    this.chooser.add(this.scene.add.rectangle(480, 300, 330, height, 0x142d20, .99).setStrokeStyle(2, 0xc8ae68));
    this.chooser.add(this.scene.add.text(480, 300-height/2+22, c.title, { ...STYLE, fontSize: '19px' }).setOrigin(.5));
    c.options.forEach((o, row) => {
      const y = 300-height/2+62+row*62;
      const b = this.scene.add.text(480, y, o.label + (o.count ? ' '+o.count : ''), { ...STYLE, fontSize: '19px', backgroundColor: row === this.selection.row ? '#4c7164' : o.id === c.equipped ? '#735e36' : '#34503b', padding: { x: 24, y: 12 } })
        .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.selection.row = row; this.applySelection(); });
      this.chooser.add(b);
    });
    this.chooser.setScrollFactor(0); this.chooser.list.forEach(child => child.setScrollFactor(0));
  }
  confirm() { if (!this.chooser) this.chooseSlot(this.selection.col); else this.applySelection(); }
  applySelection() {
    const c = this.columns[this.selection.col], o = c?.options[this.selection.row]; if (!o) return;
    this.equipped[c.key] = o.id;
    // Retain the old field only as a compatibility alias for the secondary weapon.
    this.equipped.passive = this.equipped.secondary || null;
    Object.assign(this.scene.equipped, this.equipped);
    this.onEquip?.(c.key, o.id); syncEquipment(this.scene);
    this.scene.saveInventory?.(); this.scene.saveState?.();
    this.chooser = null; this.build();
  }
  refreshHighlights() { this.columns.forEach((c, i) => c.frame?.setStrokeStyle(i === this.selection.col ? 3 : 2, i === this.selection.col ? 0x9ad3e0 : c.equipped ? 0xc8ae68 : 0x687a68)); }
  selectColumn(index) { this.selection.col = (index + this.columns.length) % this.columns.length; this.selection.row = 0; this.refreshHighlights(); }
  bindKeys() {
    this.unbindKeys(); const keyboard = this.scene.input.keyboard;
    const handler = event => {
      if (!this.isOpen) return;
      const delta = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : ['ArrowRight', 'ArrowDown'].includes(event.code) ? 1 : 0;
      if (delta) {
        if (this.chooser) { const n = this.columns[this.selection.col].options.length; this.chooseSlot(this.selection.col, (this.selection.row + delta + n) % n); }
        else this.selectColumn(this.selection.col + delta);
      }
      if (event.code === 'Enter') this.confirm();
    };
    keyboard.on('keydown', handler); this.keyHandlers.push(handler);
  }
  unbindKeys() { this.keyHandlers.forEach(h => this.scene.input.keyboard.off('keydown', h)); this.keyHandlers = []; }
}
