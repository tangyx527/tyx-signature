import type {Point} from '../src/geometry';
import {ornatePresets,isOrnatePreset,type OrnatePreset,type OrnateFrame,type OrnateLayout,type OrnateRegion,type OrnateClock} from './ornate-types';
import {drawBotanicalCompanion,type BotanicalPreset} from './ornate-botanical';
import {drawMythicCompanion,type MythicPreset} from './ornate-mythic';
import {drawCelestialCompanion,type CelestialPreset} from './ornate-celestial';
import {outroBeat} from './outro-choreography';

type Profile={count:number;size:number;speed:number;trace:boolean};
const profiles:Record<OrnatePreset,Profile>={
 orbit:{count:2,size:38,speed:1.35,trace:true},bloom:{count:3,size:43,speed:.78,trace:true},
 'crystal-vine':{count:3,size:43,speed:.72,trace:true},butterfly:{count:1,size:88,speed:1.12,trace:false},
 lotus:{count:3,size:48,speed:.68,trace:true},umbrella:{count:3,size:45,speed:.92,trace:false},
 unicorn:{count:2,size:60,speed:.86,trace:true},snowflake:{count:3,size:38,speed:1.08,trace:true},
 wings:{count:2,size:64,speed:.83,trace:false},fan:{count:2,size:54,speed:.76,trace:true},
 dragon:{count:2,size:48,speed:1.28,trace:true},moon:{count:2,size:43,speed:1.05,trace:false},
 stellar:{count:2,size:42,speed:1.45,trace:true},petals:{count:3,size:43,speed:.88,trace:true},
};
const TAU=Math.PI*2,clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n)),lerp=(a:number,b:number,p:number)=>a+(b-a)*p;
const ease=(n:number)=>{const p=clamp(n);return p*p*(3-2*p);};
const noise=(n:number)=>{const v=Math.sin(n*127.1+43.7)*43758.5453123;return v-Math.floor(v);};
const mix=(a:string,b:string,p:number)=>'#'+[1,3,5].map(i=>Math.round(lerp(parseInt(a.slice(i,i+2),16)||0,parseInt(b.slice(i,i+2),16)||0,p)).toString(16).padStart(2,'0')).join('');
const signedPower=(n:number,p:number)=>Math.sign(n)*Math.abs(n)**p;

function drawElement(ctx:CanvasRenderingContext2D,id:OrnatePreset,frame:OrnateFrame,variant:number):void{
 if(id==='orbit'||id==='bloom'||id==='moon'||id==='stellar')drawCelestialCompanion(ctx,id as CelestialPreset,frame,variant);
 else if(id==='unicorn'||id==='wings'||id==='fan'||id==='dragon')drawMythicCompanion(ctx,id as MythicPreset,frame,variant);
 else drawBotanicalCompanion(ctx,id as BotanicalPreset,frame,variant);
}
function samplePath(points:readonly Point[],u:number):Point{
 const at=clamp(u)*(points.length-1),a=Math.floor(at),b=Math.min(points.length-1,a+1),p=at-a;return {x:lerp(points[a].x,points[b].x,p),y:lerp(points[a].y,points[b].y,p)};
}
function orbitPosition(region:OrnateRegion,layout:OrnateLayout,id:OrnatePreset,actor:number,time:number,unit:number):Point{
 const profile=profiles[id],seed=actor+region.index*37,n=noise(seed+41),direction=actor%2?1:-1,angle=time*profile.speed*direction+actor/profile.count*TAU+region.index*.7;
 const width=region.bounds.maxX-region.bounds.minX,height=region.bounds.maxY-region.bounds.minY,pad=(36+n*32)*unit;
 const rx=width/2+pad,ry=height/2+pad,cos=Math.cos(angle),sin=Math.sin(angle);
 let point={x:region.center.x+signedPower(cos,.72)*rx,y:region.center.y+signedPower(sin,.78)*ry+Math.sin(time*2.2+actor)*12*unit};
 if(id==='umbrella'||id==='wings'||id==='unicorn')point.y+=Math.sin(angle*2+actor)*18*unit;
 if(id==='butterfly'){point.x+=Math.sin(time*2.4+actor)*18*unit;point.y+=Math.cos(time*2.1+actor)*20*unit;}
 if(profile.trace&&actor%3===1&&region.paths.length){
  const index=(actor*11+region.index*3)%region.paths.length,progress=region.pathProgress[index]??1,path=region.paths[index],u=(Math.sin(time*(.82+n*.35)+actor*1.9)+1)/2*progress,p=samplePath(path,u),a=samplePath(path,Math.max(0,u-.025)),b=samplePath(path,Math.min(progress,u+.025)),length=Math.hypot(b.x-a.x,b.y-a.y)||1,side=actor%2?1:-1,follow=ease(progress/.22);
  const trace={x:p.x-(b.y-a.y)/length*(19+n*17)*unit*side,y:p.y+(b.x-a.x)/length*(19+n*17)*unit*side};point={x:lerp(point.x,trace.x,follow),y:lerp(point.y,trace.y,follow)};
 }
 const margin=profile.size*.63*unit+8*unit;return {x:clamp(point.x,margin,layout.width-margin),y:clamp(point.y,margin,layout.height-margin)};
}
function birthPoint(id:OrnatePreset,actor:number,layout:OrnateLayout,lead:number,seed:number):Point{
 const size=Math.min(layout.width*.76,layout.height*.78),scale=size/600,angle=actor*2.399+seed*.31;
 if(id==='butterfly'){const a=(actor%3)*TAU/3+lead*.48;return {x:layout.center.x+Math.cos(a)*173*scale,y:layout.height*.46+Math.sin(a)*137*scale};}
 const radius=id==='bloom'?actor%2?120:215:105+noise(actor+seed)*105;
 return {x:layout.center.x+Math.cos(angle)*radius*scale,y:layout.height*.46+Math.sin(angle)*radius*.75*scale};
}
function star(ctx:CanvasRenderingContext2D,p:Point,r:number,color:string,alpha:number):void{
 if(alpha<=0||r<=0)return;ctx.save();ctx.globalAlpha*=clamp(alpha);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=r*2.2;ctx.beginPath();ctx.moveTo(p.x-r*1.4,p.y);ctx.quadraticCurveTo(p.x,p.y,p.x,p.y-r*1.9);ctx.quadraticCurveTo(p.x,p.y,p.x+r*1.4,p.y);ctx.quadraticCurveTo(p.x,p.y,p.x,p.y+r*1.9);ctx.quadraticCurveTo(p.x,p.y,p.x-r*1.4,p.y);ctx.fill();ctx.restore();
}

