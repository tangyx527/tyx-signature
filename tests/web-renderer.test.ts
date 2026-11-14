import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {asBrushConfig,defaultWebConfig,type WebConfig} from '../web/model';
import {prepareScene,hitTest,penPosition,decorationPoint,renderScene,renderDecorationThumbnail} from '../web/renderer';
import {buildWebBrush,brushProgress,strokeAt,visibleSamples} from '../web/brush-engine';
import {naturalInkTime,referenceFrameAt} from '../web/continuous-motion';
import {ACTIVE_DECORATION_IDS,decorationCatalog} from '../web/decoration-catalog';
import {referenceDecorationPaths} from '../web/reference-decorations';
import {pointAt} from '../src/geometry';
import {introPresets,outroPresets} from '../web/animation-catalog';
import {defaultGradient,gradientPaint,type GradientConfig} from '../web/gradient';

function fixture():WebConfig{
 const config=defaultWebConfig();config.mode='single';
 for(const person of config.people){person.position={x:0,y:0,scale:1,rotation:-6};person.decoration={...person.decoration,id:'none',scale:1,offsetX:0,offsetY:0};person.glow.enabled=false;person.font.penWidth=1;}
 return config;
}
function close(actual:number,expected:number){assert.ok(Math.abs(actual-expected)<1e-7,`${actual} vs ${expected}`);}

// Canvas call recording is a contract test, not a browser rasterization test.
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
class RecordedGradient{
 stops:{offset:number;color:string}[]=[];
 endpoints:number[];
 constructor(x1:number,y1:number,x2:number,y2:number,matrix:Matrix){const [a,b,c,d,e,f]=matrix;this.endpoints=[a*x1+c*y1+e,b*x1+d*y1+f,a*x2+c*y2+e,b*x2+d*y2+f];}
 addColorStop(offset:number,color:string){this.stops.push({offset,color});}
 toString(){return 'linear:'+JSON.stringify({endpoints:this.endpoints,stops:this.stops});}
}
const recordedColor=(color:string|RecordedGradient)=>String(color);
type Paint={color:string;alpha:number;shadow:number;matrix:Matrix;commands:Command[]};
class CanvasRecorder{
 fillStyle:string|RecordedGradient='#000000';strokeStyle='#000000';shadowColor='#000000';shadowBlur=0;globalAlpha=1;globalCompositeOperation='source-over';lineWidth=1;lineCap='butt';lineJoin='miter';
 matrix:Matrix=[1,0,0,1,0,0];path=new RecordedPath();fills:Paint[]=[];strokes:Paint[]=[];backgrounds:{color:string;args:number[]}[]=[];clears:{args:number[];matrix:Matrix}[]=[];operations:string[]=[];stack:Record<string,unknown>[]=[];
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
 ellipse(...args:(number|boolean)[]){this.path.ellipse(...args);}
 quadraticCurveTo(...args:number[]){this.path.quadraticCurveTo(...args);}
 closePath(){this.path.closePath();}
 clip(){this.operations.push('clip');}
 drawImage(source:{width:number;height:number},...args:number[]){
  // Record transformed image geometry; this harness does not rasterize texture pixels.
  const path=new RecordedPath();path.commands.push(['drawImage',source.width,source.height,...args]);
  this.operations.push('drawImage');this.fills.push(this.paint(path,'rgba-image'));
 }
 createLinearGradient(x1:number,y1:number,x2:number,y2:number){return new RecordedGradient(x1,y1,x2,y2,this.matrix);}
 paint(path:RecordedPath,color:string|RecordedGradient):Paint{return {color:recordedColor(color),alpha:this.globalAlpha,shadow:this.shadowBlur,matrix:[...this.matrix],commands:path.commands.map(command=>[...command])};}
 fill(path=this.path){this.operations.push('fill');this.fills.push(this.paint(path,this.fillStyle));}
 stroke(){this.operations.push('stroke');this.strokes.push(this.paint(this.path,this.strokeStyle));}
 clearRect(...args:number[]){this.operations.push('clear');this.clears.push({args,matrix:[...this.matrix]});}
 fillRect(...args:number[]){this.operations.push('background');this.backgrounds.push({color:recordedColor(this.fillStyle),args});}
}
const originalPath=Object.getOwnPropertyDescriptor(globalThis,'Path2D');
const originalOffscreenCanvas=Object.getOwnPropertyDescriptor(globalThis,'OffscreenCanvas');
class RecordedSurface{
 private context=new CanvasRecorder();
 constructor(public width:number,public height:number){}
 getContext(type:string){return type==='2d'?this.context:null;}
}
Object.defineProperty(globalThis,'Path2D',{value:RecordedPath,writable:true,configurable:true});
Object.defineProperty(globalThis,'OffscreenCanvas',{value:RecordedSurface,writable:true,configurable:true});
test.after(()=>{
 if(originalPath)Object.defineProperty(globalThis,'Path2D',originalPath);else Reflect.deleteProperty(globalThis,'Path2D');
 if(originalOffscreenCanvas)Object.defineProperty(globalThis,'OffscreenCanvas',originalOffscreenCanvas);else Reflect.deleteProperty(globalThis,'OffscreenCanvas');
});
function recording(width=180,height=112){
 const context=new CanvasRecorder();
 const requests:{type:string;options?:CanvasRenderingContext2DSettings}[]=[];
 // Only the Canvas calls exercised by the renderer are implemented here.
 const canvas={width,height,getContext:(type:string,options?:CanvasRenderingContext2DSettings)=>{requests.push({type,options});return context;}} as unknown as HTMLCanvasElement;
 return {canvas,context,requests};
}
function frameHash(scene:ReturnType<typeof prepareScene>,time:number,complete=false){const {canvas,context}=recording();renderScene(canvas,scene,time,complete);return createHash('sha256').update(JSON.stringify({fills:context.fills,strokes:context.strokes,backgrounds:context.backgrounds,clears:context.clears})).digest('hex');}
type RecordedGradientData={endpoints:number[];stops:GradientConfig['stops']};
const gradientData=(color:string):RecordedGradientData|undefined=>color.startsWith('linear:')?JSON.parse(color.slice(7)):undefined;
const paintedGradients=(context:CanvasRecorder)=>context.fills.flatMap(fill=>{const gradient=gradientData(fill.color);return gradient&&fill.commands.length?[gradient]:[];});

