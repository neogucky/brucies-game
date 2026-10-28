import ShopSceneBase from "../shop/ShopSceneBase.js";
import { saveProgress } from "../../saveManager.js";

export default class JungleShopScene extends ShopSceneBase {
  constructor() { super("JungleShopScene"); }
  getShopConfig() {
    return { levelId: "UrwaldShop", returnSceneKey: "JungleMapScene", backgroundKey: "jungle-shop",
      locationText: "Urwald-Shop", items: [
        { id: "bow", label: "Pfeil & Bogen", icon: "item-bow", price: 300,
          successText: "Lege den Bogen im Inventar auf den Zweitwaffenplatz.\nSchießen · {shoot}. Halte ↑, um nach oben zu zielen!" },
        { id: "honey", label: "Honigsaft", icon: "item-honey", price: 10,
          successText: "Ein Honigsaft für deine Reise. Trinken · {potion1}." },
        { id: "jungleShield", label: "Urwaldschild", icon: "item-jungle-shield", price: 200,
          successText: "Dein Urwaldschild schickt ein Geschoss zurück!\nBogen, Schild und Schuhe bleiben gleichzeitig ausgerüstet." },
      ] };
  }
  create() {
    super.create();
    const save = this.getSaveData();
    const next = { ...save, currentWorld: "jungle", currentLevel: "UrwaldShop", visitedJungleShop: true,
      mapState: { ...save.mapState, jungleNode: "UrwaldShop" } };
    this.registry.set("saveData", next); saveProgress(next);
  }
  showLoadingScreen() { this.isLoading = false; this.createShelf(); this.showGreetingDialog(); }
  showGreetingDialog() {
    const female = this.getSaveData().playerGender === "female";
    const greeting = this.getSaveData().visitedJungleShop
      ? "Da bist du ja wieder! Die Affen haben hoffentlich noch nicht deinen ganzen Proviant stibitzt?"
      : `Ich erkenne dich doch! ${female ? "Die tapfere Ritterin" : "Der tapfere Ritter"} aus meiner Taverne!\nFür gute Kokosnüsse reise ich sogar bis in den Urwald.`;
    this.dialog.show([{ text: greeting }, { text: "Die Affen warfen ständig nach meinem Honig. Also habe ich diesen Urwaldschild gebaut: Er schickt ihre Geschosse zurück!\nSchau dich um – alles hier kannst du antippen." }], "bottom", { portraitKey: "tavern-barkeeper", portraitZoom: 1.3 });
  }
}
