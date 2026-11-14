import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {defaultWebConfig,loadConfig,parseConfigFile,saveConfig,STORAGE_KEY,validateConfig,type WebConfig} from '../web/model';
import {hitTest,penPosition,prepareScene,renderScene} from '../web/renderer';
import {visibleSamples} from '../web/brush-engine';
import {traceSampleRadius,type TraceData} from '../web/tracing';

function traceFixture():TraceData{
  const arc=(start:number,sign:number,offset:number)=>Array.from({length:45},(_,i)=>{
    const u=i/44;
    return {x:start+.33*u,y:.52+sign*.18*Math.sin(Math.PI*u),t:offset+u*900};
  });
  return {version:1,aspect:16/9,strength:'standard',strokes:[
    {join:false,pointerType:'mouse',points:arc(.12,-1,0)},
    {join:true,pointerType:'mouse',points:arc(.45,1,1700)},
    {join:false,pointerType:'mouse',points:[{x:.84,y:.22,t:10000},{x:.843,y:.223,t:10200}]},
  ]};
}
function fixture():WebConfig{
  const config=defaultWebConfig();config.mode='couple';
  config.people[0].signatureSource='trace';config.people[0].trace=traceFixture();config.people[0].name='林清的签名';
  config.people[1].signatureSource='typed';config.people[1].name='Qingzhi';
  config.people.forEach(person=>{person.position={x:0,y:0,scale:1,rotation:-6};person.font.penWidth=1;person.decoration.id='none';person.glow.enabled=false;});
  config.people[0].position.rotation=0;
  return config;
}
function close(a:number,b:number){assert.ok(Math.abs(a-b)<1e-7,`${a} vs ${b}`);}

type Command=[string,...(number|boolean)[]];
class RecordedPath{
  commands:Command[]=[];
  constructor(source?:RecordedPath){if(source)this.commands=source.commands.map(command=>[...command]);}
  moveTo(...args:number[]){this.commands.push(['moveTo',...args]);}
  lineTo(...args:number[]){this.commands.push(['lineTo',...args]);}
  arc(...args:(number|boolean)[]){this.commands.push(['arc',...args]);}
  ellipse(...args:(number|boolean)[]){this.commands.push(['ellipse',...args]);}
  quadraticCurveTo(...args:number[]){this.commands.push(['quadraticCurveTo',...args]);}
  closePath(){this.commands.push(['closePath']);}
  addPath(path:RecordedPath){this.commands.push(...path.commands);}
}
type Matrix=[number,number,number,number,number,number];
type Paint={color:string;alpha:number;shadow:number;matrix:Matrix;commands:Command[]};
class CanvasRecorder{
  fillStyle='#000000';strokeStyle='#000000';shadowColor='#000000';shadowBlur=0;globalAlpha=1;globalCompositeOperation='source-over';lineWidth=1;lineCap='butt';lineJoin='miter';
  matrix:Matrix=[1,0,0,1,0,0];path=new RecordedPath();fills:Paint[]=[];strokes:Paint[]=[];backgrounds:{color:string;args:number[]}[]=[];clears:number[][]=[];stack:Record<string,unknown>[]=[];
  setTransform(a:number,b:number,c:number,d:number,e:number,f:number){this.matrix=[a,b,c,d,e,f];}
  transform(a:number,b:number,c:number,d:number,e:number,f:number){const [x,y,z,w,u,v]=this.matrix;this.matrix=[x*a+z*b,y*a+w*b,x*c+z*d,y*c+w*d,x*e+z*f+u,y*e+w*f+v];}
  translate(x:number,y:number){this.transform(1,0,0,1,x,y);}
  rotate(angle:number){this.transform(Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0);}
  scale(x:number,y:number){this.transform(x,0,0,y,0,0);}
  save(){this.stack.push({matrix:[...this.matrix],fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,shadowColor:this.shadowColor,shadowBlur:this.shadowBlur,globalAlpha:this.globalAlpha,globalCompositeOperation:this.globalCompositeOperation,lineWidth:this.lineWidth,lineCap:this.lineCap,lineJoin:this.lineJoin});}
  restore(){const state=this.stack.pop();assert.ok(state,'balanced Canvas state');Object.assign(this,state);}
  beginPath(){this.path=new RecordedPath();}
  moveTo(...args:number[]){this.path.moveTo(...args);}
  lineTo(...args:number[]){this.path.lineTo(...args);}
  arc(...args:(number|boolean)[]){this.path.arc(...args);}
  quadraticCurveTo(...args:number[]){this.path.quadraticCurveTo(...args);}
  closePath(){this.path.closePath();}
  paint(path:RecordedPath,color:string):Paint{return {color,alpha:this.globalAlpha,shadow:this.shadowBlur,matrix:[...this.matrix],commands:path.commands.map(command=>[...command])};}
  fill(path=this.path){this.fills.push(this.paint(path,this.fillStyle));}
  stroke(){this.strokes.push(this.paint(this.path,this.strokeStyle));}
  clearRect(...args:number[]){this.clears.push(args);}
  fillRect(...args:number[]){this.backgrounds.push({color:this.fillStyle,args});}
  drawImage(){throw new Error('A reference image must never enter the product Canvas renderer');}
}
const originalPath=Object.getOwnPropertyDescriptor(globalThis,'Path2D');
Object.defineProperty(globalThis,'Path2D',{value:RecordedPath,writable:true,configurable:true});
test.after(()=>{if(originalPath)Object.defineProperty(globalThis,'Path2D',originalPath);else Reflect.deleteProperty(globalThis,'Path2D');});
function recording(){
  const context=new CanvasRecorder();
  const canvas={width:1,height:1,getContext:()=>context} as unknown as HTMLCanvasElement;
  return {context,canvas};
}
function frameHash(scene:ReturnType<typeof prepareScene>,time:number,complete=false){
  const {context,canvas}=recording();renderScene(canvas,scene,time,complete);
  return createHash('sha256').update(JSON.stringify({fills:context.fills,strokes:context.strokes,backgrounds:context.backgrounds,clears:context.clears})).digest('hex');
}