test('unit-scale names fit each artboard; deliberate enlargement warns instead of recentering',()=>{
 for(const aspect of ['landscape','portrait','square'] as const)for(const names of [['A','X'],['TYX','SM'],['M'.repeat(40),'i'],['Liuxin','Tangyanxiang']])for(const mode of ['single','couple'] as const){
  const config=fixture();config.canvas.aspect=aspect;config.mode=mode;config.people[0].name=names[0];config.people[1].name=names[1];const scene=prepareScene(config);assert.equal(scene.people.length,mode==='single'?1:2);
  for(const person of scene.people){const b=person.bounds;assert.ok(b.minX>=0&&b.minY>=0&&b.maxX<=scene.width&&b.maxY<=scene.height,JSON.stringify({aspect,names,mode,b}));}
 }
 const c=fixture(),base=prepareScene(c);c.people[0].position.scale=1.5;c.people[0].position.x=.45;const next=prepareScene(c);assert.equal(next.people[0].baseScale,base.people[0].baseScale);close(next.people[0].scale/base.people[0].scale,1.5);assert.ok(next.warnings.length>0);
});

test('retired family and scheme values keep original input without adding alternative ornament strokes',()=>{
 for(const name of ['A','TYX','Liuxin',"O'Neil-Smith"]){const c=fixture();c.people[0].name=name;const source=asBrushConfig(c.people[0],c),authored=buildWebBrush(source,'classic');for(const scheme of ['classic','loop','sweep'] as const)for(const family of ['tyx-brush','tyx-soft'] as const){const brush=buildWebBrush(source,scheme,family);assert.deepEqual(brush,authored);assert.ok(!brush.strokes.some(stroke=>stroke.id.startsWith('scheme-')));}assert.equal(prepareScene(c).config.people[0].name,name);}
});

test('the pen samples actual nonlinear writing and supports reverse seeking',()=>{
 const scene=prepareScene(fixture()),g=scene.people[0],time=g.plan.writing.start+(g.plan.writing.end-g.plan.writing.start)*.43,pen=strokeAt(g.brush,naturalInkTime(g,time)),local=pointAt(pen.stroke.curve,pen.progress),cos=Math.cos(g.angle),sin=Math.sin(g.angle),position=penPosition(scene,0,time);
 assert.deepEqual(position,{x:(local.x*cos-local.y*sin)*g.scale+g.tx,y:(local.x*sin+local.y*cos)*g.scale+g.ty});for(const t of [scene.duration,2,0,4,1])penPosition(scene,0,t);assert.deepEqual(penPosition(scene,0,time),position);assert.equal(penPosition(scene,0,scene.duration),null);
 const partial=visibleSamples(pen.stroke,.37,.85);assert.ok(partial.every(p=>p.u<=.37));assert.deepEqual({x:partial.at(-1)!.x,y:partial.at(-1)!.y},pointAt(pen.stroke.curve,.37));assert.equal(brushProgress(-1),0);assert.equal(brushProgress(2),1);
});

