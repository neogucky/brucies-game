import { ITEM_DEFS, GAME_MODES } from "../utils/itemRegistry.js";

export default class InventoryOverlay {
  constructor(scene, { onEquip, onClose } = {}) {
    this.scene = scene;
    this.onEquip = onEquip;
    this.onClose = onClose;
    this.container = null;
    this.columns = [];
    this.selection = { col: 0, row: 0 };
    this.inventory = null;
    this.equipped = null;
    this.keyHandlers = [];
  }

  open(inventory, equipped) {
    this.inventory = inventory;
    this.equipped = equipped;
    this.isOpen = true;
    this.resetMovementKeys();
    this.build();
    this.setVisible(true);
    this.selectColumn(0, true);
    this.bindKeys();
  }

  close() {
    this.isOpen = false;
    this.setVisible(false);
    this.unbindKeys();
  }

  destroy() {
    this.unbindKeys();
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }

  resetMovementKeys() {
    const cursors = this.scene.cursors;
    if (cursors) {
      cursors.left?.reset();
      cursors.right?.reset();
      cursors.up?.reset();
      cursors.down?.reset();
    }
    const wasd = this.scene.wasd;
    if (wasd) {
      wasd.W?.reset();
      wasd.A?.reset();
      wasd.S?.reset();
      wasd.D?.reset();
    }
  }

  build() {
    if (this.container) {
      this.container.destroy(true);
    }
    const width = 720;
    const height = 360;
    const centerX = 480;
    const centerY = 300;
    this.container = this.scene.add.container(0, 0);
    const bg = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x2f2418, 0.93)
      .setStrokeStyle(3, 0x8a6b44);
    this.container.add(bg);

    this.columns = this.createColumns();
    const colWidth = 170;
    const colGap = 10;
    const startX = centerX - (colWidth * this.columns.length + colGap * (this.columns.length - 1)) / 2;
    const headerY = centerY - height / 2 + 18;
    const startY = headerY + 28;
    const slotSize = 64;
    const slotGap = 16;

