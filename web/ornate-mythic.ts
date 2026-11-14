import type {OrnateFrame} from './ornate-types';

export type MythicPreset='unicorn'|'wings'|'fan'|'dragon';
type P={x:number;y:number};
export type FanPointMap=(point:{x:number;y:number})=>{x:number;y:number};
const TAU=Math.PI*2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const u=clamp(n);return u*u*(3-2*u);};
const mix=(a:string,b:string,p:number)=>'#'+[1,3,5].map(i=>Math.round((parseInt(a.slice(i,i+2),16)||0)*(1-p)+(parseInt(b.slice(i,i+2),16)||0)*p).toString(16).padStart(2,'0')).join('');
function polygon(points:readonly P[]):Path2D{const p=new Path2D();if(!points.length)return p;p.moveTo(points[0].x,points[0].y);for(const q of points.slice(1))p.lineTo(q.x,q.y);p.closePath();return p;}
function gradient(ctx:CanvasRenderingContext2D,a:P,b:P,color:string,accent:string):string|CanvasGradient{
 if(typeof ctx.createLinearGradient!=='function')return mix(color,accent,.4);
 const g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,mix(color,'#122348',.44));g.addColorStop(.28,mix(color,accent,.55));g.addColorStop(.56,mix(accent,'#ffffff',.84));g.addColorStop(.78,mix(color,accent,.60));g.addColorStop(1,mix(accent,'#122348',.25));return g;
}
function fill(ctx:CanvasRenderingContext2D,p:Path2D,color:string|CanvasGradient,alpha=1,glow=0,edge?:string,width=1):void{
 ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;if(glow){ctx.shadowColor=typeof color==='string'?color:edge??'#bceaff';ctx.shadowBlur=glow;}ctx.fill(p);if(edge){ctx.shadowBlur=0;ctx.strokeStyle=edge;ctx.lineWidth=width;ctx.stroke(p);}ctx.restore();
}
function stroke(ctx:CanvasRenderingContext2D,p:Path2D,color:string,width=1,alpha=1,glow=0):void{
 ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.stroke(p);ctx.restore();
}
function circle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha=1,glow=0):void{const p=new Path2D();p.arc(x,y,Math.max(.01,r),0,TAU);fill(ctx,p,color,alpha,glow);}
function glint(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha=1):void{
 const p=new Path2D();p.moveTo(x-r*1.3,y);p.quadraticCurveTo(x,y,x,y-r*2);p.quadraticCurveTo(x,y,x+r*1.3,y);p.quadraticCurveTo(x,y,x,y+r*2);p.quadraticCurveTo(x,y,x-r*1.3,y);fill(ctx,p,color,alpha,r*2);
}