test('signature and ornament dragging apply exact canvas-normalized deltas',()=>{
 for(const id of ACTIVE_DECORATION_IDS){
  const c=fixture();c.people[0].decoration.id=id;const base=prepareScene(c),moved=structuredClone(c);moved.people[0].position.x+=.08;moved.people[0].position.y-=.06;const next=prepareScene(moved),a=base.hitAreas.find(h=>h.target==='signature')!.bounds,b=next.hitAreas.find(h=>h.target==='signature')!.bounds;close(b.minX-a.minX,base.width*.08);close(b.minY-a.minY,-base.height*.06);if(id==='none')continue;
  const ornament=structuredClone(c);ornament.people[0].decoration.offsetX+=.04;ornament.people[0].decoration.offsetY+=.08;const d=prepareScene(ornament),before=base.hitAreas.find(h=>h.target==='decoration')!.bounds,after=d.hitAreas.find(h=>h.target==='decoration')!.bounds;assert.deepEqual(d.hitAreas.find(h=>h.target==='signature')!.bounds,a);close(after.minX-before.minX,base.width*.04);close(after.minY-before.minY,base.height*.08);assert.deepEqual(hitTest(d,(after.minX+after.maxX)/2,(after.minY+after.maxY)/2),{index:0,target:'decoration'});
 }
});

test('size, thickness and animation preserve fixed layout; thickness changes actual ink radii and cached paths',()=>{
 const c=fixture();c.people[0].font.penWidth=.5;const thin=prepareScene(c),g=thin.people[0];c.people[0].font.penWidth=2;const thick=prepareScene(c);assert.equal(g.brush,thick.people[0].brush);assert.deepEqual(g.center,thick.people[0].center);assert.equal(g.baseScale,thick.people[0].baseScale);
 const a=thin.continuous!.chunks.find(chunk=>chunk.group.particles!==false)!,b=thick.continuous!.chunks.find(chunk=>chunk.group.particles!==false)!;close(b.vertices[0].radius/a.vertices[0].radius,4);c.people[0].position.scale=1.5;c.animation.introOutroEnabled=false;const off=prepareScene(c);assert.deepEqual(off.people[0].center,g.center);assert.equal(off.people[0].baseScale,g.baseScale);assert.equal(off.continuous,null);
 const radii=(width:number)=>{const config=fixture();config.animation.introOutroEnabled=false;config.people[0].font.penWidth=width;const scene=prepareScene(config),r=recording();renderScene(r.canvas,scene,scene.duration);return r.context.fills[0].commands.filter(command=>command[0]==='arc').map(command=>Number(command[3]));};const small=radii(.5),large=radii(2);assert.ok(small.length>0);close(large[0]/small[0],4);assert.deepEqual(radii(.5),small);
});

test('every active choice has finite paths and matching hit areas on every artboard, with one shared outro family',()=>{
 for(const aspect of ['landscape','portrait','square'] as const)for(const id of ACTIVE_DECORATION_IDS){const c=fixture();c.mode='couple';c.canvas.aspect=aspect;c.people.forEach(person=>person.decoration.id=id);const scene=prepareScene(c);assert.deepEqual(scene.people[0].plan.writing,scene.people[1].plan.writing);assert.equal(scene.continuous!.parts.length,7);for(const g of scene.people){assert.equal(g.config.decoration.id,id);assert.equal(g.decoration.strokes.length>0,id!=='none');assert.equal(scene.hitAreas.filter(area=>area.index===g.index&&area.target==='decoration').length,id==='none'?0:1);}assert.ok(scene.continuous!.chunks.every(chunk=>chunk.vertices.every(v=>[v.x,v.y,v.radius].every(Number.isFinite)&&v.radius>0)));}
 for(const id of ['cat','rabbit','bow','dog','sun','heart','star','accent-moon','accent-saturn','accent-shooting-star','accent-cloud','accent-lightning','accent-ribbon','accent-crown','accent-clover','accent-flower','accent-music','accent-envelope','accent-candy'] as const){const c=fixture();c.people[0].decoration.id=id;const scene=prepareScene(c);assert.equal(scene.people[0].config.decoration.id,'none',id);assert.equal(scene.people[0].decoration.strokes.length,0,id);}
});

