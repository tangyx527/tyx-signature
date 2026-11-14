import {z} from 'zod';
import type {Box,Point} from '../src/geometry';

const stopSchema=z.object({offset:z.number().finite().min(0).max(1),color:z.string().regex(/^#[\da-f]{6}$/i,'请选择有效的渐变颜色')}).strict();
export const gradientSchema=z.object({enabled:z.boolean(),angle:z.number().finite().min(0).max(360),stops:z.array(stopSchema).min(2).max(5)}).strict();
export type GradientConfig=z.infer<typeof gradientSchema>;
export type LinearGradientPaint={from:Point;to:Point;stops:GradientConfig['stops']};

export function defaultGradient(color:string):GradientConfig{return {enabled:true,angle:90,stops:[{offset:0,color},{offset:1,color:color.toLowerCase()==='#a78bfa'?'#0BEABD':'#A78BFA'}]};}
export function sortedGradientStops(gradient:Pick<GradientConfig,'stops'>):GradientConfig['stops']{return [...gradient.stops].sort((a,b)=>a.offset-b.offset);}
export function gradientCss(gradient:GradientConfig):string{return `linear-gradient(${gradient.angle}deg, ${sortedGradientStops(gradient).map(stop=>`${stop.color} ${stop.offset*100}%`).join(', ')})`;}

/** CSS-style direction across the full, fixed bounds; partial handwriting never changes it. */
export function gradientPaint(gradient:GradientConfig,bounds:Box,transform:(point:Point)=>Point=point=>point):LinearGradientPaint{
 const radians=gradient.angle*Math.PI/180,dx=Math.sin(radians),dy=-Math.cos(radians),span=Math.max(.000001,Math.abs(dx)*(bounds.maxX-bounds.minX)+Math.abs(dy)*(bounds.maxY-bounds.minY)),cx=(bounds.minX+bounds.maxX)/2,cy=(bounds.minY+bounds.maxY)/2;
 return transformGradient({from:{x:cx-dx*span/2,y:cy-dy*span/2},to:{x:cx+dx*span/2,y:cy+dy*span/2},stops:sortedGradientStops(gradient)},transform);
}
/** Preserve each source point's color parameter under affine flattening and shear. */
export function transformGradient(paint:LinearGradientPaint,transform:(point:Point)=>Point):LinearGradientPaint{
 const origin=transform({x:0,y:0}),x=transform({x:1,y:0}),y=transform({x:0,y:1}),a=x.x-origin.x,b=x.y-origin.y,c=y.x-origin.x,d=y.y-origin.y,det=a*d-b*c;
 const vx=paint.to.x-paint.from.x,vy=paint.to.y-paint.from.y,lengthSquared=vx*vx+vy*vy;
 if(Math.abs(det)<1e-14||lengthSquared<1e-20)return {...paint,from:transform(paint.from),to:transform(paint.to)};
 // A gradient is a scalar field. Its normal transforms by A^-T, rather than A.
 const nx=(d*vx-b*vy)/det/lengthSquared,ny=(-c*vx+a*vy)/det/lengthSquared,normalSquared=nx*nx+ny*ny,center=transform({x:(paint.from.x+paint.to.x)/2,y:(paint.from.y+paint.to.y)/2}),dx=nx/normalSquared/2,dy=ny/normalSquared/2;
 return {...paint,from:{x:center.x-dx,y:center.y-dy},to:{x:center.x+dx,y:center.y+dy}};
}
export function canvasGradient(context:CanvasRenderingContext2D,paint:LinearGradientPaint):CanvasGradient{
 const gradient=context.createLinearGradient(paint.from.x,paint.from.y,paint.to.x,paint.to.y);
 for(const stop of paint.stops)gradient.addColorStop(stop.offset,stop.color);
 return gradient;
}
export function mixHex(a:string,b:string,amount:number):string{
 const u=Math.max(0,Math.min(1,amount));if(u<=0)return a;if(u>=1)return b;
 return '#'+[1,3,5].map(index=>Math.round(parseInt(a.slice(index,index+2),16)*(1-u)+parseInt(b.slice(index,index+2),16)*u).toString(16).padStart(2,'0')).join('');
}
export function blendGradient(paint:LinearGradientPaint,color:string,amount:number,transform:(point:Point)=>Point=point=>point):LinearGradientPaint{
 return {...transformGradient(paint,transform),stops:paint.stops.map(stop=>({offset:stop.offset,color:mixHex(stop.color,color,amount)}))};
}
