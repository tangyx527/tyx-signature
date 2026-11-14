import type {OrnateFrame} from './ornate-types';

export type BotanicalPreset='crystal-vine'|'butterfly'|'lotus'|'umbrella'|'snowflake'|'petals';
type Point={x:number;y:number};
type Trace=(context:CanvasRenderingContext2D)=>void;
const TAU=Math.PI*2;
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const ease=(value:number)=>{const p=clamp(value);return p*p*(3-2*p);};
const mix=(a:string,b:string,p:number)=>'#'+[1,3,5].map(i=>Math.round((parseInt(a.slice(i,i+2),16)||0)*(1-p)+(parseInt(b.slice(i,i+2),16)||0)*p).toString(16).padStart(2,'0')).join('');
const seed=(n:number)=>{const value=Math.sin(n*127.1+43.7)*43758.5453;return value-Math.floor(value);};

function gradient(context:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,colors:readonly string[]):CanvasGradient|string{
 if(typeof context.createLinearGradient!=='function')return colors[Math.floor(colors.length/2)];
 const paint=context.createLinearGradient(x1,y1,x2,y2);colors.forEach((color,index)=>paint.addColorStop(index/Math.max(1,colors.length-1),color));return paint;
}
function shape(context:CanvasRenderingContext2D,trace:Trace,fill:CanvasGradient|string|null,stroke:string|null=null,width=1,alpha=1,glow=0):void{
 if(alpha<=0)return;
 context.save();context.globalAlpha*=alpha;context.beginPath();trace(context);context.lineJoin='round';context.lineCap='round';
 if(fill){context.fillStyle=fill;context.shadowColor=typeof fill==='string'?fill:stroke??'#dffaff';context.shadowBlur=glow;context.fill();}
 if(stroke){context.strokeStyle=stroke;context.lineWidth=width;context.shadowColor=stroke;context.shadowBlur=glow;context.stroke();}context.restore();
}
function polygon(context:CanvasRenderingContext2D,points:readonly Point[],fill:CanvasGradient|string,alpha=1,stroke?:string):void{
 shape(context,c=>{c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.closePath();},fill,stroke??null,.8,alpha);
}
function oval(context:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,alpha:number,width=1.3):void{
 shape(context,c=>{c.moveTo(x+rx,y);c.quadraticCurveTo(x+rx,y+ry,x,y+ry);c.quadraticCurveTo(x-rx,y+ry,x-rx,y);c.quadraticCurveTo(x-rx,y-ry,x,y-ry);c.quadraticCurveTo(x+rx,y-ry,x+rx,y);},null,color,width,alpha,4);
}
function star(context:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha=1,turn=0):void{
 context.save();context.translate(x,y);context.rotate(turn);
 shape(context,c=>{c.moveTo(-r,0);c.quadraticCurveTo(0,0,0,-r*1.6);c.quadraticCurveTo(0,0,r,0);c.quadraticCurveTo(0,0,0,r*1.6);c.quadraticCurveTo(0,0,-r,0);c.closePath();},color,null,1,alpha,r*.8);context.restore();
}
export function drawCrystalLeaf(context:CanvasRenderingContext2D,length:number,width:number,color:string,accent:string,shine:number):void{
 const light=mix(accent,'#ffffff',.76),deep=mix(color,'#15102b',.62);
 polygon(context,[{x:0,y:0},{x:-width,y:-length*.43},{x:0,y:-length},{x:width*.85,y:-length*.48}],gradient(context,-width,-length,width,0,[light,color,deep]),.88,light);
 polygon(context,[{x:0,y:0},{x:0,y:-length},{x:-width,y:-length*.43}],light,.19+.16*shine);
 polygon(context,[{x:0,y:0},{x:width*.85,y:-length*.48},{x:0,y:-length*.65}],accent,.36);
 shape(context,c=>{c.moveTo(0,0);c.lineTo(0,-length);c.moveTo(-width*.7,-length*.46);c.lineTo(0,-length*.60);c.lineTo(width*.7,-length*.49);},null,light,.9,.72,3);
 star(context,0,-length,2.4,light,.6+.3*shine);
}
export function drawOrganicPetal(context:CanvasRenderingContext2D,length:number,width:number,color:string,accent:string,alpha=1):void{
 const light=mix(accent,'#ffffff',.82),deep=mix(color,'#29103c',.46);
 shape(context,c=>{c.moveTo(0,0);c.quadraticCurveTo(-width,-length*.34,0,-length);c.quadraticCurveTo(width,-length*.34,0,0);c.closePath();},gradient(context,-width,-length,width,0,[light,color,deep]),light,.8,alpha,3);
 shape(context,c=>{c.moveTo(0,-3);c.quadraticCurveTo(width*.12,-length*.44,0,-length*.88);},null,light,.8,alpha*.56);
}

