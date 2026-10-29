import { bookFilmFrame } from './bookTimeline.js';
import BookShots, { createBookCanvas } from './BookShots.js';

// Traced from the gold pencil frame in the 1586 × 992 open-book.png.
// Each boundary follows the painted line, including its asymmetric bends.
export const BOOK_PAGE_SHAPES = {
  left: {
    top: [[194.0,89.0],[203.93,85],[213.86,86],[223.79,83],[233.72,82],[243.66,80],[253.59,79],[263.52,77],[273.45,76],[283.38,75],[293.31,73],[303.24,72],[313.17,71],[323.1,69],[333.03,68],[342.97,66],[352.9,65],[362.83,64],[372.76,63],[382.69,62],[392.62,61],[402.55,59],[412.48,58],[422.41,55],[432.34,58],[442.28,57],[452.21,56],[462.14,55],[472.07,54],[482.0,53],[491.93,52],[501.86,51],[511.79,51],[521.72,50],[531.66,49],[541.59,49],[551.52,48],[561.45,47],[571.38,47],[581.31,47],[591.24,46],[601.17,46],[611.1,46],[621.03,46],[630.97,46],[640.9,46],[650.83,47],[660.76,48],[670.69,49],[680.62,51],[690.55,53],[700.48,56],[710.41,58],[720.34,61],[730.28,65],[740.21,69],[750.14,75],[760.07,81],[770.0,86.0]],
    bottom: [[88.0,847.0],[97.92,847],[107.83,847],[117.75,847],[127.67,848],[137.58,849],[147.5,848],[157.42,850],[167.33,848],[177.25,849],[187.17,849],[197.08,848],[207.0,850],[216.92,849],[226.83,849],[236.75,848],[246.67,847],[256.58,846],[266.5,846],[276.42,845],[286.33,845],[296.25,844],[306.17,844],[316.08,843],[326.0,842],[335.92,842],[345.83,841],[355.75,840],[365.67,839],[375.58,838],[385.5,837],[395.42,836],[405.33,835],[415.25,834],[425.17,835],[435.08,832],[445.0,831],[454.92,831],[464.83,830],[474.75,830],[484.67,829],[494.58,827],[504.5,826],[514.42,825],[524.33,825],[534.25,824],[544.17,824],[554.08,823],[564.0,823],[573.92,822],[583.83,822],[593.75,822],[603.67,822],[613.58,822],[623.5,822],[633.42,822],[643.33,822],[653.25,822],[663.17,823],[673.08,824],[683.0,825],[692.92,827],[702.83,828],[712.75,830],[722.67,832],[732.58,833],[742.5,835],[752.42,837],[762.33,839],[772.25,841],[782.17,842],[792.08,845],[802.0,846.0]],
    left: [[194.0,89.0],[188,98.97],[188,108.95],[186,118.92],[184,128.89],[184,138.87],[182,148.84],[180,158.82],[179,168.79],[178,178.76],[176,188.74],[175,198.71],[174,208.68],[172,218.66],[171,228.63],[170,238.61],[169,248.58],[167,258.55],[166,268.53],[165,278.5],[163,288.47],[162,298.45],[161,308.42],[159,318.39],[157,328.37],[157,338.34],[156,348.32],[154,358.29],[153,368.26],[152,378.24],[150,388.21],[149,398.18],[148,408.16],[147,418.13],[145,428.11],[144,438.08],[142,448.05],[141,458.03],[140,468.0],[139,477.97],[137,487.95],[136,497.92],[134,507.89],[133,517.87],[132,527.84],[130,537.82],[129,547.79],[128,557.76],[126,567.74],[125,577.71],[124,587.68],[123,597.66],[121,607.63],[120,617.61],[118,627.58],[117,637.55],[116,647.53],[114,657.5],[113,667.47],[111,677.45],[110,687.42],[108,697.39],[107,707.37],[105,717.34],[104,727.32],[101,737.29],[100,747.26],[99,757.24],[98,767.21],[97,777.18],[95,787.16],[92,797.13],[91,807.11],[90,817.08],[89,827.05],[87,837.03],[88.0,847.0]],
    right: [[770.0,86.0],[770,96.0],[770,106.0],[771,116.0],[771,126.0],[771,136.0],[772,146.0],[773,156.0],[773,166.0],[774,176.0],[774,186.0],[775,196.0],[775,206.0],[776,216.0],[777,226.0],[777,236.0],[777,246.0],[777,256.0],[778,266.0],[778,276.0],[779,286.0],[779,296.0],[780,306.0],[780,316.0],[780,326.0],[781,336.0],[781,346.0],[782,356.0],[782,366.0],[782,376.0],[783,386.0],[783,396.0],[783,406.0],[784,416.0],[785,426.0],[785,436.0],[786,446.0],[786,456.0],[786,466.0],[787,476.0],[788,486.0],[788,496.0],[789,506.0],[790,516.0],[790,526.0],[788,536.0],[789,546.0],[790,556.0],[791,566.0],[791,576.0],[791,586.0],[792,596.0],[792,606.0],[792,616.0],[793,626.0],[794,636.0],[794,646.0],[794,656.0],[795,666.0],[795,676.0],[795,686.0],[796,696.0],[797,706.0],[796,716.0],[797,726.0],[798,736.0],[797,746.0],[798,756.0],[798,766.0],[799,776.0],[799,786.0],[800,796.0],[801,806.0],[801,816.0],[801,826.0],[802,836.0],[802.0,846.0]],
  },
  right: {
    top: [[848.0,100.0],[857.88,92],[867.75,90],[877.62,82],[887.5,79],[897.38,77],[907.25,75],[917.12,74],[927.0,72],[936.88,71],[946.75,70],[956.62,69],[966.5,69],[976.38,69],[986.25,69],[996.12,69],[1006.0,69],[1015.88,70],[1025.75,70],[1035.62,70],[1045.5,71],[1055.38,72],[1065.25,72],[1075.12,73],[1085.0,73],[1094.88,74],[1104.75,74],[1114.62,74],[1124.5,74],[1134.38,74],[1144.25,75],[1154.12,75],[1164.0,76],[1173.88,76],[1183.75,77],[1193.62,78],[1203.5,78],[1213.38,78],[1223.25,78],[1233.12,77],[1243.0,79],[1252.88,79],[1262.75,78],[1272.62,78],[1282.5,77],[1292.38,77],[1302.25,76],[1312.12,75],[1322.0,74],[1331.88,74],[1341.75,73],[1351.62,73],[1361.5,72],[1371.38,72],[1381.25,71],[1391.12,70],[1401.0,70.0]],
    bottom: [[878.0,852.0],[887.92,850],[897.84,848],[907.77,848],[917.69,847],[927.61,845],[937.53,844],[947.45,843],[957.38,842],[967.3,842],[977.22,841],[987.14,841],[997.06,840],[1006.98,840],[1016.91,840],[1026.83,840],[1036.75,841],[1046.67,842],[1056.59,843],[1066.52,843],[1076.44,845],[1086.36,846],[1096.28,847],[1106.2,848],[1116.12,849],[1126.05,850],[1135.97,850],[1145.89,849],[1155.81,849],[1165.73,850],[1175.66,850],[1185.58,851],[1195.5,851],[1205.42,851],[1215.34,851],[1225.27,851],[1235.19,852],[1245.11,852],[1255.03,852],[1264.95,851],[1274.88,852],[1284.8,851],[1294.72,850],[1304.64,850],[1314.56,850],[1324.48,850],[1334.41,850],[1344.33,849],[1354.25,849],[1364.17,848],[1374.09,848],[1384.02,847],[1393.94,846],[1403.86,846],[1413.78,845],[1423.7,844],[1433.62,844],[1443.55,843],[1453.47,842],[1463.39,841],[1473.31,841],[1483.23,837],[1493.16,840],[1503.08,839],[1513.0,838.0]],
    left: [[848.0,100.0],[846,109.89],[850,119.79],[850,129.68],[844,139.58],[845,149.47],[845,159.37],[845,169.26],[846,179.16],[846,189.05],[845,198.95],[845,208.84],[845,218.74],[845,228.63],[846,238.53],[846,248.42],[846,258.32],[847,268.21],[847,278.11],[848,288.0],[848,297.89],[849,307.79],[849,317.68],[848,327.58],[850,337.47],[850,347.37],[851,357.26],[851,367.16],[852,377.05],[852,386.95],[853,396.84],[853,406.74],[854,416.63],[854,426.53],[855,436.42],[855,446.32],[855,456.21],[855,466.11],[856,476.0],[856,485.89],[857,495.79],[857,505.68],[857,515.58],[858,525.47],[858,535.37],[861,545.26],[861,555.16],[861,565.05],[861,574.95],[861,584.84],[862,594.74],[863,604.63],[863,614.53],[863,624.42],[864,634.32],[865,644.21],[865,654.11],[865,664.0],[866,673.89],[866,683.79],[866,693.68],[867,703.58],[868,713.47],[868,723.37],[869,733.26],[869,743.16],[870,753.05],[871,762.95],[870,772.84],[871,782.74],[872,792.63],[872,802.53],[874,812.42],[875,822.32],[875,832.21],[877,842.11],[878.0,852.0]],
    right: [[1401.0,70.0],[1405,79.97],[1407,89.95],[1408,99.92],[1408,109.9],[1409,119.87],[1412,129.84],[1414,139.82],[1415,149.79],[1416,159.77],[1417,169.74],[1418,179.71],[1420,189.69],[1421,199.66],[1421,209.64],[1424,219.61],[1426,229.58],[1428,239.56],[1429,249.53],[1431,259.51],[1432,269.48],[1434,279.45],[1435,289.43],[1437,299.4],[1438,309.38],[1440,319.35],[1440,329.32],[1443,339.3],[1444,349.27],[1445,359.25],[1447,369.22],[1449,379.19],[1450,389.17],[1452,399.14],[1453,409.12],[1454,419.09],[1456,429.06],[1458,439.04],[1458,449.01],[1459,458.99],[1461,468.96],[1461,478.94],[1463,488.91],[1465,498.88],[1464,508.86],[1468,518.83],[1469,528.81],[1468,538.78],[1470,548.75],[1472,558.73],[1473,568.7],[1475,578.68],[1476,588.65],[1478,598.62],[1479,608.6],[1480,618.57],[1482,628.55],[1484,638.52],[1485,648.49],[1487,658.47],[1489,668.44],[1490,678.42],[1492,688.39],[1493,698.36],[1495,708.34],[1497,718.31],[1499,728.29],[1501,738.26],[1503,748.23],[1505,758.21],[1506,768.18],[1507,778.16],[1509,788.13],[1509,798.1],[1509,808.08],[1511,818.05],[1512,828.03],[1513.0,838.0]],
  },
};
const lerpPoint=(a,b,p)=>[a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p];
function edgePoint(points,t) {
  const at=Math.max(0,Math.min(1,t))*(points.length-1),i=Math.min(points.length-2,Math.floor(at));
  return lerpPoint(points[i],points[i+1],at-i);
}
export function bookPagePoint(shape,u,v) {
  const top=edgePoint(shape.top,u),bottom=edgePoint(shape.bottom,u);
  const left=edgePoint(shape.left,v),right=edgePoint(shape.right,v);
  const a=shape.top[0],b=shape.top.at(-1),d=shape.bottom[0],c=shape.bottom.at(-1);
  const linear=lerpPoint(lerpPoint(a,b,u),lerpPoint(d,c,u),v);
  const horizontal=lerpPoint(left,right,u),vertical=lerpPoint(top,bottom,v);
  return [horizontal[0]+vertical[0]-linear[0],horizontal[1]+vertical[1]-linear[1]];
}
// Dry-brush teeth are fixed to the paper, never randomized per frame.
// Only a narrow rim is affected; the scene still fills the page.
export function bookInkInset(t, edge) {
  return 2.5 + 2 * Math.sin(t * 137 + edge * 2.1) ** 2
    + 2.2 * Math.sin(t * 433 + edge * .7) ** 2;
}
function inkBoundaryPoint(point,u,v) {
  if(v===0)v=bookInkInset(u,0)/720;
  else if(v===1)v=1-bookInkInset(u,2)/720;
  if(u===0)u=bookInkInset(v,3)/600;
  else if(u===1)u=1-bookInkInset(v,1)/600;
  return point(u,v);
}
const leftQuad=BOOK_PAGE_SHAPES.left,rightQuad=BOOK_PAGE_SHAPES.right;
function paperRenderer(ctx) {
const sheetFront = createBookCanvas(700,840), sheetBack = createBookCanvas(700,840);
function drawTriangle(image, source, destination, targetContext = ctx) {
  const [s0,s1,s2] = source, [d0,d1,d2] = destination;
  const sx1=s1[0]-s0[0],sy1=s1[1]-s0[1],sx2=s2[0]-s0[0],sy2=s2[1]-s0[1];
  const det=sx1*sy2-sx2*sy1; if(Math.abs(det)<.0001)return;
  const dx1=d1[0]-d0[0],dy1=d1[1]-d0[1],dx2=d2[0]-d0[0],dy2=d2[1]-d0[1];
  const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det;
  const cc=(dx2*sx1-dx1*sx2)/det,d=(dy2*sx1-dy1*sx2)/det;
  targetContext.save();targetContext.beginPath();targetContext.moveTo(...d0);targetContext.lineTo(...d1);targetContext.lineTo(...d2);targetContext.closePath();targetContext.clip();
  targetContext.transform(a,b,cc,d,d0[0]-a*s0[0]-cc*s0[1],d0[1]-b*s0[0]-d*s0[1]);
  targetContext.drawImage(image,0,0);targetContext.restore();
}
function mesh(image, point, reverse=false, columns=18, rows=3, targetContext=ctx) {
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const u=col/columns,v=row/rows,u1=(col+1)/columns,v1=(row+1)/rows;
    const source=(x,y)=>[(reverse?1-x:x)*image.width,y*image.height];
    const a=point(u,v),b=point(u1,v),c=point(u1,v1),d=point(u,v1);
    drawTriangle(image,[source(u,v),source(u1,v),source(u1,v1)],[a,b,c],targetContext);
    drawTriangle(image,[source(u,v),source(u1,v1),source(u,v1)],[a,c,d],targetContext);
  }
}
function quad(image, corners, alpha=1, targetContext=ctx, frayed=true) {
  if(alpha<=0)return;
  targetContext.save();targetContext.globalAlpha=alpha;
  const point=typeof corners==='function'?corners:(u,v)=>bookPagePoint(corners,u,v);
  // The aperture follows every measured pencil-line bend. The inner mesh
  // needs fewer cells, while the boundary itself remains pixel-accurate.
  const boundary=[],edge=(u,v)=>frayed?inkBoundaryPoint(point,u,v):point(u,v);
  for(let i=0;i<=128;i++)boundary.push(edge(i/128,0));
  for(let i=1;i<=128;i++)boundary.push(edge(1,i/128));
  for(let i=1;i<=128;i++)boundary.push(edge(1-i/128,1));
  for(let i=1;i<=128;i++)boundary.push(edge(0,1-i/128));
  targetContext.beginPath();boundary.forEach((p,i)=>i?targetContext.lineTo(...p):targetContext.moveTo(...p));
  targetContext.closePath();targetContext.clip();
  const xs=boundary.map(p=>p[0]),ys=boundary.map(p=>p[1]);
  // An opaque underprint prevents hairline gaps between the mesh and the
  // detailed aperture; the shaped mesh covers its interior completely.
  targetContext.drawImage(image,Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  mesh(image,point,false,32,12,targetContext);
  targetContext.restore();
}

function sheetCoordinate(point, corners) {
  // Invert the book's perspective so the printed image stays in the same
  // place when the lifting sheet leaves or meets the flat page.
  const [a,b,c,d]=corners;
  const bx=b[0]-a[0],by=b[1]-a[1],dx=d[0]-a[0],dy=d[1]-a[1];
  const ex=a[0]-b[0]+c[0]-d[0],ey=a[1]-b[1]+c[1]-d[1];
  let u=.5,v=.5;
  for(let i=0;i<8;i++){
    const rx=a[0]+bx*u+dx*v+ex*u*v-point[0],ry=a[1]+by*u+dy*v+ey*u*v-point[1];
    const ux=bx+ex*v,uy=by+ey*v,vx=dx+ex*u,vy=dy+ey*u,det=ux*vy-vx*uy;
    u-=(rx*vy-vx*ry)/det;v-=(ux*ry-rx*uy)/det;
  }
  return [u,v];
}
function sheet(target, page, back=false, destinationBook=null) {
  const c=target.getContext('2d'),w=target.width,h=target.height;
  c.fillStyle='#ffedc4';c.fillRect(0,0,w,h);
  const shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#ad88512b');shade.addColorStop(.13,'#ffeec600');shade.addColorStop(.82,'#fff6db25');shade.addColorStop(1,'#c19a561a');
  c.fillStyle=shade;c.fillRect(0,0,w,h);
  c.strokeStyle='#cc9d5955';c.lineWidth=2;c.strokeRect(25,29,w-50,h-58);
  const paperCorners=back?[[818,88],[163,70],[35,887],[838,903]]
    :[[818,88],[1427,55],[1553,866],[838,903]];
  if (back && destinationBook) {
    // Project the actual menu spread onto the back of the turning leaf.
    // At the end of the turn it meets the menu without a change of artwork.
    quad(destinationBook,(u,v)=>{
      const [sx,sy]=sheetCoordinate([u*1586,v*992],paperCorners);
      return [(1-sx)*w,sy*h];
    },1,c,false);
    return;
  }
  quad(page,(u,v)=>{
    const [sx,sy]=sheetCoordinate(bookPagePoint(back?leftQuad:rightQuad,u,v),paperCorners);
    return [(back?1-sx:sx)*w,sy*h];
  },1,c);
}

function turningPage(progress) {
  const theta=progress*Math.PI,amount=(1-Math.cos(theta))/2,lift=Math.sin(theta);
  const edgeTop=lerpPoint([1427,55],[163,70],amount),edgeBottom=lerpPoint([1553,866],[35,887],amount);
  edgeTop[1]-=lift*58;edgeBottom[1]-=lift*55;
  const point=(u,v)=>{
    const spine=lerpPoint([818,88],[838,903],v),edge=lerpPoint(edgeTop,edgeBottom,v);
    const p=lerpPoint(spine,edge,u);p[1]-=Math.sin(u*Math.PI)*lift*24;return p;
  };
  ctx.save();ctx.fillStyle='#211711';ctx.globalAlpha=.16*lift;ctx.shadowColor='#1c110a';ctx.shadowBlur=45;
  ctx.beginPath();ctx.moveTo(818,100);ctx.lineTo(edgeTop[0]+35*lift,edgeTop[1]+40*lift);
  ctx.lineTo(edgeBottom[0]+55*lift,edgeBottom[1]+55*lift);ctx.lineTo(838,903);ctx.closePath();ctx.fill();ctx.restore();
  const back=progress>.5;
  mesh(back?sheetBack:sheetFront,point,back,28,4);
  // Soft fold shading changes with the paper's angle, without hiding its art.
  for(let i=0;i<20;i++){
    const u=i/20,u1=(i+1)/20;
    ctx.save();ctx.globalAlpha=lift*(.06+.16*Math.sin(u*Math.PI));ctx.fillStyle=back?'#8d633b':'#503b25';
    ctx.beginPath();ctx.moveTo(...point(u,0));ctx.lineTo(...point(u1,0));ctx.lineTo(...point(u1,1));ctx.lineTo(...point(u,1));ctx.closePath();ctx.fill();ctx.restore();
  }
}

return { quad, turn: turningPage, prepare(front, back, destinationBook=null) { sheet(sheetFront,front);sheet(sheetBack,back,true,destinationBook); } };
}