/** Individual glass feathers have their own facets, shaft, barbs and delayed spread. */
export function drawCrystalFeather(ctx:CanvasRenderingContext2D,length:number,width:number,bend:number,color:string,accent:string,alpha=1):void{
 const p=new Path2D();p.moveTo(0,0);p.quadraticCurveTo(length*.25,-width*.82,length*.72,-width*.55);p.quadraticCurveTo(length*.96,-width*.28,length,bend);p.quadraticCurveTo(length*.82,width*.63,length*.44,width*.43);p.quadraticCurveTo(length*.12,width*.33,0,0);
 const light=mix(accent,'#ffffff',.78);fill(ctx,p,gradient(ctx,{x:0,y:-width},{x:length,y:width},color,accent),alpha,5,light,1.05);
 const facet=polygon([{x:length*.12,y:0},{x:length*.73,y:-width*.37},{x:length,y:bend},{x:length*.60,y:width*.10}]);fill(ctx,facet,light,alpha*.29);
 const shaft=new Path2D();shaft.moveTo(length*.04,0);shaft.quadraticCurveTo(length*.45,-width*.05,length*.98,bend);stroke(ctx,shaft,light,1.35,alpha*.8,2);
 for(let j=1;j<=4;j++){const at=j/6,barb=new Path2D();barb.moveTo(length*at,0);barb.quadraticCurveTo(length*(at+.10),-width*.10,length*(at+.15),-width*(.44-.10*at));stroke(ctx,barb,light,.65,alpha*.44);}
}
export function drawCrystalWing(ctx:CanvasRenderingContext2D,side:number,frame:OrnateFrame,scale=1,offset:P={x:22,y:26}):void{
 const {time,color,accent}=frame,open=ease(frame.open),breathe=Math.sin(time*2.8+side*.7)*.035;
 ctx.save();ctx.translate(offset.x*side,offset.y);ctx.scale(side*scale,scale);ctx.rotate((1-open)*-.86+breathe);ctx.scale(.16+open*.84,1);
 for(let row=0;row<2;row++)for(let i=0;i<(row?9:13);i++){
  const spread=ease(open*1.4-i*.022),angle=-1.12+i*(row?.117:.102)+Math.sin(time*2.15+i*.58+row)*.018;
  ctx.save();ctx.translate(row?10:0,row?9:0);ctx.rotate(angle);ctx.scale(.40+.60*spread,1);
  const length=row?168-i*4:278-i*6.2,width=row?36:47-i*.8,bend=Math.sin(time*2.6+i*.7)*3;
  drawCrystalFeather(ctx,length,width,bend,mix(color,accent,(i%3)*.16),accent,row?.96:.87);ctx.restore();
 }
 const shoulder=new Path2D();shoulder.moveTo(-12,4);shoulder.quadraticCurveTo(63,-37,135,-32);shoulder.quadraticCurveTo(75,3,14,49);shoulder.quadraticCurveTo(-4,31,-12,4);fill(ctx,shoulder,gradient(ctx,{x:0,y:-30},{x:120,y:45},color,accent),.92,8,mix(accent,'#ffffff',.65),1.1);
 ctx.restore();
}
function drawWings(ctx:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const {time,color,accent}=frame,open=ease(frame.open),light=mix(accent,'#ffffff',.86);
 ctx.save();ctx.translate(0,30+Math.sin(time*1.8)*7);
 drawCrystalWing(ctx,-1,frame);drawCrystalWing(ctx,1,frame);
 const crystal=polygon([{x:0,y:-173},{x:29,y:-8},{x:0,y:170},{x:-29,y:-8}]);
 fill(ctx,crystal,gradient(ctx,{x:-26,y:0},{x:31,y:0},color,accent),open,22,light,1.5);
 fill(ctx,polygon([{x:0,y:-173},{x:0,y:170},{x:-29,y:-8}]),light,.25*open);
 const cross=polygon([{x:-114,y:-3},{x:-12,y:-13},{x:0,y:-35},{x:12,y:-13},{x:114,y:-3},{x:12,y:8},{x:0,y:31},{x:-12,y:8}]);fill(ctx,cross,light,.85*open,15);
 for(let i=0;i<5;i++)circle(ctx,0,95+i*19,3.8-i*.45,light,open*(.75-i*.09),8);
 glint(ctx,-105+Math.sin(time*1.7)*17,-80,10+3*Math.sin(time*3.2),light,.78*open);glint(ctx,130,-25+Math.sin(time*2.1)*22,7,accent,.8*open);
 ctx.restore();
}

export function drawCrystalMane(ctx:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const {time,color,accent}=frame,light=mix(accent,'#ffffff',.82);
 for(let i=15;i>=0;i--){
  const phase=time*2.1+i*.53,flow=Math.sin(phase),a={x:-68+i*2.3,y:-64+i*5.7},tip={x:-135-i*6+flow*17,y:111+i*6+Math.cos(phase*.8)*15};
  const p=new Path2D();p.moveTo(a.x,a.y);p.quadraticCurveTo(-157-i*2,-91+i*11,-137-i*3+flow*12,26+i*5);p.quadraticCurveTo(-102-i*7,99+i*3,tip.x,tip.y);p.quadraticCurveTo(-67-i*4,96+i*2,-103-i*1.9,16+i*5);p.quadraticCurveTo(-114-i*2,-32+i*6,a.x,a.y);
  fill(ctx,p,gradient(ctx,{x:a.x,y:a.y},{x:tip.x,y:tip.y},mix(color,accent,i%3*.2),accent),.91,4,light,.7);
  const highlight=new Path2D();highlight.moveTo(a.x-2,a.y+2);highlight.quadraticCurveTo(-154-i*2,-52+i*9,-117-i*3+flow*7,36+i*5);highlight.quadraticCurveTo(-101-i*5,103+i*2,tip.x+5,tip.y-10);stroke(ctx,highlight,light,1.1,.63,2);
 }
}
export function drawCrystalUnicornHorn(ctx:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const {accent}=frame,light=mix(accent,'#ffffff',.9),horn=polygon([{x:0,y:-77},{x:50,y:-219},{x:24,y:-69}]);fill(ctx,horn,gradient(ctx,{x:0,y:-100},{x:45,y:-120},accent,light),1,15,light,1.4);
 for(let i=0;i<5;i++){const y=-92-i*21,width=19-i*2.7,line=new Path2D();line.moveTo(10+i*5,y);line.lineTo(10+i*5+width,y+7);stroke(ctx,line,mix(accent,'#827bea',.4),1.25,.8);}
}