test('all twelve zodiac signs are selectable while retired ornament categories stay unavailable',()=>{
 const zodiac=[
  'zodiac-aries','zodiac-taurus','zodiac-gemini','zodiac-cancer','zodiac-leo','zodiac-virgo',
  'zodiac-libra','zodiac-scorpio','zodiac-sagittarius','zodiac-capricorn','zodiac-aquarius','zodiac-pisces',
 ];
 assert.deepEqual(decorationCatalog.filter(item=>item.category==='zodiac').map(item=>item.id),zodiac);
 const active=new Set<string>(ACTIVE_DECORATION_IDS),selectable=new Set<string>(decorationCatalog.map(item=>item.id));
 for(const id of zodiac)assert.ok(active.has(id),`${id}: selectable signs also have active geometry`);
 for(const id of ['cat','rabbit','bow','dog','sun','heart','star','accent-moon','accent-saturn','accent-shooting-star','accent-cloud','accent-lightning','accent-ribbon','accent-crown','accent-clover','accent-flower','accent-music','accent-envelope','accent-candy']){
  assert.equal(active.has(id),false,id);assert.equal(selectable.has(id),false,id);
 }
});

test('thumbnail and ordinary rendering paint identical complete ornament paths, solid marks and accent colors',()=>{
 for(const id of ACTIVE_DECORATION_IDS){const c=fixture();c.animation.introOutroEnabled=false;c.people[0].decoration.id=id;const scene=prepareScene(c),main=recording(),thumb=recording();renderScene(main.canvas,scene,scene.duration);renderDecorationThumbnail(thumb.canvas,id,c.people[0],c.canvas.background);const painted=(r:CanvasRecorder)=>r.fills.map(fill=>({color:fill.color,commands:fill.commands}));assert.deepEqual(painted(thumb.context),painted(main.context).slice(1),id);for(const path of referenceDecorationPaths[id]??[]){if(path.color)assert.ok(thumb.context.fills.some(fill=>fill.color===path.color&&fill.commands.length>0),`${id}/${path.id}`);if(path.filled)assert.ok(path.curve&&path.curve.points.length>2);}}
});

test('solid and accent geometry survive into the continuous source mesh and complete editing pose',()=>{
 for(const [id,paths] of Object.entries(referenceDecorationPaths)){const c=fixture();c.people[0].decoration.id=id as WebConfig['people'][0]['decoration']['id'];const scene=prepareScene(c),ornament=scene.continuous!.groups.find(g=>g.particles===false)!;for(const path of paths){const pieces=ornament.brush.strokes.filter(stroke=>stroke.id===path.id||stroke.id.startsWith(`${path.id}~`));assert.ok(pieces.length>0,`${id}/${path.id}`);for(const piece of pieces){assert.equal(ornament.colorAt?.(piece),path.color);assert.ok(piece.samples.every(p=>p.radius>0&&Number.isFinite(p.radius)));}if(path.filled||path.eye)assert.ok(pieces.length>1,'solid marks must be filled, not merely traced around their outlines');}const r=recording();renderScene(r.canvas,scene,scene.editingTime,true);for(const color of new Set(paths.map(path=>path.color).filter(Boolean)))assert.ok(r.context.fills.some(fill=>fill.color.toLowerCase()===color?.toLowerCase()),`${id}: ${color}`);}
});

test('chosen background persists through writing, morph, final fade and complete editing pose',()=>{
 for(const background of ['#ffffff','#7c3a80','#111820'])for(const enabled of [true,false]){const c=fixture();c.canvas.background=background;c.animation.introOutroEnabled=enabled;c.people[0].decoration.id='face-sleepy';const scene=prepareScene(c);for(const time of [0,.8,scene.editingTime,scene.duration-.5,scene.duration]){const r=recording();renderScene(r.canvas,scene,time);assert.deepEqual(r.context.backgrounds,[{color:background,args:[0,0,scene.width,scene.height]}]);assert.deepEqual(r.context.clears,[{args:[0,0,scene.width,scene.height],matrix:[1,0,0,1,0,0]}]);assert.deepEqual(r.context.operations.slice(0,2),['clear','background']);assert.equal(r.requests[0].options?.alpha,true);}const r=recording();renderScene(r.canvas,scene,scene.duration,true);assert.equal(r.context.backgrounds[0].color,background);assert.ok(r.context.fills.some(fill=>fill.commands.length>0));}
});

