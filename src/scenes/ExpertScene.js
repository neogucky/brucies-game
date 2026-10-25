import ShopSceneBase from './shop/ShopSceneBase.js';
import { EXPERT_WORLDS } from '../utils/expertKnowledge.js';
import { saveProgress } from '../saveManager.js';
import { addEmphasizedText } from '../ui/emphasizedText.js';

const style = { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff1c7' };
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
    this.expert = EXPERT_WORLDS[this.expertWorld]; this.categoryIndex = 0; this.topicIndex = 0;
    super.create();
    const save = this.getSaveData(), next = { ...save, currentWorld: this.expertWorld, currentLevel: this.expert.id,
      mapState: { ...save.mapState, [this.expert.mapField]: this.expert.id },
      visitedExperts: { ...save.visitedExperts, [this.expertWorld]: true } };
    this.registry.set('saveData', next); saveProgress(next);
  }
  showLoadingScreen() {
    this.isLoading = false; this.createExpertBoard();
    // The welcome takes place by the study window. Even the painted, empty
    // chalkboard stays outside this shot until the professor introduces it.
    this.studyBackdrop.setOrigin(0, 0).setPosition(0, 0).setScale(960 / (this.studyBackdrop.width * .48));
    const visited = this.getSaveData().visitedExperts?.[this.expertWorld];
    this.dialog.show([
      { text: visited ? this.expert.returnGreeting : this.expert.greeting },
      { text: this.expert.boardIntro },
    ], 'bottom', { portraitKey: 'professor-portrait', portraitZoom: 1.2,
      onClose: () => {
        this.studyBackdrop.setOrigin(.5).setPosition(480, 300).setScale(this.studyScale);
        this.knowledgeBoard.setVisible(true);
      } });
  }
  createExpertBoard() {
    this.add.image(220, 515, 'professor-' + this.expertWorld).setOrigin(.5, 1).setDisplaySize(240, 290).setDepth(10);
    this.add.text(215, 195, 'Professor Knobel', { ...style, fontFamily: 'Georgia, serif', fontSize: '27px', stroke: '#3a2818', strokeThickness: 4 }).setOrigin(.5).setDepth(12);
    this.knowledgeBoard = this.add.container(0, 0).setDepth(15).setVisible(false);
    this.knowledgeBoard.add(this.add.rectangle(660, 307, 566, 416, 0x183d2c, .97).setStrokeStyle(2, 0xc4a86b));
    this.knowledgeBoard.add(this.add.text(660, 119, this.expert.name, { ...style, fontFamily: 'Georgia, serif', fontSize: '26px' }).setOrigin(.5));
    this.board = this.add.container(0, 0);
    this.knowledgeBoard.add(this.board);
    this.categories = Object.keys(this.expert.topics);
    this.renderKnowledge();
    const canBrowse = () => this.canBrowseKnowledge();
    this.input.keyboard.on('keydown-LEFT', () => { if (canBrowse()) this.chooseCategory(-1); });
    this.input.keyboard.on('keydown-RIGHT', () => { if (canBrowse()) this.chooseCategory(1); });
    this.input.keyboard.on('keydown-UP', () => { if (canBrowse()) this.chooseTopic(-1); });
    this.input.keyboard.on('keydown-DOWN', () => { if (canBrowse()) this.chooseTopic(1); });
    this.input.keyboard.on('keydown-ENTER', () => { if (canBrowse()) this.chooseTopic(1); });
    this.knowledgeBoard.add(this.add.text(205, 540, '← Zur Weltkarte', { ...style, fontSize: '20px', backgroundColor: '#34543e', padding: { x: 14, y: 12 } })
      .setOrigin(.5).setDepth(20).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (canBrowse()) this.scene.start(this.expert.map);
      }));
  }
  canBrowseKnowledge() { return this.knowledgeBoard.visible && !this.inventoryOpen && !this.dialog?.container?.visible; }
  chooseCategory(delta) { this.categoryIndex = (this.categoryIndex + delta + this.categories.length) % this.categories.length; this.topicIndex = 0; this.renderKnowledge(); }
  chooseTopic(delta) {
    const topics = this.expert.topics[this.categories[this.categoryIndex]];
    this.topicIndex = (this.topicIndex + delta + topics.length) % topics.length; this.renderKnowledge();
  }
  renderKnowledge() {
    this.board.removeAll(true);
    const add = object => { this.board.add(object); return object; };
    const available = () => this.canBrowseKnowledge();
    this.categories.forEach((category, index) => {
      add(this.add.text(470 + index * 185, 166, category, { ...style, fontSize: '18px', backgroundColor: index === this.categoryIndex ? '#657747' : '#2d513c', padding: { x: 13, y: 10 } })
        .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (available()) { this.categoryIndex = index; this.topicIndex = 0; this.renderKnowledge(); } }));
    });
    const topics = this.expert.topics[this.categories[this.categoryIndex]], start = Math.floor(this.topicIndex / 5) * 5;
    topics.slice(start, start + 5).forEach(([title], row) => {
      const index = start + row;
      add(this.add.text(477, 222 + row * 48, title, { ...style, fontSize: '15px', color: index === this.topicIndex ? '#ffe399' : '#d4dfbc',
        backgroundColor: index === this.topicIndex ? '#4b6240' : '#244a35', fixedWidth: 174, padding: { x: 7, y: 8 }, align: 'center', wordWrap: { width: 160 } })
        .setOrigin(.5, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (available()) { this.topicIndex = index; this.renderKnowledge(); } }));
    });
    const [title, detail] = topics[this.topicIndex];
    add(this.add.text(744, 218, title, { ...style, fontFamily: 'Georgia, serif', fontSize: '23px', color: '#ffe1a0', wordWrap: { width: 306 }, align: 'center' }).setOrigin(.5, 0));
    add(addEmphasizedText(this, 585, 274, detail, 330, { ...style, fontSize: '17px', lineSpacing: 4 }));
    add(this.add.text(480, 485, (this.topicIndex + 1) + ' / ' + topics.length, { ...style, fontSize: '15px' }).setOrigin(.5));
    for (const [x, delta, symbol] of [[415, -1, '‹'], [545, 1, '›']]) add(this.add.text(x, 482, symbol, { ...style, fontSize: '30px', backgroundColor: '#34543e', padding: { x: 12, y: 0 } })
      .setOrigin(.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (available()) this.chooseTopic(delta); }));
    add(this.add.text(744, 487, '←/→ Rubrik · ↑/↓ Tipp · Weiter · {confirm}', { ...style, fontSize: '12px', color: '#b5c9a8' }).setOrigin(.5));
  }
}