/** The opening's paired stem stroke; the caller supplies the same continuous centerline. */
export function drawCrystalVineStrand(context:CanvasRenderingContext2D,trace:Trace,color:string,light:string):void{
 shape(context,trace,null,color,4.7,.52,13);
 shape(context,trace,null,light,1.2,.95,3);
}
export function drawCrystalVineCurl(context:CanvasRenderingContext2D,trace:Trace,accent:string):void{
 shape(context,trace,null,accent,1.7,.83,5);
}

function crystalVine(context:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const open=ease(frame.open),time=frame.time,color=mix(frame.color,'#a77dff',.50),accent=mix(frame.accent,'#e9bdff',.42),light=mix(accent,'#ffffff',.72);
 context.save();context.scale(.50+.50*open,.60+.40*open);context.rotate(Math.sin(time*.67)*.035);
 for(const side of [-1,1]){
  context.save();context.scale(side,1);
  drawCrystalVineStrand(context,c=>{c.moveTo(0,90);c.quadraticCurveTo(112,142,204,28);c.quadraticCurveTo(286,-83,178,-178);c.quadraticCurveTo(132,-218,96,-188);c.quadraticCurveTo(65,-162,102,-147);},color,light);
  for(let i=0;i<7;i++){
   const angle=-1.1+i*.31,x=103+99*Math.sin(angle),y=-110+137*Math.cos(angle),length=(73+20*Math.sin(i*.74))*open,w=18+i%3*4;
   context.save();context.translate(x,y);context.rotate(.5+i*.25+Math.sin(time*1.3+i)*.07);drawCrystalLeaf(context,length,w,i%2?color:accent,light,(Math.sin(time*2+i)+1)/2);context.restore();
  }
  for(let i=0;i<3;i++){
   context.save();context.translate(45+i*43,75-i*23);context.rotate(.7+i*.27+Math.sin(time+i)*.08);drawCrystalLeaf(context,(98-i*15)*open,22-i*3,color,accent,.5+.5*Math.sin(time+i));context.restore();
  }
  drawCrystalVineCurl(context,c=>{c.moveTo(22,106);c.quadraticCurveTo(115,164,181,108);c.quadraticCurveTo(229,69,193,66);c.quadraticCurveTo(170,65,180,84);},accent);
  context.restore();
 }
 context.save();context.translate(0,43);context.scale(.78+.22*open,1);drawCrystalLeaf(context,206*open,57,color,accent,.5+.5*Math.sin(time*2));context.restore();
 context.save();context.translate(0,91);context.rotate(Math.PI);drawCrystalLeaf(context,75*open,20,color,light,.5);context.restore();
 const points=Array.from({length:6},(_,i)=>({x:Math.cos(i*TAU/6)*31,y:28+Math.sin(i*TAU/6)*31}));
 for(let i=0;i<6;i++)polygon(context,[{x:0,y:28},points[i],points[(i+1)%6]],i%2?light:color,.70);
 star(context,0,28,23,light,.86,Math.sin(time*.8)*.1);
 for(let i=0;i<9;i++){const a=i*2.4+time*.28,r=152+49*Math.sin(i*1.8+time*.4);star(context,Math.cos(a)*r,Math.sin(a)*r*.82,2.4+(i%3),i%2?accent:light,.44+.32*Math.sin(time*1.7+i)**2,a);}
 context.restore();
}

function butterflyWing(context:CanvasRenderingContext2D,color:string,accent:string,flap:number):void{
 const light=mix(accent,'#ffffff',.86),deep=mix(color,'#102759',.65);
 context.save();context.scale(flap,1);
 const upper:Point[]=[{x:4,y:0},{x:43,y:-78},{x:107,y:-95},{x:95,y:-27},{x:61,y:20},{x:16,y:25}];
 shape(context,c=>{c.moveTo(4,0);c.quadraticCurveTo(35,-94,107,-95);c.quadraticCurveTo(112,-31,61,20);c.quadraticCurveTo(40,42,16,25);c.closePath();},gradient(context,10,30,95,-90,[deep,color,light]),light,1.4,.93,9);
 const hub={x:14,y:7};for(let i=1;i<upper.length-1;i++)polygon(context,[hub,upper[i],upper[i+1]],i%2?light:accent,.13+(i%3)*.12);
 shape(context,c=>{c.moveTo(10,17);c.quadraticCurveTo(61,-1,77,43);c.quadraticCurveTo(75,88,34,82);c.quadraticCurveTo(6,71,8,30);c.closePath();},gradient(context,8,80,70,20,[deep,color,light]),light,1.1,.91,6);
 polygon(context,[{x:12,y:27},{x:76,y:41},{x:33,y:79}],light,.22);
 shape(context,c=>{c.moveTo(8,8);c.quadraticCurveTo(49,-18,100,-87);c.moveTo(17,7);c.lineTo(43,-78);c.moveTo(17,7);c.lineTo(95,-27);c.moveTo(14,31);c.lineTo(64,61);c.moveTo(14,31);c.lineTo(33,78);},null,light,1.25,.82,3);
 for(let i=0;i<4;i++)star(context,31+i*17,-27-i*12,2.5,light,.73);
 context.restore();
}

