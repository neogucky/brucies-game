import ShopSceneBase from "../shop/ShopSceneBase.js";

export default class TavernScene extends ShopSceneBase {
  constructor() {
    super("TavernScene");
  }

  getShopConfig() {
    return {
      levelId: "Taverne",
      returnSceneKey: "DessertMapScene",
      backgroundKey: "tavern-bg",
      loadingKey: "tavern-loading",
      locationText: "Taverne",
      greetingText: "Willkommen in meiner Taverne, Sir Ritter!",
      promptText: "Was möchtest du kaufen?",
      items: [
        {
          id: "honey",
          label: "Honigsaft",
          price: 10,
          successText: "Hier ist der Honigsaft, darf es noch etwas sein?",
        },
        {
          id: "shield",
          label: "Schild",
          price: 100,
          successText: "Hier ist mein alter Schild\nHoffentlich wird er dich beschützen!",
        },
      ],
    };
  }
}