    this.columns.forEach((column, colIndex) => {
      const colX = startX + colIndex * (colWidth + colGap);
      const title = this.scene.add
        .text(colX + colWidth / 2, headerY, column.title, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "14px",
          color: "#f7e3c0",
        })
        .setOrigin(0.5, 0.5);
      this.container.add(title);

      column.slots = column.options.map((option, rowIndex) => {
        const x = colX + colWidth / 2;
        const y = startY + rowIndex * (slotSize + slotGap);
        const frame = this.scene.add.rectangle(x, y, slotSize, slotSize, 0xf2e3c5, 0.9);
        frame.setStrokeStyle(2, 0xdbc1a0);
        const equippedBorder = this.scene.add.rectangle(x, y, slotSize + 6, slotSize + 6);
        equippedBorder.setStrokeStyle(2, 0xf5d37a);
        equippedBorder.setFillStyle(0x000000, 0);
        const selectBorder = this.scene.add.rectangle(x, y, slotSize + 10, slotSize + 10);
        selectBorder.setStrokeStyle(2, 0x84a7d8);
        selectBorder.setFillStyle(0x000000, 0);
        const icon = option.icon
          ? this.scene.add.image(x, y, option.icon).setScale(0.28)
          : null;
        if (icon && option.greyed) {
          icon.setAlpha(0.25);
        }
        const label = option.label
          ? this.scene.add
              .text(x, y + slotSize / 2 + 10, option.label, {
                fontFamily: "Trebuchet MS, sans-serif",
                fontSize: "12px",
                color: "#e7d6b8",
              })
              .setOrigin(0.5, 0)
          : null;
        const countText = option.count
          ? this.scene.add
              .text(x + 20, y - 20, option.count, {
                fontFamily: "Trebuchet MS, sans-serif",
                fontSize: "12px",
                color: "#ffffff",
              })
              .setOrigin(0.5)
          : null;
        this.container.add(frame);
        this.container.add(equippedBorder);
        this.container.add(selectBorder);
        if (icon) this.container.add(icon);
        if (label) this.container.add(label);
        if (countText) this.container.add(countText);
        return {
          option,
          frame,
          equippedBorder,
          selectBorder,
          icon,
          label,
          countText,
        };
      });
    });
    this.refreshHighlights();
    this.container.setDepth(200);
  }

  createColumns() {
    const inventory = this.inventory || {};
    const equipped = this.equipped || {};
    const defaultModes = [GAME_MODES.ISOMETRIC, GAME_MODES.JUMP];
    const withModes = (id, base) => ({
      ...base,
      supportedModes: ITEM_DEFS[id]?.supportedModes || defaultModes,
    });
    const weapons = [{ id: null, icon: null, label: "" }];
    if (inventory.weapons?.sword) {
      weapons.push(withModes("sword", { id: "sword", icon: "item-sword", label: "Schwert" }));
    }

    const passives = [{ id: null, icon: null, label: "" }];
    if (inventory.passives?.shield) {
      passives.push(withModes("shield", { id: "shield", icon: "item-shield", label: "Schild" }));
    }
    if (inventory.passives?.shoes) {
      passives.push(
        withModes("shoes", { id: "shoes", icon: "item-winged-shoes", label: "Schuhe" })
      );
    }

    const consumables = [{ id: null, icon: null, label: "" }];
    const honeyCount = inventory.consumables?.honey ?? 0;
    if (honeyCount > 0) {
      consumables.push(
        withModes("honey", {
          id: "honey",
          icon: "item-honey",
          label: "Honigsaft",
          count: `x${honeyCount}`,
        })
      );
    }

    const companions = [
      { id: null, icon: "item-companion", label: "", greyed: true, supportedModes: defaultModes },
    ];
    if (inventory.companions?.default) {
      companions.push(
        withModes("default", { id: "default", icon: "item-companion", label: "Begleiter" })
      );
    }

    return [
      { key: "weapon", title: "Primär", options: weapons, equipped: equipped.weapon ?? null },
      { key: "passive", title: "Passiv", options: passives, equipped: equipped.passive ?? null },
      { key: "consumable", title: "Verbrauch", options: consumables, equipped: equipped.consumable ?? null },
      { key: "companion", title: "Begleiter", options: companions, equipped: equipped.companion ?? null },
    ];
  }

  bindKeys() {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    const onKey = (event) => {
      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          event.preventDefault();
          event.stopPropagation();
          this.moveSelection(-1, 0);
          break;
        case "ArrowRight":
        case "KeyD":
          event.preventDefault();
          event.stopPropagation();
          this.moveSelection(1, 0);
          break;
        case "ArrowUp":
        case "KeyW":
          event.preventDefault();
          event.stopPropagation();
          this.moveSelection(0, -1);
          break;
        case "ArrowDown":
        case "KeyS":
          event.preventDefault();
          event.stopPropagation();
          this.moveSelection(0, 1);
          break;
        case "Enter":
          event.preventDefault();
          event.stopPropagation();
          this.applySelection();
          break;
        case "Tab":
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          this.close();
          if (this.onClose) {
            this.onClose();
          }
          break;
        default:
          break;
      }
    };
    keyboard.on("keydown", onKey);
    this.keyHandlers.push({ event: "keydown", handler: onKey });
  }

  unbindKeys() {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    this.keyHandlers.forEach(({ event, handler }) => {
      keyboard.off(event, handler);
    });
    this.keyHandlers = [];
  }

  setVisible(visible) {
    if (!this.container) return;
    this.container.setVisible(visible);
  }

  moveSelection(dx, dy) {
    const colCount = this.columns.length;
    let newCol = Phaser.Math.Clamp(this.selection.col + dx, 0, colCount - 1);
    if (dx !== 0) {
      this.selectColumn(newCol, true);
      return;
    }
    const rowCount = this.columns[this.selection.col].options.length;
    const newRow = Phaser.Math.Clamp(this.selection.row + dy, 0, rowCount - 1);
    this.selection = { col: this.selection.col, row: newRow };
    this.refreshHighlights();
  }

  selectColumn(colIndex, pickEquipped) {
    this.selection.col = colIndex;
    const column = this.columns[colIndex];
    if (!column) return;
    if (pickEquipped) {
      const equippedId = column.equipped ?? null;
      const idx = column.options.findIndex((opt) => opt.id === equippedId);
      this.selection.row = idx >= 0 ? idx : 0;
    } else {
      this.selection.row = 0;
    }
    this.refreshHighlights();
  }

  refreshHighlights() {
    this.columns.forEach((column, colIndex) => {
      column.slots.forEach((slot, rowIndex) => {
        const isSelected = colIndex === this.selection.col && rowIndex === this.selection.row;
        const isEquipped = slot.option.id === column.equipped;
        slot.selectBorder.setVisible(isSelected);
        slot.equippedBorder.setVisible(isEquipped);
      });
    });
  }

  applySelection() {
    const column = this.columns[this.selection.col];
    if (!column) return;
    const option = column.options[this.selection.row];
    if (!option) return;
    column.equipped = option.id;
    this.equipped = {
      ...this.equipped,
      [column.key]: option.id,
    };
    this.refreshHighlights();
    if (this.onEquip) {
      this.onEquip(column.key, option.id);
    }
  }
}
