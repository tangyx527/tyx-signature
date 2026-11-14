import type {OrnateFrame} from './ornate-types';

export type CelestialPreset='orbit'|'bloom'|'moon'|'stellar';
type Point={x:number;y:number};
const TAU=Math.PI*2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const u=clamp(n);return u*u*(3-2*u);};
const mix=(a:string,b:string,u:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-u)+parseInt(b.slice(i,i+2),16)*u).toString(16).padStart(2,'0')).join('');
const polar=(r:number,a:number):Point=>({x:Math.cos(a)*r,y:Math.sin(a)*r});

function gradient(ctx:CanvasRenderingContext2D,a:Point,b:Point,colors:readonly string[]):CanvasGradient|string{
 if(typeof ctx.createLinearGradient!=='function')return colors[Math.floor(colors.length/2)];
 const fill=ctx.createLinearGradient(a.x,a.y,b.x,b.y);colors.forEach((color,index)=>fill.addColorStop(index/Math.max(1,colors.length-1),color));return fill;
}
function line(ctx:CanvasRenderingContext2D,points:readonly Point[],color:string,width:number,alpha=1,glow=0):void{
 if(points.length<2||alpha<=0)return;
 ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();
}
function polygon(ctx:CanvasRenderingContext2D,points:readonly Point[],fill:string|CanvasGradient,edge:string,width=1.5,alpha=1,glow=0):void{
 if(!points.length||alpha<=0)return;
 ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=fill;ctx.strokeStyle=edge;ctx.lineWidth=width;ctx.lineJoin='round';ctx.shadowColor=edge;ctx.shadowBlur=glow;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.stroke();ctx.restore();
}
function spark(ctx:CanvasRenderingContext2D,p:Point,r:number,color:string,alpha=1,turn=0):void{
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(p.x,p.y);ctx.rotate(turn);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=r*2.6;ctx.beginPath();ctx.moveTo(-r*1.55,0);ctx.quadraticCurveTo(0,0,0,-r*2.2);ctx.quadraticCurveTo(0,0,r*1.55,0);ctx.quadraticCurveTo(0,0,0,r*2.2);ctx.quadraticCurveTo(0,0,-r*1.55,0);ctx.fill();ctx.restore();
}
function diamond(ctx:CanvasRenderingContext2D,p:Point,r:number,color:string,accent:string,turn=0):void{
 const light=mix(color,'#ffffff',.86),dark=mix(color,'#251744',.52);
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(turn);
 const top={x:0,y:-r*1.28},right={x:r*.72,y:0},bottom={x:0,y:r*1.28},left={x:-r*.72,y:0},center={x:0,y:0};
 polygon(ctx,[top,right,bottom,left],gradient(ctx,top,bottom,[light,accent,dark]),light,2,1,17);
 polygon(ctx,[top,right,center],light,light,1,.84);polygon(ctx,[right,bottom,center],accent,light,1,.72);polygon(ctx,[bottom,left,center],dark,accent,1,.76);polygon(ctx,[left,top,center],mix(color,'#ffffff',.6),light,1,.8);ctx.restore();
}
function orbitPoint(radius:number,flatten:number,tilt:number,angle:number,cy=0):Point{
 const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*flatten;
 return {x:x*Math.cos(tilt)-y*Math.sin(tilt),y:x*Math.sin(tilt)+y*Math.cos(tilt)+cy};
}
function orbitArc(radius:number,flatten:number,tilt:number,from:number,to:number,cy=0,count=72):Point[]{
 const points:Point[]=[];for(let i=0;i<=count;i++)points.push(orbitPoint(radius,flatten,tilt,from+(to-from)*i/count,cy));return points;
}
function drop(ctx:CanvasRenderingContext2D,p:Point,r:number,color:string,turn:number,alpha=1):void{
 const light=mix(color,'#ffffff',.84);ctx.save();ctx.globalAlpha*=alpha;ctx.translate(p.x,p.y);ctx.rotate(turn);ctx.fillStyle=gradient(ctx,{x:-r,y:0},{x:r,y:0},[color,light,color]);ctx.shadowColor=color;ctx.shadowBlur=r*2;ctx.beginPath();ctx.moveTo(r*1.9,0);ctx.quadraticCurveTo(-r*.15,-r*1.45,-r,0);ctx.quadraticCurveTo(-r*.15,r*1.45,r*1.9,0);ctx.fill();ctx.fillStyle='#ffffff';ctx.shadowBlur=r*.5;ctx.beginPath();ctx.arc(r*.08,-r*.17,r*.3,0,TAU);ctx.fill();ctx.restore();
}

