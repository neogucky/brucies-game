import { getWeaponStats, getAttackStats } from './weapons.js';
import { HAMMER_CHARGE } from './hammerRules.js';
import SwordAnimation, { swordStance } from './SwordAnimation.js';

export const MELEE_EMPTY_TEXTURE = 'melee-player-body';
export const MELEE_RECOVERY_MS = 90;
export const HAMMER_NORMAL_IMPACT_MS = 260;
// Visible sleeve/fist widths at the player's normal .6 scale. Transparent
// padding and the widest shoulder cap must not define the size of an arm.
export const MELEE_ARM_WIDTHS = { upper: 11, forearm: 10, hand: 9.5 };
export const HAMMER_ARM = { upper:20, forearm:16, wristBend:.32, length:33.2, maxFlexion:Math.PI*5/6, thrustFlexion:Math.PI/2, wristLimit:Math.PI*70/180 };
const BODY_STEPS = 6;
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const between = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });

// Cutouts are registered by their boots and shoulder, never by the cape bounds.
const BODY_CUTS = [
  [[72, 35, 300, 374, 174, 402, 132, 238], [396, 47, 326, 362, 521, 402, 459, 249], [759, 68, 313, 341, 885, 402, 818, 272]],
  [[85, 455, 287, 281, 174, 729, 137, 603], [390, 442, 337, 292, 523, 729, 455, 596], [762, 463, 306, 272, 886, 729, 812, 619]],
  [[71, 752, 306, 371, 174, 1117, 130, 956], [396, 760, 334, 369, 521, 1122, 464, 963], [759, 780, 309, 349, 885, 1122, 822, 985]],
  [[78, 1140, 300, 285, 175, 1419, 137, 1290], [396, 1135, 329, 290, 522, 1419, 457, 1293], [760, 1155, 307, 271, 885, 1420, 819, 1311]],
];
const PART_CUTS = {
  upper: { rect: [72, 230, 544, 305], pivot: [512, 421], end: [157, 421] },
  forearm: { rect: [690, 315, 504, 220], pivot: [1130, 428], end: [742, 428] },
  hand: { rect: [134, 819, 365, 277], pivot: [290, 951], end: [140, 951], wristRatio: 155 / 150 },
  sword: { rect: [620, 852, 612, 215], pivot: [1155, 961], end: [625, 961] },
  // Grip the wooden shaft; the old pivot at x511 was on the gold pommel.
  powerHammer: { atlas: 'melee-parts-atlas', rect: [30, 755, 580, 345], pivot: [430, 939], end: [37, 939], headFace: [145, 1082] },
};

export function measureLimbThickness(pixels, width, height, pivot, end) {
  const dx = end.x - pivot.x, dy = end.y - pivot.y, length = Math.hypot(dx, dy);
  const nx = -dy / length, ny = dx / length, limit = Math.ceil(Math.hypot(width, height));
  const samples = [];
  // Sample the sleeve, away from the large joint cap and flared cuff.
  for (let i = 0; i <= 16; i++) {
    const t = .35 + i / 16 * .4, cx = pivot.x + dx*t, cy = pivot.y + dy*t;
    let first = Infinity, last = -Infinity;
    for (let d = -limit; d <= limit; d++) {
      const x = Math.round(cx + nx*d), y = Math.round(cy + ny*d);
      if (x >= 0 && x < width && y >= 0 && y < height && pixels[(y*width+x)*4+3] >= 128) {
        first = Math.min(first, d); last = Math.max(last, d);
      }
    }
    if (Number.isFinite(first)) samples.push(last - first + 1);
  }
  samples.sort((a,b)=>a-b);
  if (!samples.length) throw new Error('Melee limb has no visible sleeve silhouette');
  return samples[Math.floor(samples.length*.25)];
}

function silhouetteHull(pixels, width, height, pivot, length) {
  const points = [];
  for (let y = 0; y < height; y++) {
    let left = width, right = -1;
    for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] >= 100) {
      left = Math.min(left, x); right = x;
    }
    if (right >= left) for (const x of [left, right]) points.push({ x: (pivot.x - x) / length, y: (y - pivot.y) / length });
  }
  points.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = values => {
    const result = [];
    for (const p of values) {
      while (result.length >= 2 && cross(result.at(-2), result.at(-1), p) <= 0) result.pop();
      result.push(p);
    }
    return result.slice(0, -1);
  };
  return [...half(points), ...half(points.slice().reverse())];
}

export function registerMeleeBodyRow(scene, atlas, cuts, id, pixelScale = .368) {
  const bases = cuts.map(([x, y, width, height, footX, footY, shoulderX, shoulderY]) => {
      const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 150;
      canvas.getContext('2d').drawImage(atlas, x, y, width, height,
        100 + (x - footX) * pixelScale, 148 + (y - footY) * pixelScale, width * pixelScale, height * pixelScale);
      return { canvas, shoulder: { x: (footX - shoulderX) * pixelScale, y: 148 - 150 + (shoulderY - footY) * pixelScale } };
    });
  return Array.from({ length: BODY_STEPS * 2 + 1 }, (_, index) => {
      const phase = index / BODY_STEPS, nearest = Math.round(phase), base = bases[nearest];
      const shear = -(phase - nearest) * .045, squash = 1 - Math.sin(phase * Math.PI / 2) * .018;
      const key = 'melee-' + id + '-' + index;
      const texture = scene.textures.createCanvas(key, 200, 150), ctx = texture.getContext();
      // Solid cutout in-betweens keep the face crisp; a dissolve produces double
      // eyes and transparent armor. The boots stay on the same ground anchor.
      ctx.translate(100, 148); ctx.transform(1, 0, shear, squash, 0, 0);
      ctx.drawImage(base.canvas, -100, -148); texture.refresh();
      return { key, shoulder: { x: base.shoulder.x - shear * (base.shoulder.y + 2), y: (base.shoulder.y + 2) * squash - 2 } };
    });
}

