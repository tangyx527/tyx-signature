import type {Point} from '../src/geometry';
import {ornatePresets,isOrnatePreset,type OrnatePreset,type OrnateFrame,type OrnateLayout,type OrnateClock} from './ornate-types';
import {drawBotanicalMotif,type BotanicalPreset} from './ornate-botanical';
import {drawMythicMotif,type MythicPreset} from './ornate-mythic';
import {drawCelestialMotif,type CelestialPreset} from './ornate-celestial';
import {drawWritingCompanions} from './ornate-companions';
import {ornateOpeningFrameColors} from './motion-palette';

const TAU=Math.PI*2;
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=(n:number)=>{const p=clamp(n);return p*p*(3-2*p);};
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p;
const noise=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453123;return n-Math.floor(n);};
const mix=(a:string,b:string,p:number)=>'#'+[1,3,5].map(i=>Math.round(lerp(parseInt(a.slice(i,i+2),16)||0,parseInt(b.slice(i,i+2),16)||0,p)).toString(16).padStart(2,'0')).join('');
type Pose={id:OrnatePreset;frame:OrnateFrame;center:Point;size:number;alpha:number;rotation:number;seed:number};
export type OrnatePen={point:Point;color:string;index:number;trail:Point[];firstStroke:boolean};

function motif(context:CanvasRenderingContext2D,id:OrnatePreset,frame:OrnateFrame):void{
 if(id==='orbit'||id==='bloom'||id==='moon'||id==='stellar')drawCelestialMotif(context,id as CelestialPreset,frame);
 else if(id==='unicorn'||id==='wings'||id==='fan'||id==='dragon')drawMythicMotif(context,id as MythicPreset,frame);
 else drawBotanicalMotif(context,id as BotanicalPreset,frame);
}
function poseAt(intro:string,layout:OrnateLayout,clock:OrnateClock):Pose|null{
 const {time,lead,duration}=clock;
 const id=isOrnatePreset(intro)?intro:null;if(!id||time<=0||time>=lead||time>=duration)return null;
 const seed=ornatePresets.findIndex(item=>item.id===id)+1,unit=Math.min(layout.width,layout.height)/1080;
 const maximum=Math.min(layout.width*.76,layout.height*.78),size=Math.max(280*unit,maximum),ink=layout.anchors[0]?.color??'#ffffff',{color,accent}=ornateOpeningFrameColors(id,ink);
 const introProgress=lead>0?clamp(time/lead):1,breakDuration=Math.min(.32,lead*.42),dissolve=lead>0?ease((time-(lead-breakDuration))/Math.max(.001,breakDuration)):1;
 const alpha=(1-dissolve)*ease(introProgress/.09),open=ease(introProgress/.48),scale=.36+.64*ease(introProgress/.45),rotation=Math.sin(time*.45+seed)*.045,center={x:layout.center.x,y:layout.height*.46};
 if(alpha<=0)return null;
 return {id,frame:{time,phase:'intro',progress:introProgress,open,color,accent},center,size:size*scale,alpha:clamp(alpha),rotation,seed};
}
function star(context:CanvasRenderingContext2D,p:Point,r:number,color:string,alpha:number,diamond=false):void{
 if(r<=0||alpha<=0)return;
 context.save();context.globalAlpha*=clamp(alpha);context.fillStyle=color;context.shadowColor=color;context.shadowBlur=r*2.5;context.beginPath();
 if(diamond){context.moveTo(p.x-r*1.5,p.y);context.quadraticCurveTo(p.x,p.y,p.x,p.y-r*2.2);context.quadraticCurveTo(p.x,p.y,p.x+r*1.5,p.y);context.quadraticCurveTo(p.x,p.y,p.x,p.y+r*2.2);context.quadraticCurveTo(p.x,p.y,p.x-r*1.5,p.y);}
 else context.arc(p.x,p.y,r,0,TAU);
 context.fill();context.restore();
}
function stroke(context:CanvasRenderingContext2D,points:readonly Point[],color:string,width:number,alpha:number,glow=0):void{
 if(points.length<2||width<=0||alpha<=0)return;
 context.save();context.globalAlpha*=clamp(alpha);context.strokeStyle=color;context.shadowColor=color;context.shadowBlur=glow;context.lineWidth=width;context.lineCap='round';context.lineJoin='round';context.beginPath();context.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))context.lineTo(p.x,p.y);context.stroke();context.restore();
}
function companionTracks(context:CanvasRenderingContext2D,pose:Pose,front=false):void{
 const {center,size,frame,alpha,seed}=pose,r=size*.56,time=frame.time;
 context.save();context.globalAlpha*=alpha;
 if(!front)for(let band=0;band<3;band++){
  const points:Point[]=[],turn=time*(.6+band*.08)+seed+band*2.1,tilt=-.45+band*.43;
  for(let i=0;i<=64;i++){const angle=turn-i/64*(2.2+band*.25),x=Math.cos(angle)*r*(1+band*.08),y=Math.sin(angle)*r*(.32+band*.07);points.push({x:center.x+x*Math.cos(tilt)-y*Math.sin(tilt),y:center.y+x*Math.sin(tilt)+y*Math.cos(tilt)});}
  stroke(context,points,band===1?frame.accent:mix(frame.color,'#ffffff',.65),size/600*(band===0?3:1.5),.38,9*size/600);star(context,points[0],size/600*4.5,frame.accent,.85,true);
 }
 const count=front?22:64;
 for(let i=0;i<count;i++){
  const n=noise(i+seed*131),u=(time*(.18+n*.13)+n)%1,angle=(i/count*TAU+time*(i%2?.23:-.17)+seed),distance=r*(.64+noise(i+seed*43)*.66),rise=(u-.5)*size*.20;
  const p={x:center.x+Math.cos(angle)*distance,y:center.y+Math.sin(angle)*distance*.70-rise},a=Math.sin(Math.PI*u)**1.4;
  star(context,p,(1.6+n*3.5)*size/600,(i%4?mix(frame.color,'#ffffff',.7):frame.accent),a*(front?.62:.72),i%5===0);
 }
 context.restore();
}