test('transparent scenes clear every frame without painting a backdrop through intro, writing, outro and complete pose',()=>{
 for(const enabled of [true,false]){
  const c=fixture();c.canvas.transparent=true;c.canvas.background='#7c3a80';c.animation.introOutroEnabled=enabled;c.people[0].decoration.id='face-sleepy';const scene=prepareScene(c),r=recording(scene.width,scene.height),times=[0,.8,(scene.people[0].plan.writing.start+scene.people[0].plan.writing.end)/2,scene.editingTime,scene.duration-.5,scene.duration];
  for(const time of times){
   const clears=r.context.clears.length,operation=r.context.operations.length,fills=r.context.fills.length;renderScene(r.canvas,scene,time);
   assert.equal(r.context.clears.length,clears+1);assert.deepEqual(r.context.clears.at(-1),{args:[0,0,scene.width,scene.height],matrix:[1,0,0,1,0,0]});assert.equal(r.context.operations[operation],'clear');assert.equal(r.context.backgrounds.length,0);
   if(enabled&&time===scene.duration)assert.equal(r.context.fills.length,fills,'the final faded frame is left transparent');
  }
  const before=r.context.fills.length,clears=r.context.clears.length;renderScene(r.canvas,scene,scene.duration,true);assert.equal(r.context.clears.length,clears+1);assert.equal(r.context.backgrounds.length,0);assert.ok(r.context.fills.slice(before).some(fill=>fill.commands.length>0),'complete editing pose retains actual ink');assert.ok(r.requests.every(request=>request.type==='2d'&&request.options?.alpha===true));
 }
});

test('the same alpha canvas can switch opaque and transparent without retaining its old background',()=>{
 const c=fixture();c.canvas.background='#e2d5f1';c.people[0].decoration.id='paw-beans';const opaque=prepareScene(c);c.canvas.transparent=true;const transparent=prepareScene(c),r=recording(opaque.width,opaque.height);
 for(const [scene,backgrounds] of [[opaque,1],[transparent,1],[opaque,2],[transparent,2]] as const){const clears=r.context.clears.length;renderScene(r.canvas,scene,scene.duration,true);assert.equal(r.context.clears.length,clears+1);assert.equal(r.context.backgrounds.length,backgrounds);}
 assert.ok(r.requests.every(request=>request.options?.alpha===true));assert.deepEqual(r.context.backgrounds.map(fill=>fill.color),['#e2d5f1','#e2d5f1']);
 const expected=structuredClone(opaque.config);expected.canvas.transparent=true;assert.deepEqual(transparent.config,expected);assert.deepEqual(transparent.hitAreas,opaque.hitAreas);assert.equal(transparent.editingTime,opaque.editingTime);assert.equal(transparent.duration,opaque.duration);
 for(let i=0;i<opaque.people.length;i++){assert.equal(transparent.people[i].brush,opaque.people[i].brush);assert.deepEqual(transparent.people[i].plan,opaque.people[i].plan);assert.deepEqual(transparent.people[i].config,opaque.people[i].config);assert.deepEqual(transparent.people[i].center,opaque.people[i].center);assert.equal(transparent.people[i].scale,opaque.people[i].scale);}
});

test('ornament thumbnails clear reused canvases and keep their real geometry when transparency changes',()=>{
 const c=fixture(),r=recording(),person=c.people[0];
 renderDecorationThumbnail(r.canvas,'face-sleepy',person,c.canvas.background,false);const opaque=r.context.fills.map(fill=>({color:fill.color,commands:fill.commands})),before=r.context.fills.length;
 renderDecorationThumbnail(r.canvas,'face-sleepy',person,c.canvas.background,true);assert.deepEqual(r.context.fills.slice(before).map(fill=>({color:fill.color,commands:fill.commands})),opaque);assert.equal(r.context.backgrounds.length,1);assert.equal(r.context.clears.length,2);
 renderDecorationThumbnail(r.canvas,'none',person,c.canvas.background,true);assert.equal(r.context.clears.length,3);assert.equal(r.context.backgrounds.length,1);assert.equal(r.context.fills.length,before*2);assert.ok(r.requests.every(request=>request.options?.alpha===true));
});

test('writing and short ornament reaction meet the outro directly without a full-ink blackout',()=>{
 for(const duration of [3,5,6.5,15])for(const id of ['none','cat-round'] as const){const c=fixture();c.timing.duration=duration;c.people[0].decoration.id=id;const scene=prepareScene(c),plan=scene.people[0].plan;close(id==='none'?plan.writing.end:plan.reaction.end,plan.outro.start);close(referenceFrameAt(plan.outro.start,duration),150);close(referenceFrameAt(duration,duration),195);for(const frame of [150,155,156,157,158,159,160,161,162]){const r=recording();renderScene(r.canvas,scene,plan.outro.start+(frame-150)/30);assert.ok(r.context.fills.some(fill=>fill.alpha>.1&&fill.commands.length>0),`${duration}/${id}/${frame}`);}}
});

test('arbitrary forward and reverse rendering is deterministic',()=>{
 for(const enabled of [true,false]){const c=fixture();c.animation.introOutroEnabled=enabled;c.people[0].decoration.id='panda-face';const scene=prepareScene(c),time=scene.people[0].plan.reaction.start+.05,expected=frameHash(scene,time);for(const t of [scene.duration,0,2,scene.editingTime])frameHash(scene,t);assert.equal(frameHash(scene,time),expected);}
});

