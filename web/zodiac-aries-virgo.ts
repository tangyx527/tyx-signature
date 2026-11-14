import type {ReferenceDecorationPath} from './reference-decorations';
import {line,oval} from './ornament-drawing';

const ring=(id:string,x:number,y:number,rx:number,ry=rx,width=8):ReferenceDecorationPath=>({
  id,width,profile:'round',curve:oval(x,y,rx,ry),
});

/** Rounded zodiac pen paths; every mark inherits the signature ink and glow. */
export const zodiacAriesVirgoPaths:Record<string,ReferenceDecorationPath[]>={
  'zodiac-aries':[
    line('left-horn',8.2,
      [0,43,0,4,-9,-33,-25,-38],
      [-25,-38,-41,-44,-50,-25,-39,-11],
    ),
    line('right-horn',8.2,
      [0,43,0,4,9,-33,25,-38],
      [25,-38,41,-44,50,-25,39,-11],
    ),
  ],
  'zodiac-taurus':[
    line('left-horn',8.2,
      [-39,-41,-29,-41,-29,-24,-18,-17],
      [-18,-17,-13,-13,-6,-12,0,-12],
    ),
    line('right-horn',8.2,
      [0,-12,6,-12,13,-13,18,-17],
      [18,-17,29,-24,29,-41,39,-41],
    ),
    ring('head-ring',0,15,27,27,8.2),
  ],
  'zodiac-gemini':[
    line('top-arch',8,
      [-39,-39,-16,-29,16,-29,39,-39],
    ),
    line('left-column',8,[-19,-32,-19,-13,-19,13,-19,32]),
    line('right-column',8,[19,-32,19,-13,19,13,19,32]),
    line('bottom-arch',8,
      [-39,39,-16,29,16,29,39,39],
    ),
  ],
  'zodiac-cancer':[
    ring('upper-ring',-28,-10,13,13,8),
    line('upper-sweep',8,
      [-28,-23,-8,-40,20,-38,39,-18],
    ),
    ring('lower-ring',28,10,13,13,8),
    line('lower-sweep',8,
      [28,23,8,40,-20,38,-39,18],
    ),
  ],
  'zodiac-leo':[
    ring('left-ring',-26,18,14,14,8.2),
    line('mane-and-tail',8.2,
      [-16,8,-19,-1,-26,-19,-15,-33],
      [-15,-33,-2,-49,19,-42,22,-25],
      [22,-25,27,-6,6,10,9,29],
      [9,29,11,44,25,46,34,37],
    ),
  ],
  'zodiac-virgo':[
    line('left-entry-stem',8,
      [-42,-36,-36,-34,-34,-27,-34,-18],
      [-34,-18,-34,-2,-34,14,-34,28],
    ),
    line('first-arch-stem',8,
      [-34,-14,-34,-41,-11,-47,-10,-16],
      [-10,-16,-10,-2,-10,14,-10,28],
    ),
    line('second-arch-tail',8,
      [-10,-14,-9,-41,13,-46,14,-15],
      [14,-15,14,3,12,28,27,42],
    ),
    line('right-loop-crossing',8,
      [14,-6,22,-26,43,-21,39,-2],
      [39,-2,36,16,19,32,2,39],
    ),
  ],
};
