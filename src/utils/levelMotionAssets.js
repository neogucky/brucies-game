export const PLAYER_MOTION_EMPTY = 'level-player-empty';
export const HELPER_MOTION_EMPTY = 'level-helper-empty';

export function registerLevelMotionTextures(scene) {
  if (scene.registry.get('level-motion-assets')) return;
  scene.textures.createCanvas(PLAYER_MOTION_EMPTY, 150, 150).refresh();
  scene.textures.createCanvas(HELPER_MOTION_EMPTY, 50, 50).refresh();
  const metadata = scene.cache.json.get('level-motion-frames'), result = {};
  for (const [name, frames] of Object.entries(metadata)) {
    if (name === 'rig') continue;
    const source = scene.textures.get('level-motion-' + name).getSourceImage();
    const pixelScale = name === 'helper' ? .57 : .548;
    result[name] = frames.map((frame, index) => {
      const key = 'level-motion-' + name + '-' + index;
      const texture = scene.textures.createCanvas(key, 150, 150), ctx = texture.getContext();
      const [x, y, width, height] = frame.rect, [rootX, rootY] = frame.root;
      ctx.drawImage(source, x, y, width, height,
        75 + (x - rootX) * pixelScale, 147 + (y - rootY) * pixelScale, width * pixelScale, height * pixelScale);
      texture.refresh();
      const hand = point => ({ x: (rootX-point[0])*pixelScale,y:-3+(point[1]-rootY)*pixelScale });
      return { key, hand: hand(frame.hand), otherHand: hand(frame.otherHand || frame.hand) };
    });
  }
  const source = scene.textures.get('level-motion-rig').getSourceImage();
  const roots = [[166, 415], [530, 410], [888, 416], [1240, 411]], hands = [[67, 392], [434, 393], [782, 396], [1166, 399]];
  const otherHands = [[230,417],[608,412],[947,420],[1313,413]];
  result.rig = { torsos: [], parts: [] };
  metadata.rig.forEach((frame, i) => {
    const [x, y, width, height] = frame.rect, key = 'level-rig-' + i;
    if (i < 4) {
      const texture = scene.textures.createCanvas(key, 150, 150), ctx = texture.getContext(), unit = .24;
      ctx.drawImage(source, x, y, width, height, 75 + (x - roots[i][0]) * unit, 107 + (y - roots[i][1]) * unit, width * unit, height * unit);
      const hand = point => ({ x:(roots[i][0]-point[0])*unit,y:-43+(point[1]-roots[i][1])*unit });
      texture.refresh(); result.rig.torsos.push({ key, hand:hand(hands[i]), otherHand:hand(otherHands[i]) });
    } else {
      const texture = scene.textures.createCanvas(key, width, height), ctx = texture.getContext();
      ctx.drawImage(source, x, y, width, height, 0, 0, width, height); texture.refresh();
      const pivot = i < 6 ? { x: width * .5, y: height * .08 } : { x: width * .47, y: height * .19 };
      const end = i < 6 ? { x: width * .56, y: height * .85 } : { x: width * .6, y: height * .94 };
      result.rig.parts.push({ key, width, height, originX: pivot.x / width, originY: pivot.y / height,
        length: Math.hypot(end.x - pivot.x, end.y - pivot.y), angle: Math.atan2(end.y - pivot.y, end.x - pivot.x) });
    }
  });
  // Use the legs from the actual standing artwork. The separate puppet atlas
  // had a different silhouette; its nominal width was not the knight's width.
  const standing = scene.textures.get('level-motion-poses').getSourceImage();
  const legCuts = [
    { polygon: [[53,185],[82,185],[87,207],[81,215],[46,215],[46,210]], pivot:[67,199], end:[65,222] },
    { polygon: [[90,187],[115,187],[124,215],[92,215]], pivot:[107,199], end:[111,222] },
    { polygon: [[46,213],[82,213],[85,229],[82,248],[45,248]], pivot:[65,220], end:[65,247] },
    { polygon: [[94,213],[124,213],[129,247],[99,249]], pivot:[111,221], end:[116,247] },
  ];
  legCuts.forEach((cut, i) => {
    const x=Math.min(...cut.polygon.map(p=>p[0])),y=Math.min(...cut.polygon.map(p=>p[1]));
    const width=Math.max(...cut.polygon.map(p=>p[0]))-x,height=Math.max(...cut.polygon.map(p=>p[1]))-y;
    const key='level-rig-standing-leg-'+i,texture=scene.textures.createCanvas(key,width,height),ctx=texture.getContext();
    ctx.beginPath();cut.polygon.forEach(([px,py],n)=>n?ctx.lineTo(px-x,py-y):ctx.moveTo(px-x,py-y));ctx.closePath();ctx.clip();
    ctx.drawImage(standing,x,y,width,height,0,0,width,height);texture.refresh();
    result.rig.parts[i]={ key,width,height,originX:(cut.pivot[0]-x)/width,originY:(cut.pivot[1]-y)/height,
      length:Math.hypot(cut.end[0]-cut.pivot[0],cut.end[1]-cut.pivot[1]),angle:Math.atan2(cut.end[1]-cut.pivot[1],cut.end[0]-cut.pivot[0]) };
  });
  scene.registry.set('level-motion-assets', result);
}