export type CrystalButterflyStyle={color:string;accent:string;flap:number;rightColor?:string;rightAccent?:string};

/** The opening's original single butterfly, centered on the thorax at (0,0). */
export function drawCrystalButterfly(context:CanvasRenderingContext2D,{color,accent,flap,rightColor=color,rightAccent}:CrystalButterflyStyle):void{
 const light=mix(accent,'#ffffff',.8);
 context.save();
 butterflyWing(context,color,accent,flap);context.save();context.scale(-1,1);butterflyWing(context,rightColor,rightAccent??light,flap);context.restore();
 shape(context,c=>{c.moveTo(0,-23);c.quadraticCurveTo(-7,-3,-3,42);c.quadraticCurveTo(0,58,4,39);c.quadraticCurveTo(7,-3,0,-23);},gradient(context,-4,0,5,0,[color,light,color]),light,1,.95,6);
 shape(context,c=>{c.moveTo(-1,-19);c.quadraticCurveTo(-15,-45,-23,-37);c.moveTo(2,-19);c.quadraticCurveTo(16,-44,24,-38);},null,light,1.1,.9,3);
 star(context,0,-23,4.2,light,.94);context.restore();
}

function butterfly(context:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const time=frame.time,open=ease(frame.open),color=mix(frame.color,'#48aaff',.57),accent=mix(frame.accent,'#adf4ff',.48),light=mix(accent,'#ffffff',.8);
 for(let i=0;i<3;i++){
  const a=time*(i%2?-.55:.48)+i*TAU/3,r=173+(i===2?-20:14)*Math.sin(time*.65+i),x=Math.cos(a)*r*open,y=Math.sin(a)*r*.79*open;
  shape(context,c=>{c.moveTo(x,y);for(let j=1;j<=34;j++){const age=j/34*.80,p=a-age*(i%2?-.9:.9);c.lineTo(Math.cos(p)*r*open,Math.sin(p)*r*.79*open+Math.sin(age*3)*11);}},null,i%2?color:light,1.7,.71,6);
  context.save();context.translate(x,y);context.rotate(a*.21+Math.sin(time*1.3+i)*.18);context.scale((.70+i*.12)*(.46+.54*open),.70+i*.12);
  const flap=.27+.73*Math.abs(Math.sin(time*6.5+i*1.17));
  drawCrystalButterfly(context,{color,accent,flap,rightColor:i===1?accent:color,rightAccent:light});context.restore();
 }
 context.save();context.rotate(-time*.2);context.scale(.52+.48*open,.52+.48*open);
 for(let i=0;i<8;i++){context.save();context.rotate(i*TAU/8);context.translate(0,-9);drawCrystalLeaf(context,87,18,i%2?color:accent,light,.6+.4*Math.sin(time*2+i));context.restore();}
 star(context,0,0,32,light,.86,time*.15);context.restore();
 for(let i=0;i<12;i++){const a=i*2.399+time*.19,r=70+seed(i+14)*180;star(context,Math.cos(a)*r,Math.sin(a)*r*.8,2+seed(i+8)*3.3,light,.25+.58*Math.sin(time*2.5+i)**2);}
}

