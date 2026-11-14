import {sampleCubic,type Curve,type Point} from '../src/geometry';
import type {ReferenceDecorationPath} from './reference-decorations';

export type Cubic=readonly [number,number,number,number,number,number,number,number];

/** Keep disconnected pen marks in separate paths. */
export function curve(...segments:Cubic[]):Curve{
  const points:Curve['points']=[];
  let length=0;
  for(const segment of segments){
    const sampled=sampleCubic(
      {x:segment[0],y:segment[1]},{x:segment[2],y:segment[3]},
      {x:segment[4],y:segment[5]},{x:segment[6],y:segment[7]},40,
    );
    for(const point of sampled.points){
      const previous=points.at(-1),distance=previous?Math.hypot(point.x-previous.x,point.y-previous.y):0;
      if(previous&&distance<1e-8)continue;
      length+=distance;
      points.push({x:point.x,y:point.y,length});
    }
  }
  return {points,length};
}

export function oval(x:number,y:number,rx:number,ry:number,degrees=0):Curve{
  const k=.55228475;
  const result=curve(
    [rx,0,rx,k*ry,k*rx,ry,0,ry],
    [0,ry,-k*rx,ry,-rx,k*ry,-rx,0],
    [-rx,0,-rx,-k*ry,-k*rx,-ry,0,-ry],
    [0,-ry,k*rx,-ry,rx,-k*ry,rx,0],
  );
  const angle=degrees*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  return {...result,points:result.points.map(point=>({x:x+point.x*cos-point.y*sin,y:y+point.x*sin+point.y*cos,length:point.length}))};
}

export function polygon(vertices:readonly Point[]):Curve{
  const points:Curve['points']=[];
  let length=0;
  for(const point of vertices.length?[...vertices,vertices[0]]:[]){
    const previous=points.at(-1);
    if(previous)length+=Math.hypot(point.x-previous.x,point.y-previous.y);
    points.push({...point,length});
  }
  return {points,length};
}

export const line=(id:string,width:number,...segments:Cubic[]):ReferenceDecorationPath=>({id,width,profile:'round',curve:curve(...segments)});
export const shape=(id:string,path:Curve,color?:string):ReferenceDecorationPath=>({id,width:6,profile:'round',curve:path,filled:true,...(color?{color}:{})});
export const eye=(id:string,x:number,y:number,width=9):ReferenceDecorationPath=>({id,width,profile:'round',eye:{x,y}});
export const pink='#F5AFC7',blue='#A3D8ED';