export function registerMeleeTextures(scene) {
  if (scene.textures.exists(MELEE_EMPTY_TEXTURE)) return;
  scene.textures.createCanvas(MELEE_EMPTY_TEXTURE, 150, 150).refresh();
  const atlas = scene.textures.get('melee-bodies-atlas').getSourceImage();
  const bodies = {};
  BODY_CUTS.forEach((cuts, row) => {
    const gender = row >= 2 ? 'female' : 'male', ducking = row % 2 === 1;
    const id = gender + (ducking ? '-crouch' : '-stand');
    bodies[id] = registerMeleeBodyRow(scene, atlas, cuts, id);
  });
  const rightAtlas = scene.textures.get('melee-right-bodies').getSourceImage();
  scene.cache.json.get('melee-right-body-frames').forEach((cuts, row) => {
    const id = (row >= 2 ? 'female' : 'male') + '-right-' + (row % 2 ? 'crouch' : 'stand');
    bodies[id] = registerMeleeBodyRow(scene, rightAtlas, cuts, id, .36)
      .map(frame => ({ ...frame, shoulder: { ...frame.shoulder, x: -frame.shoulder.x } }));
  });
  const farAtlas = scene.textures.get('sword-far-bodies').getSourceImage();
  scene.cache.json.get('sword-far-body-frames').forEach((cuts, row) => {
    const id = (row >= 3 ? 'female' : 'male') + '-left-far-' + ['stand', 'crouch', 'jump'][row % 3];
    bodies[id] = registerMeleeBodyRow(scene, farAtlas, cuts, id, .44);
  });
  const hammerAtlas = scene.textures.get('hammer-near-bodies').getSourceImage();
  scene.cache.json.get('hammer-near-body-frames').forEach((cuts, row) => {
    const id = (row >= 3 ? 'female' : 'male') + '-hammer-right-' + ['stand', 'crouch', 'jump'][row % 3];
    bodies[id] = registerMeleeBodyRow(scene, hammerAtlas, cuts, id, .41)
      .map(frame => ({ ...frame, shoulder: { ...frame.shoulder, x: -frame.shoulder.x } }));
  });
  const parts = {};
  for (const [id, cut] of Object.entries(PART_CUTS)) {
    const source = scene.textures.get(cut.atlas || 'melee-parts-v2-atlas').getSourceImage();
    const [x, y, width, height] = cut.rect, key = 'melee-part-' + id;
    const texture = scene.textures.createCanvas(key, width, height), ctx = texture.getContext();
    ctx.drawImage(source, x, y, width, height, 0, 0, width, height); texture.refresh();
    const pivot = { x: cut.pivot[0] - x, y: cut.pivot[1] - y };
    const dx = cut.pivot[0] - cut.end[0], dy = cut.end[1] - cut.pivot[1], length = Math.hypot(dx, dy);
    parts[id] = { key, originX: pivot.x / width, originY: pivot.y / height, length, height, angle: Math.atan2(dy, dx), wristRatio: cut.wristRatio };
    if (cut.headFace) parts[id].headFace = {x:(cut.pivot[0]-cut.headFace[0])/length,y:(cut.headFace[1]-cut.pivot[1])/length};
    const pixels = ctx.getImageData(0, 0, width, height).data;
    if (['upper','forearm','hand'].includes(id)) parts[id].thickness = measureLimbThickness(pixels, width, height, pivot,
      {x:cut.end[0]-x,y:cut.end[1]-y});
    if (id === 'sword' || id === 'powerHammer') parts[id].outline = silhouetteHull(pixels, width, height, pivot, length);
  }
  const grips = scene.textures.get('hammer-grips').getSourceImage();
  for(const [id,cut]of Object.entries(scene.cache.json.get('hammer-grip-frames'))){
    const [x,y,width,height]=cut.rect,key='hammer-grip-'+id;
    const texture=scene.textures.createCanvas(key,width,height),ctx=texture.getContext();
    ctx.drawImage(grips,x,y,width,height,0,0,width,height);texture.refresh();
    const geometry = hammerGripGeometry(cut);
    parts['hammerHand'+id[0].toUpperCase()+id.slice(1)] = { key, ...geometry,
      thickness: measureLimbThickness(ctx.getImageData(0,0,width,height).data,width,height,
        {x:cut.wrist[0]-x,y:cut.wrist[1]-y}, {x:cut.grip[0]-x,y:cut.grip[1]-y}) };

  }
  scene.registry.set('melee-animation-assets', { bodies, parts });
}