test('ornament reactions occur after drawing and return to the exact authored pose',()=>{
 for(const [id,stroke] of [['cat-ears','left-ear'],['paw-wave','paw-outline'],['rabbit-face','left-ear'],['puppy-face','left-floppy-ear'],['panda-face','left-ear']] as const){const c=fixture();c.people[0].decoration.id=id;const scene=prepareScene(c),phase=scene.people[0].plan.reaction;assert.ok(scene.people[0].decoration.strokes.some(path=>path.id===stroke),`${id}: gesture source`);const at=(time:number)=>decorationPoint(scene,0,stroke,.4,time),rest=at(phase.start);assert.deepEqual(at(phase.end),rest);assert.notDeepEqual(at(phase.start+(phase.end-phase.start)*.3),rest,id);}
});

test('moving or recoloring reuses the fixed ornament mesh instead of rebuilding every filled scanline',()=>{
 const c=fixture();c.people[0].decoration.id='panda-face';const base=prepareScene(c);c.people[0].position.x=.03;c.people[0].ink.color='#ffcccc';const next=prepareScene(c);const mesh=(scene:ReturnType<typeof prepareScene>)=>scene.continuous!.groups.find(g=>g.particles===false)!.brush.strokes;assert.equal(mesh(base),mesh(next));
});

test('prepared scenes isolate exports from later edits',()=>{const c=fixture(),copy=structuredClone(c),scene=prepareScene(c);assert.deepEqual(c,copy);c.people[0].name='Changed';assert.equal(scene.config.people[0].name,copy.people[0].name);assert.equal(hitTest(scene,-50,-50),null);});

test('opening and ending selections reserve only their own time and retain the authored layout',()=>{
 for(const duration of [3,5,15])for(const intro of introPresets)for(const outro of outroPresets){
  const c=fixture();c.timing.duration=duration;c.animation={introOutroEnabled:true,intro:intro.id,outro:outro.id};
  const scene=prepareScene(c),plan=scene.people[0].plan;
  const expectedLead=intro.id==='none'?0:intro.id==='classic'?.8:duration===3&&outro.id!=='none'?.55:intro.id==='comet'?1.2:1.35;
  close(plan.writing.start,expectedLead);
  close(plan.outro.start,outro.id==='none'?duration:duration-1.5);
  close(scene.editingTime,plan.outro.start);assert.equal(scene.duration,duration);
  assert.ok(plan.writing.end>plan.writing.start);assert.ok(plan.writing.end<=plan.outro.start);
  if(outro.id!=='none')close(plan.writing.end,plan.outro.start);
  if(intro.id!=='none')assert.equal(penPosition(scene,0,.4),null);
  assert.ok(penPosition(scene,0,plan.writing.start+.001),'writing begins at the selected opening handoff');
  assert.equal(penPosition(scene,0,plan.writing.end),null);
  const reference=fixture();reference.timing.duration=duration;const original=prepareScene(reference);
  assert.deepEqual(scene.hitAreas,original.hitAreas);assert.deepEqual(scene.people[0].center,original.people[0].center);
 }
});

test('new opening choices draw distinct effects and hand off to the actual signature ink',()=>{
 const hashes=new Set<string>();
 for(const intro of ['comet','orbit','bloom'] as const){
  const c=fixture();c.animation.intro=intro;c.animation.outro='none';c.people[0].ink.color='#34a786';
  const scene=prepareScene(c);hashes.add(frameHash(scene,.4));
  const r=recording();renderScene(r.canvas,scene,scene.people[0].plan.writing.start+.18);
  assert.ok(r.context.fills.some(fill=>fill.color==='#34a786'&&fill.alpha>.1&&fill.commands.length>0),intro);
  const final=recording();renderScene(final.canvas,scene,scene.duration);
  assert.ok(final.context.fills.some(fill=>fill.color==='#34a786'&&fill.alpha>.1&&fill.commands.length>0),'no ending keeps the completed signature visible');
 }
 assert.equal(hashes.size,3,'the opening selector chooses visibly different trajectories');
});