/** Original neck, face, ear, horn and forelock, without the opening's stage transform. */
export function drawCrystalUnicornFigure(ctx:CanvasRenderingContext2D,frame:OrnateFrame,includeHorn=true):void{
 const {color,accent}=frame,light=mix(accent,'#ffffff',.9),dark=mix(color,'#142b4d',.72);
 const neck=new Path2D();neck.moveTo(-84,190);neck.quadraticCurveTo(-125,105,-76,15);neck.quadraticCurveTo(-51,-23,-64,-73);neck.quadraticCurveTo(-39,-52,-20,-64);neck.quadraticCurveTo(9,-94,33,-77);neck.quadraticCurveTo(47,-65,54,-45);neck.quadraticCurveTo(91,-28,142,-5);neck.quadraticCurveTo(172,7,157,28);neck.quadraticCurveTo(144,43,110,36);neck.quadraticCurveTo(83,26,71,49);neck.quadraticCurveTo(40,91,33,131);neck.quadraticCurveTo(48,164,108,198);neck.quadraticCurveTo(8,226,-84,190);fill(ctx,neck,gradient(ctx,{x:-102,y:60},{x:150,y:40},color,accent),1,15,light,1.7);
 fill(ctx,polygon([{x:-59,y:7},{x:-17,y:63},{x:-58,y:185},{x:-84,y:190},{x:-87,y:94}]),light,.21);
 const cheek=new Path2D();cheek.moveTo(44,-31);cheek.quadraticCurveTo(16,3,38,54);cheek.quadraticCurveTo(45,37,68,29);cheek.quadraticCurveTo(80,14,44,-31);fill(ctx,cheek,light,.27);
 const chest=new Path2D();chest.moveTo(36,66);chest.quadraticCurveTo(-2,122,42,171);chest.quadraticCurveTo(65,191,92,194);stroke(ctx,chest,light,3,.78,4);
 const ear=new Path2D();ear.moveTo(-53,-57);ear.quadraticCurveTo(-77,-95,-61,-144);ear.quadraticCurveTo(-31,-124,-18,-77);ear.closePath();fill(ctx,ear,gradient(ctx,{x:-65,y:-140},{x:-20,y:-64},color,accent),1,6,light,1.5);fill(ctx,polygon([{x:-55,y:-127},{x:-46,y:-77},{x:-29,y:-78}]),mix(accent,'#ffc8ef',.5),.78);
 if(includeHorn)drawCrystalUnicornHorn(ctx,frame);
 const eye=new Path2D();eye.moveTo(32,-32);eye.quadraticCurveTo(45,-24,54,-31);stroke(ctx,eye,dark,5,1);circle(ctx,47,-28,2.3,light,1,3);
 const lashes=new Path2D();lashes.moveTo(34,-31);lashes.lineTo(32,-37);lashes.moveTo(41,-28);lashes.lineTo(40,-35);stroke(ctx,lashes,dark,1.7,.85);
 circle(ctx,143,12,2.8,dark,.83);const mouth=new Path2D();mouth.moveTo(130,27);mouth.quadraticCurveTo(112,28,103,21);stroke(ctx,mouth,mix(accent,'#426488',.6),1.7,.8);
 const forelock=new Path2D();forelock.moveTo(-25,-75);forelock.quadraticCurveTo(20,-120,47,-55);forelock.quadraticCurveTo(12,-80,-6,-49);forelock.quadraticCurveTo(-5,-66,-25,-75);fill(ctx,forelock,gradient(ctx,{x:-20,y:-105},{x:46,y:-45},color,accent),1,5,light,1);
}

function drawUnicorn(ctx:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const {time,accent}=frame,open=ease(frame.open),light=mix(accent,'#ffffff',.9);
 ctx.save();ctx.translate(20,12+Math.sin(time*1.55)*7);ctx.rotate(Math.sin(time*1.8)*.025);ctx.scale(.65+.35*open,.26+.74*open);
 drawCrystalWing(ctx,-1,{...frame,open:clamp(frame.open*1.3)},.72,{x:73,y:68});
 drawCrystalMane(ctx,frame);drawCrystalUnicornFigure(ctx,frame);
 const orbit=new Path2D();orbit.moveTo(-210,151);orbit.quadraticCurveTo(-109,224,106,141);stroke(ctx,orbit,accent,2.1,.65,8);
 glint(ctx,-173,-96,10,light,.83);glint(ctx,173,77,8,accent,.8);glint(ctx,49,-220,8,light,.72);
 ctx.restore();
}