export function getMeleePhase(elapsed, stats, kind = 'swing', recovery = null) {
  if (recovery !== null) return { stage: 'recovery', bodyPhase: 2 * (1 - ease(recovery)), blend: ease(recovery) };
  if (kind === 'ready') return { stage: 'ready', bodyPhase: 0, blend: 0 };
  if (kind === 'charge') { const blend = ease(elapsed / HAMMER_CHARGE.superMs); return { stage: 'charge', bodyPhase: .2 + 1.2 * blend, blend }; }
  if (kind === 'slam') return { stage: 'slam', bodyPhase: 1.6, blend: ease(elapsed / 70) };
  if (kind === 'landing') return { stage: 'landing', bodyPhase: 2 * (1 - ease(elapsed / stats.swingMs)), blend: ease(elapsed / stats.swingMs) };
  if (stats.windupMs && elapsed < stats.windupMs) {
    const blend = stats.chargeProgress !== undefined ? ease(elapsed / stats.windupMs)
      : ease((elapsed - stats.windupMs * .55) / (stats.windupMs * .45));
    const fromBody = stats.chargeProgress !== undefined ? .2 + 1.2 * ease(stats.chargeProgress) : 0;
    return { stage: 'windup', bodyPhase: mix(fromBody, .4, blend), blend };
  }
  const blend = ease((elapsed - stats.windupMs) / (stats.swingMs - stats.windupMs));
  return { stage: 'strike', bodyPhase: .4 + 1.6 * blend, blend };
}

export function weaponOutlineBounds(part, length, angle) {
  const points = part.outline.map(p => ({ x: length * (p.x * Math.cos(angle) - p.y * Math.sin(angle)), y: length * (p.x * Math.sin(angle) + p.y * Math.cos(angle)) }));
  return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
}

// The painted cuff and shaft are measured independently: the hand's pivot is
// the palm, while its attachment to the forearm is the wrist opening.
export function hammerGripGeometry(cut) {
  const [x,y,width,height] = cut.rect;
  const pivot = {x:cut.grip[0]-x,y:cut.grip[1]-y};
  const angle = Math.atan2(cut.axisTop[1]-cut.grip[1],cut.grip[0]-cut.axisTop[0]) + Math.PI/2;
  const dx = cut.grip[0]-cut.wrist[0], dy = cut.wrist[1]-cut.grip[1], length = 100;
  return {originX:pivot.x/width,originY:pivot.y/height,length,height,angle,
    wristLocal:{x:(dx*Math.cos(angle)+dy*Math.sin(angle))/length,
      y:(-dx*Math.sin(angle)+dy*Math.cos(angle))/length}};
}

export function hammerGripPart(parts, farSide = false) {
  return (farSide ? parts.hammerHandFar : parts.hammerHandNear) || parts.hand;
}

// Facing-local x points forward and y points down. A natural raised hand
// (wrist forward and above the shoulder) leaves the elbow forward and BELOW
// that chord. The opposite IK solution bends the elbow backwards.
export function solveHammerElbow(shoulder, wrist, unit = 1, maxFlexion = HAMMER_ARM.maxFlexion, palm = null) {
  const u = HAMMER_ARM.upper*unit, f = HAMMER_ARM.forearm*unit;
  const dx = wrist.x-shoulder.x, dy = wrist.y-shoulder.y;
  const d = Math.max(.001, Math.hypot(dx,dy));
  const minimumReach = Math.sqrt(u*u+f*f+2*u*f*Math.cos(maxFlexion));
  // Tucked poses shorten the projected bones rather than folding past the
  // flexion limit. Sleeve thickness is independent of this foreshortening.
  let projection = Math.max(d/(u+f), Math.min(1,d/minimumReach));
  const elbowAt = factor => {
    const upper = u*factor, forearm = f*factor;
    const along = (upper*upper-forearm*forearm+d*d)/(2*d);
    const bend = Math.sqrt(Math.max(0,upper*upper-along*along));
    return {x:shoulder.x+dx/d*along-dy/d*bend,
      y:shoulder.y+dy/d*along+dx/d*bend};
  };
  if (palm) {
    const wristBend = elbow => {
      const f={x:wrist.x-elbow.x,y:wrist.y-elbow.y},h={x:palm.x-wrist.x,y:palm.y-wrist.y};
      return Math.abs(Math.atan2(f.x*h.y-f.y*h.x,f.x*h.x+f.y*h.y));
    };
    let low = d/(u+f), high = projection;
    // Only shorten the projected bones when it can bring the painted wrist
    // back toward neutral. The palm, grip, weapon arc and sleeve widths stay put.
    if (wristBend(elbowAt(high))>HAMMER_ARM.wristLimit && wristBend(elbowAt(low))<=HAMMER_ARM.wristLimit) {
      for(let i=0;i<24;i++){
        const middle=(low+high)/2;
        if(wristBend(elbowAt(middle))>HAMMER_ARM.wristLimit)high=middle;else low=middle;
      }
      projection=low;
    }
  }
  let elbow = elbowAt(projection);
  if(palm){
    const h={x:palm.x-wrist.x,y:palm.y-wrist.y};
    const wristAngle=e=>Math.abs(Math.atan2((wrist.x-e.x)*h.y-(wrist.y-e.y)*h.x,
      (wrist.x-e.x)*h.x+(wrist.y-e.y)*h.y));
    if(wristAngle(elbow)>HAMMER_ARM.wristLimit){
      // When carrying the hammer beside the hip the forearm points partly
      // toward the camera. Project it shorter independently of the upper arm;
      // a fixed 2D bone ratio would force the wrist to fold back on itself.
      const axis=Math.atan2(h.y,h.x),upperLimit=Math.max(u*projection,d*1.01);
      let best=Infinity;const referenceElbow=elbow;
      for(const sign of [-1,1]){
        const angle=axis+sign*HAMMER_ARM.wristLimit,v={x:Math.cos(angle),y:Math.sin(angle)};
        const dot=dx*v.x+dy*v.y;
        const available=dot+Math.sqrt(Math.max(0,dot*dot+upperLimit*upperLimit-d*d));
        if(available<=.05*unit)continue;
        const length=Math.min(f*projection,available),candidate={x:wrist.x-v.x*length,y:wrist.y-v.y*length};
        const ax=candidate.x-shoulder.x,ay=candidate.y-shoulder.y;
        const flexion=Math.atan2(ax*v.y-ay*v.x,ax*v.x+ay*v.y);
        if(flexion>1e-6||flexion < -maxFlexion-1e-6)continue;
        const cost=(candidate.x-referenceElbow.x)**2+(candidate.y-referenceElbow.y)**2;
        if(cost<best){best=cost;elbow=candidate;}
      }
    }
  }
  return elbow;
}