test('new endings start from authored signatures and ornaments, disappear fully, and leave complete editing intact',()=>{
 const completeHashes=new Set<string>(),endingHashes=new Set<string>();
 for(const outro of ['classic','vortex','none'] as const){
  const c=fixture();c.mode='couple';c.animation.intro='comet';c.animation.outro=outro;c.people[0].decoration.id='cat-ears';c.people[1].decoration.id='paw-beans';
  const scene=prepareScene(c);completeHashes.add(frameHash(scene,scene.duration,true));
  const start=recording();renderScene(start.canvas,scene,scene.people[0].plan.outro.start);
  assert.ok(start.context.fills.some(fill=>fill.commands.length>0&&fill.alpha>.1),`${outro}: ink stays visible at the handoff`);
  if(outro==='none')continue;
  const sample=scene.people[0].plan.outro.start+.42;endingHashes.add(frameHash(scene,sample));
  const other=structuredClone(c);other.people[0].name='QXZ';other.people[0].decoration.id='none';
  assert.notEqual(frameHash(prepareScene(other),sample),frameHash(scene,sample),`${outro}: effect is driven by the authored ink`);
  const final=recording();renderScene(final.canvas,scene,scene.duration);
  assert.ok(![...final.context.fills,...final.context.strokes].some(paint=>paint.alpha>1e-6&&paint.commands.length>0),`${outro}: the final frame is clear`);
 }
 assert.equal(completeHashes.size,1,'choosing an ending never changes the complete editing pose');
 assert.equal(endingHashes.size,2,'ending choices produce different motion');
});

test('new animation frames remain finite, reversible, and independent of the selected background',()=>{
 for(const [intro,outro,aspect,mode] of [['comet','classic','landscape','single'],['orbit','vortex','portrait','couple'],['bloom','vortex','square','couple']] as const){
  const c=fixture();c.animation.intro=intro;c.animation.outro=outro;c.canvas.aspect=aspect;c.canvas.background='#a5b6c7';c.mode=mode;c.people[0].decoration.id='paw-wave';
  const opaque=prepareScene(c);c.canvas.transparent=true;const scene=prepareScene(c);
  const times=[.4,(scene.people[0].plan.writing.start+scene.people[0].plan.writing.end)/2,scene.people[0].plan.outro.start+.5];
  for(const time of times){
   const expected=frameHash(scene,time);for(const seek of [scene.duration,0,scene.editingTime])frameHash(scene,seek);assert.equal(frameHash(scene,time),expected,`${intro}/${outro}/${time}`);
   const transparent=recording(),background=recording();renderScene(transparent.canvas,scene,time);renderScene(background.canvas,opaque,time);
   assert.equal(transparent.context.backgrounds.length,0);assert.deepEqual(background.context.backgrounds,[{color:'#a5b6c7',args:[0,0,scene.width,scene.height]}]);
   assert.deepEqual(transparent.context.fills,background.context.fills);assert.deepEqual(transparent.context.strokes,background.context.strokes);
   for(const paint of [...transparent.context.fills,...transparent.context.strokes]){
    assert.ok(Number.isFinite(paint.alpha)&&paint.alpha>=0&&paint.alpha<=1);assert.ok(paint.matrix.every(Number.isFinite));
    assert.ok(paint.commands.every(command=>command.slice(1).every(value=>typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))));
   }
   assert.equal(transparent.context.stack.length,0,'Canvas state remains balanced');
  }
 }
});

test('typed and traced gradient ink spans the complete signature in ordinary and continuous writing',()=>{
 for(const signatureSource of ['typed','trace'] as const)for(const enabled of [false,true]){
  const c=fixture();c.animation.introOutroEnabled=enabled;c.people[0].signatureSource=signatureSource;
  c.people[0].ink.gradient={enabled:true,angle:135,stops:[{offset:1,color:'#AA33FF'},{offset:0,color:'#FFFFFF'},{offset:.35,color:'#00EEAA'}]};
  if(signatureSource==='trace')c.people[0].trace={version:1,aspect:16/9,strength:'standard',strokes:[{pointerType:'mouse',join:false,points:[{x:.1,y:.2,t:0},{x:.35,y:.7,t:200},{x:.55,y:.15,t:400},{x:.9,y:.55,t:600}]}]};
  const scene=prepareScene(c),group=scene.people[0],a=recording(),b=recording();renderScene(a.canvas,scene,group.plan.writing.start+(group.plan.writing.end-group.plan.writing.start)*.53);renderScene(b.canvas,scene,scene.duration,true);
  const active=paintedGradients(a.context),complete=paintedGradients(b.context);assert.ok(active.length&&complete.length,`${signatureSource}/${enabled}`);
  const expected=gradientPaint(c.people[0].ink.gradient,group.brush.box,p=>({x:(p.x*Math.cos(group.angle)-p.y*Math.sin(group.angle))*group.scale+group.tx,y:(p.x*Math.sin(group.angle)+p.y*Math.cos(group.angle))*group.scale+group.ty}));
  const endpoints=[expected.from.x,expected.from.y,expected.to.x,expected.to.y];
  for(const data of [...active,...complete]){assert.deepEqual(data.stops,expected.stops);data.endpoints.forEach((value,index)=>close(value,endpoints[index]));}
  const time=group.plan.writing.start+(group.plan.writing.end-group.plan.writing.start)*.61,hash=frameHash(scene,time);for(const at of [scene.duration,.1,scene.editingTime])frameHash(scene,at);assert.equal(frameHash(scene,time),hash);
 }
});