/** The actual two-layer highlight of an opening orbit, reusable along a different spine. */
export function drawCelestialOrbitStreak(ctx:CanvasRenderingContext2D,body:readonly Point[],core:readonly Point[],color:string,light:string,alpha=1):void{
 line(ctx,body,color,11,alpha*.82,23);
 line(ctx,core,light,3.8,alpha,8);
}

/** The opening star's broad white energy packet and its coloured inner seam. */
export function drawCelestialStellarStreak(ctx:CanvasRenderingContext2D,body:readonly Point[],core:readonly Point[],color:string,light:string):void{
 line(ctx,body,light,12,.9,22);line(ctx,core,color,4,.95,7);
}

function drawOrbit(ctx:CanvasRenderingContext2D,f:OrnateFrame):void{
 const light=mix(f.color,'#ffffff',.9),cool=mix(f.accent,'#78e8ff',.6),t=f.time;
 const tracks=[{r:242,flat:.32,tilt:-.42,speed:.72},{r:262,flat:.47,tilt:.73,speed:-.49},{r:226,flat:.72,tilt:-1.03,speed:.41},{r:213,flat:.22,tilt:1.42,speed:-.9}];
 tracks.forEach((track,index)=>{
  const unfold=ease((f.open-index*.055)/(1-index*.055)),r=track.r*(.22+.78*unfold),tilt=track.tilt+Math.sin(t*.32+index)*.18,rotation=t*track.speed+index*1.7,color=index%2?cool:f.accent;
  line(ctx,orbitArc(r,track.flat,tilt,0,TAU),color,3,.38*unfold,11);
  line(ctx,orbitArc(r+7,track.flat,tilt,0,TAU),light,1.1,.25*unfold);
  drawCelestialOrbitStreak(ctx,orbitArc(r,track.flat,tilt,rotation-1.2,rotation+.9),orbitArc(r,track.flat,tilt,rotation-.72,rotation+.83),color,light,unfold);
  line(ctx,orbitArc(r,track.flat,tilt,rotation+Math.PI-.7,rotation+Math.PI+.35),light,5.2,unfold*.7,13);
  const satellite=orbitPoint(r,track.flat,tilt,rotation+.84);
  diamond(ctx,satellite,index===1?18:12,color,light,rotation+tilt);
  const rear=orbitPoint(r,track.flat,tilt,rotation+Math.PI+.35);spark(ctx,rear,5+index,light,.55+.35*Math.sin(t*2+index)**2,t*.2);
 });
 // The compact central crystal lets the four moving orbital planes remain the main silhouette.
 for(let i=0;i<3;i++)line(ctx,orbitArc(58+i*8,.85,0,t*.45+i*.8,t*.45+i*.8+Math.PI*1.1),i%2?cool:light,2.5,.5,10);
 diamond(ctx,{x:0,y:0},43,f.color,cool,Math.sin(t*.48)*.13);
 spark(ctx,{x:0,y:0},12,light,.7+.25*Math.sin(t*2.2)**2,t*.13);
}