/** Native paths remain exact; only a warped fan needs canonical curves flattened. */
function fanPath(map?:FanPointMap){
 const path=new Path2D();let current:P={x:0,y:0},origin=current,hasPoint=false;
 const moveTo=(x:number,y:number)=>{current={x,y};origin=current;hasPoint=true;const q=map?map(current):current;path.moveTo(q.x,q.y);};
 const lineTo=(x:number,y:number)=>{
  if(!map){current={x,y};if(!hasPoint){origin=current;hasPoint=true;}path.lineTo(x,y);return;}
  if(!hasPoint){moveTo(x,y);return;}
  const from=current,count=Math.max(1,Math.ceil(Math.hypot(x-from.x,y-from.y)/5));
  for(let i=1;i<=count;i++){const u=i/count,q=map({x:from.x+(x-from.x)*u,y:from.y+(y-from.y)*u});path.lineTo(q.x,q.y);}
  current={x,y};
 };
 const quadraticCurveTo=(cx:number,cy:number,x:number,y:number)=>{
  if(!map){path.quadraticCurveTo(cx,cy,x,y);current={x,y};hasPoint=true;return;}
  const from=current,count=Math.max(4,Math.ceil(2*Math.max(Math.hypot(cx-from.x,cy-from.y),Math.hypot(x-cx,y-cy))/5));
  for(let i=1;i<=count;i++){const u=i/count,v=1-u;lineTo(v*v*from.x+2*v*u*cx+u*u*x,v*v*from.y+2*v*u*cy+u*u*y);}
 };
 const arc=(x:number,y:number,r:number,start:number,end:number,anticlockwise=false)=>{
  if(!map){if(anticlockwise)path.arc(x,y,r,start,end,true);else path.arc(x,y,r,start,end);current={x:x+Math.cos(end)*r,y:y+Math.sin(end)*r};hasPoint=true;return;}
  let sweep=end-start;
  if(anticlockwise){if(sweep<=-TAU)sweep=-TAU;else while(sweep>0)sweep-=TAU;}
  else{if(sweep>=TAU)sweep=TAU;else while(sweep<0)sweep+=TAU;}
  const first={x:x+Math.cos(start)*r,y:y+Math.sin(start)*r};
  if(!hasPoint)moveTo(first.x,first.y);else if(Math.hypot(first.x-current.x,first.y-current.y)>1e-9)lineTo(first.x,first.y);
  const count=Math.max(1,Math.ceil(Math.abs(sweep)*r/5));
  for(let i=1;i<=count;i++){const angle=start+sweep*i/count;lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r);}
 };
 const closePath=()=>{if(map&&hasPoint)lineTo(origin.x,origin.y);path.closePath();current=origin;};
 return {path,moveTo,lineTo,quadraticCurveTo,arc,closePath};
}
function fanPolygon(points:readonly P[],map?:FanPointMap):Path2D{
 if(!map)return polygon(points);
 const p=fanPath(map);if(!points.length)return p.path;p.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)p.lineTo(points[i].x,points[i].y);p.closePath();return p.path;
}
function fanGradient(ctx:CanvasRenderingContext2D,a:P,b:P,color:string,accent:string,map?:FanPointMap):string|CanvasGradient{return gradient(ctx,map?map(a):a,map?map(b):b,color,accent);}
function fanCircle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha=1,glow=0,map?:FanPointMap):void{
 if(!map){circle(ctx,x,y,r,color,alpha,glow);return;}
 const p=fanPath(map);p.arc(x,y,Math.max(.01,r),0,TAU);fill(ctx,p.path,color,alpha,glow);
}
function fanFlower(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,accent:string,turn:number,map?:FanPointMap):void{
 if(map){
  const flowerMap=(point:P):P=>map({x:x+point.x*Math.cos(turn)-point.y*Math.sin(turn),y:y+point.x*Math.sin(turn)+point.y*Math.cos(turn)});
  for(let i=0;i<5;i++){
   const angle=i*TAU/5,petalMap=(point:P):P=>flowerMap({x:point.x*Math.cos(angle)-point.y*Math.sin(angle),y:point.x*Math.sin(angle)+point.y*Math.cos(angle)}),p=fanPath(petalMap);
   p.moveTo(0,0);p.quadraticCurveTo(r*.85,-r*.55,r*1.05,-r*1.5);p.quadraticCurveTo(-r*.35,-r*1.5,0,0);fill(ctx,p.path,mix(color,accent,i%2?.5:.8),.75,1);
  }
  fanCircle(ctx,0,0,r*.22,mix(accent,'#ffffff',.9),.95,3,flowerMap);return;
 }
 ctx.save();ctx.translate(x,y);ctx.rotate(turn);
 for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*TAU/5);const p=new Path2D();p.moveTo(0,0);p.quadraticCurveTo(r*.85,-r*.55,r*1.05,-r*1.5);p.quadraticCurveTo(-r*.35,-r*1.5,0,0);fill(ctx,p,mix(color,accent,i%2?.5:.8),.75,1);ctx.restore();}circle(ctx,0,0,r*.22,mix(accent,'#ffffff',.9),.95,3);ctx.restore();
}