export function drawLotusPetal(context:CanvasRenderingContext2D,angle:number,length:number,width:number,color:string,accent:string,open:number,layer:number):void{
 context.save();context.rotate(angle*(.14+.86*open));context.scale(.62+.38*open,1);
 const light=mix(accent,'#fff3fa',.72),deep=mix(color,'#4d174b',.60);
 shape(context,c=>{c.moveTo(0,54);c.quadraticCurveTo(-width,length*.02,0,-length);c.quadraticCurveTo(width,length*.02,0,54);c.closePath();},gradient(context,0,-length,0,54,[light,color,deep]),light,1.2,.86,layer===0?7:4);
 shape(context,c=>{c.moveTo(0,48);c.quadraticCurveTo(-width*.13,-length*.2,0,-length*.92);},null,light,1,.56,2);
 shape(context,c=>{c.moveTo(-width*.16,8);c.quadraticCurveTo(-width*.39,-length*.18,-width*.12,-length*.53);},null,mix(color,light,.5),.8,.39);
 context.restore();
}
export function drawLotusWaterline(context:CanvasRenderingContext2D,y:number,rx:number,ry:number,color:string,alpha:number,width:number):void{
 oval(context,0,y,rx,ry,color,alpha,width);
}
function lotus(context:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const time=frame.time,open=ease(frame.open),color=mix(frame.color,'#f19acb',.61),accent=mix(frame.accent,'#ffe0ee',.60),light=mix(accent,'#ffffff',.75);
 context.save();context.translate(0,51+Math.sin(time*.9)*7);context.scale(1,.95);
 for(let row=0;row<3;row++){
  const count=row===0?9:row===1?7:5;
  for(let i=0;i<count;i++){
   const index=(i%2?count-1-Math.floor(i/2):Math.floor(i/2)),angle=(index-(count-1)/2)*(row===0?.275:row===1?.27:.255),length=177-row*20+(row===0?11*Math.cos(index):0),w=75-row*9;
   drawLotusPetal(context,angle,length,w,mix(color,accent,row*.10),accent,clamp(open*(1.13-row*.09)),row);
  }
 }
 for(let i=0;i<8;i++){
  context.save();context.translate((i-3.5)*12,46);context.rotate((i-3.5)*.14);drawOrganicPetal(context,55,18,mix(color,'#d3edbe',.50),light,.95);context.restore();
 }
 for(let i=0;i<13;i++){const a=i*2.399,r=10+Math.sqrt(i)*4;shape(context,c=>{c.moveTo(Math.cos(a)*r,45+Math.sin(a)*r*.45);c.quadraticCurveTo(Math.cos(a)*r*1.9,11,Math.cos(a)*r*2.4,-8-8*Math.sin(time+i));},null,'#ffeca6',1.1,.9,3);star(context,Math.cos(a)*r*2.4,-8-8*Math.sin(time+i),2.8,'#fff5bc',.9);}
 context.restore();
 for(let i=0;i<4;i++){const u=(time*.18+i*.25)%1;drawLotusWaterline(context,142+u*25,(91+u*175)*(.3+.7*open),15+u*20,mix(color,light,.40),(1-u)*.64,1.6-i*.15);}
 for(let i=0;i<11;i++){
  const u=(time*.17+i/11)%1,a=i*2.399+time*.21;context.save();context.translate(Math.cos(a)*(210-70*u)*open,126-u*355);context.rotate(a+time*.3);drawOrganicPetal(context,21+11*seed(i+4),7+5*seed(i+5),color,light,Math.sin(Math.PI*u)*.74);context.restore();
 }
 star(context,0,-145,11,light,.67+.2*Math.sin(time*2),time*.1);
}

