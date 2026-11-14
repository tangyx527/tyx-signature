import {appendCapsules,type InkSample} from './brush-engine';
import type {MotionGeometry,VariantInk} from './motion-variants';
import {canvasGradient,blendGradient,type LinearGradientPaint} from './gradient';

export type RibbonSample=InkSample&{z:number;left?:{x:number;y:number};right?:{x:number;y:number}};
export type AuthoredRibbon={id:number;color:string;samples:readonly RibbonSample[];weight:number;shade?:number};
export function ribbonFaceColor(ribbon:AuthoredRibbon):string{
 const shade=Math.max(0,Math.min(1,ribbon.shade??1));if(shade===1)return ribbon.color;
 return '#'+[1,3,5].map(i=>Math.round(parseInt(ribbon.color.slice(i,i+2),16)*shade).toString(16).padStart(2,'0')).join('');
}
export function appendRibbonSegment(path:Path2D,a:RibbonSample,b:RibbonSample):void{
 if(a.left&&a.right&&b.left&&b.right){path.moveTo(a.left.x,a.left.y);path.lineTo(b.left.x,b.left.y);path.lineTo(b.right.x,b.right.y);path.lineTo(a.right.x,a.right.y);path.closePath();}
 else appendCapsules(path,[a,b]);
}
export function appendRibbonPath(path:Path2D,ribbon:AuthoredRibbon):void{
 if(ribbon.samples.some(q=>q.left&&q.right)){for(let k=1;k<ribbon.samples.length;k++)appendRibbonSegment(path,ribbon.samples[k-1],ribbon.samples[k]);}
 else appendCapsules(path,ribbon.samples);
}

type Allocation={ribbon:AuthoredRibbon;start:number;end:number};
type Cut={distance:number;before:number;after:number;local:number};
type Paint={path:Path2D;color:string;gradient?:LinearGradientPaint;glowColor:string;glowStrength:number;glowRadius:number;depth:number;count:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const u=clamp(n);return u*u*(3-2*u);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const mix=(a:string,b:string,t:number)=>t<=0?a:t>=1?b:'#'+[1,3,5].map(i=>Math.round(lerp(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),t)).toString(16).padStart(2,'0')).join('');

function paint(ctx:CanvasRenderingContext2D,entry:Paint):void{
 ctx.save();
 const alpha=ctx.globalAlpha;
 if(entry.glowStrength>0){
  ctx.fillStyle=entry.glowColor;ctx.shadowColor=entry.glowColor;ctx.shadowBlur=entry.glowRadius;ctx.globalAlpha=alpha*entry.glowStrength*.43;ctx.fill(entry.path);
  ctx.shadowBlur=entry.glowRadius*.25;ctx.globalAlpha=alpha*entry.glowStrength*.19;ctx.fill(entry.path);
 }
 ctx.shadowBlur=0;ctx.globalAlpha=alpha;ctx.fillStyle=entry.gradient?canvasGradient(ctx,entry.gradient):entry.color;ctx.fill(entry.path);ctx.restore();
}

