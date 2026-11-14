import test from 'node:test';
import assert from 'node:assert/strict';
import {appendTraceStroke,beautifyTrace,buildTraceBrush,traceBrushTransform,traceSampleRadius,traceSchema,TRACE_BASE_RADIUS,type TraceData,type TracePoint,type TraceStroke} from '../web/tracing';

const stroke=(points:TracePoint[],pointerType:TraceStroke['pointerType']='mouse',join=false):TraceStroke=>({points,pointerType,join});
const trace=(strokes:TraceStroke[],strength:TraceData['strength']='standard',aspect=16/9):TraceData=>({version:1,aspect,strength,strokes});
const distance=(a:TracePoint,b:TracePoint,aspect:number)=>Math.hypot(a.x-b.x,(a.y-b.y)/aspect);
function line(count=181):TracePoint[]{return Array.from({length:count},(_,i)=>({x:.1+i/(count-1)*.7,y:.4+(i%2?1:-1)*.002,t:i*7}));}

test('trace schema bounds raw data, finite samples and capture order without discarding it',()=>{
  const original=trace([stroke(line())]),parsed=traceSchema.parse(original);
  assert.deepEqual(parsed,original);assert.notEqual(parsed,original);
  assert.equal(traceSchema.parse(trace([])).strokes.length,0);
  for(const invalid of [NaN,Infinity,-.01,1.01]){
    const bad=structuredClone(original);bad.strokes[0].points[0].x=invalid;assert.throws(()=>traceSchema.parse(bad));
  }
  const backwards=structuredClone(original);backwards.strokes[0].points[2].t=0;assert.throws(()=>traceSchema.parse(backwards),/顺序/);
  const oversized=trace([stroke(Array.from({length:40001},(_,i)=>({x:.5,y:.5,t:i})))]);assert.throws(()=>traceSchema.parse(oversized));
});

test('near-end resume is one continuous segment while distant landings stay disconnected',()=>{
  const first=stroke([{x:.1,y:.4,t:0},{x:.35,y:.4,t:300}]);
  const original=[first],near=stroke([{x:.36,y:.405,t:8000},{x:.7,y:.25,t:8500}]);
  const joined=appendTraceStroke(original,near,2);assert.equal(joined[1].join,true);assert.deepEqual(original,[first]);assert.equal(original[0].points.length,2);
  const far=stroke([{x:.8,y:.7,t:9000},{x:.81,y:.71,t:9100}]);
  const complete=appendTraceStroke(joined,far,2);assert.equal(complete[2].join,false);
  assert.equal(beautifyTrace(trace(complete)).length,2);assert.equal(buildTraceBrush(trace(complete)).strokes.length,2);
  const malformed=trace([first,{...far,join:true}]);assert.equal(beautifyTrace(malformed).length,2,'imported join flags cannot make cross-canvas bridges');
});

test('standard beautification reduces small long-arc jitter and preserves raw endpoints',()=>{
  const raw=line(),original=trace([stroke(raw)]),before=structuredClone(original),smooth=beautifyTrace(original)[0].points;
  const error=(points:TracePoint[])=>points.slice(2,-2).reduce((sum,p)=>sum+Math.abs(p.y-.4),0)/Math.max(1,points.length-4);
  assert.ok(error(smooth)<error(raw)*.55,`${error(smooth)} vs ${error(raw)}`);
  assert.deepEqual(smooth[0],raw[0]);assert.deepEqual(smooth.at(-1),raw.at(-1));assert.deepEqual(original,before);
  assert.deepEqual(beautifyTrace(original),beautifyTrace(original));
});

test('important corners and hooks are pinned and bounded smoothing keeps closed loops intact',()=>{
  const points:TracePoint[]=[];
  for(let i=0;i<=40;i++)points.push({x:.1+i*.01,y:.2,t:i*10});
  for(let i=1;i<=30;i++)points.push({x:.5,y:.2+i*.01,t:(40+i)*10});
  const result=beautifyTrace(trace([stroke(points)],'strong'))[0].points;
  assert.ok(result.some(p=>p.x===.5&&p.y===.2),'right-angle turn stays at the original corner');
  const hook=[{x:.1,y:.2,t:0},{x:.5,y:.2,t:100},{x:.52,y:.23,t:110},{x:.5,y:.24,t:120},{x:.48,y:.23,t:130}];
  const hooked=beautifyTrace(trace([stroke(hook)],'strong'))[0].points;
  assert.ok(hooked.some(p=>p.x===.52&&p.y===.23),'hook tip is retained');
  const loop=Array.from({length:181},(_,i)=>({x:.5+.13*Math.cos(i/180*Math.PI*2),y:.5+.19*Math.sin(i/180*Math.PI*2),t:i*10}));
  loop[loop.length-1]={...loop[0],t:1800};
  const shaped=beautifyTrace(trace([stroke(loop)],'strong'))[0].points;
  assert.equal(shaped[0].x,shaped.at(-1)!.x);assert.equal(shaped[0].y,shaped.at(-1)!.y);
  const radius=(p:TracePoint)=>Math.hypot((p.x-.5)/.13,(p.y-.5)/.19);
  assert.ok(shaped.every(p=>radius(p)>.94&&radius(p)<1.02),'loop cannot collapse or acquire an overshoot');
});

test('every beauty strength starts from immutable raw data and obeys its displacement limit',()=>{
  const original=trace([stroke(line())]),saved=structuredClone(original);
  const standard=beautifyTrace(original);
  const strong=beautifyTrace({...original,strength:'strong'});
  const light=beautifyTrace({...original,strength:'light'});
  assert.notDeepEqual(strong,light);assert.deepEqual(beautifyTrace(original),standard);assert.deepEqual(original,saved);
  for(const points of [standard[0].points,strong[0].points,light[0].points]){
    assert.ok(points.every(point=>point.x>=.1&&point.x<=.8&&point.y>=.398-1e-9&&point.y<=.402+1e-9));
  }
});