function petal(ctx:CanvasRenderingContext2D,r:number,width:number,color:string,accent:string,alpha:number):void{
 const light=mix(color,'#ffffff',.86),edge=mix(accent,'#ffffff',.4),base=32;
 ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=gradient(ctx,{x:0,y:-r},{x:0,y:-base},[light,accent,mix(color,'#34244e',.36)]);ctx.strokeStyle=edge;ctx.lineWidth=2.2;ctx.shadowColor=accent;ctx.shadowBlur=19;
 ctx.beginPath();ctx.moveTo(0,-base);ctx.quadraticCurveTo(-width*1.1,-r*.62,0,-r);ctx.quadraticCurveTo(width*1.1,-r*.62,0,-base);ctx.fill();ctx.shadowBlur=0;ctx.stroke();
 polygon(ctx,[{x:0,y:-r},{x:width*.52,y:-r*.58},{x:0,y:-base}],light,light,.7,.43);
 line(ctx,[{x:0,y:-base},{x:0,y:-r}],light,1.8,.84,5);ctx.restore();
}
function drawBloom(ctx:CanvasRenderingContext2D,f:OrnateFrame):void{
 const t=f.time,light=mix(f.color,'#ffffff',.86),pink=mix(f.accent,'#ffbce6',.46),cool=mix(f.color,'#a8e9ff',.45);
 for(let layer=0;layer<2;layer++){
  const count=layer?12:8,turn=layer?-t*.18:t*.105,r=layer?154:255;
  for(let i=0;i<count;i++){
   const unfold=ease((f.open-(i%4)*.055-layer*.08)/(.84-layer*.04)),angle=i/count*TAU+turn+(layer?.13:0),sway=Math.sin(t*1.12+i*.91)*.035;
   ctx.save();ctx.rotate(angle+sway);ctx.scale(.3+.7*unfold,.16+.84*unfold);petal(ctx,r+(layer?7:13)*Math.sin(t*.7+i),layer?23:47,layer?light:f.color,i%2?cool:pink,unfold*(layer?.94:.82));
   if(!layer)spark(ctx,{x:0,y:-r-2},4+3*Math.sin(t*1.5+i*.73)**2,light,unfold*.7,-angle);ctx.restore();
  }
 }
 for(let i=0;i<3;i++)line(ctx,orbitArc(62+i*9,1,0,-t*.24+i*2.2,-t*.24+i*2.2+1.8),i%2?pink:light,3,.64,10);
 diamond(ctx,{x:0,y:0},41,f.color,pink,t*.15);
 for(let i=0;i<8;i++){
  const angle=i/8*TAU-t*.14,p=polar(185+Math.sin(t*1.4+i)*15,angle);spark(ctx,p,3+Math.sin(t*1.7+i)**2*3,light,f.open*.72,angle);
 }
}

/** Moon material and its five inset stars, without its outer helix or hanging ornament. */
export function drawCelestialMoonBody(ctx:CanvasRenderingContext2D,time:number,gold:string,light:string):void{
 ctx.fillStyle=gradient(ctx,{x:-172,y:-160},{x:70,y:175},[light,gold,mix(gold,'#9c5a8c',.37)]);ctx.strokeStyle=light;ctx.lineWidth=3;ctx.shadowColor=gold;ctx.shadowBlur=27;
 ctx.beginPath();ctx.moveTo(41,-174);ctx.quadraticCurveTo(-179,-203,-181,9);ctx.quadraticCurveTo(-171,188,37,174);ctx.quadraticCurveTo(-85,115,-88,-20);ctx.quadraticCurveTo(-80,-125,41,-174);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.stroke();
 line(ctx,[{x:25,y:-159},{x:-53,y:-101},{x:-80,y:-18},{x:-63,y:82},{x:20,y:158}],light,2.8,.75,7);
 for(let i=0;i<5;i++)spark(ctx,{x:-134+14*Math.sin(i*1.6),y:-105+i*49},3+(i%2)*2,light,.55+.3*Math.sin(time*1.3+i)**2,time*.12);
}

/** The original cord, lower diamond and its gentle sway, in the opening's local coordinates. */
export function drawCelestialMoonHanging(ctx:CanvasRenderingContext2D,time:number,gold:string,pink:string,light:string):void{
 const sway=Math.sin(time*.84)*17,anchor={x:106,y:-168},hanging={x:132+sway,y:123+Math.sin(time*.84)*7};
 line(ctx,[anchor,{x:122+sway*.5,y:-10},hanging],light,1.8,.72,5);diamond(ctx,hanging,24,gold,pink,Math.sin(time*.84)*.16);
}

