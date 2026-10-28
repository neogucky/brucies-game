import { getWorldMapRoute, pointOnMapRoute, MAP_TRAVEL_SPEED } from "./worldMapRoutes.js";

export const MAP_STRIDE_PX = 112;

export default class WorldMapTravel {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.distance = 0;
    this.totalWalked = 0;
    this.active = false;
    this.shadow = scene.add.ellipse(0, 0, 28, 7, 0x17201b, .28).setDepth(4);
    this.helperShadow = scene.add.ellipse(0, 0, 17, 5, 0x17201b, .22).setDepth(4);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
    this.updateShadows();
  }

  travel(from, to, onComplete) {
    if (this.active) return false;
    this.route = getWorldMapRoute(this.world, from, to);
    this.distance = 0;
    this.helperStart = { x: this.scene.companionMarker.x, y: this.scene.companionMarker.y };
    this.onComplete = onComplete;
    this.active = true;
    this.scene.isMoving = true;
    if (!this.route.length) this.finish();
    return true;
  }

  update(_time, delta = 0) {
    const scene = this.scene, player = scene.playerMarker, helper = scene.companionMarker;
    if (!player?.active) return;
    if (!this.active) { this.updateShadows(); return; }
    const step = Math.min(this.route.length - this.distance, Math.max(0, delta) / 1000 * (scene.travelSpeed || MAP_TRAVEL_SPEED));
    this.distance += step; this.totalWalked += step;
    const point = pointOnMapRoute(this.route, this.distance);
    const ahead = pointOnMapRoute(this.route, Math.min(this.route.length, this.distance + 3));
    const behind = pointOnMapRoute(this.route, Math.max(0, this.distance - 3));
    const dx = ahead.x - behind.x;
    if (Math.abs(dx) > .15) player.setFlipX(dx < 0);
    const female = scene.registry.get("saveData")?.playerGender === "female";
    const frame = Math.floor(this.totalWalked / MAP_STRIDE_PX * 6) % 6;
    player.setTexture(`knight${female ? "-female" : ""}-walk-${frame}`);
    player.setPosition(point.x, point.y - Math.abs(Math.sin(this.totalWalked / MAP_STRIDE_PX * Math.PI * 2)) * 1.1);
    this.placeInLandscape(player, point, this.shadow);
    this.ground = point;
    if (helper?.visible) {
      const follow = pointOnMapRoute(this.route, Math.max(0, this.distance - 30));
      const join = Math.min(1, this.distance / 30);
      this.helperGround = { x: this.helperStart.x + (follow.x - this.helperStart.x) * join,
        y: this.helperStart.y + (follow.y - this.helperStart.y) * join };
      helper.setFlipX(dx < 0).setPosition(this.helperGround.x,
        this.helperGround.y - Math.abs(Math.sin(this.totalWalked / 60 * Math.PI)) * 4);
      this.placeInLandscape(helper, this.helperGround, this.helperShadow);
    }
    this.updateShadows();
    if (this.distance >= this.route.length) this.finish();
  }

  updateShadows() {
    const player = this.scene.playerMarker, helper = this.scene.companionMarker;
    const ground = this.active && this.ground ? this.ground : player;
    this.shadow.setPosition(ground.x, ground.y - 2);
    const helperGround = this.active && this.helperGround ? this.helperGround : helper;
    this.helperShadow.setVisible(Boolean(helper?.visible)).setPosition(helperGround.x, helperGround.y - 2);
  }

  placeInLandscape(actor, ground, shadow) {
    const behind = [...(this.scene.nodeSprites?.values() || [])].some(({ icon }) =>
      icon.visible !== false && ground.y < icon.y - 8 && ground.y > icon.y - icon.displayHeight - 8 &&
      Math.abs(ground.x - icon.x) < icon.displayWidth * .4);
    actor.setDepth(behind ? 1 : 5); shadow.setDepth(behind ? 0 : 4);
  }

  finish() {
    this.active = false;
    const scene = this.scene, player = scene.playerMarker;
    const point = pointOnMapRoute(this.route, this.route.length);
    player.setPosition(point.x, point.y).setTexture(player.getData("standingTexture") || "knight-standing").setDepth(5);
    this.shadow.setDepth(4);
    this.placeInLandscape(player, point, this.shadow);
    if (scene.companionMarker.visible && this.helperGround) scene.companionMarker.setPosition(this.helperGround.x, this.helperGround.y);
    if (scene.companionMarker.visible) this.placeInLandscape(scene.companionMarker, scene.companionMarker, this.helperShadow);
    scene.isMoving = false;
    this.updateShadows();
    const callback = this.onComplete; this.onComplete = null;
    callback?.();
  }

  destroy() {
    this.active = false;
    this.onComplete = null;
    this.scene.events.off("update", this.update, this);
  }
}
