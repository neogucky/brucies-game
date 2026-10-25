// Wrap normal and bold words together, so emphasis never changes the paragraph's
// available width or leaves markup visible in the game.
export function layoutEmphasizedText(text, width, measure) {
  const runs = [];
  let bold = false, x = 0, line = 0, space = false, maxWidth = 0;
  String(text).split('**').forEach((part, index) => {
    if (index) bold = !bold;
    for (const word of part.match(/\n|[^\S\n]+|[^\s]+/gu) || []) {
      if (word === '\n') { x = 0; line++; space = false; continue; }
      if (/^\s+$/u.test(word)) { space = x > 0; continue; }
      const previous = runs[runs.length - 1];
      const merge = previous && previous.line === line && previous.bold === bold;
      const gap = space && x ? measure(' ', bold) : 0;
      const combined = merge ? previous.text + (gap ? ' ' : '') + word : word;
      const end = merge ? previous.x + measure(combined, bold) : x + gap + measure(word, bold);
      if (x && end > width) {
        x = 0; line++; runs.push({ text: word, bold, x, line }); x = measure(word, bold);
      } else if (merge) { previous.text = combined; x = end; }
      else { runs.push({ text: word, bold, x: x + gap, line }); x = end; }
      maxWidth = Math.max(maxWidth, x); space = false;
    }
  });
  return { runs, width: maxWidth, lines: runs.length ? line + 1 : 0 };
}

export function addEmphasizedText(scene, x, y, text, width, style) {
  const probe = scene.add.text(0, 0, '', style).setVisible(false);
  const cache = new Map();
  const measure = (word, bold) => {
    const key = (bold ? 'bold:' : 'normal:') + word;
    if (!cache.has(key)) {
      probe.setStyle({ fontStyle: bold ? 'bold' : 'normal' }).setText(word);
      cache.set(key, probe.width);
    }
    return cache.get(key);
  };
  const layout = layoutEmphasizedText(text, width, measure);
  probe.setText('Mg');
  const lineHeight = probe.height + (style.lineSpacing || 0);
  probe.destroy();
  const paragraph = scene.add.container(x, y);
  layout.runs.forEach(run => paragraph.add(scene.add.text(run.x, run.line * lineHeight, run.text,
    { ...style, fontStyle: run.bold ? 'bold' : 'normal', color: run.bold ? '#ffe399' : style.color })));
  paragraph.setSize(width, layout.lines * lineHeight);
  return paragraph;
}