test('two gradients remain independent while authored colored ornaments keep their original paint',()=>{
 const c=fixture();c.mode='couple';c.people[0].ink.gradient=defaultGradient('#FFFFFF');c.people[1].ink.gradient={enabled:true,angle:180,stops:[{offset:0,color:'#FF1122'},{offset:1,color:'#2233FF'}]};c.people[0].decoration.id='panda-face';
 const scene=prepareScene(c),r=recording();renderScene(r.canvas,scene,scene.duration,true);const gradients=paintedGradients(r.context);
 for(const person of c.people)assert.ok(gradients.some(paint=>JSON.stringify(paint.stops)===JSON.stringify(person.ink.gradient!.stops)));
 for(const color of new Set((referenceDecorationPaths['panda-face']??[]).map(stroke=>stroke.color).filter(Boolean)))assert.ok(r.context.fills.some(fill=>fill.color.toLowerCase()===color!.toLowerCase()),color);
});

test('classic and vortex endings retain the incoming gradient through contraction before their own palette takes over',()=>{
 for(const outro of ['classic','vortex'] as const){
  const c=fixture();c.animation.outro=outro;c.people[0].ink.gradient=defaultGradient('#EFAB33');const scene=prepareScene(c),start=scene.duration-1.5;
  const before=recording(),begin=recording(),contract=recording();renderScene(before.canvas,scene,start-1e-6);renderScene(begin.canvas,scene,start+1e-6);renderScene(contract.canvas,scene,start+.12);
  const prior=paintedGradients(before.context),next=paintedGradients(begin.context),moving=paintedGradients(contract.context);assert.ok(prior.length&&next.length&&moving.length,outro);
  assert.deepEqual(prior[0].stops,next[0].stops);assert.deepEqual(moving[0].stops,c.people[0].ink.gradient.stops);
  for(const time of [start+.24,start+.33,start+.65]){const hash=frameHash(scene,time);frameHash(scene,0);frameHash(scene,scene.duration);assert.equal(frameHash(scene,time),hash);}
  const end=recording();renderScene(end.canvas,scene,scene.duration);assert.equal(end.context.fills.length,0);
 }
});

test('background gradient fills the whole artboard at every phase and transparency omits it without changing ink',()=>{
 for(const aspect of ['landscape','portrait','square'] as const){
  const c=fixture();c.canvas.aspect=aspect;c.canvas.gradient={enabled:true,angle:45,stops:[{offset:1,color:'#123456'},{offset:0,color:'#ABCDEF'}]};c.people[0].ink.gradient=defaultGradient('#F5FFFD');const opaque=prepareScene(c);c.canvas.transparent=true;const transparent=prepareScene(c);
  for(const time of [0,.9,opaque.editingTime,opaque.duration-.2,opaque.duration]){
   const a=recording(),b=recording();renderScene(a.canvas,opaque,time);renderScene(b.canvas,transparent,time);assert.equal(a.context.backgrounds.length,1);assert.equal(b.context.backgrounds.length,0);assert.deepEqual(a.context.fills,b.context.fills);assert.deepEqual(a.context.strokes,b.context.strokes);
   const data=gradientData(a.context.backgrounds[0].color)!;assert.ok(data);const expected=gradientPaint(c.canvas.gradient,{minX:0,minY:0,maxX:opaque.width,maxY:opaque.height});assert.deepEqual(data.endpoints,[expected.from.x,expected.from.y,expected.to.x,expected.to.y]);assert.deepEqual(a.context.backgrounds[0].args,[0,0,opaque.width,opaque.height]);
  }
  const a=recording(),b=recording();renderScene(a.canvas,opaque,0,true);renderScene(b.canvas,transparent,0,true);assert.deepEqual(a.context.fills,b.context.fills);assert.equal(b.context.backgrounds.length,0);
 }
 const c=fixture(),r=recording();c.canvas.gradient=defaultGradient('#111111');renderDecorationThumbnail(r.canvas,'panda-face',c.people[0],c.canvas.background,false,c.canvas.gradient);assert.ok(gradientData(r.context.backgrounds[0].color));renderDecorationThumbnail(r.canvas,'panda-face',c.people[0],c.canvas.background,true,c.canvas.gradient);assert.equal(r.context.backgrounds.length,1);
});