/** Global source arc intervals become weighted, consecutive parts of the target ribbons. */
export function drawInkRibbonHandoff(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],ribbons:readonly AuthoredRibbon[],p:number,geometry:MotionGeometry):void{
 const progress=Number.isFinite(p)?clamp(p):0;if(progress>=.28||!inks.some(ink=>ink.samples.length>0))return;
 const contraction=ease((progress-.07)/.15),anticipation=1+.035*Math.sin(Math.PI*clamp(progress/.07)),scale=lerp(anticipation,.045,contraction),morph=ease((progress-.16)/.10);
 const active=ribbons.filter(ribbon=>ribbon.samples.length>0),weights=active.map(ribbon=>Number.isFinite(ribbon.weight)&&ribbon.weight>0?ribbon.weight:1),weightTotal=weights.reduce((sum,weight)=>sum+weight,0)||1;
 let weightCursor=0;
 const allocations:Allocation[]=active.map((ribbon,index)=>{const start=weightCursor/weightTotal;weightCursor+=weights[index];return {ribbon,start,end:index===active.length-1?1:weightCursor/weightTotal};});
 const paints=new Map<string,Paint>();
 const sourcePaint=(ink:VariantInk,key:string,color:string,depth=0,gradientTarget=color):Paint=>{
  let entry=paints.get(key);
  if(!entry){entry={path:new Path2D(),color,gradient:ink.gradient?blendGradient(ink.gradient,gradientTarget,morph,point=>({x:geometry.center.x+(point.x-geometry.center.x)*scale+(point.y-geometry.center.y)*scale*.18*pull,y:geometry.center.y+(point.y-geometry.center.y)*scale*flatten})):undefined,glowColor:ink.glowColor,glowStrength:ink.glowStrength*(1-morph),glowRadius:ink.glowRadius*scale*(1-morph),depth:0,count:0};paints.set(key,entry);}
  entry.depth+=depth;entry.count++;return entry;
 };
 const pull=ease((progress-.10)/.12),flatten=1-.68*pull;
 const contract=(sample:InkSample):InkSample=>scale===1&&pull===0?sample:{...sample,x:geometry.center.x+(sample.x-geometry.center.x)*scale+(sample.y-geometry.center.y)*scale*.18*pull,y:geometry.center.y+(sample.y-geometry.center.y)*scale*flatten,radius:sample.radius*scale*Math.sqrt(flatten)};

 if(morph<=0||!allocations.length){
  // p=0 uses the exact incoming samples, paint groups and two glow passes.
  for(const ink of inks){
   if(!ink.samples.length)continue;
   const entry=sourcePaint(ink,ink.paintKey,ink.color);
   appendCapsules(entry.path,scale===1?ink.samples:ink.samples.map(contract));
  }
 }else if(morph>=1){
  // Use the parent's same local faces and ordering throughout the final overlap.
  const panels=allocations.flatMap(({ribbon})=>ribbon.samples.slice(0,-1).map((a,k)=>({color:ribbonFaceColor(ribbon),a,b:ribbon.samples[k+1],z:(a.z+ribbon.samples[k+1].z)/2}))).sort((a,b)=>a.z-b.z);
  ctx.save();ctx.shadowBlur=0;
  for(const panel of panels){const path=new Path2D();appendRibbonSegment(path,panel.a,panel.b);ctx.fillStyle=panel.color;ctx.fill(path);}
  ctx.restore();return;
 }else{
  const lengths=inks.map(ink=>{
   if(!ink.samples.length)return 0;
   let length=0;for(let i=1;i<ink.samples.length;i++)length+=Math.hypot(ink.samples[i].x-ink.samples[i-1].x,ink.samples[i].y-ink.samples[i-1].y);
   return Math.max(.001,length);
  }),total=lengths.reduce((sum,length)=>sum+length,0)||1;
  const cuts:Cut[]=[];
  allocations.forEach((allocation,index)=>{
   const last=allocation.ribbon.samples.length-1;
   // Keep every target knot: the nearly completed handoff cannot shortcut a curved tip.
   for(let k=1;k<last;k++)cuts.push({distance:(allocation.start+(allocation.end-allocation.start)*k/last)*total,before:index,after:index,local:k/last});
   if(index<allocations.length-1)cuts.push({distance:allocation.end*total,before:index,after:index+1,local:1});
  });
  type ProjectedSample=RibbonSample&{roundRadius?:number};
  const sourceNormal=(ink:VariantInk,u:number):{x:number;y:number}=>{
   const list=ink.samples;if(list.length<2)return {x:0,y:1};
   let low=0,high=list.length-1;
   while(low<high){const middle=(low+high)>>>1;if(list[middle].u<u)low=middle+1;else high=middle;}
   const exact=Math.abs(list[low].u-u)<1e-9;
   const before=contract(list[Math.max(0,low-1)]),after=contract(list[Math.min(list.length-1,low+(exact?1:0))]);
   const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy);
   return length>1e-9?{x:-dy/length,y:dx/length}:{x:0,y:1};
  };
  const project=(ink:VariantInk,sample:InkSample,index:number,local:number):ProjectedSample=>{
   const ribbon=allocations[index].ribbon,at=clamp(local)*(ribbon.samples.length-1),a=Math.floor(at),b=Math.min(ribbon.samples.length-1,a+1),t=at-a,from=contract(sample),left=ribbon.samples[a],right=ribbon.samples[b];
   const projected:ProjectedSample={...sample,x:lerp(from.x,lerp(left.x,right.x,t),morph),y:lerp(from.y,lerp(left.y,right.y,t),morph),radius:lerp(from.radius,lerp(left.radius,right.radius,t),morph),z:lerp(left.z,right.z,t)*morph};
   if(left.left&&left.right&&right.left&&right.right){
    // Take the source section from the same contracted circular ink as the unchanged p=0 branch.
    const normal=sourceNormal(ink,sample.u),targetLeft={x:lerp(left.left.x,right.left.x,t),y:lerp(left.left.y,right.left.y,t)},targetRight={x:lerp(left.right.x,right.right.x,t),y:lerp(left.right.y,right.right.y,t)};
    const before=ribbon.samples[Math.max(0,a-1)],after=ribbon.samples[Math.min(ribbon.samples.length-1,b+1)];
    const handedness=(after.x-before.x)*(targetLeft.y-(targetLeft.y+targetRight.y)/2)-(after.y-before.y)*(targetLeft.x-(targetLeft.x+targetRight.x)/2)<0?-1:1;
    const nx=normal.x*from.radius*handedness,ny=normal.y*from.radius*handedness;
    projected.left={x:lerp(from.x+nx,targetLeft.x,morph),y:lerp(from.y+ny,targetLeft.y,morph)};
    projected.right={x:lerp(from.x-nx,targetRight.x,morph),y:lerp(from.y-ny,targetRight.y,morph)};
    projected.roundRadius=projected.radius*(1-morph);
   }
   return projected;
  };
  const append=(ink:VariantInk,index:number,samples:readonly ProjectedSample[])=>{
   if(!samples.length)return;
   const ribbon=allocations[index].ribbon,entry=sourcePaint(ink,ribbon.id+'/'+ink.paintKey,mix(ink.color,ribbonFaceColor(ribbon),morph),samples.reduce((sum,sample)=>sum+sample.z,0)/samples.length,ribbonFaceColor(ribbon));
   if(samples.every(sample=>sample.left&&sample.right)){
    for(let k=1;k<samples.length;k++){
     const a=samples[k-1],b=samples[k],al=a.left!,ar=a.right!,bl=b.left!,br=b.right!;
     const area=al.x*bl.y-bl.x*al.y+bl.x*br.y-br.x*bl.y+br.x*ar.y-ar.x*br.y+ar.x*al.y-al.x*ar.y;
     // Capsule disks wind clockwise. Match that winding so the single fill is a union, never a hole.
     const face=area>0?[ar,br,bl,al]:[al,bl,br,ar];
     entry.path.moveTo(face[0].x,face[0].y);for(let i=1;i<4;i++)entry.path.lineTo(face[i].x,face[i].y);entry.path.closePath();
    }
    appendCapsules(entry.path,samples.map(sample=>({...sample,radius:sample.roundRadius??0})));
   }else appendCapsules(entry.path,samples);
  };
  let cursor=0;
  for(let j=0;j<inks.length;j++){
   const ink=inks[j];if(!ink.samples.length)continue;
   let index=0;while(index<allocations.length-1&&cursor>=allocations[index].end*total)index++;
   let cutIndex=0;while(cutIndex<cuts.length&&cuts[cutIndex].distance<=cursor)cutIndex++;
   let distance=cursor,part:ProjectedSample[]=[project(ink,ink.samples[0],index,(cursor/total-allocations[index].start)/(allocations[index].end-allocations[index].start))];
   for(let k=1;k<ink.samples.length;k++){
    const previous=ink.samples[k-1],sample=ink.samples[k],start=distance;
    distance+=Math.hypot(sample.x-previous.x,sample.y-previous.y);
    while(cutIndex<cuts.length&&cuts[cutIndex].distance<=distance){
     const cut=cuts[cutIndex++],t=clamp((cut.distance-start)/Math.max(Number.EPSILON,distance-start)),boundary:InkSample={x:lerp(previous.x,sample.x,t),y:lerp(previous.y,sample.y,t),radius:lerp(previous.radius,sample.radius,t),u:lerp(previous.u,sample.u,t)};
     part.push(project(ink,boundary,cut.before,cut.local));
     if(cut.before!==cut.after){
      append(ink,cut.before,part);index=cut.after;part=[project(ink,boundary,index,0)];
     }
    }
    part.push(project(ink,sample,index,(distance/total-allocations[index].start)/(allocations[index].end-allocations[index].start)));
   }
   append(ink,index,part);cursor+=lengths[j];
  }
 }

 const entries=[...paints.values()];
 if(morph>0)entries.sort((a,b)=>a.depth/Math.max(1,a.count)-b.depth/Math.max(1,b.count));
 // The handoff stays opaque; the same full target ribbons overlay it from .22 to .28.
 for(const entry of entries)paint(ctx,entry);
}