test('old configurations acquire typed sources without replacing their authored signatures',()=>{
  const current=defaultWebConfig();
  const old={...current,people:current.people.map(({signatureSource:_source,trace:_trace,...person})=>person)};
  for(const key of [STORAGE_KEY,'tyx-signature.website.v6']){
    const loaded=loadConfig({getItem:requested=>requested===key?JSON.stringify(old):null});
    assert.equal(loaded.warning,undefined);
    for(let i=0;i<2;i++){
      assert.equal(loaded.config.people[i].signatureSource,'typed');
      assert.equal(loaded.config.people[i].trace,undefined);
      assert.equal(loaded.config.people[i].name,current.people[i].name);
      assert.deepEqual(loaded.config.people[i].position,current.people[i].position);
      assert.deepEqual(loaded.config.people[i].ink,current.people[i].ink);
    }
  }
});

test('mixed typed and traced signatures retain independent raw input, Unicode names and styling through storage',()=>{
  const config=fixture();config.people[0].ink.color='#0BEABD';config.people[1].ink.color='#FF8FB1';
  config.people[0].position.scale=3;config.people[1].position.scale=.8;config.people[0].trace!.strength='strong';
  const original=structuredClone(config);let text='';
  saveConfig({setItem:(_key,value)=>{text=value;}},config);
  assert.deepEqual(config,original,'saving cannot rewrite raw samples in the editor');
  const loaded=loadConfig({getItem:key=>key===STORAGE_KEY?text:null});
  assert.equal(loaded.warning,undefined);assert.deepEqual(loaded.config,original);assert.deepEqual(parseConfigFile(text),original);
  assert.equal(loaded.config.people[0].trace!.strokes[2].points[0].t,10000,'acquisition pauses remain in raw storage');
  const dual=structuredClone(config);dual.people[1].signatureSource='trace';dual.people[1].name='';dual.people[1].trace=traceFixture();dual.people[1].trace.strength='light';
  const restored=parseConfigFile(JSON.stringify(dual));assert.equal(restored.people[1].name,'');assert.equal(restored.people[1].trace!.strength,'light');assert.equal(restored.people[0].trace!.strength,'strong');
  restored.people[0].trace!.strokes[0].points[0].x=.2;assert.notEqual(restored.people[1].trace!.strokes[0].points[0].x,.2);
});