/** One of the original seventeen pleats. `open` is already eased by the caller. */
export function drawCrystalFanPleat(ctx:CanvasRenderingContext2D,frame:OrnateFrame,index:number,map?:FanPointMap,open=1):void{
 const {time,color,accent}=frame,i=index,light=mix(accent,'#ffffff',.86),pivot={x:0,y:168};
 const spread=ease(open*1.34-i*.017),half=.08+1.18*spread,a=-Math.PI/2-half+(i/17)*half*2,b=-Math.PI/2-half+((i+1)/17)*half*2,r=354+Math.sin(i*.9)*6;
 const p=fanPath(map);p.moveTo(pivot.x,pivot.y);p.lineTo(pivot.x+Math.cos(a)*r,pivot.y+Math.sin(a)*r);p.arc(pivot.x,pivot.y,r,a,b);p.closePath();
 fill(ctx,p.path,fanGradient(ctx,{x:Math.cos(a)*r,y:pivot.y+Math.sin(a)*r},{x:Math.cos(b)*r*.4,y:pivot.y+Math.sin(b)*r*.4},mix(color,accent,i%3*.16),accent,map),.92,3,light,.7);
 const mid=(a+b)/2,facet=fanPolygon([pivot,{x:Math.cos(a)*r,y:pivot.y+Math.sin(a)*r},{x:Math.cos(mid)*r*.94,y:pivot.y+Math.sin(mid)*r*.94}],map);fill(ctx,facet,light,i%2?.10:.22);
 const rib=fanPath(map);rib.moveTo(0,168);rib.lineTo(Math.cos(a)*(r+7),168+Math.sin(a)*(r+7));stroke(ctx,rib.path,light,1.6,.84,2);
 if(i%2===0){const radius=r*(.62+.12*Math.sin(i));fanFlower(ctx,Math.cos(mid)*radius,168+Math.sin(mid)*radius,10+i%3*2,light,accent,time*.12+i,map);}
 const border=fanPath(map);border.arc(0,168,r*.88,a,b);stroke(ctx,border.path,mix(accent,'#ffffff',.55),2.2,.85,3);
}

export function drawCrystalFanRim(ctx:CanvasRenderingContext2D,frame:OrnateFrame,map?:FanPointMap,open=1):void{
 const light=mix(frame.accent,'#ffffff',.86),trim=fanPath(map);trim.arc(0,168,355,-Math.PI/2-(.08+1.18*open),-Math.PI/2+(.08+1.18*open));stroke(ctx,trim.path,light,3.8,.9,7);
}

/** Original handle, cord, pearl and thirteen strands, without an outer fan transform. */
export function drawCrystalFanHandleTassel(ctx:CanvasRenderingContext2D,frame:OrnateFrame,map?:FanPointMap):void{
 const {time,color,accent}=frame,light=mix(accent,'#ffffff',.86);
 const handle=fanPolygon([{x:-13,y:160},{x:13,y:160},{x:10,y:232},{x:-10,y:232}],map);fill(ctx,handle,fanGradient(ctx,{x:-13,y:0},{x:13,y:0},color,accent,map),1,5,light,1.2);fanCircle(ctx,0,174,8,light,.94,7,map);fanCircle(ctx,0,218,3.8,mix(color,'#223659',.7),1,0,map);
 const sway=Math.sin(time*2.5)*13,cord=fanPath(map);cord.moveTo(0,224);cord.quadraticCurveTo(5+sway,251,sway,269);stroke(ctx,cord.path,accent,3,.95,3);fanCircle(ctx,sway,270,7,mix(accent,'#ffffff',.6),.9,5,map);
 for(let i=0;i<13;i++){const tassel=fanPath(map),x=(i-6)*1.3;tassel.moveTo(sway+x,275);tassel.quadraticCurveTo(sway+x+Math.sin(time*3+i*.25)*8,302,sway+x*.68+Math.sin(time*2.6+i*.2)*13,325-(i%3)*6);stroke(ctx,tassel.path,i%3?accent:light,1.25,.88,2);}
}

function drawFan(ctx:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const {time,accent}=frame,open=ease(frame.open),light=mix(accent,'#ffffff',.86);
 ctx.save();ctx.rotate(Math.sin(time*.95)*.055);
 for(let i=0;i<17;i++)drawCrystalFanPleat(ctx,frame,i,undefined,open);
 drawCrystalFanRim(ctx,frame,undefined,open);drawCrystalFanHandleTassel(ctx,frame);
 for(let i=0;i<5;i++)glint(ctx,-224+i*112,-114-Math.sin(i*.8)*44,4.5+2*Math.sin(time*2+i)**2,light,.7*open);
 ctx.restore();
}