/** One original canopy face, including its rib, crystal inlay and hem glint. */
export function drawUmbrellaPanel(context:CanvasRenderingContext2D,i:number,time:number,color:string,accent:string,light:string):void{
 const edgeY=(x:number)=>15+25*(1-(x/230)**2),crown={x:0,y:-177};
  const x1=-230+i*46,x2=x1+46,y1=edgeY(x1),y2=edgeY(x2),mid=(x1+x2)/2;
  shape(context,c=>{c.moveTo(crown.x,crown.y);c.quadraticCurveTo(x1*.59,-157,x1,y1);c.quadraticCurveTo(mid,edgeY(mid)-19,x2,y2);c.quadraticCurveTo(x2*.59,-157,crown.x,crown.y);c.closePath();},gradient(context,x1,-177,x2,55,[i%2?light:accent,i%2?color:mix(color,'#2972a5',.35),mix(color,'#102e42',.65)]),light,1.1,.87,5);
  shape(context,c=>{c.moveTo(0,-172);c.quadraticCurveTo(x1*.59,-157,x1,y1);},null,light,1.2,.88,3);
  context.save();context.translate(mid*.70,-65+Math.abs(mid)*.22);context.rotate(mid/420);drawCrystalLeaf(context,28,9,color,light,.58+.42*Math.sin(time*1.7+i));context.restore();
  star(context,x1,y1,3.2,light,.78);
}
export function drawUmbrellaRim(context:CanvasRenderingContext2D,color:string):void{
 shape(context,c=>{c.moveTo(-194,31);c.quadraticCurveTo(0,-16,194,31);},null,mix(color,'#f3e39e',.62),1.6,.8,3);
}
export function drawUmbrellaHandle(context:CanvasRenderingContext2D,color:string,light:string):void{
 shape(context,c=>{c.moveTo(0,-190);c.lineTo(0,169);c.quadraticCurveTo(1,204,-29,202);c.quadraticCurveTo(-59,200,-55,176);},null,mix(color,'#b5c8bd',.54),5.4,.86,4);
 shape(context,c=>{c.moveTo(-1,-190);c.lineTo(-1,168);c.quadraticCurveTo(-1,198,-28,197);},null,light,1.8,.98,4);
 star(context,0,-191,7,light,.9);
}
export function drawUmbrellaTassel(context:CanvasRenderingContext2D,time:number,color:string):void{
 const sway=Math.sin(time*2.2)*15;
 shape(context,c=>{c.moveTo(-27,202);c.quadraticCurveTo(-20+sway*.4,221,-29+sway,243);},null,'#e1f5bd',1.6,.85,3);
 for(let i=0;i<5;i++)shape(context,c=>{c.moveTo(-29+sway,238);c.quadraticCurveTo(-37+i*4+sway,259,-38+i*5+sway,279+Math.sin(time*2+i)*3);},null,mix(color,'#e8e9ae',.61),2.0,.82,3);
}
function umbrella(context:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const time=frame.time,open=ease(frame.open),color=mix(frame.color,'#55e5d3',.65),accent=mix(frame.accent,'#c8fff0',.62),light=mix(accent,'#ffffff',.71);
 context.save();context.translate(0,-10);context.rotate(-.19+Math.sin(time*.8)*.10);
 const spread=.13+.87*open;
 context.save();context.scale(spread,1);
 for(let i=0;i<10;i++)drawUmbrellaPanel(context,i,time,color,accent,light);
 shape(context,c=>{c.moveTo(-230,15);c.quadraticCurveTo(-143,-170,0,-177);c.quadraticCurveTo(143,-170,230,15);},null,light,2.2,.96,8);
 drawUmbrellaRim(context,color);
 for(let i=0;i<7;i++){const a=-Math.PI*.88+i*Math.PI*.13;star(context,Math.sin(a)*184,-23+Math.cos(a)*75,4.7,light,.52+.3*Math.sin(time*2+i)**2,a);}
 context.restore();
 drawUmbrellaHandle(context,color,light);
 drawUmbrellaTassel(context,time,color);
 context.restore();
 for(let i=0;i<13;i++){
  const a=i*2.399+time*.36,r=203+37*Math.sin(i+time*.9),x=Math.cos(a)*r,y=Math.sin(a)*r*.78+20;
  context.save();context.translate(x,y);context.rotate(a+time*.35);drawOrganicPetal(context,24+seed(i+3)*18,9+seed(i+8)*6,i%3?color:'#f4d28c',light,.64+.20*Math.sin(time+i));context.restore();
 }
}

export function drawSnowCrystalStem(context:CanvasRenderingContext2D,trace:Trace,color:string,light:string):void{
 shape(context,trace,null,color,8,.42,13);
 shape(context,trace,null,light,2.2,.95,5);
}
/** One opening branch, rooted at (0,0), with all six crystal leaves and terminal shard. */
export function drawSnowCrystalBranch(context:CanvasRenderingContext2D,time:number,open:number,arm:number,color:string,light:string):void{
  drawSnowCrystalStem(context,c=>{c.moveTo(0,0);c.lineTo(0,-254);},color,light);
  for(let tier=0;tier<3;tier++){
   const y=-67-tier*56,length=72-tier*12;
   for(const side of [-1,1]){
    context.save();context.translate(0,y);context.rotate(side*(.70+.06*Math.sin(time+tier)));drawCrystalLeaf(context,length*(.52+.48*open),17-tier*2,color,light,.5+.5*Math.sin(time*2+arm+tier));context.restore();
    shape(context,c=>{c.moveTo(0,y-21);c.lineTo(side*(33-tier*5),y-54);c.lineTo(side*(23-tier*4),y-53);},null,light,1.4,.86,3);
   }
  }
  context.save();context.translate(0,-227);drawCrystalLeaf(context,39,13,color,light,.7);context.restore();
  star(context,0,-264,5.2,light,.81+.16*Math.sin(time*2+arm),time*.4);
}
function snowflake(context:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const time=frame.time,open=ease(frame.open),color=mix(frame.color,'#b18bf1',.58),accent=mix(frame.accent,'#e8d4ff',.62),light=mix(accent,'#ffffff',.81);
 context.save();context.rotate(time*.13+Math.sin(time*.5)*.04);context.scale(.44+.56*open,.44+.56*open);
 for(let arm=0;arm<6;arm++){
  context.save();context.rotate(arm*TAU/6);
  drawSnowCrystalBranch(context,time,open,arm,color,light);
  context.restore();
 }
 for(let ring=0;ring<2;ring++){
  const radius=ring?91:48,points=Array.from({length:6},(_,i)=>({x:Math.sin(i*TAU/6)*radius,y:Math.cos(i*TAU/6)*radius}));
  shape(context,c=>{c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.closePath();},null,ring?accent:light,ring?1.9:2.6,.87,5);
  if(!ring)for(let i=0;i<6;i++)polygon(context,[{x:0,y:0},points[i],points[(i+1)%6]],i%2?light:color,.49);
 }
 for(let i=0;i<12;i++){context.save();context.rotate(i*TAU/12-time*.19);context.translate(0,-122);drawCrystalLeaf(context,25,8,color,light,.8);context.restore();}
 star(context,0,0,32,light,.89,time*.1);context.restore();
 for(let i=0;i<16;i++){const a=i*2.399-time*.17,r=268+14*Math.sin(time*1.1+i);context.save();context.translate(Math.cos(a)*r,Math.sin(a)*r*.91);context.rotate(a+time*.3);polygon(context,[{x:0,y:-8},{x:4,y:0},{x:0,y:8},{x:-4,y:0}],i%3?light:accent,.47+.34*Math.sin(time*2+i)**2);context.restore();}
}