test('invalid tracing data cannot be applied or overwrite a valid saved design',()=>{
  const valid=fixture();const invalids:unknown[]=[
    {...valid,people:[{...valid.people[0],trace:undefined},valid.people[1]]},
    {...valid,people:[{...valid.people[0],trace:{...traceFixture(),strokes:[]}},valid.people[1]]},
    {...valid,people:[{...valid.people[0],signatureSource:'reference-image'},valid.people[1]]},
  ];
  for(const point of [{x:Infinity,y:.5,t:0},{x:.4,y:NaN,t:0},{x:1.01,y:.5,t:0},{x:.4,y:.5,t:-1},{x:.4,y:.5,t:0,pressure:1.1}]){
    const config=fixture();config.people[0].trace!.strokes[0].points[0]=point;invalids.push(config);
  }
  const tooMany=fixture();tooMany.people[0].trace!.strokes=[{join:false,pointerType:'mouse',points:Array.from({length:40001},(_,i)=>({x:i/40001,y:.5,t:i}))}];invalids.push(tooMany);
  const image=fixture();invalids.push({...image,people:[{...image.people[0],trace:{...image.people[0].trace,referenceImage:'data:image/png;base64,private'}},image.people[1]]});
  for(const invalid of invalids){let writes=0;assert.throws(()=>saveConfig({setItem:()=>{writes++;}},invalid as WebConfig));assert.equal(writes,0);}
  const typed=fixture();typed.people[0].signatureSource='typed';typed.people[0].name='林清';assert.throws(()=>validateConfig(typed),/英文字母/);
});

test('trace geometry has its own cache identity, keeps the authored angle and supports real three-times scaling and dragging',()=>{
  const config=fixture(),base=prepareScene(config),person=base.people[0];assert.equal(person.angle,0);
  const enlarged=structuredClone(config);enlarged.people[0].position.scale=3;const large=prepareScene(enlarged);
  close(large.people[0].scale/person.scale,3);assert.deepEqual(large.people[0].center,person.center);assert.equal(large.people[0].brush,person.brush);
  const moved=structuredClone(config);moved.people[0].position.x=.12;moved.people[0].position.y=-.06;moved.people[0].ink.color='#111111';const next=prepareScene(moved);
  assert.equal(next.people[0].brush,person.brush);close(next.people[0].tx-person.tx,base.width*.12);close(next.people[0].ty-person.ty,-base.height*.06);
  const changed=structuredClone(config);changed.people[0].trace!.strokes[0].points[20].y=.8;assert.notEqual(prepareScene(changed).people[0].brush,person.brush);
  const strength=structuredClone(config);strength.people[0].trace!.strength='light';assert.notEqual(prepareScene(strength).people[0].brush,person.brush);
  const typed=structuredClone(config);typed.people[0].name='Qingzhi';typed.people[0].signatureSource='typed';assert.notEqual(prepareScene(typed).people[0].brush,person.brush);
});