/** Individual pieces migrate from the opening into each person's actual ink region. */
export function drawWritingCompanions(ctx:CanvasRenderingContext2D,intro:string,layout:OrnateLayout,clock:OrnateClock,layer:'back'|'front'):void{
 if(!isOrnatePreset(intro)||clock.lead<=0)return;
 const born=clock.lead-Math.min(.24,clock.lead*.3),age=clock.time-born;if(age<=0)return;
 const inOutro=clock.outroStart<clock.duration&&clock.time>=clock.outroStart,p=inOutro?clamp((clock.time-clock.outroStart)/(clock.duration-clock.outroStart)):0,ribbonExit=clock.outro!==undefined&&clock.outro!=='classic'&&clock.outro!=='none',exit=inOutro?(ribbonExit?ease((p-.07)/.15):outroBeat(p).collapse):0,opacity=ease(age/.18)*(1-ease((p-(ribbonExit?.17:.24))/(ribbonExit?.05:.08)));if(opacity<=0)return;
 const profile=profiles[intro],metadata=ornatePresets.find(item=>item.id===intro)!,seed=ornatePresets.findIndex(item=>item.id===intro)+1,unit=Math.min(layout.width,layout.height)/1080,spread=ease(age/.65),travel=clock.time-clock.lead;
 for(const region of layout.regions){
  const color=mix(region.color,metadata.accent,.62),frame:OrnateFrame={time:clock.time,phase:inOutro?'outro':'writing',progress:inOutro?p:spread,open:1,color,accent:metadata.accent};
  for(let i=0;i<profile.count;i++){
   const back=i>0&&i%3===0;if((layer==='back')!==back)continue;
   const base=orbitPosition(region,layout,intro,i,travel,unit),origin=birthPoint(intro,i,layout,clock.lead,seed),n=noise(i+region.index*31+seed*73);
   let point={x:lerp(origin.x,base.x,spread),y:lerp(origin.y,base.y,spread)};
   if(inOutro){const dx=point.x-layout.center.x,dy=point.y-layout.center.y,angle=exit*.45;point={x:layout.center.x+(dx*Math.cos(angle)-dy*Math.sin(angle))*(1-exit),y:layout.center.y+(dx*Math.sin(angle)+dy*Math.cos(angle))*(1-exit)};}
   const ahead=orbitPosition(region,layout,intro,i,travel+.025,unit),heading=Math.atan2(ahead.y-base.y,ahead.x-base.x),rotation=intro==='butterfly'?Math.sin(travel*2+i)*.27:heading+Math.PI/2+Math.sin(travel*1.3+i)*.16;
   const height=region.bounds.maxY-region.bounds.minY,size=clamp(height*.20,profile.size*.78*unit,profile.size*1.2*unit)*(.88+n*.24)*(1-exit*.86);
   ctx.save();ctx.globalAlpha*=opacity*(back?.70:.94);ctx.translate(point.x,point.y);ctx.rotate(rotation);ctx.scale(size/100,size/100);drawElement(ctx,intro,{...frame,time:frame.time+i*.17+region.index*.21},i);ctx.restore();
   if(layer==='front')for(let j=1;j<=1;j++){
    const trail=orbitPosition(region,layout,intro,i,travel-j*.045,unit),q={x:lerp(origin.x,trail.x,spread),y:lerp(origin.y,trail.y,spread)};
    const position=inOutro?{x:layout.center.x+(q.x-layout.center.x)*(1-exit),y:layout.center.y+(q.y-layout.center.y)*(1-exit)}:q;
    star(ctx,position,(1.8-j*.35)*unit*(1-exit*.8),mix(color,'#ffffff',.6),opacity*.22);
   }
  }
  // Loose glints drift over the complete signature perimeter, not a fixed corner.
  for(let i=0;i<7;i++){
   if((i%3===0)!==(layer==='back'))continue;
   const angle=i/7*TAU+travel*(i%2?.38:-.34),pulse=(travel*.4+noise(i+seed*17))%1,rx=(region.bounds.maxX-region.bounds.minX)/2+(18+noise(i+seed)*52)*unit,ry=(region.bounds.maxY-region.bounds.minY)/2+(20+noise(i+53)*40)*unit;
   const point={x:region.center.x+Math.cos(angle)*rx,y:region.center.y+Math.sin(angle)*ry},origin=birthPoint(intro,i,layout,clock.lead,seed),q={x:lerp(origin.x,point.x,spread),y:lerp(origin.y,point.y,spread)};
   const position=inOutro?{x:layout.center.x+(q.x-layout.center.x)*(1-exit),y:layout.center.y+(q.y-layout.center.y)*(1-exit)}:q;
   star(ctx,position,(1.3+noise(i+7)*2)*unit*(1-exit*.8),mix(color,'#ffffff',.65),opacity*Math.sin(Math.PI*((pulse+1)%1))**2*.70);
  }
 }
}
