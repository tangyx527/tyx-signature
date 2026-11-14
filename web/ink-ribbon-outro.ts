import type {MotionGeometry,VariantInk} from './motion-variants';
import type {AuthoredRibbon,RibbonSample} from './ink-ribbon-handoff';
import {drawAuthoredInkScene} from './outro-ink-renderer';
import {openingSubjectColors,type OutroAppearance} from './motion-palette';
import {vortexOutroPainter} from './outro-native-abstract';

type V3={x:number;y:number;z:number};
type Key=V3&{t:number};
type Track={id:number;weight:number;width:number;lag:number;keys:readonly Key[]};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const key=(t:number,x:number,y:number,z:number):Key=>({t,x,y,z});

/** Each head has a different turning point and a different route home. These are not rotations of one flight. */
const tracks:readonly Track[]=[
 {id:0,weight:.24,width:25,lag:.164,keys:[
  key(.22,-22,44,0),key(.32,-64,145,8),key(.47,-242,302,42),key(.60,-424,236,15),key(.735,-360,84,-48),key(.795,-270,-70,45),key(.845,22,8,82),key(.875,-12,17,18),key(.91,0,0,0),
 ]},
 {id:1,weight:.05,width:9,lag:.064,keys:[
  key(.24,13,34,-8),key(.36,-2,134,-10),key(.52,-104,252,-32),key(.655,-224,173,-55),key(.77,-153,33,-24),key(.84,81,61,-38),key(.90,17,-12,-20),key(.94,0,0,0),
 ]},
 {id:2,weight:.17,width:21,lag:.145,keys:[
  key(.22,-36,-17,10),key(.32,-167,-93,30),key(.45,-389,-158,12),key(.575,-465,-17,-38),key(.70,-390,78,-52),key(.78,-295,136,60),key(.825,-70,65,88),key(.865,25,-12,32),key(.915,0,0,0),
 ]},
 {id:3,weight:.05,width:8,lag:.055,keys:[
  key(.25,-22,-30,-10),key(.39,-74,-108,-15),key(.53,-204,-156,-35),key(.65,-269,-57,-6),key(.79,-81,93,38),key(.86,22,6,65),key(.93,0,0,0),
 ]},
 {id:4,weight:.16,width:13,lag:.112,keys:[
  key(.23,11,-44,-18),key(.335,61,-201,-22),key(.475,232,-342,-55),key(.565,366,-251,-24),key(.67,310,-40,28),key(.755,192,123,-30),key(.815,-30,14,-58),key(.865,12,-15,-22),key(.90,0,0,0),
 ]},
 {id:5,weight:.15,width:14,lag:.116,keys:[
  key(.23,38,-14,4),key(.34,159,-37,-6),key(.475,376,-134,10),key(.62,479,9,50),key(.745,397,164,8),key(.81,265,50,-46),key(.87,-8,-24,-60),key(.915,12,12,-10),key(.94,0,0,0),
 ]},
 {id:6,weight:.18,width:12,lag:.122,keys:[
  key(.24,35,18,12),key(.35,102,98,28),key(.51,307,275,52),key(.64,433,191,72),key(.75,350,40,28),key(.825,210,-105,-58),key(.895,-20,16,-82),key(.93,6,8,-18),key(.95,0,0,0),
 ]},
];

function headAt(track:Track,t:number):V3{
 // The leader leaves first; the secondary family and three narrow followers catch up later.
 const launchDelay=[0,.025,.060,.095,.100,.135,.160][track.id];
 t-=launchDelay*(1-ease((t-.40)/.25));
 const keys=track.keys,first=keys[0];
 if(t<=first.t){
  const u=ease((t-.105)/(first.t-.105)),bend=Math.sin(Math.PI*u)*7,length=Math.hypot(first.x,first.y)||1;
  return {x:first.x*u-first.y/length*bend,y:first.y*u+first.x/length*bend,z:first.z*u};
 }
 if(t>=keys[keys.length-1].t)return {x:0,y:0,z:0};
 let i=0;while(i<keys.length-2&&keys[i+1].t<t)i++;
 const a=keys[i],b=keys[i+1],previous=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)],dt=b.t-a.t,u=clamp((t-a.t)/dt);
 const h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;
 const result:V3={x:0,y:0,z:0};
 for(const axis of ['x','y','z'] as const){
  const ma=i===0?0:(b[axis]-previous[axis])/Math.max(.001,b.t-previous.t),mb=i+1===keys.length-1?0:(next[axis]-a[axis])/Math.max(.001,next.t-a.t);
  result[axis]=h00*a[axis]+h10*dt*ma+h01*b[axis]+h11*dt*mb;
 }
 return result;
}

/** Time-lagged samples make the tail stay outside while its head cuts back through the knot. */
function ribbonsAt(p:number,geometry:MotionGeometry,colors:readonly string[]):AuthoredRibbon[]{
 const unit=geometry.unit,scale=Math.max(.67,Math.min(1.05,geometry.radius/(440*unit)))*unit;
 const closing=1-ease((p-.94)/.035);
 return tracks.map(track=>{
  const samples:RibbonSample[]=[],returning=ease((p-.71)/.12)*(1-ease((p-.94)/.04));
  for(let k=0;k<=40;k++){
   const u=k/40,time=p-track.lag*(1-u),q=headAt(track,time),behind=headAt(track,time-.012),ahead=headAt(track,time+.012);
   const speed=Math.hypot(ahead.x-behind.x,ahead.y-behind.y)/.024;
   const taper=(.025+.975*Math.sin(Math.PI*u)**.62)*(1-.08*u)+.18*u**5,born=.26+.74*ease((p-.205)/.13),width=track.width*(.56+.44*taper)*taper;
   const radius=(width*(1+returning*.58)*(.88+.12*clamp(speed/3200))*born+.35)*scale*closing;
   samples.push({x:geometry.center.x+q.x*scale*closing,y:geometry.center.y+q.y*scale*closing,z:q.z*scale,radius,u});
  }
  let length=0;for(let k=1;k<samples.length;k++)length+=Math.hypot(samples[k].x-samples[k-1].x,samples[k].y-samples[k-1].y);
  const inkLife=ease(length/((p>.86?48:12)*scale));
  return {id:track.id,color:colors[track.id%Math.max(1,colors.length)]??'#ffffff',weight:track.weight,samples:samples.map(q=>({...q,radius:q.radius*inkLife}))};
 });
}

/** One authored coda, not a reusable scatter envelope: compress → seven flights → staggered return passes → ink knot. */
export function drawInkRibbonOutro(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],progress:number,geometry:MotionGeometry,colors:readonly string[]=openingSubjectColors('classic'),appearance?:OutroAppearance):void{
 const p=clamp(progress);if(p>=1||!inks.some(ink=>ink.samples.length))return;
 const ribbons=ribbonsAt(p,geometry,colors);
 drawAuthoredInkScene(ctx,inks,p,geometry,ribbons,vortexOutroPainter(p,colors,ribbons,appearance));
}
