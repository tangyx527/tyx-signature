import {z} from 'zod';
import {pointAt,pointBounds,type Curve,type Point} from '../src/geometry';
import type {InkSample,PreparedBrush,PreparedStroke} from './brush-engine';

export const TRACE_MAX_STROKES=300;
export const TRACE_MAX_POINTS=40000;
export const TRACE_JOIN_DISTANCE=.025;
// Radius is measured against the source board width, never the evolving ink bounds.
export const TRACE_BASE_RADIUS=.0018;
const finite=(min:number,max:number)=>z.number().finite().min(min).max(max);
const pointSchema=z.object({x:finite(0,1),y:finite(0,1),t:finite(0,86400000),pressure:finite(0,1).optional()}).strict();
const strokeSchema=z.object({points:z.array(pointSchema).min(1).max(TRACE_MAX_POINTS),join:z.boolean(),pointerType:z.enum(['mouse','touch','pen'])}).strict();
export const traceSchema=z.object({version:z.literal(1),aspect:finite(.25,4),strength:z.enum(['light','standard','strong']),strokes:z.array(strokeSchema).max(TRACE_MAX_STROKES)}).strict().superRefine((trace,ctx)=>{
  let count=0,previous=-1;
  for(let i=0;i<trace.strokes.length;i++)for(let j=0;j<trace.strokes[i].points.length;j++){
    const point=trace.strokes[i].points[j];count++;
    if(point.t<previous)ctx.addIssue({code:'custom',path:['strokes',i,'points',j,'t'],message:'描图轨迹时间必须按采集顺序排列'});
    previous=point.t;
  }
  if(count>TRACE_MAX_POINTS)ctx.addIssue({code:'custom',path:['strokes'],message:'描图轨迹最多保留 40000 个采样点'});
});
export type TraceData=z.infer<typeof traceSchema>;
export type TracePoint=z.infer<typeof pointSchema>;
export type TraceStroke=z.infer<typeof strokeSchema>;
export type TraceStrength=TraceData['strength'];
export type TraceSegment={points:TracePoint[];pressureEnabled:boolean};
export type TraceBrushTransform={scale:number;offsetX:number;offsetY:number};

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const physicalDistance=(a:Point,b:Point,aspect:number)=>Math.hypot(b.x-a.x,(b.y-a.y)/aspect);
const copyPoint=(point:TracePoint):TracePoint=>({x:point.x,y:point.y,t:point.t,...(point.pressure!==undefined?{pressure:point.pressure}:{})});
const mixPoint=(a:TracePoint,b:TracePoint,u:number):TracePoint=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,t:a.t+(b.t-a.t)*u,...(a.pressure!==undefined||b.pressure!==undefined?{pressure:(a.pressure??b.pressure??.5)+((b.pressure??a.pressure??.5)-(a.pressure??b.pressure??.5))*u}:{})});

/** Gestures remain separate raw records, even when they form one continuous signature. */
export function appendTraceStroke(strokes:readonly TraceStroke[],stroke:TraceStroke,aspect:number):TraceStroke[]{
  if(!Number.isFinite(aspect)||aspect<.25||aspect>4)throw new Error('描图画布比例无效');
  if(strokes.length>=TRACE_MAX_STROKES)throw new Error('描图最多支持 300 次落笔，请先撤销或清空部分轨迹');
  const next=strokeSchema.parse(stroke);
  if(strokes.reduce((count,item)=>count+item.points.length,0)+next.points.length>TRACE_MAX_POINTS)throw new Error('描图采样点已达上限，请先撤销或清空部分轨迹');
  const previous=strokes.at(-1)?.points.at(-1);
  next.join=!!previous&&physicalDistance(previous,next.points[0],aspect)<=TRACE_JOIN_DISTANCE;
  return [...strokes.map(item=>({...item,points:item.points.map(copyPoint)})),next];
}