/** Full subjects belong to entry only; exits transform the existing authored ink. */
export function drawOrnateBackdrop(context:CanvasRenderingContext2D,intro:string,layout:OrnateLayout,clock:OrnateClock):void{
 drawWritingCompanions(context,intro,layout,clock,'back');
 const pose=poseAt(intro,layout,clock);if(!pose)return;
 companionTracks(context,pose);
 context.save();context.globalAlpha*=pose.alpha;
 context.translate(pose.center.x,pose.center.y);context.rotate(pose.rotation);context.scale(pose.size/600,pose.size/600);motif(context,pose.id,pose.frame);context.restore();
 // A faint moving reflection is generated from the same vectors, never from video pixels.
 const reflectionY=pose.center.y+pose.size*.47;
 if(reflectionY<layout.height-pose.size*.08){context.save();context.globalAlpha*=pose.alpha*.11;context.translate(pose.center.x,reflectionY);context.scale(pose.size/600,-pose.size/600*.27);context.rotate(pose.rotation);motif(context,pose.id,pose.frame);context.restore();}
}
function cubic(a:Point,b:Point,c:Point,d:Point,p:number):Point{const q=1-p;return {x:q*q*q*a.x+3*q*q*p*b.x+3*q*p*p*c.x+p*p*p*d.x,y:q*q*q*a.y+3*q*q*p*b.y+3*q*p*p*c.y+p*p*p*d.y};}
function entryPoint(intro:string,layout:OrnateLayout,clock:OrnateClock,anchor:OrnateLayout['anchors'][number],time:number):Point|null{
 if(time<=0||clock.lead<=0)return null;
 const pose=poseAt(intro,layout,{...clock,time}),p=clamp((time/clock.lead-.56)/.44);if(!pose||p<=0)return null;
 const side=anchor.index===1?1:-1,a={x:pose.center.x+side*pose.size*.23,y:pose.center.y},b={x:a.x+side*pose.size*.18,y:a.y-pose.size*.23},c={x:anchor.point.x-side*pose.size*.12,y:anchor.point.y-pose.size*.19};
 return cubic(a,b,c,anchor.point,p);
}

/** One luminous thread reaches each real first stroke; pen sparks then follow real writing. */
export function drawOrnateForeground(context:CanvasRenderingContext2D,intro:string,layout:OrnateLayout,clock:OrnateClock,pens:readonly OrnatePen[]):void{
 drawWritingCompanions(context,intro,layout,clock,'front');
 const pose=poseAt(intro,layout,clock);if(pose)companionTracks(context,pose,true);
 const accent=ornatePresets.find(item=>item.id===intro)?.accent??'#ffffff';
 const unit=Math.min(layout.width,layout.height)/1080;
 if(clock.time<clock.lead&&isOrnatePreset(intro)){
  const p=clamp((clock.time/clock.lead-.56)/.44);if(p<=0)return;
  for(const anchor of layout.anchors){
   const tail:Point[]=[];
   for(let i=0;i<=26;i++){const point=entryPoint(intro,layout,clock,anchor,clock.time-.22*(1-i/26));if(point)tail.push(point);}
   const color=mix(anchor.color,accent,.4),fade=ease(p/.20);stroke(context,tail,color,8*unit,fade*.30,20*unit);stroke(context,tail,mix(color,'#ffffff',.7),2.5*unit,fade*.95,7*unit);if(tail.length)star(context,tail.at(-1)!,7*unit,mix(color,'#ffffff',.85),fade*.92,true);
  }
 }else if(clock.time<clock.outroStart&&isOrnatePreset(intro)){
  for(const pen of pens){
   const bridge=pen.firstStroke?ease((clock.time-clock.lead)/.22):1,trail:Point[]=[],anchor=layout.anchors.find(item=>item.index===pen.index);
   if(anchor&&bridge<1)for(let i=0;i<=18;i++){const at=clock.time-.22*(1-i/18);if(at>=clock.lead)continue;const point=entryPoint(intro,layout,clock,anchor,at);if(point)trail.push(point);}
   trail.push(...pen.trail);const color=mix(pen.color,accent,.32);stroke(context,trail,color,lerp(8,2,bridge)*unit,lerp(.30,.76,bridge),lerp(20,6,bridge)*unit);stroke(context,trail,mix(color,'#ffffff',.7),lerp(2.5,1,bridge)*unit,(1-bridge)*.9,7*unit);star(context,pen.point,lerp(7,4.3,bridge)*unit,mix(pen.color,'#ffffff',.8),.92,true);
  }
 }
}