test('raw dwell times and mouse pseudo-pressure never change prepared geometry, widths or playback',()=>{
  const points=line(81),plain=trace([stroke(points)]),paused=structuredClone(plain);
  paused.strokes[0].points=points.flatMap((point,index)=>index===40?[point,...Array.from({length:12},(_,j)=>({...point,t:point.t+(j+1)*500,pressure:1}))]:[{...point,t:point.t+(index>40?6000:0),pressure:index%3/2}]);
  assert.deepEqual(buildTraceBrush(paused),buildTraceBrush(plain));
  const brush=buildTraceBrush(plain),samples=brush.strokes[0].samples.filter(p=>p.u>.1&&p.u<.9);
  assert.ok(Math.max(...samples.map(p=>p.radius))/Math.min(...samples.map(p=>p.radius))<1.1);
  assert.equal(brush.duration,1);
});

test('pen pressure is smoothed spatially and only the overall path endpoints receive tapering',()=>{
  const first=Array.from({length:61},(_,i)=>({x:.1+i*.005,y:.35,t:i*10,pressure:i<30?.2:.9}));
  const second=Array.from({length:61},(_,i)=>({x:.4+i*.005,y:.35,t:8000+i*10,pressure:.9}));
  const joined=appendTraceStroke([stroke(first,'pen')],stroke(second,'pen'),16/9),data=trace(joined),brush=buildTraceBrush(data),scale=traceBrushTransform(data).scale;
  assert.equal(brush.strokes.length,1);assert.equal(beautifyTrace(trace(joined))[0].pressureEnabled,true);
  const samples=brush.strokes[0].samples,middle=samples.filter(p=>p.u>.4&&p.u<.6);
  assert.ok(Math.min(...middle.map(p=>p.radius/scale))>TRACE_BASE_RADIUS*.65,'resume seam has no intermediate taper');
  assert.ok(samples[0].radius<samples[Math.floor(samples.length*.15)].radius);
  assert.ok(samples.at(-1)!.radius<samples[Math.floor(samples.length*.85)].radius);
  assert.ok(samples.every((p,i)=>!i||Math.abs(p.radius-samples[i-1].radius)/scale<TRACE_BASE_RADIUS*.13),'pressure steps cannot become abrupt bumps');
});

test('short dots survive and source-to-brush mapping retains physical aspect and board alignment',()=>{
  const raw=trace([stroke([{x:.2,y:.4,t:0},{x:.6,y:.5,t:500}]),stroke([{x:.7,y:.2,t:2000}])]);
  const brush=buildTraceBrush(raw),transform=traceBrushTransform(raw),beauty=beautifyTrace(raw);
  assert.equal(brush.strokes.length,2);assert.ok(brush.strokes[1].samples.every(p=>p.radius/transform.scale>TRACE_BASE_RADIUS*.85));
  for(let i=0;i<brush.strokes.length;i++){
    const start=brush.strokes[i].samples[0],source=beauty[i].points[0];
    assert.ok(distance({x:start.x/transform.scale+transform.offsetX,y:(start.y/transform.scale+transform.offsetY)*raw.aspect,t:0},source,raw.aspect)<1e-9);
    for(const u of [0,.15,.5,.9,1])assert.ok(Number.isFinite(traceSampleRadius(brush.strokes[i],u))&&traceSampleRadius(brush.strokes[i],u)>0);
  }
  assert.ok(Object.values(brush.box).every(Number.isFinite));
  assert.throws(()=>buildTraceBrush(trace([])),/先描写/);
});

test('a dense backtracking trace cannot expand into unbounded prepared ink samples',()=>{
  const points=Array.from({length:500},(_,i)=>({x:i%2?.9:.1,y:.3+i*.0002,t:i*5}));
  const brush=buildTraceBrush(trace([stroke(points)]));
  assert.ok(brush.strokes.reduce((sum,item)=>sum+item.samples.length,0)<=24002);
  assert.ok(brush.strokes[0].samples.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.radius)));
});

test('adding a distant stroke cannot thicken previously written ink in board coordinates',()=>{
  const initial=trace([stroke(Array.from({length:81},(_,i)=>({x:.1+i*.001,y:.2,t:i*10})))],'light');
  const extended=trace([...initial.strokes,stroke([{x:.7,y:.8,t:2000},{x:.9,y:.9,t:2500}])],'light');
  const before=buildTraceBrush(initial),after=buildTraceBrush(extended),beforeScale=traceBrushTransform(initial).scale,afterScale=traceBrushTransform(extended).scale;
  assert.ok(beforeScale>afterScale*10,'fixture must expand the signature bounding box substantially');
  for(const u of [.3,.4,.5,.6])assert.ok(Math.abs(traceSampleRadius(before.strokes[0],u)/beforeScale-traceSampleRadius(after.strokes[0],u)/afterScale)<1e-10,'old ink width stays fixed in board coordinates');
});

test('beautification strength never changes the source-board base width',()=>{
  const raw=stroke(Array.from({length:121},(_,i)=>({x:.1+i*.005,y:.4,t:i*10}))),widths:number[]=[];
  for(const strength of ['light','standard','strong'] as const){
    const data=trace([raw],strength),brush=buildTraceBrush(data),scale=traceBrushTransform(data).scale;
    assert.ok(Math.abs(brush.strokes[0].width/(2*scale)-TRACE_BASE_RADIUS)<1e-12);
    widths.push(traceSampleRadius(brush.strokes[0],.5)/scale);
  }
  assert.ok(widths.every(value=>Math.abs(value-widths[0])<1e-12));
});
