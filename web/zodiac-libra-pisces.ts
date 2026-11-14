import type {Curve,Point} from '../src/geometry';
import type {ReferenceDecorationPath} from './reference-decorations';
import {line,oval} from './ornament-drawing';

function openPolyline(vertices:readonly Point[]):Curve{
  let length=0;
  const points=vertices.map((point,index)=>{
    const previous=vertices[index-1];
    if(previous)length+=Math.hypot(point.x-previous.x,point.y-previous.y);
    return {...point,length};
  });
  return {points,length};
}
const stroke=(id:string,vertices:readonly Point[],width=8):ReferenceDecorationPath=>({
  id,width,profile:'round',curve:openPolyline(vertices),
});

/** Round, open pen paths for the six symbols from Libra through Pisces. */
export const zodiacLibraPiscesPaths:Record<string,ReferenceDecorationPath[]>={
  'zodiac-libra':[
    line('balance-arch',8.2,
      [-44,12,-36,12,-25,12,-18,12],
      [-18,12,-35,-11,-18,-30,0,-30],
      [0,-30,18,-30,35,-11,18,12],
      [18,12,25,12,36,12,44,12],
    ),
    line('balance-base',8.2,[-44,34,-18,34,18,34,44,34]),
  ],
  'zodiac-scorpio':[
    line('left-stem',8,
      [-40,-33,-33,-33,-30,-26,-30,-18],
      [-30,-18,-30,-6,-30,11,-30,23],
    ),
    line('middle-hump',8,
      [-30,-18,-30,-42,-8,-43,-8,-18],
      [-8,-18,-8,-5,-8,12,-8,23],
    ),
    line('right-hump-tail',8,
      [-8,-18,-8,-43,14,-43,14,-18],
      [14,-18,14,-8,13,3,14,13],
      [14,13,14,31,25,35,44,26],
    ),
    stroke('arrow-head',[
      {x:35,y:17},{x:48,y:26},{x:37,y:36},
    ],7.8),
  ],
  'zodiac-sagittarius':[
    line('arrow-shaft',8.2,[-40,40,-16,16,9,-9,33,-36]),
    stroke('arrow-head',[
      {x:3,y:-36},{x:33,y:-36},{x:33,y:-6},
    ],8.2),
    line('crossbar',8.2,[-30,6,-22,14,-14,21,-6,29]),
  ],
  'zodiac-capricorn':[
    line('left-stem',8,
      [-43,-37,-32,-38,-27,-28,-27,-16],
      [-27,-16,-27,-8,-27,0,-27,8],
    ),
    line('arching-stem-tail',8,
      [-27,-9,-24,-20,-13,-39,-5,-38],
      [-5,-38,3,-38,3,-18,5,-3],
      [5,-3,7,8,8,18,4,27],
      [4,27,0,37,-9,39,-18,38],
    ),
    line('loop-join',8,[6,13,13,3,22,-1,31,1]),
    {id:'right-loop',width:8,profile:'round',curve:oval(28,17,16,15)},
  ],
  'zodiac-aquarius':[
    stroke('upper-wave',[
      {x:-44,y:-7},{x:-25,y:-23},{x:-12,y:-7},
      {x:6,y:-23},{x:19,y:-7},{x:36,y:-23},{x:46,y:-9},
    ],8.2),
    stroke('lower-wave',[
      {x:-44,y:27},{x:-25,y:11},{x:-12,y:27},
      {x:6,y:11},{x:19,y:27},{x:36,y:11},{x:46,y:25},
    ],8.2),
  ],
  'zodiac-pisces':[
    line('left-fish-arc',8.2,[-28,-39,-6,-18,-6,18,-28,39]),
    line('right-fish-arc',8.2,[28,-39,6,-18,6,18,28,39]),
    line('joining-bar',8.2,[-30,0,-12,0,12,0,30,0]),
  ],
};