function mergedSegments(trace:TraceData):TraceSegment[]{
  const result:TraceSegment[]=[];
  for(const stroke of trace.strokes){
    const points=stroke.points.map(point=>({...point,...(stroke.pointerType==='pen'?{}:{pressure:undefined})}));
    const previous=result.at(-1),last=previous?.points.at(-1);
    // Recheck imported flags: a malformed file must not draw a bridge across the canvas.
    if(previous&&stroke.join&&last&&physicalDistance(last,points[0],trace.aspect)<=TRACE_JOIN_DISTANCE){
      previous.points.push(...points);
      previous.pressureEnabled=previous.pressureEnabled&&stroke.pointerType==='pen';
    }else result.push({points,pressureEnabled:stroke.pointerType==='pen'});
  }
  return result;
}

type Sample=TracePoint&{pinned:boolean;sourceLength:number};
function cumulative(points:readonly TracePoint[],aspect:number):number[]{
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+physicalDistance(points[i-1],points[i],aspect));return lengths;
}
function deduplicate(points:readonly TracePoint[],aspect:number):TracePoint[]{
  if(points.length<2)return points.map(copyPoint);
  const result=[copyPoint(points[0])];
  for(let i=1;i<points.length-1;i++)if(physicalDistance(result.at(-1)!,points[i],aspect)>=.00015)result.push(copyPoint(points[i]));
  const last=points.at(-1)!;
  if(physicalDistance(result.at(-1)!,last,aspect)<1e-9){
    // Preserve end coordinates/time without letting a stationary dwell create thick ink.
    if(result.length>1)result[result.length-1]={...result.at(-1)!,x:last.x,y:last.y,t:last.t};
    else if(last.t!==result[0].t)result.push({...result[0],t:last.t});
  }else result.push(copyPoint(last));
  return result;
}
function protectedIndices(points:readonly TracePoint[],aspect:number,lengths:readonly number[]):number[]{
  if(points.length<=2)return points.map((_,index)=>index);
  const candidates:{index:number;score:number}[]=[];let left=0,right=1;
  for(let i=1;i<points.length-1;i++){
    while(left<i-1&&lengths[i]-lengths[left+1]>=.006)left++;
    right=Math.max(right,i+1);while(right<points.length-1&&lengths[right]-lengths[i]<.006)right++;
    const a=points[left],p=points[i],b=points[right],ax=p.x-a.x,ay=(p.y-a.y)/aspect,bx=b.x-p.x,by=(b.y-p.y)/aspect;
    const denominator=Math.hypot(ax,ay)*Math.hypot(bx,by);
    if(denominator>1e-12&&(ax*bx+ay*by)/denominator<.45){
      const before=points[i-1],after=points[i+1],ux=p.x-before.x,uy=(p.y-before.y)/aspect,vx=after.x-p.x,vy=(after.y-p.y)/aspect,local=Math.hypot(ux,uy)*Math.hypot(vx,vy);
      candidates.push({index:i,score:1-(ax*bx+ay*by)/denominator+(local>1e-12?(1-(ux*vx+uy*vy)/local)*.25:0)});
    }
  }
  // One corner produces a neighbourhood of large angles. Pin its apex, not both legs.
  const pinned=[0];let best=candidates[0];
  for(const candidate of candidates.slice(1)){
    if(lengths[candidate.index]-lengths[best.index]<.004){if(candidate.score>best.score)best=candidate;}
    else{pinned.push(best.index);best=candidate;}
  }
  if(best)pinned.push(best.index);
  pinned.push(points.length-1);return pinned;
}
function spatialSamples(points:readonly TracePoint[],aspect:number,step:number):Sample[]{
  if(points.length<=1)return points.map(point=>({...point,pinned:true,sourceLength:0}));
  const lengths=cumulative(points,aspect),pins=protectedIndices(points,aspect,lengths),result:Sample[]=[];
  for(let segment=1;segment<pins.length;segment++){
    const first=pins[segment-1],last=pins[segment],start=lengths[first],length=lengths[last]-start,count=Math.max(1,Math.ceil(length/step));let cursor=first+1;
    for(let sample=segment===1?0:1;sample<=count;sample++){
      if(sample===0){result.push({...points[first],pinned:true,sourceLength:lengths[first]});continue;}
      if(sample===count){result.push({...points[last],pinned:true,sourceLength:lengths[last]});continue;}
      const target=start+length*sample/count;
      while(cursor<last&&lengths[cursor]<target)cursor++;
      const from=Math.max(first,cursor-1),u=(target-lengths[from])/Math.max(1e-12,lengths[cursor]-lengths[from]);
      result.push({...mixPoint(points[from],points[cursor],u),pinned:false,sourceLength:target});
    }
  }
  return result;
}
const beautySettings={light:{radius:.0024,deviation:.0012},standard:{radius:.0048,deviation:.0027},strong:{radius:.0072,deviation:.0045}} as const;

