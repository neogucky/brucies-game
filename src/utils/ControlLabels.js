import { formatControlHint } from './controlProfiles.js';

// Keep label templates attached to their text objects so changing the profile
// updates open dialogs, inventories and victory screens without restarting play.
export default class ControlLabels {
  constructor(scene) {
    this.scene = scene; this.labels = new Map();
    this.scan(scene.children?.list || []);
    this.originalText = scene.add.text;
    const labels = this;
    this.wrappedText = function(...args) { const text = labels.originalText.apply(this, args); labels.track(text); return text; };
    scene.add.text = this.wrappedText;
  }
  scan(children) { children.forEach(child => { this.track(child); if (child.list) this.scan(child.list); }); }
  track(text) { if (typeof text?.setText === 'function' && typeof text.text === 'string') this.labels.set(text, { template: text.text, last: null }); }
  update(profile) {
    this.labels.forEach((entry, text) => {
      if (!text.scene || text.active === false) { this.labels.delete(text); return; }
      if (text.text !== entry.last) entry.template = text.text;
      const next = formatControlHint(entry.template, profile);
      if (text.text !== next) text.setText(next);
      entry.last = next;
    });
  }
  destroy() { if (this.scene.add.text === this.wrappedText) this.scene.add.text = this.originalText; this.labels.clear(); }
}