// The separate articulated artwork is much more graphic than the painted
// torso. Grade its ink and highlights in the renderer, preserving opacity,
// sleeve width and every source anchor. Pre FX are local to these sprites.
export function matchArmRendering(image) {
  const fx = image.preFX;
  if (!fx) return;
  const color = fx.addColorMatrix();
  color.contrast(-.18);
  color.saturate(-.12,true);
  fx.addBlur(0,.25,.25,1,0xffffff,1);
}

// A hammer is held across the palm. Its shaft and the fist rotate together;
// the forearm ends at the painted wrist opening, not at the finger tips.
export function getHammerArmPose({elapsed,stats,phase,shoulder,reach,unit,parts,farSide=false,
  ducking=false,vertical=false,legacy,recoveryPose,restPose}) {
  const glove=hammerGripPart(parts,farSide),length=HAMMER_ARM.length*unit;
  const handLength=MELEE_ARM_WIDTHS.hand*unit*glove.length/(glove.thickness||glove.height);
  const local=glove.wristLocal||{x:-(glove.wristRatio??.85),y:0};
  const wristOffset=angle=>({x:handLength*(local.x*Math.cos(angle)-local.y*Math.sin(angle)),
    y:handLength*(local.x*Math.sin(angle)+local.y*Math.cos(angle))});
  const u=HAMMER_ARM.upper*unit,f=HAMMER_ARM.forearm*unit;
  const jointHeld=progress=>{
    const t=ease(progress),upper=mix(.9,-.35,t),fore=mix(-.6,-1.4,t);
    const angle=fore+HAMMER_ARM.wristBend-Math.PI/2,handAngle=angle+Math.PI/2,o=wristOffset(handAngle);
    return {angle,hand:{x:shoulder.x+u*Math.cos(upper)+f*Math.cos(fore)-o.x,
      y:shoulder.y+u*Math.sin(upper)+f*Math.sin(fore)-o.y}};
  };
  const ready=restPose||jointHeld(0),cocked=jointHeld(1),startAngle=-1.45;
  const held=progress=>({angle:mix(ready.angle,cocked.angle,ease(progress)),
    hand:between(ready.hand,cocked.hand,ease(progress))});
  const boundsAt=angle=>weaponOutlineBounds(parts.powerHammer,length,angle);
  const edgeGrip=(angle,y)=>({x:reach-boundsAt(angle).right,y});
  const firstY=Math.min(-44*unit,shoulder.y-8*unit),first=edgeGrip(startAngle,firstY);
  const floorGrip=angle=>edgeGrip(angle,-2*unit-boundsAt(angle).bottom);
  let angle=ready.angle,hand=ready.hand;
  if(vertical) { angle=legacy.angle;hand=legacy.hand; }
  else if(ducking&&['charge','windup','strike'].includes(phase.stage)){
    angle=-.035;
    const bounds=boundsAt(angle),lowY=legacy.centerY-(bounds.top+bounds.bottom)/2;
    const extended=edgeGrip(angle,lowY),charge=phase.stage==='charge'?phase.blend:ease(stats.chargeProgress||0);
    const tucked={x:Math.min(shoulder.x+4*unit,extended.x-16*unit)-charge*6*unit,y:lowY};
    const peak=stats.impactMs||215,extension=phase.stage==='charge'?0:phase.stage==='windup'?ease(elapsed/stats.windupMs)
      :elapsed<=peak?1:mix(1,.55,ease((elapsed-peak)/(stats.swingMs-peak)));
    hand=between(tucked,extended,extension);
  }else if(phase.stage==='charge'){
    ({angle,hand}=held(clamp(elapsed/HAMMER_CHARGE.superMs)));
  }else if(phase.stage==='windup'){
    if(stats.chargeProgress!==undefined){
      const from=held(stats.chargeProgress);
      hand=between(from.hand,first,phase.blend);angle=mix(from.angle,startAngle,phase.blend);
    }else{
      const back=ease(elapsed/(stats.windupMs*.55)),forward=ease((elapsed-stats.windupMs*.55)/(stats.windupMs*.45));
      hand=forward>0?between(cocked.hand,first,forward):between(ready.hand,cocked.hand,back);
      angle=forward>0?mix(cocked.angle,startAngle,forward):mix(ready.angle,cocked.angle,back);
    }
  }else if(phase.stage==='strike'){
    const impact=stats.impactMs||HAMMER_NORMAL_IMPACT_MS,drop=ease((elapsed-stats.windupMs)/(impact-stats.windupMs));
    // The metal end of the cross-head strikes the floor. Pointing the shaft
    // down would land on the engraved side of the head instead.
    angle=mix(startAngle,0,drop);
    hand=edgeGrip(angle,mix(firstY,floorGrip(angle).y,drop));
  }else if(phase.stage==='slam'){
    angle=mix(-.7,0,phase.blend);
    hand=between(edgeGrip(-.7,shoulder.y-3*unit),floorGrip(angle),phase.blend);
  }else if(phase.stage==='landing'){
    angle=mix(0,ready.angle,phase.blend);hand=between(floorGrip(0),ready.hand,phase.blend);
  }else if(phase.stage==='recovery'){
    angle=mix(recoveryPose.angle,ready.angle,phase.blend);
    hand=between(recoveryPose.hand,ready.hand,phase.blend);
  }
  const handAngle=angle+Math.PI/2,o=wristOffset(handAngle),wrist={x:hand.x+o.x,y:hand.y+o.y};
  // The low thrust extends the arm instead of keeping the large overhead
  // curl. This also avoids bending the wrist back against a horizontal shaft.
  const elbow = solveHammerElbow(shoulder,wrist,unit,ducking?HAMMER_ARM.thrustFlexion:HAMMER_ARM.maxFlexion,hand);
  return {angle,hand,handAngle,handLength,wrist,elbow,length,handPart:glove,
    sleevesVisible:true,bounds:boundsAt(angle),gripKind:'hammer-overhand'};
}