function drawMoon(ctx:CanvasRenderingContext2D,f:OrnateFrame):void{
 const t=f.time,gold=mix(f.accent,'#ffd784',.74),light=mix(gold,'#ffffff',.84),pink=mix(f.color,'#ff96cf',.55);
 // Three separated, almost horizontal helices are distinct from the intersecting planes of orbit.
 for(let band=0;band<3;band++){
  const y=-132+band*135,r=198+(band===1?42:0),angle=t*(.68+band*.11)+band*1.8;
  line(ctx,orbitArc(r,.17,.06*Math.sin(t*.4+band),0,TAU,y),gold,3.2,.73,12);
  line(ctx,orbitArc(r,.17,0,angle-.55,angle+.65,y),light,6,.9,17);
  for(let i=0;i<3;i++){
   const a=angle+i*TAU/3,p=orbitPoint(r,.17,0,a,y);drop(ctx,p,i?6:11,i===1?pink:gold,a+Math.PI/2,.82);
  }
 }
 ctx.save();ctx.translate(-20,-4);ctx.rotate(-.23+Math.sin(t*.58)*.1);
 drawCelestialMoonBody(ctx,t,gold,light);
 ctx.restore();
 drawCelestialMoonHanging(ctx,t,gold,pink,light);
 spark(ctx,{x:-178,y:-173},12,light,.64+.3*Math.sin(t*1.6)**2,t*.1);spark(ctx,{x:188,y:205},11,pink,.68+.27*Math.sin(t*1.6+1)**2,-t*.1);
}

export type CelestialStarColors={light:string;cool:string;dark:string;accent:string};
function stellarPoints(rotation:number):Point[]{
 const points:Point[]=[];
 for(let i=0;i<16;i++){
  const angle=-Math.PI/2+i*TAU/16+rotation,r=i%2?66:(i%4===0?205:152);points.push(polar(r,angle));
 }
 return points;
}

/** One original star point: its two differently lit crystal facets and the shared spine. */
export function drawCelestialStarArm(ctx:CanvasRenderingContext2D,index:number,colors:CelestialStarColors,rotation=0):void{
 const {light,cool,dark,accent}=colors,points=stellarPoints(rotation),i=((index%8)+8)%8;
 const a=points[i*2],b=points[(i*2+1)%16],c=points[(i*2+15)%16];
 polygon(ctx,[{x:0,y:0},a,b],i%2?light:cool,light,1.2,.62);
 polygon(ctx,[{x:0,y:0},c,a],i%2?dark:accent,cool,1.2,.72);
 line(ctx,[{x:0,y:0},a],light,2.4,.85,6);
}

/** The complete original crystal core; its moving outer tracks are separate artwork. */
export function drawCelestialStarCore(ctx:CanvasRenderingContext2D,colors:CelestialStarColors,rotation=0):void{
 const {light,cool,dark}=colors,points=stellarPoints(rotation);
 polygon(ctx,points,gradient(ctx,{x:-150,y:-170},{x:170,y:200},[light,cool,dark]),cool,3,1,28);
 for(let i=0;i<8;i++)drawCelestialStarArm(ctx,i,colors,rotation);
}

/** A real section of that core, including its original coloured ground below the facets. */
export function drawCelestialStarBlade(ctx:CanvasRenderingContext2D,index:number,colors:CelestialStarColors,rotation=0):void{
 const points=stellarPoints(rotation),i=((index%8)+8)%8,a=points[i*2],b=points[(i*2+1)%16],c=points[(i*2+15)%16];
 ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(b.x,b.y);ctx.lineTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();
 polygon(ctx,points,gradient(ctx,{x:-150,y:-170},{x:170,y:200},[colors.light,colors.cool,colors.dark]),colors.cool,3,1,28);
 drawCelestialStarArm(ctx,i,colors,rotation);ctx.restore();
}