test('trace ornaments, hit testing and pen positions stay finite on every artboard',()=>{
  for(const aspect of ['landscape','portrait','square'] as const)for(const decoration of ['none','cat-ears','face-wink','zodiac-libra'] as const){
    const config=fixture();config.canvas.aspect=aspect;config.people[0].decoration.id=decoration;const scene=prepareScene(config),group=scene.people[0];
    for(const stroke of group.brush.strokes)assert.ok(stroke.samples.every(p=>[p.x,p.y,p.radius,p.u].every(Number.isFinite)&&p.radius>0));
    for(const hit of scene.hitAreas)assert.ok(Object.values(hit.bounds).every(Number.isFinite));
    const signature=scene.hitAreas.find(hit=>hit.index===0&&hit.target==='signature')!;
    const hit=hitTest(scene,(signature.bounds.minX+signature.bounds.maxX)/2,(signature.bounds.minY+signature.bounds.maxY)/2);
    if(decoration==='none')assert.deepEqual(hit,{index:0,target:'signature'});
    else assert.equal(hit?.index,0,'an overlapping ornament keeps the current signature as its owner');
    assert.equal(scene.hitAreas.some(hit=>hit.index===0&&hit.target==='decoration'),decoration!=='none');
    const pen=penPosition(scene,0,(group.plan.writing.start+group.plan.writing.end)/2);assert.ok(pen&&[pen.x,pen.y].every(Number.isFinite));
  }
});

test('already visible trace samples retain their exact geometry and width while the drawing front advances',()=>{
  const config=fixture(),group=prepareScene(config).people[0],stroke=group.brush.strokes[0];
  assert.equal(stroke.fixedInk,true);assert.ok(stroke.samples.length>5);
  const before=structuredClone(stroke.samples),early=visibleSamples(stroke,.31,.05),later=visibleSamples(stroke,.79,.99);
  for(const sample of early.slice(0,-1))assert.deepEqual(later.find(other=>other.u===sample.u),sample);
  assert.deepEqual(visibleSamples(stroke,.31,.99),early,'live timing must not synthesize pressure on fixed trace ink');
  assert.deepEqual(stroke.samples,before);
  for(const chunk of prepareScene(config).continuous!.chunks.filter(chunk=>chunk.group.index===0&&chunk.group.particles!==false))for(const vertex of chunk.vertices){
    close(vertex.radius,traceSampleRadius(chunk.stroke,vertex.strokeU)*chunk.group.scale*chunk.group.config.font.penWidth*(chunk.stroke.dot?.88:1));
  }
});

test('ordinary and morphing trace frames are deterministic under reverse seeking, resizing and complete-view rendering',()=>{
  for(const enabled of [false,true])for(const aspect of ['landscape','portrait','square'] as const){
    const config=fixture();config.animation.introOutroEnabled=enabled;config.canvas.aspect=aspect;config.people[0].decoration.id='paw';
    const scene=prepareScene(config),time=scene.people[0].plan.writing.start+(scene.people[0].plan.writing.end-scene.people[0].plan.writing.start)*.63,expected=frameHash(scene,time);
    for(const at of [scene.duration,scene.editingTime,0,time+.1,.3])frameHash(scene,at);
    assert.equal(frameHash(scene,time),expected);const complete=frameHash(scene,scene.duration,true);assert.equal(frameHash(scene,0,true),complete);
    const {canvas,context}=recording();renderScene(canvas,scene,scene.duration,true);assert.equal(canvas.width,scene.width);assert.equal(canvas.height,scene.height);assert.ok(context.fills.length>0);
    assert.deepEqual(context.backgrounds,[{color:config.canvas.background,args:[0,0,scene.width,scene.height]}]);assert.ok(!JSON.stringify(scene.config).includes('referenceImage'));
  }
});

test('trace redraws and transparent final frames use only ink, never a captured reference image',()=>{
  for(const enabled of [false,true]){
    const config=fixture();config.animation.introOutroEnabled=enabled;config.canvas.transparent=true;const scene=prepareScene(config),{context,canvas}=recording();
    for(const time of [0,.8,scene.editingTime,scene.duration-.4,scene.duration])renderScene(canvas,scene,time);
    assert.equal(context.backgrounds.length,0);assert.equal(context.clears.length,5);
    const previous=context.fills.length;renderScene(canvas,scene,0,true);assert.ok(context.fills.length>previous,'complete view retains ink on an alpha canvas');
    assert.equal(context.backgrounds.length,0);
  }
});