function lineDistance(point:Point,a:Point,b:Point,aspect:number):number{
  const dx=b.x-a.x,dy=(b.y-a.y)/aspect,length=dx*dx+dy*dy,u=length?clamp(((point.x-a.x)*dx+(point.y-a.y)/aspect*dy)/length,0,1):0;
  return Math.hypot(point.x-a.x-dx*u,(point.y-a.y)/aspect-dy*u);
}
type FitKnot={index:number;point:TracePoint;factor:number};
type BeautySettings=typeof beautySettings[TraceStrength];
/** Fit one shared-tangent curve, accepting whole spans rather than clamping output points. */
function roundedSamples(samples:readonly Sample[],original:readonly TracePoint[],aspect:number,settings:BeautySettings,outputStep:number):TracePoint[]{
  if(samples.length<3)return samples.map(copyPoint);
  const lengths=cumulative(samples,aspect),total=lengths.at(-1)!;
  if(total<.001)return original.map(copyPoint);
  const spacing=Math.max(settings.radius*2.5,outputStep*3),indices=[0];
  for(let i=1;i<samples.length-1;i++)if(samples[i].pinned||lengths[i]-lengths[indices.at(-1)!]>=spacing)indices.push(i);
  indices.push(samples.length-1);
  // Insert route landmarks before fitting so a loop/hook cannot become a shortcut.
  const refined=[0],pending=indices.slice(1).reverse();
  while(pending.length){
    const end=pending.pop()!,start=refined.at(-1)!;let error=0,split=-1;
    for(let i=start+1;i<end;i++){const distance=lineDistance(samples[i],samples[start],samples[end],aspect);if(distance>error){error=distance;split=i;}}
    const arc=lengths[end]-lengths[start],chord=physicalDistance(samples[start],samples[end],aspect);
    if(end-start>1&&(error>settings.deviation*.8||arc>Math.max(chord*1.65,outputStep*3))){
      if(split<0)split=(start+end)>>1;
      pending.push(end,split);
    }else refined.push(end);
  }
  const knots:FitKnot[]=refined.map(index=>{
    const point=samples[index];
    if(point.pinned)return{index,point:copyPoint(point),factor:1};
    let x=0,y=0,weight=0;
    for(let i=index;i>=0&&lengths[index]-lengths[i]<=settings.radius;i--){const w=1-(lengths[index]-lengths[i])/settings.radius;x+=samples[i].x*w;y+=samples[i].y*w;weight+=w;}
    for(let i=index+1;i<samples.length&&lengths[i]-lengths[index]<=settings.radius;i++){const w=1-(lengths[i]-lengths[index])/settings.radius;x+=samples[i].x*w;y+=samples[i].y*w;weight+=w;}
    const candidate={x:x/weight,y:y/weight},distance=physicalDistance(point,candidate,aspect),amount=Math.min(1,settings.deviation*.35/Math.max(distance,1e-12));
    return{index,point:{...point,x:point.x+(candidate.x-point.x)*amount,y:point.y+(candidate.y-point.y)*amount},factor:1};
  });
  const originalLengths=cumulative(original,aspect),routePointAt=(distance:number):number=>{
    let low=0,high=original.length-1;
    while(low<high){const middle=(low+high)>>1;if(originalLengths[middle]<distance)low=middle+1;else high=middle;}
    return low;
  };
  const routes=knots.slice(0,-1).map((knot,index)=>{
    const start=samples[knot.index],end=samples[knots[index+1].index],points=[{...copyPoint(start),sourceLength:start.sourceLength}];
    for(let i=routePointAt(start.sourceLength);i<original.length&&originalLengths[i]<end.sourceLength;i++)if(originalLengths[i]>start.sourceLength)points.push({...copyPoint(original[i]),sourceLength:originalLengths[i]});
    points.push({...copyPoint(end),sourceLength:end.sourceLength});return points;
  });
  const closed=physicalDistance(samples[0],samples.at(-1)!,aspect)<1e-8;
  const tangent=(index:number,side:-1|1):Point=>{
    let before=Math.max(0,index-1),after=Math.min(knots.length-1,index+1),span=lengths[knots[after].index]-lengths[knots[before].index];
    if(closed&&(index===0||index===knots.length-1)&&knots.length>3){before=knots.length-2;after=1;span=total-lengths[knots[before].index]+lengths[knots[after].index];}
    else if(samples[knots[index].index].pinned){before=side<0?Math.max(0,index-1):index;after=side<0?index:Math.min(knots.length-1,index+1);span=lengths[knots[after].index]-lengths[knots[before].index];}
    return{x:(knots[after].point.x-knots[before].point.x)/Math.max(span,1e-12)*knots[index].factor,y:(knots[after].point.y-knots[before].point.y)/aspect/Math.max(span,1e-12)*knots[index].factor};
  };
  const metadata=(start:number,end:number,u:number):TracePoint=>{
    const target=lengths[start]+(lengths[end]-lengths[start])*u;let low=start,high=end;
    while(low<high){const middle=(low+high)>>1;if(lengths[middle]<target)low=middle+1;else high=middle;}
    const previous=Math.max(start,low-1),fraction=(target-lengths[previous])/Math.max(1e-12,lengths[low]-lengths[previous]);
    return mixPoint(samples[previous],samples[low],clamp(fraction,0,1));
  };
  const curve=(index:number,count:number):TracePoint[]=>{
    const a=knots[index],b=knots[index+1],h=lengths[b.index]-lengths[a.index],first=tangent(index,1),last=tangent(index+1,-1);
    return Array.from({length:count+1},(_,i)=>{
      const u=i/count,u2=u*u,u3=u2*u,ha=2*u3-3*u2+1,hb=-2*u3+3*u2,hc=u3-2*u2+u,hd=u3-u2,point=metadata(a.index,b.index,u);
      return{...point,x:ha*a.point.x+hb*b.point.x+h*(hc*first.x+hd*last.x),y:ha*a.point.y+hb*b.point.y+h*aspect*(hc*first.y+hd*last.y)};
    });
  };
  const accepted=(index:number,points:readonly TracePoint[]):boolean=>{
    const route=routes[index],budget=settings.deviation*.95;
    for(const point of points){
      if(point.x<0||point.x>1||point.y<0||point.y>1)return false;
      let distance=Infinity;for(let i=1;i<route.length;i++)distance=Math.min(distance,lineDistance(point,route[i-1],route[i],aspect));if(distance>budget)return false;
    }
    for(const point of route){
      let distance=Infinity;for(let j=1;j<points.length;j++)distance=Math.min(distance,lineDistance(point,points[j-1],points[j],aspect));if(distance>budget)return false;
    }
    return true;
  };
  let failed=new Set<number>();
  for(let attempt=0;attempt<5;attempt++){
    failed=new Set();const reduced=new Set<number>();
    for(let i=0;i<knots.length-1;i++)if(!accepted(i,curve(i,Math.max(12,Math.min(64,Math.ceil((lengths[knots[i+1].index]-lengths[knots[i].index])/outputStep)))))){failed.add(i);reduced.add(i);reduced.add(i+1);}
    if(!failed.size||attempt===4)break;
    // Shared factors preserve C1 tangents at ordinary joins while shortening both handles.
    for(const index of reduced)knots[index].factor*=.5;
  }
  const result:TracePoint[]=[];
  for(let i=0;i<knots.length-1;i++){
    const from=knots[i].index,to=knots[i+1].index,start=samples[from].sourceLength,sourceSpan=samples[to].sourceLength-start;
    const points=failed.has(i)?routes[i].map(point=>({...metadata(from,to,sourceSpan?(point.sourceLength-start)/sourceSpan:0),x:point.x,y:point.y,t:point.t})):curve(i,Math.max(1,Math.min(64,Math.ceil((lengths[to]-lengths[from])/outputStep))));
    result.push(...(i?points.slice(1):points));
  }
  // Original endpoints and sharp landmarks are never moved by the knot fit.
  result[0]=copyPoint(samples[0]);result[result.length-1]=copyPoint(samples.at(-1)!);return result;
}