// All geometry is in facing-local coordinates: positive x points at the enemy.
export function getMeleePose({ elapsed, stats, weapon, hit, x, feetY, scale = .6, direction = 1, ducking = false, kind = 'swing', recovery = null, recoveryPose, assets, aimVector, farSide = false, farCut = false }) {
  const phase = getMeleePhase(elapsed, stats, kind, recovery);
  const bodyFrames = assets.bodies, frame = bodyFrames[Math.round(phase.bodyPhase * BODY_STEPS)];
  // The joint sits inside the shoulder plate, rather than on its outer edge.
  const unit = scale / .6;
  // Weight starts on the back foot and travels through the torso into the
  // shoulder. That leaves room for an actual upper arm rather than squeezing
  // two sleeves into the few pixels between a fixed shoulder and the grip.
  const drive = phase.stage === 'charge' ? -phase.blend : phase.stage === 'windup' && stats.chargeProgress !== undefined ? -ease(stats.chargeProgress) * (1 - phase.blend)
    : phase.stage === 'strike' ? Math.sin(phase.blend * Math.PI) : 0;
  const bodyOffset = { x: ((weapon === 'powerHammer' ? -2 : -9) + drive * 3) * unit, y: Math.max(0, drive) * 1.2 * unit };
  if (phase.stage === 'recovery') { bodyOffset.x = mix(recoveryPose.bodyOffset?.x ?? -9 * unit, 0, phase.blend); bodyOffset.y = mix(recoveryPose.bodyOffset?.y ?? 0, 0, phase.blend); }
  const bodyAngle = (weapon === 'powerHammer' && phase.stage === 'windup' && stats.chargeProgress === undefined ? mix(-.025, -.035, phase.blend)
    : phase.stage === 'charge' ? -.065 * phase.blend
    : phase.stage === 'windup' && stats.chargeProgress !== undefined ? mix(-.065 * ease(stats.chargeProgress), -.025, phase.blend)
    : phase.stage === 'strike' ? -.035 + .105 * phase.blend : -.025);
  const rawShoulder = { x: frame.shoulder.x * scale - Math.sign(frame.shoulder.x || 1) * 4 * unit, y: frame.shoulder.y * scale };
  const shoulder = { x: rawShoulder.x * Math.cos(bodyAngle) - rawShoulder.y * Math.sin(bodyAngle) + bodyOffset.x,
    y: rawShoulder.x * Math.sin(bodyAngle) + rawShoulder.y * Math.cos(bodyAngle) + bodyOffset.y };
  const reach = direction > 0 ? hit.x + hit.width - x : x - hit.x;
  const length = (weapon === 'powerHammer' ? HAMMER_ARM.length : farCut ? 52 : 38) * scale / .6;
  const part = assets.parts[weapon];
  const centerY = hit.y + hit.height / 2 - feetY;
  const aim = clamp(Math.atan2(centerY - shoulder.y, Math.max(1, reach - shoulder.x)) * .6, -.45, .35);
  const vertical = aimVector && Math.abs(aimVector.y) > Math.abs(aimVector.x);
  const angleLimit = weapon === 'powerHammer' ? .9 : 1.1;
  const firstAngle = vertical ? Math.sign(aimVector.y) * Math.PI / 2 - .22 : clamp(-.85 + aim, -angleLimit, angleLimit);
  const activeAngle = vertical ? Math.sign(aimVector.y) * Math.PI / 2 + mix(-.22, .22, phase.blend) : clamp(mix(-.85, .75, phase.blend) + aim, -angleLimit, angleLimit);
  const activeBounds = weaponOutlineBounds(part, length, activeAngle);
  const freeHeight = Math.max(0, hit.height - (activeBounds.bottom - activeBounds.top));
  const strikeHand = { x: reach - activeBounds.right, y: centerY + (phase.blend - .5) * freeHeight * .65 - (activeBounds.top + activeBounds.bottom) / 2 };
  const verticalHand = bounds => ({ x: direction * (hit.x + hit.width / 2 - x) - (bounds.left + bounds.right) / 2,
    y: aimVector.y < 0 ? hit.y - feetY - bounds.top : hit.y + hit.height - feetY - bounds.bottom });
  if (vertical) Object.assign(strikeHand, verticalHand(activeBounds));
  const readyHand = { x: shoulder.x + 15 * unit, y: shoulder.y - 8 * unit };
  let angle = activeAngle, hand = strikeHand;
  if (phase.stage === 'ready') {
    hand = readyHand; angle = -1.2;
  } else if (phase.stage === 'charge') {
    hand = { x: shoulder.x + mix(9, 4, phase.blend) * scale / .6, y: shoulder.y - mix(8, 18, phase.blend) * scale / .6 };
    angle = mix(-1.25, -2.6, phase.blend);
  } else if (phase.stage === 'strike' && stats.chargeProgress !== undefined) {
    // Charged swings follow through all the way to the ground. Their forward
    // edge still agrees with melee reach; the last pose plants the hammer head.
    const drop = ease((elapsed - stats.windupMs) / (stats.impactMs - stats.windupMs));
    angle = mix(firstAngle, 1.2, drop);
    const bounds = weaponOutlineBounds(part, length, angle), first = weaponOutlineBounds(part, length, firstAngle);
    const firstY = centerY - Math.max(0, hit.height - first.bottom + first.top) * .325 - (first.top + first.bottom) / 2;
    hand = { x: reach - bounds.right, y: mix(firstY, -2 - bounds.bottom, drop) };
  } else if (phase.stage === 'windup') {
    const firstBounds = weaponOutlineBounds(part, length, firstAngle);
    const firstHand = { x: reach - firstBounds.right, y: centerY - Math.max(0, hit.height - firstBounds.bottom + firstBounds.top) * .325 - (firstBounds.top + firstBounds.bottom) / 2 };
    if (vertical) Object.assign(firstHand, verticalHand(firstBounds));
    const charged = stats.chargeProgress !== undefined, chargeBlend = ease(stats.chargeProgress);
    const fromHand = charged ? { x: shoulder.x + mix(9, 4, chargeBlend) * scale / .6,
      y: shoulder.y - mix(8, 18, chargeBlend) * scale / .6 } : readyHand;
    hand = between(fromHand, firstHand, phase.blend);
    angle = mix(charged ? mix(-1.25, -2.6, chargeBlend) : -1.8, firstAngle, phase.blend);
  } else if (phase.stage === 'slam' || phase.stage === 'landing') {
    hand = { x: shoulder.x + 9 * scale / .6, y: shoulder.y - 5 * scale / .6 };
    angle = phase.stage === 'slam' ? mix(.8, 1.35, phase.blend) : mix(1.35, -1.2, phase.blend);
  } else if (phase.stage === 'recovery') {
    hand = between(recoveryPose.hand, readyHand, phase.blend); angle = mix(recoveryPose.angle, -1.2, phase.blend);
  }
  if (farCut && weapon === 'sword' && phase.stage === 'strike' && !vertical) {
    // The same B cut seen from its far side: coil, high cut, waist, low
    // follow-through. The torso is a separate foreground layer, hiding the
    // shoulder instead of swapping to a front-facing left arm.
    const points = ducking
      ? [[.45,-20],[2.8,-24],[0,-22],[.1,-17],[.55,-2]]
      : [[-2,-76],[-2.45,-82],[-.8,-70],[-.05,-50],[-.025,-40],[.58,-2],[.42,-2]];
    const t=clamp(elapsed/stats.swingMs)*points.length,index=Math.min(points.length-1,Math.floor(t));
    const next=Math.min(points.length-1,index+1),blend=ease(t-index);
    angle=mix(points[index][0],points[next][0],blend);
    const tipY=mix(points[index][1],points[next][1],blend)*unit;
    const bounds=weaponOutlineBounds(part,length,angle);
    const grip=i=>i<2?{x:shoulder.x+(i?-6:9)*unit,y:points[i][1]*unit-length*Math.sin(points[i][0])}
      :{x:reach-weaponOutlineBounds(part,length,points[i][0]).right,y:points[i][1]*unit-length*Math.sin(points[i][0])};
    hand=index<2?between(grip(index),grip(next),blend):{x:reach-bounds.right,y:tipY-length*Math.sin(angle)};
  }
  if (weapon === 'powerHammer') {
    const hammer = getHammerArmPose({ elapsed, stats, phase, shoulder, reach, unit, parts: assets.parts,
      farSide, ducking, vertical, legacy: { angle, hand, centerY }, recoveryPose, restPose: assets.readyPose });
    return { frame: frame.key, phase, shoulder, ...hammer, direction, x, feetY, scale, ducking,
      bodyOffset, bodyAngle, armWidths: MELEE_ARM_WIDTHS };
  }
  // A tucked hand foreshortens the sleeves. Fixed long bones would fold the
  // elbow past the fist here, making the arm look dislocated.
  const dx = hand.x - shoulder.x, dy = hand.y - shoulder.y, distance = Math.max(.001, Math.hypot(dx, dy));
  const glove = assets.parts.hand;
  const handLength = MELEE_ARM_WIDTHS.hand * unit * glove.length / (glove.thickness || glove.height);
  const wristOffset = handLength * (glove.wristRatio ?? .85);
  const sleevesVisible = distance > wristOffset + 1.5 * scale / .6;
  const wrist = sleevesVisible
    ? { x: hand.x - dx / distance * wristOffset, y: hand.y - dy / distance * wristOffset } : { ...shoulder };
  const sleeveDistance = Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y);
  // Bend outwards, perpendicular to the shoulder/wrist line. Both bones keep
  // their thickness; the bend opens during extension and follows the swing.
  const bend = Math.min(6.5 * unit, sleeveDistance * .32);
  const elbow = { x: mix(shoulder.x, wrist.x, .5) - (wrist.y - shoulder.y) / Math.max(.001, sleeveDistance) * bend,
    y: mix(shoulder.y, wrist.y, .5) + (wrist.x - shoulder.x) / Math.max(.001, sleeveDistance) * bend };
  elbow.x = clamp(elbow.x, Math.min(shoulder.x, wrist.x), Math.max(shoulder.x, wrist.x));
  return { frame: frame.key, phase, shoulder, elbow, wrist, hand, handAngle: Math.atan2(dy, dx), handLength, sleevesVisible,
    angle, length, direction, x, feetY, scale, ducking, bodyOffset, bodyAngle,
    armWidths: MELEE_ARM_WIDTHS,
    bounds: weaponOutlineBounds(part, length, angle) };
}