/** Native heart-silk fill, light seam and two travelling glints on an authored centerline. */
export function drawHeartSilk(context:CanvasRenderingContext2D,points:readonly Point[],widths:readonly number[],time:number,color:string,accent:string):void{
 if(points.length<2)return;
 const sideA:Point[]=[],sideB:Point[]=[];
 for(let i=0;i<points.length;i++){
  const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,length=Math.hypot(dx,dy)||1,p=points[i],w=widths[i];sideA.push({x:p.x-dy/length*w,y:p.y+dx/length*w});sideB.push({x:p.x+dy/length*w,y:p.y-dx/length*w});
 }
 polygon(context,[...sideA,...sideB.reverse()],gradient(context,-220,-150,220,190,[mix(color,'#78294f',.42),accent,'#fff0f5',color]),.88);
 shape(context,c=>{c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);},null,mix(accent,'#ffffff',.83),1.2,.85,8);
 for(let side=0;side<2;side++){
  const at=(time*.10+side*.5)%1,index=Math.floor(at*(points.length-1)),p=points[index];star(context,p.x,p.y,7.5,mix(accent,'#ffffff',.84),.91,time*.3);
 }
}
function ribbonHeart(context:CanvasRenderingContext2D,time:number,open:number,color:string,accent:string):void{
 const points:Point[]=[],widths:number[]=[];
 for(let i=0;i<=100;i++){
  const t=i/100*TAU,x=16*Math.sin(t)**3*13.8*open,y=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*13.8*open-5;
  points.push({x,y});widths.push(2.4+4.2*(.5+.5*Math.sin(t*2+time*.8)));
 }
 drawHeartSilk(context,points,widths,time,color,accent);
}
/** The opening's original four-corner flying paper and its single fold seam. */
export function drawPetalPaper(context:CanvasRenderingContext2D,color:string,accent:string,light:string,alpha:number):void{
 polygon(context,[{x:-15,y:-6},{x:19,y:1},{x:-3,y:14},{x:-7,y:3}],gradient(context,-15,-6,19,14,[light,accent,color]),alpha);
 shape(context,c=>{c.moveTo(-15,-6);c.lineTo(-7,3);c.lineTo(19,1);},null,light,.9,.85);
}
function petals(context:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const time=frame.time,open=ease(frame.open),color=mix(frame.color,'#ec6ca3',.61),accent=mix(frame.accent,'#ffd0e5',.60),light=mix(accent,'#ffffff',.74);
 context.save();context.rotate(Math.sin(time*.6)*.05);ribbonHeart(context,time,.40+.60*open,color,accent);
 for(let i=0;i<24;i++){
  const a=i*2.399+time*(.19+(i%3)*.035),radius=(91+seed(i+3)*183)*(.25+.75*open),float=Math.sin(time*1.15+i)*19;
  context.save();context.translate(Math.cos(a)*radius,Math.sin(a)*radius*.83+float);context.rotate(a+time*(i%2?.55:-.35));context.scale(.45+.55*Math.abs(Math.sin(time*1.6+i)),1);drawOrganicPetal(context,25+seed(i+7)*29,11+seed(i+9)*12,i%4?color:accent,light,.56+seed(i+2)*.37);context.restore();
 }
 for(let i=0;i<7;i++){
  const p=(time*.16+i/7)%1,x=-270+p*540,y=-197+Math.sin(p*TAU+i)*54;
  context.save();context.translate(x,y);context.rotate(Math.sin(time+i)*.5);drawPetalPaper(context,color,accent,light,Math.sin(Math.PI*p)*.76);context.restore();
 }
 for(let i=0;i<15;i++){const a=i*2.399+time*.23,r=135+seed(i+41)*130;star(context,Math.cos(a)*r,Math.sin(a)*r*.87,2.2+seed(i+11)*3.0,light,.32+.50*Math.sin(time*2.2+i)**2,time*.3);}
 context.restore();
}