/** A bounded corner-aware curve fit, recalculated from raw data for every strength. */
export function beautifyTrace(input:TraceData):TraceSegment[]{
  const trace=traceSchema.parse(input),merged=mergedSegments(trace),settings=beautySettings[trace.strength];
  const clean=merged.map(segment=>({...segment,points:deduplicate(segment.points,trace.aspect)}));
  const totalLength=clean.reduce((sum,segment)=>sum+cumulative(segment.points,trace.aspect).at(-1)!,0);
  // Keep work bounded for long traces; sparse originals and short marks are not discarded.
  const step=Math.max(.0012,totalLength/12000);
  return clean.map(segment=>{
    const samples=spatialSamples(segment.points,trace.aspect,step),lengths=cumulative(samples,trace.aspect);
    const validPressure=samples.map(point=>point.pressure).filter((value):value is number=>value!==undefined&&value>.01);
    const pressureEnabled=segment.pressureEnabled&&validPressure.length>=Math.max(2,samples.length*.6)&&
      (Math.max(...validPressure)-Math.min(...validPressure)>.02||Math.abs(validPressure.reduce((sum,p)=>sum+p,0)/validPressure.length-.5)>.04);
    let pressureLeft=0,pressureRight=0;
    const pressureSamples=samples.map((point,index):Sample=>{
      const output:Sample={x:point.x,y:point.y,t:point.t,pinned:point.pinned,sourceLength:point.sourceLength};
      if(pressureEnabled){
        while(pressureLeft<index&&lengths[index]-lengths[pressureLeft]>.008)pressureLeft++;
        pressureRight=Math.max(pressureRight,index);while(pressureRight+1<samples.length&&lengths[pressureRight+1]-lengths[index]<=.008)pressureRight++;
        let pressure=0,total=0;for(let j=pressureLeft;j<=pressureRight;j++){const w=Math.exp(-3*((lengths[j]-lengths[index])/.008)**2);pressure+=(samples[j].pressure??.5)*w;total+=w;}
        output.pressure=clamp(pressure/total,.05,1);
      }
      return output;
    });
    return {points:roundedSamples(pressureSamples,segment.points,trace.aspect,settings,Math.max(.0007,totalLength/18000)),pressureEnabled};
  });
}