export default class MeleeAnimation {
  constructor(scene) {
    this.scene = scene; this.assets = scene.registry.get('melee-animation-assets');
    if (!this.assets) return;
    this.parts = scene.meleeVisualType === 'trainer' ? this.assets.trainerParts : this.assets.parts;
    this.body = scene.add.image(0, 0, this.assets.bodies['male-stand'][0].key).setOrigin(.5, 1);
    this.upper = scene.add.image(0, 0, this.parts.upper.key);
    this.weapon = scene.add.image(0, 0, this.parts.sword.key);
    this.forearm = scene.add.image(0, 0, this.parts.forearm.key);
    this.hand = scene.add.image(0, 0, this.parts.hand.key);
    [this.upper,this.forearm,this.hand].forEach(matchArmRendering);
    this.images = [this.body, this.upper, this.weapon, this.forearm, this.hand];
    this.sword = new SwordAnimation(scene);
    this.hide();
  }

  clock() { return this.scene.worldTime ?? this.scene.time.now; }
  hide() { this.images?.forEach(image => image.setVisible(false)); this.sword?.hide(); }
  restore() {
    const s = this.scene, p = s.player;
    this.hide();
    if (p?.active && p.scene && p.texture?.key === MELEE_EMPTY_TEXTURE) p.setTexture(p.getData(s.isDucking ? 'crouchTexture' : 'standingTexture'));
  }
  update() {
    const s = this.scene, p = s.player;
    if (!this.assets || !p?.active) return;
    if (s.climbingVine || s.isGameOver || s.levelCompleted || s.isComplete || !getWeaponStats(s.equipped.weapon)
      || s.weaponSwitch?.pending?.kind === 'bow' || s.weaponSwitch?.hand === 'bow') {
      this.state = null; this.restore(); return;
    }
    const now = this.clock();
    const charging = s.hammerCharge?.holding && s.hammerCharge.ready;
    const paused = s.isPaused || s.inventoryOpen || s.isEditorMode || s.isHitboxEditMode || s.time?.paused;
    const delta = paused || this.lastClock === undefined ? 0 : Math.max(0, now - this.lastClock);
    this.lastClock = now;
    if (charging) {
      this.state = { startedAt: s.hammerCharge.sequence, elapsed: s.hammerCharge.elapsed, weapon: 'powerHammer', kind: 'charge' };
    } else if (s.isSwinging) {
      const kind = s.hammerSlamActive ? 'slam' : s.swingVisualKind || 'swing';
      if (!this.state || this.state.startedAt !== s.swingStartedAt || this.state.kind !== kind || this.state.weapon !== s.equipped.weapon) {
        this.state = { startedAt: s.swingStartedAt ?? now, elapsed: Math.max(0, now - (s.swingStartedAt ?? now)), weapon: s.equipped.weapon, kind };
      } else {
        this.state.elapsed += delta;
      }
      if (kind !== 'slam' && Number.isFinite(s.swingTimer?.elapsed)) this.state.elapsed = s.swingTimer.elapsed;
    } else if (this.state && this.lastPose && this.state.kind !== 'ready') {
      if (this.state.recoveryElapsed === undefined) { this.state.recoveryElapsed = 0; this.state.recoveryPose = this.lastPose; }
      else this.state.recoveryElapsed += delta;
      if (this.state.recoveryElapsed >= MELEE_RECOVERY_MS) this.state = null;
    } else this.state = null;
    if (!this.state && s.meleeIdle) this.state = { kind: 'ready', weapon: s.equipped.weapon, elapsed: 0 };
    if (!this.state) { this.restore(); return; }
    const state = this.state, stats = getAttackStats(state.weapon, s.hammerAttack), scale = Math.abs(p.scaleY);
    const gender = s.meleeVisualType || (s.registry.get('saveData')?.playerGender === 'female' ? 'female' : 'male');
    const hit = s.getMeleeBounds ? s.getMeleeBounds() : s.swordHitbox.getBounds();
    const feetY = p.y + (1 - (p.originY ?? 1)) * (p.displayHeight || 0);
    const direction = s.facingX || (s.facing?.x ? Math.sign(s.facing.x) : p.flipX ? 1 : -1);
    if (state.recoveryElapsed !== undefined && state.recoveryPose.direction !== direction) {
      this.state = null; this.restore(); return;
    }
    const stance = s.gameMode === 'jump' ? swordStance(s) : s.isDucking ? 'crouch' : 'stand';
    const farBody = direction < 0 ? this.assets.bodies[gender + '-left-far-' + stance] : null;
    const rightBody = direction > 0 ? state.weapon === 'powerHammer'
      ? this.assets.bodies[gender + '-hammer-right-' + stance]
      : this.assets.bodies[gender + '-right-' + (s.isDucking ? 'crouch' : 'stand')] : null;
    const bodyFrames = farBody || rightBody || this.assets.bodies[gender + (s.isDucking ? '-crouch' : '-stand')];
    if (state.weapon === 'sword' && s.gameMode === 'jump' && direction > 0 && this.sword?.body) {
      this.images.forEach(image => image.setVisible(false));
      this.lastPose = this.sword.draw({ state, stats, hit, direction, scale, feetY,
        recovery: state.recoveryElapsed === undefined ? null : state.recoveryElapsed / MELEE_RECOVERY_MS });
      p.setTexture(MELEE_EMPTY_TEXTURE);
      return;
    }
    this.sword?.hide();
    const restFrames = gender !== 'trainer' ? s.registry.get('level-motion-assets')?.poses : null;
    const restFrame = restFrames?.[(gender === 'female' ? 16 : 0) + (stance === 'crouch' ? 6 : stance === 'jump' ? 8 : 0)];
    const restHand = restFrame && (direction > 0 ? restFrame.otherHand || restFrame.hand : restFrame.hand);
    const readyPose = restHand ? {angle:direction > 0 ? -2 : -1.15,
      hand:{x:restHand.x*scale,y:restHand.y*scale}} : null;
    const pose = getMeleePose({ elapsed: state.elapsed, stats, weapon: state.weapon, hit, x: p.x, feetY,
      direction, scale, ducking: stance === 'crouch', kind: state.kind, farSide: Boolean(farBody), farCut: Boolean(farBody) && s.gameMode === 'jump',
      recovery: state.recoveryElapsed === undefined ? null : state.recoveryElapsed / MELEE_RECOVERY_MS,
      recoveryPose: state.recoveryPose, aimVector: s.gameMode === 'isometric' ? s.facing : null, assets: { bodies: bodyFrames, parts: this.parts, readyPose } });
    if (farBody || rightBody) Object.assign(pose, { renderer: state.weapon === 'sword' ? 'sword-b' : 'hammer',
      view: farBody ? 'far' : 'near', stance, frameIndex: Math.round(pose.phase.bodyPhase * BODY_STEPS) });
    this.lastPose = pose;
    p.setTexture(MELEE_EMPTY_TEXTURE);
    this.images.forEach((image, index) => image.setVisible(p.visible).setAlpha(p.alpha).setDepth(p.depth + .01 * (index + 1)));
    // A fixed camera sees the right sword shoulder behind the torso when the
    // knight faces left. Helmet, chest and shield occlude the far-side arm.
    if (farBody) this.body.setDepth(p.depth + .06);
    this.body.setTexture(pose.frame).setPosition(p.x + direction * pose.bodyOffset.x, feetY + pose.bodyOffset.y)
      .setScale(scale).setFlipX(rightBody ? false : direction > 0).setRotation(direction * pose.bodyAngle);
    this.drawLimb(this.upper, this.parts.upper, pose.shoulder, pose.elbow, pose);
    this.drawPart(this.weapon, this.parts[state.weapon], pose.hand, pose.angle, pose.length, pose);
    this.drawLimb(this.forearm, this.parts.forearm, pose.elbow, pose.wrist, pose);
    this.upper.setVisible(p.visible && pose.sleevesVisible); this.forearm.setVisible(p.visible && pose.sleevesVisible);
    this.drawPart(this.hand, pose.handPart || this.parts.hand, pose.hand, pose.handAngle, pose.handLength, pose);
    if (!paused && state.weapon === 'powerHammer' && state.kind === 'swing' && !s.hammerAttack?.charged
      && stance === 'stand' && state.recoveryElapsed === undefined && state.elapsed >= HAMMER_NORMAL_IMPACT_MS
      && !state.impactShown) {
      state.impactShown = true; this.normalHammerImpact(pose);
    }
  }
  normalHammerImpact(pose) {
    const s = this.scene;
    if (s.cache?.audio?.exists('sfx-stone-hit')) s.sound.play('sfx-stone-hit', {volume:.16,rate:1.25});
    if (!s.tweens || !s.add.ellipse) return;
    const face = this.parts.powerHammer.headFace;
    const strikeX = face ? pose.length * (face.x * Math.cos(pose.angle) - face.y * Math.sin(pose.angle))
      : (pose.bounds.left + pose.bounds.right) / 2;
    const x = pose.x + pose.direction * (pose.hand.x + strikeX);
    for (const sign of [-1,1]) {
      const dust = s.add.ellipse(x + sign*5, pose.feetY-3, 9, 4, 0xd5c29b, .45).setDepth(s.player.depth + .07);
      s.tweens.add({targets:dust,x:dust.x+sign*10,y:dust.y-4,alpha:0,scaleX:1.5,duration:190,onComplete:()=>dust.destroy()});
    }
  }
  drawLimb(image, part, from, to, pose) {
    this.drawPart(image, part, from, Math.atan2(to.y - from.y, to.x - from.x), Math.hypot(to.x - from.x, to.y - from.y), pose);
    // Size the opaque sleeve itself. The texture rectangle also includes
    // empty pixels and an oversized joint cap; using its height made thin arms.
    const target = part === this.parts.upper ? MELEE_ARM_WIDTHS.upper : MELEE_ARM_WIDTHS.forearm;
    image.scaleY = target * pose.scale / .6 / (part.thickness || part.height);
  }
  drawPart(image, part, pivot, angle, length, pose) {
    const scale = length / part.length;
    image.setTexture(part.key).setOrigin(part.originX, part.originY)
      .setPosition(pose.x + pose.direction * pivot.x, pose.feetY + pivot.y)
      .setScale(-pose.direction * scale, scale).setRotation(pose.direction * (angle - part.angle));
  }
  destroy() { this.restore(); this.images?.forEach(image => image.destroy()); this.sword?.destroy(); this.state = null; }
}