// Pixel desaturation is cached for frozen pages and works on iPad browsers
// that do not implement CanvasRenderingContext2D.filter.
export function desaturateBookPixels(data) {
  for(let i=0;i<data.length;i+=4){
    const value=Math.round(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722);
    data[i]=value;data[i+1]=value;data[i+2]=value;
  }
  return data;
}
export default class BookPresentation {
  constructor(canvas,getImage,film,options={}) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.image=getImage;this.film=film;
    this.reducedMotion=options.reducedMotion;this.shots=new BookShots(getImage,options);
    this.paper=paperRenderer(this.ctx);
    this.pages=Array.from({length:3},()=>({color:createBookCanvas(600,720),gray:createBookCanvas(600,720),
      printed:createBookCanvas(1586,992),printedGray:createBookCanvas(1586,992),key:null,grayKey:null}));
    this.menu=createBookCanvas(1586,992);
    const menuImage=getImage('menu-book'),menuScale=Math.max(1586/menuImage.width,992/menuImage.height);
    this.menu.getContext('2d').drawImage(menuImage,(1586-menuImage.width*menuScale)/2,
      (992-menuImage.height*menuScale)/2,menuImage.width*menuScale,menuImage.height*menuScale);
    this.front=createBookCanvas(600,720);this.back=createBookCanvas(600,720);
  }
  pageTexture(slot,page) {
    const p=this.pages[slot],key=page.shot.id+':'+page.time;
    if(p.key!==key){this.shots.render(p.color,this.film,page);p.key=key;p.grayKey=null;}
    if(page.desaturation>0&&p.grayKey!==key){
      const c=p.gray.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,600,720);c.drawImage(p.color,0,0);
      const pixels=c.getImageData(0,0,600,720);desaturateBookPixels(pixels.data);c.putImageData(pixels,0,0);p.grayKey=key;
    }
    return p;
  }
  composite(target,slot,page) {
    const p=this.pageTexture(slot,page),c=target.getContext('2d');c.clearRect(0,0,600,720);c.drawImage(p.color,0,0);
    if(page.desaturation>0){c.save();c.globalAlpha=page.desaturation;c.drawImage(p.gray,0,0);c.restore();}
  }
  paintPage(slot,page,corners,alpha=1) {
    const p=this.pageTexture(slot,page),opacity=alpha*page.reveal;
    if(p.printKey!==p.key){
      const c=p.printed.getContext('2d');c.clearRect(0,0,1586,992);
      this.paper.quad(p.color,corners,1,c);p.printKey=p.key;p.printGrayKey=null;
    }
    this.ctx.save();this.ctx.globalAlpha=opacity;this.ctx.drawImage(p.printed,0,0);
    if(page.desaturation>0){
      if(p.printGrayKey!==p.key){
        const c=p.printedGray.getContext('2d');c.clearRect(0,0,1586,992);
        this.paper.quad(p.gray,corners,1,c);p.printGrayKey=p.key;
      }
      this.ctx.globalAlpha=opacity*page.desaturation;this.ctx.drawImage(p.printedGray,0,0);
    }
    this.ctx.restore();
  }
  draw(milliseconds) {
    const f=bookFilmFrame(this.film,milliseconds),tick=Math.floor(f.time/33);
    this.changed=tick!==this.tick;if(!this.changed)return f;this.tick=tick;
    this.ctx.clearRect(0,0,1586,992);this.ctx.drawImage(this.image('book-open'),0,0,1586,992);
    const menuTurn=Boolean(f.next?.shot.menu),menuPage=Boolean(f.left.shot.menu);
    if(menuTurn){
      this.ctx.save();this.ctx.globalAlpha=f.turn;this.ctx.drawImage(this.menu,0,0);this.ctx.restore();
    }
    if(menuPage){this.ctx.drawImage(this.menu,0,0);}
    else this.paintPage(0,f.left,leftQuad,this.reducedMotion&&menuTurn?1-f.turn:1);
    if(f.turn!==null){
      if(this.reducedMotion){
        this.paintPage(1,f.right,rightQuad,1-f.turn);if(!menuTurn)this.paintPage(2,f.next,leftQuad,f.turn);
      }else{
        this.composite(this.front,1,f.right);this.composite(this.back,2,f.next);
        this.paper.prepare(this.front,this.back,menuTurn?this.menu:null);this.paper.turn(f.turn);
      }
    }else if(f.right)this.paintPage(1,f.right,rightQuad);
    this.canvas.dataset.bookFilm=this.film;this.canvas.dataset.bookShot=String(f.index);
    this.canvas.dataset.bookSourceTime=String(f.sourceTime);this.canvas.dataset.bookLeftTime=String(f.left.time);
    this.canvas.dataset.bookDesaturation=String(f.left.desaturation);
    return f;
  }
}