function transformation(segments:readonly TraceSegment[],aspect:number):TraceBrushTransform{
  const points=segments.flatMap(segment=>segment.points.map(point=>({x:point.x,y:point.y/aspect})));
  if(!points.length)return {scale:800,offsetX:0,offsetY:0};
  const box=pointBounds(points);
  return {scale:Math.min(1000/Math.max(box.maxX-box.minX,.001),200/Math.max(box.maxY-box.minY,.001)),offsetX:box.minX,offsetY:box.minY};
}
export function traceBrushTransform(trace:TraceData):TraceBrushTransform{return transformation(beautifyTrace(trace),trace.aspect);}

/** Fixed samples serve normal painting, partial playback, particles and morphing alike. */
export function buildTraceBrush(trace:TraceData):PreparedBrush{
  const segments=beautifyTrace(trace),transform=transformation(segments,trace.aspect);
  if(!segments.length)throw new Error('请先描写签名，再完成并应用');
  const baseRadius=TRACE_BASE_RADIUS*transform.scale;
  const prepared=segments.map(segment=>{
    const source=segment.points.map(point=>({...point,x:(point.x-transform.offsetX)*transform.scale,y:(point.y/trace.aspect-transform.offsetY)*transform.scale}));
    let length=0;
    const points:Curve['points']=source.map((point,index)=>{if(index)length+=Math.hypot(point.x-source[index-1].x,point.y-source[index-1].y);return{x:point.x,y:point.y,length};});
    if(points.length===1)points.push({...points[0]});
    return {source,pressureEnabled:segment.pressureEnabled,curve:{points,length}};
  });
  const weights=prepared.map(segment=>Math.max(2,segment.curve.length)),total=weights.reduce((sum,n)=>sum+n,0),liftBudget=Math.min(.16,Math.max(0,prepared.length-1)*.025),gap=prepared.length>1?liftBudget/(prepared.length-1):0;
  const inkStep=Math.max(1.4,prepared.reduce((sum,segment)=>sum+segment.curve.length,0)/24000);
  let clock=0;
  const strokes:PreparedStroke[]=prepared.map((segment,index)=>{
    if(index)clock+=gap;
    const duration=weights[index]/total*(1-liftBudget),start=clock;clock+=duration;
    const count=Math.max(1,Math.ceil(segment.curve.length/inkStep));let pressureIndex=1;
    const samples:InkSample[]=Array.from({length:count+1},(_,sampleIndex)=>{
      const u=sampleIndex/count,point=pointAt(segment.curve,u),distance=u*segment.curve.length;
      while(pressureIndex<segment.curve.points.length-1&&segment.curve.points[pressureIndex].length<distance)pressureIndex++;
      const a=Math.max(0,pressureIndex-1),b=Math.min(segment.source.length-1,pressureIndex),mix=(distance-segment.curve.points[a].length)/Math.max(1e-12,segment.curve.points[pressureIndex].length-segment.curve.points[a].length);
      const pressure=segment.pressureEnabled?(segment.source[a]?.pressure??.5)+((segment.source[b]?.pressure??.5)-(segment.source[a]?.pressure??.5))*mix:.5;
      const before=pointAt(segment.curve,Math.max(0,u-.015)),after=pointAt(segment.curve,Math.min(1,u+.015)),dy=after.y-before.y,tangent=Math.hypot(after.x-before.x,dy)||1;
      const nib=.93+.07*Math.max(0,dy/tangent),ease=(n:number)=>{const v=clamp(n,0,1);return v*v*(3-2*v);};
      const sourceLength=segment.curve.length/transform.scale,sourceDistance=distance/transform.scale;
      const taper=sourceLength<TRACE_BASE_RADIUS*.5?1:Math.min(index===0?.35+.65*ease(sourceDistance/Math.min(TRACE_BASE_RADIUS*7,sourceLength*.2)):1,index===prepared.length-1?.12+.88*ease((sourceLength-sourceDistance)/Math.min(TRACE_BASE_RADIUS*10,sourceLength*.25)):1);
      return {...point,u,radius:Math.max(baseRadius*.03,baseRadius*(.65+.7*pressure)*nib*taper)};
    });
    return {id:`trace-${index}`,char:'',index,curve:segment.curve,start,duration,width:baseRadius*2,position:index===0?'initial':index===prepared.length-1?'terminal':'medial',dot:false,samples,fixedInk:true};
  });
  const box=pointBounds(strokes.flatMap(stroke=>stroke.samples.flatMap(point=>[{x:point.x-point.radius,y:point.y-point.radius},{x:point.x+point.radius,y:point.y+point.radius}])));
  return {strokes,duration:1,box,guide:{baseline:box.maxY,xHeight:Math.max(1,box.maxY-box.minY),hasDescenders:false,bodyStart:box.minX,bodyEnd:box.maxX}};
}

export function traceSampleRadius(stroke:PreparedStroke,u:number):number{
  const samples=stroke.samples;if(!samples.length)return Math.max(Number.EPSILON,stroke.width/2);
  const position=clamp(u,0,1)*(samples.length-1),index=Math.floor(position),next=Math.min(samples.length-1,index+1),mix=position-index;
  return samples[index].radius+(samples[next].radius-samples[index].radius)*mix;
}