export function crystalDragonSpinePoint(p:number,time:number):P{
 return {x:-267+440*p+72*Math.sin(TAU*p),y:130-242*p+82*Math.sin(TAU*1.28*p)+Math.sin(time*2.5-p*7)*11*Math.sin(Math.PI*p)};
}
function dragonTangent(p:number,time:number):P{const a=crystalDragonSpinePoint(Math.max(0,p-.003),time),b=crystalDragonSpinePoint(Math.min(1,p+.003),time),d=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};}
export function drawCrystalDragonHead(ctx:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const {time,color,accent}=frame,light=mix(accent,'#ffffff',.87),dark=mix(color,'#091f38',.8);
 for(let i=11;i>=0;i--){const x=-30-i*3.4,y=-29+i*5.5,p=polygon([{x:x+13,y},{x:x-55+Math.sin(time*3+i)*6,y:y-21},{x:x-22,y:y+10},{x:x+8,y:y+9}]);fill(ctx,p,mix(color,accent,(i%3)*.2),.94,4,light,.7);}
 const head=new Path2D();head.moveTo(-35,-22);head.quadraticCurveTo(-16,-68,18,-51);head.quadraticCurveTo(40,-39,47,-28);head.quadraticCurveTo(73,-25,91,-12);head.quadraticCurveTo(104,-1,88,12);head.quadraticCurveTo(69,22,40,11);head.quadraticCurveTo(21,10,12,36);head.quadraticCurveTo(-25,37,-35,-22);fill(ctx,head,gradient(ctx,{x:-35,y:-34},{x:90,y:25},color,accent),1,12,light,1.45);
 fill(ctx,polygon([{x:-22,y:-22},{x:4,y:-49},{x:37,y:-28},{x:13,y:-13}]),light,.28);fill(ctx,polygon([{x:12,y:36},{x:22,y:7},{x:40,y:11},{x:24,y:32}]),light,.25);
 for(const side of [-1,1]){ctx.save();ctx.translate(side===1?9:-10,side===1?-46:-45);ctx.rotate(side*.13);const horn=new Path2D();horn.moveTo(0,0);horn.quadraticCurveTo(-12,-30,-18,-58);horn.quadraticCurveTo(-33,-70,-43,-73);horn.moveTo(-15,-46);horn.quadraticCurveTo(3,-59,8,-77);horn.moveTo(-19,-58);horn.quadraticCurveTo(-12,-76,-17,-92);stroke(ctx,horn,light,4.8,.95,6);stroke(ctx,horn,accent,1.9,.9);ctx.restore();}
 const brow=new Path2D();brow.moveTo(18,-30);brow.quadraticCurveTo(30,-41,48,-29);stroke(ctx,brow,light,3,.9,3);const eye=polygon([{x:25,y:-27},{x:42,y:-25},{x:31,y:-18}]);fill(ctx,eye,dark,1);circle(ctx,34,-24,2.3,light,1,3);
 circle(ctx,83,-6,2.7,dark,.9);const mouth=new Path2D();mouth.moveTo(82,12);mouth.quadraticCurveTo(62,10,48,4);stroke(ctx,mouth,dark,2.2,.9);fill(ctx,polygon([{x:58,y:7},{x:61,y:16},{x:65,y:8}]),light,.9);
 for(let side=0;side<2;side++){const whisker=new Path2D();whisker.moveTo(73,side?8:-9);whisker.quadraticCurveTo(134,side?43:-49,149,side?2:-58);whisker.quadraticCurveTo(155,side?-12:-83,126,side?-14:-72);stroke(ctx,whisker,light,1.8,.9,4);}
 const beard=new Path2D();beard.moveTo(20,29);beard.quadraticCurveTo(9,79,-30,77);beard.quadraticCurveTo(-48,76,-42,59);stroke(ctx,beard,accent,5,.9,5);stroke(ctx,beard,light,1.5,.85);
}
export function drawCrystalDragonFin(ctx:CanvasRenderingContext2D,frame:OrnateFrame,index:number,radius:number):void{
 const {time,color,accent}=frame,light=mix(accent,'#ffffff',.84),fin=polygon([{x:-8,y:-radius*.72},{x:-27+Math.sin(time*2.8+index)*6,y:-radius-22-index%3*7},{x:4,y:-radius*.85}]);fill(ctx,fin,mix(color,accent,.6),.83,4,light,.65);
}
export function drawCrystalDragonBody(ctx:CanvasRenderingContext2D,frame:OrnateFrame,amount=Math.max(.015,ease(frame.open))):void{
 const {time,color,accent}=frame,open=ease(frame.open),light=mix(accent,'#ffffff',.84),left:P[]=[],right:P[]=[];
 for(let i=0;i<=86;i++){const t=i/86*amount,p=crystalDragonSpinePoint(t,time),d=dragonTangent(t,time),r=(2.6+26*Math.sin(t*Math.PI/2)**.74)*(.6+.4*open);left.push({x:p.x-d.y*r,y:p.y+d.x*r});right.push({x:p.x+d.y*r,y:p.y-d.x*r});}
 const body=polygon([...left,...right.reverse()]);fill(ctx,body,gradient(ctx,{x:-240,y:180},{x:180,y:-160},color,accent),1,14,light,1.5);
 const back=new Path2D();for(let i=0;i<=75;i++){const t=i/75*amount,p=crystalDragonSpinePoint(t,time),d=dragonTangent(t,time),r=4+20*Math.sin(t*Math.PI/2);const q={x:p.x-d.y*r*.40,y:p.y+d.x*r*.40};if(!i)back.moveTo(q.x,q.y);else back.lineTo(q.x,q.y);}stroke(ctx,back,light,2,.70,4);
 for(let i=3;i<35;i++){
  const t=i/35;if(t>amount)break;const p=crystalDragonSpinePoint(t,time),d=dragonTangent(t,time),angle=Math.atan2(d.y,d.x),r=4+22*Math.sin(t*Math.PI/2);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
  drawCrystalDragonFin(ctx,frame,i,r);
  for(const side of [-1,1]){const scale=new Path2D();scale.moveTo(-8,side*r*.12);scale.quadraticCurveTo(0,side*r*.83,9,side*r*.30);stroke(ctx,scale,light,1.15,.61,1);}
  ctx.restore();
 }
 for(const t of [.39,.67])if(t<amount){const p=crystalDragonSpinePoint(t,time),d=dragonTangent(t,time);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(d.y,d.x));for(const side of [-1,1]){const leg=new Path2D();leg.moveTo(0,side*11);leg.quadraticCurveTo(4,side*38,-19,side*47);stroke(ctx,leg,accent,7,.95,5);stroke(ctx,leg,light,1.6,.8);for(let j=0;j<3;j++){const claw=new Path2D();claw.moveTo(-17+j*5,side*46);claw.quadraticCurveTo(-19+j*6,side*57,-27+j*5,side*59);stroke(ctx,claw,light,2.2,.9,2);}}ctx.restore();}
}

