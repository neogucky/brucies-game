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
      locationText: "Taverne",
      greetingText: "Da bist du wieder! Hier unten rumpelt es ganz schön.\nFür harte Brocken habe ich einen starken Hammer!",
      promptText: "Was möchtest du kaufen?",
      items: [
        {
          id: "powerHammer",
          label: "Power Hammer",
          price: 200,
          successText: "Rüste den Hammer im Inventar aus.\n{attack}: antippen oder halten und loslassen.\nSpringen + ↓: Landungsschlag!",
        },
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
          successText: "Der Schild fängt einen Treffer ab.\nDanach braucht er eine kleine Pause.",
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
