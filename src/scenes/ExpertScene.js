import ShopSceneBase from './shop/ShopSceneBase.js';
import { EXPERT_WORLDS, getExpertCard } from '../utils/expertKnowledge.js';
import { knownDiscoveryIds, ownedDiscoveryIds, recordDiscoveries } from '../utils/expertDiscovery.js';
import { saveProgress } from '../saveManager.js';
import { addEmphasizedText } from '../ui/emphasizedText.js';
import { formatControlHint, profileForScene } from '../utils/controlProfiles.js';

const style = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff1c7' };
const CARD_COLUMNS = 4;
export default class ExpertScene extends ShopSceneBase {
  constructor() { super('ExpertScene'); }
  init(data) { this.expertWorld = Object.hasOwn(EXPERT_WORLDS, data?.world) ? data.world : 'desert'; }
  getShopConfig() {
    const expert = EXPERT_WORLDS[this.expertWorld];
    return { levelId: expert.id, returnSceneKey: expert.map, backgroundKey: 'professor-study', locationText: expert.name, items: [] };
  }
  addBackground() {
    this.studyBackdrop = this.add.image(480, 300, this.shopConfig.backgroundKey);
    this.studyScale = Math.max(960 / this.studyBackdrop.width, 600 / this.studyBackdrop.height);
    this.studyBackdrop.setScale(this.studyScale);
  }
  create() {
    this.expert = EXPERT_WORLDS[this.expertWorld]; this.cardIndex = 0; this.showingTip = false; this.tipIndex = 0;
    super.create();
    const save = this.getSaveData(), next = { ...save, currentWorld: this.expertWorld, currentLevel: this.expert.id,
      mapState: { ...save.mapState, [this.expert.mapField]: this.expert.id },
      visitedExperts: { ...save.visitedExperts, [this.expertWorld]: true } };
    this.registry.set('saveData', next); saveProgress(next);
  }
  showLoadingScreen() {
    this.isLoading = false;
    // Existing equipment is a real discovery, including in saves from before the collection existed.
    recordDiscoveries(this, ownedDiscoveryIds(this.getSaveData()));
    this.knownCards = knownDiscoveryIds(this.getSaveData());
    this.cardIndex = Math.max(0, this.expert.cards.findIndex(id => this.knownCards.has(id)));
    this.createExpertBoard();
    // Frame the left side from the floor upwards, so the professor keeps his
    // footing while the painted chalkboard stays outside the welcome shot.
    this.studyBackdrop.setOrigin(0, 1).setPosition(0, 600).setScale(960 / (this.studyBackdrop.width * .48));
    // A separate flag lets existing adventurers hear the new dragon story once, too.
    const introduced = this.getSaveData().expertIntroductions?.[this.expertWorld];
    const pages = [...(!introduced ? [{ text: this.expert.greeting }] : []), { text: this.expert.returnGreeting }];
    this.dialog.show(pages, 'bottom', { portraitKey: 'professor-portrait', portraitZoom: 1.2,
      onClose: () => {
        const save = this.getSaveData(), next = { ...save, expertIntroductions: { ...save.expertIntroductions, [this.expertWorld]: true } };
        this.registry.set('saveData', next); saveProgress(next);
        this.studyBackdrop.setOrigin(.5).setPosition(480, 300).setScale(this.studyScale);
        this.knowledgeBoard.setVisible(true);
      } });
  }
  createExpertBoard() {
    this.mapReturnHint?.setVisible(false);
    this.add.ellipse(158, 510, 144, 18, 0x291c10, .18).setDepth(9);
    this.professorFigure = this.add.image(158, 515, 'professor-' + this.expertWorld).setOrigin(.5, 1).setScale(1.12).setDepth(10);
    this.add.text(160, 108, 'Professor Knobel', { ...style, fontFamily: 'Georgia, serif', fontSize: '24px', stroke: '#3a2818', strokeThickness: 4 }).setOrigin(.5).setDepth(12);
    this.knowledgeBoard = this.add.container(0, 0).setDepth(15).setVisible(false);
    this.knowledgeBoard.add(this.add.rectangle(628, 326, 636, 470, 0x183d2c, .98).setStrokeStyle(2, 0xc4a86b));
    this.board = this.add.container(0, 0); this.knowledgeBoard.add(this.board);
    for (const [key, delta] of [['LEFT', -1], ['A', -1], ['RIGHT', 1], ['D', 1], ['UP', -CARD_COLUMNS], ['W', -CARD_COLUMNS], ['DOWN', CARD_COLUMNS], ['S', CARD_COLUMNS]]) {
      this.input.keyboard.on('keydown-' + key, () => { if (this.canBrowseKnowledge()) this.chooseCard(delta); });
    }
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.showingTip && this.canUseKnowledge()) this.advanceTip(1);
      else if (this.canBrowseKnowledge()) this.openCard(this.cardIndex);
    });
    this.mapReturnButton = this.add.text(160, 552, '← Weltkarte · {back}', { ...style, fontSize: '20px', backgroundColor: '#34543e', padding: { x: 14, y: 12 } })
      .setOrigin(.5).setDepth(20).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.canUseKnowledge()) this.scene.start(this.expert.map);
      });
    this.knowledgeBoard.add(this.mapReturnButton);
    this.renderKnowledge();
  }
  canUseKnowledge() { return this.knowledgeBoard.visible && !this.inventoryOpen && !this.dialog?.container?.visible; }
  canBrowseKnowledge() { return this.canUseKnowledge() && !this.showingTip; }
  chooseCard(delta) {
    this.cardIndex = (this.cardIndex + delta + this.expert.cards.length) % this.expert.cards.length;
    this.renderKnowledge();
  }
  openCard(index) {
    if (!this.canBrowseKnowledge()) return false;
    this.cardIndex = index; this.tipIndex = 0;
    this.showingTip = this.knownCards.has(this.expert.cards[index]);
    this.renderKnowledge();
    return this.showingTip;
  }
  closeKnowledgeTip() {
    if (!this.showingTip) return false;
    this.showingTip = false; this.renderKnowledge(); return true;
  }
  advanceTip(delta) {
    const tips = getExpertCard(this.expertWorld, this.expert.cards[this.cardIndex]).tips;
    this.tipIndex = Math.max(0, Math.min(tips.length - 1, (this.tipIndex || 0) + delta));
    this.renderKnowledge();
  }
  cardImage(card, known, x, y, width, height) {
    let key = card.texture;
    if (!known) {
      key = 'discovery-gray-' + card.texture;
      if (!this.textures.exists(key)) {
        const frame = this.textures.getFrame(card.texture);
        const texture = this.textures.createCanvas(key, frame.cutWidth, frame.cutHeight), context = texture.getContext();
        context.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, frame.cutWidth, frame.cutHeight);
        const pixels = context.getImageData(0, 0, frame.cutWidth, frame.cutHeight);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const gray = pixels.data[i] * .3 + pixels.data[i + 1] * .59 + pixels.data[i + 2] * .11;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
        }
        context.putImageData(pixels, 0, 0); texture.refresh();
      }
    }
    const image = this.add.image(x, y, key);
    image.setScale(Math.min(width / image.width, height / image.height));
    if (known && card.tint) image.setTint(card.tint);
    if (!known) image.setAlpha(.45);
    return image;
  }
  renderKnowledge() {
    this.board.removeAll(true); this.cardViews = [];
    this.mapReturnButton?.setText(this.showingTip ? '← Zur Weltkarte' : '← Weltkarte · {back}');
    const add = object => { this.board.add(object); return object; };
    const heading = text => add(this.add.text(628, 118, text, { ...style, fontFamily: 'Georgia, serif', fontSize: '27px' }).setOrigin(.5));
    if (this.showingTip) {
      const card = getExpertCard(this.expertWorld, this.expert.cards[this.cardIndex]);
      this.tipIndex ||= 0;
      heading(card.name);
      add(this.add.rectangle(420, 300, 154, 220, 0xf1e4bd).setStrokeStyle(2, 0xc4a86b));
      add(this.cardImage(card, true, 420, 300, 136, 180));
      const tip = formatControlHint(card.tips[this.tipIndex], profileForScene(this));
      add(addEmphasizedText(this, 526, 219, tip, 388, { ...style, fontSize: '23px', lineSpacing: 7 }));
      add(this.add.text(720, 422, (this.tipIndex + 1) + ' / ' + card.tips.length, { ...style, fontSize: '16px', color: '#c5d4b6' }).setOrigin(.5));
      add(this.add.text(420, 482, '‹ Karten · {back}', { ...style, fontSize: '18px', backgroundColor: '#34543e', padding: { x: 14, y: 10 } })
        .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.canUseKnowledge()) this.closeKnowledgeTip(); }));
      if (this.tipIndex > 0) add(this.add.text(574, 482, '‹', { ...style, fontSize: '30px', backgroundColor: '#34543e', padding: { x: 14, y: 0 } })
        .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.canUseKnowledge()) this.advanceTip(-1); }));
      if (this.tipIndex < card.tips.length - 1) add(this.add.text(780, 482, 'Weiter · {confirm} ›', { ...style, fontSize: '18px', backgroundColor: '#34543e', padding: { x: 14, y: 10 } })
        .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.canUseKnowledge()) this.advanceTip(1); }));
      return;
    }
    heading('Deine Entdeckungen');
    const seen = this.expert.cards.filter(id => this.knownCards.has(id)).length;
    add(this.add.text(628, 148, seen + ' von ' + this.expert.cards.length + ' entdeckt', { ...style, fontSize: '15px', color: '#c5d4b6' }).setOrigin(.5));
    const rows = Math.ceil(this.expert.cards.length / CARD_COLUMNS), cardHeight = rows > 2 ? 116 : 166;
    // Every card is on this one board. There are no categories, pages or hidden rows.
    this.expert.cards.forEach((id, index) => {
      const card = getExpertCard(this.expertWorld, id), known = this.knownCards.has(id);
      const x = 394 + (index % CARD_COLUMNS) * 156, top = 170 + Math.floor(index / CARD_COLUMNS) * (cardHeight + 10);
      const view = this.add.container(0, 0), selected = index === this.cardIndex, imageHeight = cardHeight - 52;
      view.add(this.add.rectangle(x, top + cardHeight / 2, 146, cardHeight, known ? 0xf1e4bd : 0x66736a)
        .setStrokeStyle(selected ? 3 : 1, selected ? 0xffd37d : 0xa6b3a0));
      view.add(this.add.text(x, top + 15, known ? card.name : '???', { ...style, color: known ? '#3e3322' : '#d3d9d0',
        fontSize: '16px', fontStyle: 'bold', align: 'center', wordWrap: { width: 138 } }).setOrigin(.5));
      view.add(this.cardImage(card, known, x, top + 30 + imageHeight / 2, 124, imageHeight));
      view.add(this.add.text(x, top + cardHeight - 13, known ? '✓ Gesehen' : 'Nicht entdeckt', { ...style, fontSize: '13px', color: known ? '#335a32' : '#d3d9d0' }).setOrigin(.5));
      view.add(this.add.zone(x, top + cardHeight / 2, 146, cardHeight).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.openCard(index)));
      this.cardViews.push({ id, known, selected, view }); add(view);
    });
    const selectedKnown = this.knownCards.has(this.expert.cards[this.cardIndex]);
    add(this.add.text(628, 549, selectedKnown ? '← ↑ ↓ → Wählen · Tipp ansehen: {confirm}' : 'Erst entdecken! · ← ↑ ↓ → Wählen', { ...style,
      fontSize: '14px', color: selectedKnown ? '#ffe399' : '#c5d4b6' }).setOrigin(.5));
  }
}