/** The opening's pearl can be attached to any existing head or fin trajectory. */
export function drawCrystalDragonPearl(ctx:CanvasRenderingContext2D,frame:OrnateFrame,pearl:P={x:0,y:0}):void{
 const {accent}=frame,light=mix(accent,'#ffffff',.84),ring=new Path2D();ring.arc(pearl.x,pearl.y,27,0,TAU);stroke(ctx,ring,accent,1.5,.8,7);circle(ctx,pearl.x,pearl.y,17,accent,.88,24);circle(ctx,pearl.x-4,pearl.y-5,10,light,.94,10);glint(ctx,pearl.x,pearl.y,25,light,.48);
}

function drawDragon(ctx:CanvasRenderingContext2D,frame:OrnateFrame):void{
 const {time,accent}=frame,open=ease(frame.open),amount=Math.max(.015,open);
 ctx.save();ctx.translate(-18,19);ctx.rotate(Math.sin(time*.85)*.035);
 drawCrystalDragonBody(ctx,frame,amount);
 const head=crystalDragonSpinePoint(amount,time);ctx.save();ctx.translate(head.x,head.y);ctx.rotate(-.19+Math.sin(time*1.9)*.035);ctx.scale(.38+.62*open,.38+.62*open);drawCrystalDragonHead(ctx,frame);ctx.restore();
 const pearl={x:273+Math.cos(time*.9)*12,y:-171+Math.sin(time*1.7)*15};drawCrystalDragonPearl(ctx,frame,pearl);
 const breath=new Path2D();breath.moveTo(head.x+78,head.y-12);breath.quadraticCurveTo(236+Math.sin(time*2)*14,-115,pearl.x-28,pearl.y+8);stroke(ctx,breath,accent,1.6,.48*open,5);
 ctx.restore();
}

export function drawMythicMotif(ctx:CanvasRenderingContext2D,id:MythicPreset,frame:OrnateFrame):void{
 if(frame.open<=.001)return;
 if(id==='unicorn')drawUnicorn(ctx,frame);
 else if(id==='wings')drawWings(ctx,frame);
 else if(id==='fan')drawFan(ctx,frame);
 else drawDragon(ctx,frame);
}