/** Original vector motifs; no reference-video frames, names, or text are retained. */
export function drawBotanicalMotif(context:CanvasRenderingContext2D,id:BotanicalPreset,frame:OrnateFrame):void{
 if(frame.open<=0)return;
 context.save();
 if(id==='crystal-vine')crystalVine(context,frame);
 else if(id==='butterfly')butterfly(context,frame);
 else if(id==='lotus')lotus(context,frame);
 else if(id==='umbrella')umbrella(context,frame);
 else if(id==='snowflake')snowflake(context,frame);
 else petals(context,frame);
 context.restore();
}

/** One detached element in a 100-unit local box; the signature scene owns its flight. */
export function drawBotanicalCompanion(context:CanvasRenderingContext2D,id:BotanicalPreset,frame:OrnateFrame,variant:number):void{
 const time=frame.time,choice=Math.abs(Math.floor(variant)),phase=time+choice*.73,light=mix(frame.accent,'#ffffff',.84);
 context.save();
 if(id==='butterfly'){
  const color=mix(frame.color,'#48aaff',.57),accent=mix(frame.accent,'#adf4ff',.48),flap=.22+.78*Math.abs(Math.sin(time*6.5+choice*1.17));
  context.rotate(Math.sin(phase*1.3)*.10);context.scale(.47,.47);context.translate(0,5);
  butterflyWing(context,color,accent,flap);context.save();context.scale(-1,1);butterflyWing(context,choice%2?accent:color,light,flap);context.restore();
  shape(context,c=>{c.moveTo(0,-23);c.quadraticCurveTo(-7,-3,-3,42);c.quadraticCurveTo(0,58,4,39);c.quadraticCurveTo(7,-3,0,-23);},gradient(context,-4,0,5,0,[color,light,color]),light,1,.97,5);
  shape(context,c=>{c.moveTo(-1,-19);c.quadraticCurveTo(-15,-45,-23,-37);c.moveTo(2,-19);c.quadraticCurveTo(16,-44,24,-38);},null,light,1.5,.92,2);
 }else if(id==='crystal-vine'){
  const color=mix(frame.color,'#a77dff',.50),accent=mix(frame.accent,'#e9bdff',.42);
  context.rotate(Math.sin(phase*1.4)*.13);context.scale(.66+.34*Math.abs(Math.sin(phase*.8)),1);context.translate(0,49);
  if(choice%2===0)drawCrystalLeaf(context,98,44,color,accent,.5+.5*Math.sin(phase*2));
  else{
   drawOrganicPetal(context,98,80,color,accent,.96);
   shape(context,c=>{c.moveTo(0,-3);c.quadraticCurveTo(45,-33,12,-68);c.quadraticCurveTo(-14,-92,-20,-61);c.quadraticCurveTo(-18,-44,-5,-54);},null,light,1.7,.89,3);
  }
 }else if(id==='lotus'){
  const color=mix(frame.color,'#f19acb',.61),accent=mix(frame.accent,'#ffe0ee',.60);
  context.rotate(Math.sin(phase*1.15)*.12);
  if(choice%3!==2){context.scale(.67+.33*Math.abs(Math.cos(phase*.95)),1);context.translate(0,47);drawOrganicPetal(context,96,78,color,accent,.97);}
  else{
   context.scale(1,.92+.08*Math.sin(phase*1.6));
   shape(context,c=>{c.moveTo(0,-47);c.quadraticCurveTo(-10,-27,-32,9);c.quadraticCurveTo(-48,44,0,48);c.quadraticCurveTo(48,44,32,9);c.quadraticCurveTo(10,-27,0,-47);c.closePath();},gradient(context,-35,-35,35,45,[light,accent,color]),light,1.2,.94,6);
   shape(context,c=>{c.moveTo(-8,-20);c.quadraticCurveTo(-28,5,-21,23);},null,'#ffffff',3,.73,2);
  }
 }else if(id==='umbrella'){
  const color=mix(frame.color,'#55e5d3',.65),accent=mix(frame.accent,'#c8fff0',.62);
  context.rotate(Math.sin(phase*1.5)*.14);
  if(choice%3===1){
   const sway=Math.sin(phase*2.4)*9;
   shape(context,c=>{c.moveTo(0,-47);c.quadraticCurveTo(-6,-21,sway,-8);},null,accent,2.0,.96,2);
   polygon(context,[{x:sway,y:-12},{x:sway-13,y:0},{x:sway,y:15},{x:sway+13,y:0}],gradient(context,sway-13,-12,sway+13,15,[light,color,accent]),.95,light);
   for(let i=0;i<7;i++)shape(context,c=>{c.moveTo(sway+(i-3)*1.4,13);c.quadraticCurveTo(sway+(i-3)*4,29,sway+(i-3)*4.7+Math.sin(phase*2+i)*2,48-Math.abs(i-3)*2);},null,i%2?light:accent,2.1,.91,2);
  }else if(choice%3===2){
   shape(context,c=>{c.moveTo(0,-48);c.quadraticCurveTo(-5,-29,-28,4);c.quadraticCurveTo(-49,42,0,47);c.quadraticCurveTo(49,42,28,4);c.quadraticCurveTo(5,-29,0,-48);c.closePath();},gradient(context,-32,-26,35,44,[light,accent,color]),light,1.1,.92,5);
   shape(context,c=>{c.moveTo(-7,-18);c.quadraticCurveTo(-26,12,-17,28);},null,light,2.7,.87,2);
  }else{
   const spread=.54+.46*Math.abs(Math.sin(phase*.9));context.scale(spread,1);
   shape(context,c=>{c.moveTo(0,-47);c.quadraticCurveTo(-40,-22,-49,29);c.quadraticCurveTo(0,52,49,29);c.quadraticCurveTo(40,-22,0,-47);c.closePath();},gradient(context,-48,-45,49,40,[light,color,mix(color,'#21658a',.48)]),light,1.4,.96,4);
   shape(context,c=>{c.moveTo(0,-45);c.lineTo(0,40);c.moveTo(-34,28);c.quadraticCurveTo(0,9,34,28);},null,light,1.2,.87,2);
   polygon(context,[{x:0,y:-19},{x:-9,y:0},{x:0,y:17},{x:9,y:0}],accent,.73,light);
  }
 }else if(id==='snowflake'){
  const color=mix(frame.color,'#b18bf1',.58),accent=mix(frame.accent,'#e8d4ff',.62);
  context.rotate(Math.sin(phase*.9)*.12);
  if(choice%2){
   context.translate(0,49);drawCrystalLeaf(context,98,43,color,accent,.5+.5*Math.sin(phase*2.2));
  }else{
   shape(context,c=>{c.moveTo(0,48);c.lineTo(0,-48);},null,accent,5,.69,6);shape(context,c=>{c.moveTo(0,48);c.lineTo(0,-48);},null,light,1.8,.95,3);
   for(let tier=0;tier<3;tier++)for(const side of [-1,1]){
    const y=23-tier*25,length=34-tier*5;
    shape(context,c=>{c.moveTo(0,y);c.lineTo(side*length,y-23);c.lineTo(side*(length-8),y-23);},null,light,1.7,.91,2);
    polygon(context,[{x:side*length,y:y-23},{x:side*(length-4),y:y-34},{x:side*(length-13),y:y-25}],tier%2?accent:color,.89,light);
   }
  }
 }else{
  const color=mix(frame.color,'#ec6ca3',.61),accent=mix(frame.accent,'#ffd0e5',.60);
  context.rotate(Math.sin(phase*1.1)*.16);
  if(choice%3!==1){context.scale(.34+.66*Math.abs(Math.sin(phase*1.5)),1);context.translate(0,46);drawOrganicPetal(context,94,83,color,accent,.96);}
  else{
   context.scale(1,.78+.22*Math.abs(Math.sin(phase*1.5)));
   polygon(context,[{x:-49,y:-24},{x:50,y:-5},{x:-11,y:36},{x:-21,y:4}],gradient(context,-48,-24,50,36,[light,accent,color]),.96,light);
   polygon(context,[{x:-49,y:-24},{x:-21,y:4},{x:50,y:-5},{x:-7,y:9}],light,.38);
   shape(context,c=>{c.moveTo(-49,-24);c.lineTo(-21,4);c.lineTo(50,-5);c.moveTo(-21,4);c.lineTo(-11,36);},null,light,1.3,.95,2);
  }
 }
 context.restore();
}
