// Read the repository's RGBA8 PNG assets without adding a test dependency.
const fs=require('node:fs'),{inflateSync}=require('node:zlib');
exports.readRgba=function(file){
 const png=fs.readFileSync(file),chunks=[];let w,h,depth,color,interlaced;
 if(png.subarray(1,4).toString()!=='PNG')throw Error('Not a PNG: '+file);
 for(let i=8;i<png.length;){
  const n=png.readUInt32BE(i),type=png.toString('ascii',i+4,i+8),data=png.subarray(i+8,i+8+n);i+=n+12;
  if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);depth=data[8];color=data[9];interlaced=data[12];}
  if(type==='IDAT')chunks.push(data);
  if(type==='IEND')break;
 }
 if(depth!==8||color!==6||interlaced)throw Error('Expected noninterlaced RGBA8: '+file);
 const raw=inflateSync(Buffer.concat(chunks)),stride=w*4,pixels=Buffer.alloc(stride*h);
 const paeth=(a,b,c)=>{const p=a+b-c,A=Math.abs(p-a),B=Math.abs(p-b),C=Math.abs(p-c);return A<=B&&A<=C?a:B<=C?b:c};
 let offset=0;
 for(let y=0;y<h;y++){
  const filter=raw[offset++];if(filter>4)throw Error('Unknown PNG filter');
  for(let x=0;x<stride;x++){
   const i=y*stride+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0;
   pixels[i]=(raw[offset++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
  }
 }
 return {width:w,height:h,pixels};
};