/** Small fragments released by the opening; these never paint a miniature whole motif. */
export function drawMythicCompanion(ctx:CanvasRenderingContext2D,id:MythicPreset,frame:OrnateFrame,variant:number):void{
 if(frame.open<=.001)return;
 const choice=((variant%3)+3)%3,{time,color,accent}=frame,light=mix(accent,'#ffffff',.86),open=ease(frame.open);
 ctx.save();ctx.globalAlpha*=open;ctx.rotate(Math.sin(time*(1.35+choice*.18)+variant*.7)*.10);
 if(id==='wings'||id==='unicorn'&&choice===1){
  ctx.translate(-47,4);ctx.rotate(-.17+Math.sin(time*1.9+variant)*.045);
  drawCrystalFeather(ctx,96,choice===2?31:24,Math.sin(time*2.2+variant)*5,color,accent,.95);
  const drift=new Path2D();drift.moveTo(2,0);drift.quadraticCurveTo(-12,7,-18,17);stroke(ctx,drift,light,1.1,.58,2);
 }else if(id==='unicorn'&&choice===0){
  const flow=Math.sin(time*2.1+variant)*9;
  for(let i=2;i>=0;i--){
   const p=new Path2D(),offset=(i-1)*8;p.moveTo(-51,-15+offset);p.quadraticCurveTo(-12,-49+offset,16,-13+offset+flow);p.quadraticCurveTo(36,16+offset,55,-3+offset);p.quadraticCurveTo(19,35+offset,-6,4+offset+flow);p.quadraticCurveTo(-28,-19+offset,-51,-15+offset);
   fill(ctx,p,gradient(ctx,{x:-50,y:-25},{x:55,y:22},color,accent),.78,4,light,.7);
   const vein=new Path2D();vein.moveTo(-43,-15+offset);vein.quadraticCurveTo(-12,-25+offset,13,-3+offset+flow);vein.quadraticCurveTo(37,19+offset,50,1+offset);stroke(ctx,vein,light,1,.62,1);
  }
 }else if(id==='unicorn'){
  ctx.rotate(.35+Math.sin(time*1.4+variant)*.07);
  const shard=polygon([{x:-14,y:47},{x:7,y:-56},{x:18,y:34},{x:0,y:50}]);fill(ctx,shard,gradient(ctx,{x:-16,y:0},{x:19,y:0},color,accent),.96,9,light,1.05);
  fill(ctx,polygon([{x:7,y:-56},{x:0,y:50},{x:-14,y:47}]),light,.25);
  for(let i=0;i<4;i++){const y=-19+i*18,p=new Path2D();p.moveTo(-5-i*2,y);p.lineTo(11+i,y+7);stroke(ctx,p,accent,1.35,.85);}
  glint(ctx,7,-52,5,light,.72);
 }else if(id==='fan'&&choice!==1){
  const fold=.22+Math.sin(time*1.8+variant)*.07,leaf=new Path2D();leaf.moveTo(-44,35);leaf.lineTo(-36,-42);leaf.quadraticCurveTo(5,-57,46,-33);leaf.lineTo(35,37);leaf.quadraticCurveTo(-2,49,-44,35);fill(ctx,leaf,gradient(ctx,{x:-40,y:-35},{x:42,y:35},color,accent),.94,5,light,1);
  fill(ctx,polygon([{x:-36,y:-42},{x:fold*45,y:-47},{x:-7,y:43},{x:-44,y:35}]),light,.21);
  const rib=new Path2D();rib.moveTo(-7,43);rib.lineTo(fold*45,-47);stroke(ctx,rib,light,1.35,.86,2);
  fanFlower(ctx,choice===0?12:-16,-4,10,light,accent,time*.22+variant);
 }else if(id==='fan'){
  const sway=Math.sin(time*2.4+variant)*8;
  for(const side of [-1,1]){const knot=new Path2D();knot.moveTo(0,-18);knot.quadraticCurveTo(side*39,-49,side*43,-18);knot.quadraticCurveTo(side*26,5,0,-18);stroke(ctx,knot,accent,5,.88,4);stroke(ctx,knot,light,1.1,.78);}
  circle(ctx,0,-16,7,light,.9,4);
  for(let i=0;i<9;i++){const x=(i-4)*2.7,p=new Path2D();p.moveTo(x,-8);p.quadraticCurveTo(x+sway,23,x*.7+sway+Math.sin(time*3+i*.18)*4,54-Math.abs(i-4)*3);stroke(ctx,p,i%3?accent:light,1.7,.85,2);}
 }else if(choice===0){
  const scale=new Path2D();scale.moveTo(-49,-13);scale.quadraticCurveTo(-4,-51,49,-13);scale.quadraticCurveTo(37,28,0,48);scale.quadraticCurveTo(-37,28,-49,-13);fill(ctx,scale,gradient(ctx,{x:-45,y:-20},{x:42,y:38},color,accent),.95,6,light,1.1);
  fill(ctx,polygon([{x:-49,y:-13},{x:0,y:-35},{x:0,y:48}]),light,.22);
  for(let i=0;i<3;i++){const edge=new Path2D(),d=i*9;edge.moveTo(-34+d,-10+d*.1);edge.quadraticCurveTo(0,20+d,34-d,-10+d*.1);stroke(ctx,edge,light,1,.64,1);}
 }else if(choice===1){
  const wave=Math.sin(time*2.7+variant)*10,p=new Path2D();p.moveTo(-56,16);p.quadraticCurveTo(-34,-36,-3,-8+wave);p.quadraticCurveTo(25,20+wave,48,-13);p.quadraticCurveTo(61,-35,34,-32);stroke(ctx,p,accent,5.5,.87,7);stroke(ctx,p,light,1.6,.94,2);circle(ctx,-53,12,4,light,.85,6);
 }else{
  ctx.rotate(time*.18+variant);
  for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*TAU/6);const piece=polygon([{x:13,y:-5},{x:41,y:-11},{x:48,y:0},{x:22,y:8}]);fill(ctx,piece,gradient(ctx,{x:15,y:-8},{x:47,y:8},color,accent),.84,4,light,.8);ctx.restore();}
  circle(ctx,0,0,15,accent,.82,13);circle(ctx,-3,-4,8,light,.96,5);glint(ctx,0,0,18,light,.45);
 }
 ctx.restore();
}
