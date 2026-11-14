import type {Point} from '../src/geometry';

type FlightPoint=Point&{distance:number};
export type CometFlight={points:FlightPoint[];length:number;unit:number};
export type CometPen={point:Point;stroke:string;visible:boolean;radius:number};
type TrailPoint=Point&{width:number};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=(n:number)=>{const p=clamp(n);return p*p*(3-2*p);};
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p;
const mix=(a:string,b:string,p:number)=>'#'+[1,3,5].map(i=>Math.round(lerp(parseInt(a.slice(i,i+2),16)||0,parseInt(b.slice(i,i+2),16)||0,p)).toString(16).padStart(2,'0')).join('');
const noise=(seed:number)=>{const n=Math.sin(seed*127.1+311.7)*43758.5453123;return n-Math.floor(n);};
const normalize=(p:Point):Point=>{const d=Math.hypot(p.x,p.y);return d>.0001?{x:p.x/d,y:p.y/d}:{x:1,y:0};};
function cubic(a:Point,b:Point,c:Point,d:Point,p:number):Point{
 const q=1-p;return {x:q*q*q*a.x+3*q*q*p*b.x+3*q*p*p*c.x+p*p*p*d.x,y:q*q*q*a.y+3*q*q*p*b.y+3*q*p*p*c.y+p*p*p*d.y};
}

/** A broad pass through the artboard bends back onto the actual first-stroke tangent. */
export function prepareCometFlight(start:Point,direction:Point,width:number,height:number,index:number):CometFlight{
 const unit=Math.min(width,height)/1080,side=index===1?-1:1,tangent=normalize(direction);
 const entry={x:side===1?-width*.12:width*1.12,y:clamp(start.y-height*.30,height*.14,height*.68)};
 const turn={x:clamp(start.x+side*width*.40,width*.25,width*.79),y:clamp(start.y-height*.12,height*.20,height*.72)};
 const handle={x:side*width*.13,y:height*.15},approach=Math.min(width*.19,height*.20);
 const controls=[
  [entry,{x:entry.x+side*width*.36,y:entry.y-height*.17},{x:turn.x-handle.x,y:turn.y-handle.y},turn],
  [turn,{x:turn.x+handle.x,y:turn.y+handle.y},{x:start.x-tangent.x*approach,y:start.y-tangent.y*approach},start],
 ];
 const points:FlightPoint[]=[];let length=0;
 for(const [a,b,c,d] of controls)for(let i=points.length?1:0;i<=96;i++){
  const p=cubic(a,b,c,d,i/96),previous=points.at(-1);if(previous)length+=Math.hypot(p.x-previous.x,p.y-previous.y);points.push({...p,distance:length});
 }
 return {points,length,unit};
}

export function cometFlightPoint(flight:CometFlight,progress:number):Point{
 const p=clamp(progress),travel=1-(1-p)**1.85,target=travel*flight.length,points=flight.points;
 let lo=0,hi=points.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(points[mid].distance<target)lo=mid;else hi=mid;}
 const a=points[lo],b=points[hi],u=clamp((target-a.distance)/Math.max(.0001,b.distance-a.distance));return {x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u)};
}

function ribbonPath(points:readonly TrailPoint[],scale:number,offset=0):Path2D{
 const path=new Path2D(),left:Point[]=[],right:Point[]=[];
 for(let i=0;i<points.length;i++){
  const previous=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],direction=normalize({x:next.x-previous.x,y:next.y-previous.y}),n={x:-direction.y,y:direction.x},p=points[i],u=i/Math.max(1,points.length-1),shift=Math.sin(Math.PI*u)*offset;
  left.push({x:p.x+n.x*(p.width*scale+shift),y:p.y+n.y*(p.width*scale+shift)});right.push({x:p.x+n.x*(-p.width*scale+shift),y:p.y+n.y*(-p.width*scale+shift)});
 }
 if(!left.length)return path;
 path.moveTo(left[0].x,left[0].y);for(const p of left.slice(1))path.lineTo(p.x,p.y);for(const p of right.reverse())path.lineTo(p.x,p.y);path.closePath();return path;
}

function paintRibbon(context:CanvasRenderingContext2D,points:readonly TrailPoint[],color:string,width:number,alpha:number,blur:number,offset=0):void{
 if(points.length<2||alpha<=0)return;
 context.save();context.fillStyle=color;context.shadowColor=color;context.shadowBlur=blur;context.globalAlpha=alpha;context.fill(ribbonPath(points,width,offset));context.restore();
}
function star(context:CanvasRenderingContext2D,p:Point,r:number,color:string,alpha:number):void{
 if(r<=0||alpha<=0)return;
 context.save();context.translate(p.x,p.y);context.fillStyle=color;context.shadowColor=color;context.shadowBlur=r*3;context.globalAlpha=alpha;context.beginPath();context.moveTo(-r*1.7,0);context.quadraticCurveTo(0,0,0,-r*2.2);context.quadraticCurveTo(0,0,r*1.7,0);context.quadraticCurveTo(0,0,0,r*2.2);context.quadraticCurveTo(0,0,-r*1.7,0);context.fill();context.restore();
}

