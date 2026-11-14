import {referenceDropletOutline,referenceBubbleOutline,type ReferencePoint} from './particle-reference';

/** The exact local particle painter used by the classic entry and by native abstract exits. */
export function drawClassicEntryParticle(ctx:CanvasRenderingContext2D,kind:string,options:{radius:number;color:string;opacity?:number;aspect?:number;fill?:number;outline?:readonly ReferencePoint[]}):void{
 const {radius,color,opacity=1,aspect=1,fill=0}=options;
 ctx.fillStyle=color;ctx.strokeStyle=color;
 const contour=(points:readonly ReferencePoint[])=>{ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];if(i)ctx.lineTo(p.x*radius,p.y*radius*aspect);else ctx.moveTo(p.x*radius,p.y*radius*aspect);}ctx.closePath();};
 if(kind==='ring'){
  contour(referenceBubbleOutline);ctx.lineWidth=Math.max(.7,radius*.14);ctx.globalAlpha=opacity*(1-fill*.45);ctx.stroke();
  if(fill>0){ctx.globalAlpha=opacity*fill;ctx.fill();}
 }else if(kind==='sparkle'){
  ctx.beginPath();ctx.moveTo(-radius,0);ctx.quadraticCurveTo(0,0,0,-radius*1.6);ctx.quadraticCurveTo(0,0,radius,0);ctx.quadraticCurveTo(0,0,0,radius*1.6);ctx.quadraticCurveTo(0,0,-radius,0);ctx.fill();
 }else{
  contour(options.outline??referenceDropletOutline);ctx.fill();ctx.globalAlpha=opacity*.80;ctx.shadowBlur=radius*.5;ctx.fillStyle='#fbffff';ctx.beginPath();ctx.arc(-radius*.18,-radius*.21,radius*.36,0,Math.PI*2);ctx.fill();
 }
}
