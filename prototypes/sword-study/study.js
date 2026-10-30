const data = await (await fetch('frames.json')).json();
const phases = ['Bereit', 'Ausholen', 'Beschleunigen', 'Schlag', 'Nachschwung', 'Zurück in die Deckung'];
const holds = { simple: [350,100,80,80,130,500], grounded: [350,180,100,90,200,500], realistic: [350,200,130,100,250,500] };
const studies = [];
let playing = true, speed = .65, elapsed = 0, previous;
const button = document.getElementById('play'), slider = document.getElementById('frame'), number = document.getElementById('frame-number');

for (const study of data.studies) {
  const image = new Image(); image.src = study.source; await image.decode();
  const frames = study.frames.map(frame => {
    const [x,y,width,height] = frame.rect;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, x,y,width,height,0,0,width,height);
    const mask = document.createElement('canvas'); mask.width = width; mask.height = height;
    const m = mask.getContext('2d'); m.fillStyle = '#fff';
    for (const [row,start,length] of frame.runs) m.fillRect(start,row,length,1);
    ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask,0,0);
    return { image: canvas, rootX: frame.root[0]-x, rootY: frame.root[1]-y };
  });
  const article = document.querySelector('[data-study="'+study.id+'"]'), canvas = article.querySelector('canvas');
  studies.push({ ...study, frames, canvas, ctx: canvas.getContext('2d'), phase: article.querySelector('.phase') });
}
document.getElementById('load-status').textContent = 'Alle 18 Originalposen geladen.';

function frameFor(study) {
  if (!playing) return Number(slider.value);
  const duration = holds[study.id].reduce((a,b)=>a+b,0); let t = elapsed % duration;
  for(let i=0;i<6;i++){if(t<holds[study.id][i])return i;t-=holds[study.id][i];}return 5;
}
function paint() {
  for (const study of studies) {
    const index = frameFor(study), frame = study.frames[index], ctx = study.ctx;
    ctx.setTransform(2,0,0,2,0,0); ctx.clearRect(0,0,420,340);
    ctx.strokeStyle = '#bbae8e'; ctx.lineWidth = 1; ctx.beginPath();ctx.moveTo(22,322);ctx.lineTo(405,322);ctx.stroke();
    const scale = data.pixelScale;
    ctx.drawImage(frame.image,200-frame.rootX*scale,322-frame.rootY*scale,frame.image.width*scale,frame.image.height*scale);
    study.phase.textContent = `${index+1} / 6 · ${phases[index]}`;
  }
}
button.onclick=()=>{playing=!playing;button.textContent=playing?'Pause':'Abspielen';if(playing)elapsed=0;paint();};
document.getElementById('speed').onchange=e=>{speed=Number(e.target.value);};
slider.oninput=()=>{playing=false;button.textContent='Abspielen';number.value=Number(slider.value)+1;paint();};
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!['INPUT','SELECT'].includes(event.target.tagName)){event.preventDefault();button.click();}});
function loop(now){elapsed+=previous===undefined?0:Math.min(60,now-previous)*speed;previous=now;paint();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