export function drawCometHeadArtwork(context:CanvasRenderingContext2D,accent:string,light:string):void{
 context.fillStyle=accent;context.shadowColor=accent;context.shadowBlur=34;context.beginPath();context.moveTo(22,0);context.quadraticCurveTo(8,-24,-40,-9);context.quadraticCurveTo(-57,0,-40,9);context.quadraticCurveTo(8,24,22,0);context.fill();
 context.fillStyle=light;context.shadowColor=light;context.shadowBlur=13;context.beginPath();context.moveTo(17,0);context.quadraticCurveTo(5,-12,-25,-5);context.quadraticCurveTo(-37,0,-25,5);context.quadraticCurveTo(5,12,17,0);context.fill();
}
export {star as drawCometStarArtwork};

/** The same head and trailing ribbon continue over the entry-to-writing handoff. */
export function drawCometIntro(context:CanvasRenderingContext2D,flight:CometFlight,time:number,lead:number,writingEnd:number,color:string,penAt:(time:number)=>CometPen):void{
 if(time<=0||time>writingEnd)return;
 const {unit}=flight,handoff=Math.min(.30,Math.max(.06,(writingEnd-lead)*.22)),bridge=ease((time-lead)/handoff),visibility=ease(time/.055)*(1-ease((time-writingEnd+.12)/.12));if(visibility<=0)return;
 const position=(at:number):CometPen=>at<lead?{point:cometFlightPoint(flight,at/lead),stroke:'entry',visible:at>=0,radius:2*unit}:penAt(at);
 const head=position(time),tailSeconds=lerp(Math.min(.43,lead*.62),.09,bridge),segments:TrailPoint[][]=[];
 let segment:TrailPoint[]=[],previousStroke:string|undefined;
 for(let i=0;i<=64;i++){
  const u=i/64,at=time-tailSeconds*(1-u),p=position(at),stroke=p.stroke==='entry'?penAt(lead).stroke:p.stroke;
  if(!p.visible||(previousStroke!==undefined&&previousStroke!==stroke)){if(segment.length>1)segments.push(segment);segment=[];}
  previousStroke=stroke;if(!p.visible)continue;
  const breadth=lerp(12.5*unit,Math.max(.7*unit,p.radius*.55),bridge),taper=Math.sin(u*Math.PI/2)**1.2;
  segment.push({...p.point,width:breadth*taper});
 }
 if(segment.length>1)segments.push(segment);
 const accent=mix(color,'#59dfff',.58),light=mix(color,'#ffffff',.88),edge=mix(color,'#216baa',.65);
 for(const points of segments){
  paintRibbon(context,points,accent,2.8,visibility*.15,32*unit);
  paintRibbon(context,points,edge,1.16,visibility*.62,0);
  paintRibbon(context,points,accent,1,visibility*.95,13*unit);
  paintRibbon(context,points,light,.30,visibility,4*unit);
  if(bridge<1){paintRibbon(context,points,mix(color,'#c5afff',.48),.22,visibility*(1-bridge)*.72,8*unit,18*unit*(1-bridge));paintRibbon(context,points,light,.11,visibility*(1-bridge)*.75,4*unit,-13*unit*(1-bridge));}
 }
 // These fragments retain their birth position while drifting away from the flight.
 for(let i=0;i<20;i++){
  const birth=(i+.4)/20*lead*.88,age=time-birth,lifetime=.24+noise(i+7)*.26;if(age<=0||age>=lifetime)continue;
  const p=cometFlightPoint(flight,birth/lead),next=cometFlightPoint(flight,Math.min(1,birth/lead+.008)),direction=normalize({x:next.x-p.x,y:next.y-p.y}),side=i%2?1:-1,drift=(8+noise(i+2)*38)*unit*age/lifetime,alpha=Math.sin(Math.PI*age/lifetime)*visibility;
  star(context,{x:p.x-direction.y*drift*side,y:p.y+direction.x*drift*side},(2.3+noise(i+5)*3)*unit*(1-age/lifetime),i%3?light:accent,alpha*.8);
 }
 if(!head.visible)return;
 const previous=position(Math.max(0,time-.008)).point,direction=normalize({x:head.point.x-previous.x,y:head.point.y-previous.y}),angle=Math.atan2(direction.y,direction.x),size=lerp(1,Math.max(.07,head.radius/(18*unit)),bridge);
 context.save();context.translate(head.point.x,head.point.y);context.rotate(angle);context.scale(unit*size,unit*size);context.globalAlpha=visibility;
 drawCometHeadArtwork(context,accent,light);context.restore();
 const flare=(1-bridge)*Math.sin(Math.PI*clamp(time/Math.max(.001,lead)))*visibility;star(context,head.point,11*unit*(1-bridge),light,flare*.72);
}
