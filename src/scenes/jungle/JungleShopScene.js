import ShopSceneBase from "../shop/ShopSceneBase.js";
import { saveProgress } from "../../saveManager.js";
import InventoryOverlay from "../../ui/InventoryOverlay.js";

export default class JungleShopScene extends ShopSceneBase {
  constructor() { super("JungleShopScene"); }
  getShopConfig() {
    return { levelId: "UrwaldShop", returnSceneKey: "JungleMapScene", backgroundKey: "jungle-shop",
      locationText: "Urwald-Shop", items: [
        { id: "bow", label: "Pfeil & Bogen", icon: "item-bow", price: 300,
          successText: "Der Bogen gehört dir! Im Inventar unter Sekundär ausrüsten.\nMit Shift schießen · Reichweite etwa 10 Kacheln." },
        { id: "honey", label: "Honigsaft", icon: "item-honey", price: 10,
          successText: "Ein Honigsaft für deine Reise. Mit T benutzen." },
        { id: "shield", label: "Schild", icon: "item-shield", price: 100,
          successText: "Ein Schild für deine Reise. Bogen und Schild teilen sich den Sekundärplatz." },
      ] };
  }
  create() {
    super.create();
    this.inventoryOpen = false;
    this.inventoryOverlay = new InventoryOverlay(this, {
      onEquip: (slot, id) => this.equipInventoryItem(slot, id),
      onClose: () => { this.inventoryOpen = false; },
    });
    this.events.once("shutdown", () => this.inventoryOverlay.destroy());
    const save = this.getSaveData();
    const next = { ...save, currentWorld: "jungle", currentLevel: "UrwaldShop",
      mapState: { ...save.mapState, jungleNode: "UrwaldShop" } };
    this.registry.set("saveData", next); saveProgress(next);
  }
  showLoadingScreen() { this.isLoading = false; this.createShelf(); }
  createShelf() {
    this.selectedIndex = 0; this.buyButtons = [];
    this.add.text(650, 110, "URWALD-SHOP", { fontFamily: "Georgia, serif", fontSize: "34px",
      color: "#ffedb0", stroke: "#163c2c", strokeThickness: 5 }).setOrigin(.5);
    this.shopConfig.items.forEach((item, i) => {
      const y = 205 + i * 105;
      const card = this.add.rectangle(672, y, 450, 92, 0x183f2e, .95).setStrokeStyle(2, 0xa6ae6d)
        .setInteractive({ useHandCursor: true });
      this.add.image(495, y, item.icon).setDisplaySize(60, 60);
      this.add.text(540, y - 17, item.label, { fontFamily: "Georgia, serif", fontSize: "23px", color: "#fff1c3" });
      const price = this.add.text(540, y + 13, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "17px", color: "#d7e9bc" });
      card.on("pointerdown", () => { this.selectedIndex = i; this.buyItem(item); this.refreshShelf(); });
      this.buyButtons.push({ card, price, item });
    });
    this.statusText = this.add.text(665, 490, "Bogen ausrüsten: Inventar → Sekundär\nShift: Schießen · Schild oder Bogen wählbar", {
      fontFamily: "Trebuchet MS, sans-serif", fontSize: "16px", color: "#fff1bd", align: "center",
      wordWrap: { width: 470 }, stroke: "#133527", strokeThickness: 3,
    }).setOrigin(.5);
    this.input.keyboard.on("keydown-UP", () => { if (!this.inventoryOpen) { this.selectedIndex = (this.selectedIndex + 2) % 3; this.refreshShelf(); } });
    this.input.keyboard.on("keydown-DOWN", () => { if (!this.inventoryOpen) { this.selectedIndex = (this.selectedIndex + 1) % 3; this.refreshShelf(); } });
    this.input.keyboard.on("keydown-ENTER", () => { if (!this.inventoryOpen) this.buyItem(this.shopConfig.items[this.selectedIndex]); });
    const back = this.add.text(170, 535, "← Zur Urwaldkarte", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px",
      color: "#fff0bd", backgroundColor: "#2e523b", padding: { x: 16, y: 12 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("JungleMapScene"));
    this.refreshShelf();
  }
  refreshShelf() {
    this.buyButtons.forEach(({ card, price, item }, i) => {
      const available = this.canShowItem(item);
      price.setText(available ? item.price + " Gold · Kaufen" : "Bereits im Inventar ✓");
      card.setStrokeStyle(i === this.selectedIndex ? 4 : 1, i === this.selectedIndex ? 0xffdc88 : 0x72926d);
      card.setAlpha(available ? 1 : .65);
    });
  }
  showPurchaseMessage(text) { this.statusText.setText(text); this.refreshShelf(); }
  toggleInventory() {
    if (this.inventoryOpen) { this.inventoryOverlay.close(); this.inventoryOpen = false; }
    else { this.inventoryOpen = true; this.inventoryOverlay.open(this.inventory, this.equipped); }
  }
  equipInventoryItem(slot, id) {
    this.equipped[slot] = id;
    this.hud.setActiveEquipped(this.equipped.weapon);
    this.updateHudAfterPurchase(); this.saveInventory();
  }
}