function drawStellar(ctx:CanvasRenderingContext2D,f:OrnateFrame):void{
 const t=f.time,light=mix(f.color,'#ffffff',.94),cool=mix(f.accent,'#b8d8ff',.53),dark=mix(f.color,'#27185e',.56),rotation=t*.11;
 drawCelestialStarCore(ctx,{light,cool,dark,accent:f.accent},rotation);
 // Bright moving energy packets cross the large solid crystal on three separate planes.
 for(let plane=0;plane<3;plane++){
  const radius=plane===1?272:235,flatten=[.25,.52,.32][plane],tilt=[-.35,.68,1.43][plane]+Math.sin(t*.3+plane)*.14,a=t*(plane===1?-.91:.73)+plane*2.1;
  line(ctx,orbitArc(radius,flatten,tilt,0,TAU),cool,1.7,.35,5);
  drawCelestialStellarStreak(ctx,orbitArc(radius,flatten,tilt,a-1.04,a+.62),orbitArc(radius,flatten,tilt,a-.75,a+.59),cool,light);
  const p=orbitPoint(radius,flatten,tilt,a+.64),previous=orbitPoint(radius,flatten,tilt,a+.60);drop(ctx,p,12,light,Math.atan2(p.y-previous.y,p.x-previous.x),.95);
 }
 for(let ray=0;ray<4;ray++){
  const angle=rotation+ray*Math.PI/2,a=polar(83,angle),b=polar(235+Math.sin(t*1.2+ray)*25,angle);line(ctx,[a,b],light,3,.55,15);spark(ctx,b,7,cool,.7,angle);
 }
 diamond(ctx,{x:0,y:0},43,light,f.accent,-rotation);spark(ctx,{x:0,y:0},16,light,.7+.25*Math.sin(t*2.3)**2,t*.1);
}

// These are the same primitives used above, rather than companion approximations.
export {line as drawCelestialLine,spark as drawCelestialSpark,diamond as drawCelestialDiamond,drop as drawCelestialDrop,petal as drawCelestialPetal};

export function drawCelestialMotif(ctx:CanvasRenderingContext2D,id:CelestialPreset,frame:OrnateFrame):void{
 const open=clamp(frame.open);if(open<=.0001)return;
 ctx.save();ctx.globalAlpha*=Math.min(1,open*3.2);const spread=.07+.93*ease(open);ctx.scale(spread,spread);
 if(id==='orbit')drawOrbit(ctx,frame);else if(id==='bloom')drawBloom(ctx,frame);else if(id==='moon')drawMoon(ctx,frame);else drawStellar(ctx,frame);
 ctx.restore();
}

