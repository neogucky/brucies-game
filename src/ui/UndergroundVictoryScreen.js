export default function showUndergroundVictory(scene, { name, reward, unlocked, unlockedWorld, onContinue }) {
  const screen = scene.add.container(0, 0).setDepth(400);
  const shade = scene.add.rectangle(480, 300, 960, 600, 0x10141d, 0.91);
  const panel = scene.add.rectangle(480, 300, 710, 470, 0x272b36, 0.98)
    .setStrokeStyle(3, 0xd5b361);
  const title = scene.add.text(480, 124, "SIEG!", {
    fontFamily: "Georgia, serif", fontSize: "58px", color: "#ffe29a",
    stroke: "#594021", strokeThickness: 5,
  }).setOrigin(0.5);
  const subtitle = scene.add.text(480, 188, name + " ist besiegt!", {
    fontFamily: "Trebuchet MS, sans-serif", fontSize: "24px", color: "#ffffff",
  }).setOrigin(0.5);
  const hero = scene.add.image(425, 303, scene.player.getData("standingTexture")).setScale(0.8);
  const helper = scene.add.image(533, 329, "companion-running").setScale(0.65);
  const coin = scene.add.image(425, 397, "ui-coin").setDisplaySize(27, 27);
  const gold = scene.add.text(450, 397, "+" + reward + " Gold", {
    fontFamily: "Trebuchet MS, sans-serif", fontSize: "25px", color: "#ffe29a",
  }).setOrigin(0, 0.5);
  const message = scene.add.text(480, 443, unlockedWorld === "jungle"
    ? "Neue Welt freigeschaltet: Urwaldwelt\nAuf der Unterweltkarte bei Kristalltiefen nach rechts gehen."
    : unlocked
    ? "Neu freigeschaltet: Kristalltiefen · Schatzsuche & Superboss"
    : "Du hast die Kristalltiefen und ihren Superboss bezwungen!", {
    fontFamily: "Trebuchet MS, sans-serif", fontSize: "18px", color: "#bce0ef",
    align: "center", wordWrap: { width: 650 },
  }).setOrigin(0.5);
  const button = scene.add.rectangle(480, 500, 310, 44, 0x705b36)
    .setStrokeStyle(1, 0xe7c47c).setInteractive({ useHandCursor: true });
  const hint = scene.add.text(480, 500, "Enter / Esc · Zur Unterweltkarte", {
    fontFamily: "Trebuchet MS, sans-serif", fontSize: "17px", color: "#ffffff",
  }).setOrigin(0.5);
  screen.add([shade, panel, title, subtitle, hero, helper, coin, gold, message, button, hint]);
  screen.setScrollFactor(0, 0, true);
  let leaving = false;
  const leave = () => {
    if (leaving) return;
    leaving = true;
    onContinue();
  };
  button.on("pointerdown", leave);
  scene.input.keyboard.once("keydown-ENTER", leave);
  scene.input.keyboard.once("keydown-ESC", leave);
  scene.tweens.add({ targets: title, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
  return screen;
}
