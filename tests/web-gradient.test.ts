import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWebConfig,parseConfigFile,saveConfig,loadConfig,STORAGE_KEY,validateConfig} from '../web/model';
import {blendGradient,defaultGradient,gradientCss,gradientPaint,gradientSchema,transformGradient,type LinearGradientPaint} from '../web/gradient';

test('independent signature and background gradients retain base colors through files and storage',()=>{
 const config=defaultWebConfig();config.people[0].ink.gradient=defaultGradient('#F5FFFD');config.people[1].ink.gradient={enabled:false,angle:135,stops:[{offset:1,color:'#112233'},{offset:0,color:'#AABBCC'},{offset:.32,color:'#00FF88'}]};config.canvas.gradient={enabled:true,angle:180,stops:[{offset:0,color:'#111111'},{offset:.7,color:'#334455'},{offset:1,color:'#556677'}]};
 const before=structuredClone(config);let text='';saveConfig({setItem:(key,value)=>{assert.equal(key,STORAGE_KEY);text=value;}},config);
 assert.deepEqual(parseConfigFile(text),before);assert.deepEqual(loadConfig({getItem:key=>key===STORAGE_KEY?text:null}).config,before);assert.deepEqual(config,before);
 const old=defaultWebConfig();assert.equal(validateConfig(old).people[0].ink.gradient,undefined);assert.equal(validateConfig(old).canvas.gradient,undefined);
});
test('gradient colors, stop counts, finite positions and angles are bounded at import',()=>{
 const gradient=defaultGradient('#FFFFFF');
 for(const patch of [{angle:NaN},{angle:Infinity},{angle:-1},{angle:361},{enabled:'yes'},{stops:[]},{stops:gradient.stops.slice(0,1)},{stops:Array.from({length:6},()=>gradient.stops[0])},{stops:[{offset:-.1,color:'#FFFFFF'},gradient.stops[1]]},{stops:[{offset:Infinity,color:'#FFFFFF'},gradient.stops[1]]},{stops:[{offset:1.1,color:'#FFFFFF'},gradient.stops[1]]},{stops:[{offset:0,color:'red'},gradient.stops[1]]}])assert.equal(gradientSchema.safeParse({...gradient,...patch}).success,false,JSON.stringify(patch));
 const hardStop={...gradient,stops:[{offset:.5,color:'#123456'},{offset:.5,color:'#ABCDEF'}]};assert.deepEqual(gradientSchema.parse(hardStop),hardStop);
 const config=defaultWebConfig();assert.throws(()=>validateConfig({...config,canvas:{...config.canvas,gradient:{...gradient,angle:Infinity}}}));
});
test('CSS directions match canvas endpoints and sorting never changes saved stop order',()=>{
 const box={minX:10,minY:20,maxX:210,maxY:120};
 const right=gradientPaint({...defaultGradient('#FFFFFF'),angle:90},box);assert.ok(Math.abs(right.from.x-10)<1e-9&&Math.abs(right.to.x-210)<1e-9);assert.ok(Math.abs(right.from.y-70)<1e-9&&Math.abs(right.to.y-70)<1e-9);
 const up=gradientPaint({...defaultGradient('#FFFFFF'),angle:0},box);assert.deepEqual(up.from,{x:110,y:120});assert.deepEqual(up.to,{x:110,y:20});
 const gradient={enabled:true,angle:135,stops:[{offset:1,color:'#123456'},{offset:0,color:'#ABCDEF'}]},before=structuredClone(gradient);assert.equal(gradientCss(gradient),'linear-gradient(135deg, #ABCDEF 0%, #123456 100%)');assert.deepEqual(gradient,before);
});

test('vortex shear and flattening carry every source color with its ink instead of sliding the gradient',()=>{
 const parameter=(paint:LinearGradientPaint,p:{x:number;y:number})=>{const x=paint.to.x-paint.from.x,y=paint.to.y-paint.from.y;return ((p.x-paint.from.x)*x+(p.y-paint.from.y)*y)/(x*x+y*y);};
 for(const angle of [0,90,45])for(const pull of [.1,.55,1]){
  const source=gradientPaint({...defaultGradient('#F5FFFD'),angle},{minX:200,minY:300,maxX:1000,maxY:600}),scale=.7-.65*pull,flatten=1-.68*pull;
  const move=(p:{x:number;y:number})=>({x:600+(p.x-600)*scale+(p.y-450)*scale*.18*pull,y:450+(p.y-450)*scale*flatten});
  const mapped=transformGradient(source,move),blended=blendGradient(source,'#8833AA',.4,move),vx=source.to.x-source.from.x,vy=source.to.y-source.from.y,length=Math.hypot(vx,vy);
  for(const t of [0,.2,.7,1])for(const across of [-80,65]){
   // Points separated across the gradient have exactly the same source color.
   const point={x:source.from.x+vx*t-vy/length*across,y:source.from.y+vy*t+vx/length*across},destination=move(point);
   assert.ok(Math.abs(parameter(mapped,destination)-t)<1e-9,`${angle}/${pull}/${t}/${across}`);
   assert.ok(Math.abs(parameter(blended,destination)-t)<1e-9,'palette blending retains the affine color coordinate');
  }
 }
});