/** One detached, locally centered actor; the parent moves it around the actual ink. */
export function drawCelestialCompanion(ctx:CanvasRenderingContext2D,id:CelestialPreset,frame:OrnateFrame,variant:number):void{
 const open=clamp(frame.open);if(open<=.0001)return;
 const v=Math.abs(Math.trunc(variant))%4,t=frame.time,light=mix(frame.color,'#ffffff',.88),cool=mix(frame.accent,'#a2e7ff',.48),pulse=1+.035*Math.sin(t*1.7+v*1.9);
 ctx.save();ctx.globalAlpha*=Math.min(1,open*3.2);ctx.rotate(Math.sin(t*(.9+v*.1)+v)*.07);ctx.scale(pulse,pulse);
 if(id==='orbit'){
  if(v%2===0){
   // An individual comet droplet and its own short trailing edge, without an orbit.
   line(ctx,[{x:-57,y:4*Math.sin(t*2+v)},{x:-36,y:0},{x:-20,y:0}],cool,4.2,.58,7);
   drop(ctx,{x:-12,y:0},30,cool,Math.sin(t*.8+v)*.035);
  }else if(v===1){
   diamond(ctx,{x:0,y:0},38,frame.color,cool,Math.PI/2+Math.sin(t*.7)*.08);
  }else{
   const points=[{x:-49,y:0},{x:-23,y:-28},{x:28,y:-21},{x:49,y:0},{x:28,y:21},{x:-23,y:28}];
   polygon(ctx,points,gradient(ctx,{x:-49,y:-20},{x:49,y:20},[cool,light,frame.accent]),light,2,1,11);
   polygon(ctx,[points[0],points[1],{x:5,y:0},points[5]],frame.accent,light,1,.72);
   polygon(ctx,[points[1],points[2],points[3],{x:5,y:0}],light,light,1,.76);
   line(ctx,[points[0],{x:5,y:0},points[3]],light,2.1,.85,4);
  }
 }else if(id==='bloom'){
  // A single substantial crystal petal, with no center jewel or surrounding petals.
  const pink=mix(frame.accent,v%2?'#ffb4dc':'#c8b8ff',.42),tip={x:v%2?43:51,y:-4},base={x:v%2?-43:-50,y:10},upper=v%2?-48:-40,lower=v%2?47:37;
  ctx.fillStyle=gradient(ctx,{x:base.x,y:28},{x:tip.x,y:-20},[mix(frame.color,'#5a4174',.38),pink,light]);ctx.strokeStyle=mix(pink,'#ffffff',.48);ctx.lineWidth=2.2;ctx.shadowColor=pink;ctx.shadowBlur=15;
  ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.quadraticCurveTo(-7,upper,tip.x,tip.y);ctx.quadraticCurveTo(9,lower,base.x,base.y);ctx.fill();ctx.shadowBlur=0;ctx.stroke();
  polygon(ctx,[base,{x:3,y:-14},tip,{x:8,y:3}],light,light,.9,.46);
  line(ctx,[{x:base.x+8,y:base.y-2},{x:4,y:1},tip],light,1.8,.83,4);
  spark(ctx,{x:tip.x-11,y:tip.y-3},3.6,light,.35+.5*Math.sin(t*1.8+v)**2,.3);
 }else if(id==='moon'){
  const gold=mix(frame.accent,'#ffd982',.77),pale=mix(gold,'#ffffff',.8);
  if(v===0||v===3){
   // A detached crescent shard, not the moon-and-helices composition.
   ctx.rotate(v===3?-.65:.25);ctx.fillStyle=gradient(ctx,{x:-49,y:-44},{x:38,y:43},[pale,gold,mix(gold,'#a57777',.3)]);ctx.strokeStyle=pale;ctx.lineWidth=2;ctx.shadowColor=gold;ctx.shadowBlur=13;
   ctx.beginPath();ctx.moveTo(35,-48);ctx.quadraticCurveTo(-54,-63,-49,5);ctx.quadraticCurveTo(-39,60,38,42);ctx.quadraticCurveTo(-7,30,-11,-4);ctx.quadraticCurveTo(-10,-31,35,-48);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.stroke();
   line(ctx,[{x:21,y:-37},{x:-28,y:-20},{x:-32,y:14},{x:22,y:34}],pale,1.7,.74,3);
  }else if(v===1){
   const points:Point[]=[];for(let i=0;i<10;i++)points.push(polar(i%2?20:47,-Math.PI/2+i*TAU/10));
   polygon(ctx,points,gradient(ctx,{x:-40,y:-40},{x:40,y:40},[pale,gold,mix(gold,'#99655d',.34)]),pale,2,1,13);
   for(let i=0;i<5;i++)polygon(ctx,[{x:0,y:0},points[i*2],points[(i*2+1)%10]],i%2?pale:gold,pale,.8,.62);
  }else{
   diamond(ctx,{x:0,y:0},37,gold,pale,Math.PI/2-.18);
  }
 }else{
  if(v%2===0){
   // One multi-faceted star crystal, entirely separate from the mother motif's arcs.
   const points:Point[]=[];for(let i=0;i<16;i++)points.push(polar(i%2?19:(i%4===0?49:36),-Math.PI/2+i*TAU/16));
   polygon(ctx,points,gradient(ctx,{x:-45,y:-45},{x:45,y:45},[light,cool,mix(frame.color,'#35235e',.45)]),light,1.8,1,13);
   for(let i=0;i<8;i++){
    polygon(ctx,[{x:0,y:0},points[i*2],points[(i*2+1)%16]],i%2?cool:light,light,.75,.72);
    line(ctx,[{x:0,y:0},points[i*2]],light,1.1,.83,3);
   }
  }else{
   const points=[{x:-51,y:0},{x:-24,y:-25},{x:22,y:-19},{x:49,y:0},{x:22,y:19},{x:-24,y:25}];
   polygon(ctx,points,gradient(ctx,{x:-51,y:0},{x:49,y:0},[frame.accent,cool,light]),light,2,1,16);
   polygon(ctx,[points[0],points[1],{x:4,y:0},points[5]],frame.accent,light,1,.7);
   polygon(ctx,[points[1],points[2],points[3],{x:4,y:0}],light,light,1,.7);
   line(ctx,[points[0],{x:4,y:0},points[3]],light,2.4,.9,6);
  }
 }
 ctx.restore();
}
