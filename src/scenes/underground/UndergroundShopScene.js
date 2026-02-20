import ShopSceneBase from "../shop/ShopSceneBase.js";

export default class UndergroundShopScene extends ShopSceneBase {
  constructor() {
    super("UndergroundShopScene");
  }

  getShopConfig() {
    return {
      levelId: "UnderShop",
      returnSceneKey: "UndergroundMapScene",
      backgroundKey: "underground-shop",
      loadingKey: "underground-shop-loading",
      locationText: "Unterwelt-Shop",
      greetingText: "Huch! Was hat dich denn nach hier unten verschlagen?",
      promptText: "Was möchtest du kaufen?",
      items: [
        {
          id: "honey",
          label: "Honigsaft",
          price: 10,
          successText: "Hier ist der Honigsaft, brauchst du noch etwas?",
        },
        {
          id: "shield",
          label: "Schild",
          price: 100,
          successText: "Hier ist mein alter Schild\nHoffentlich wird er dich beschützen!",
        },
        {
          id: "shoes",
          label: "Geflügelte Schuhe",
          price: 300,
          successText: "Geflügelte Schuhe für schnelle Beine!",
        },
      ],
    };
  }
}
