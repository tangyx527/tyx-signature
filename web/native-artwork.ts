import type {AuthoredRibbon,RibbonSample} from './ink-ribbon-handoff';

export type NativePoint={x:number;y:number;z?:number};
export type NativePointMap=((point:NativePoint)=>NativePoint)&{meshBounds?:ArtworkBounds;meshAxis?:NativePoint};
export type ArtworkBounds={x:number;y:number;width:number;height:number};
export type RibbonArtworkSpec={start:NativePoint;end:NativePoint;halfWidth:number;bounds?:ArtworkBounds};
type Surface=HTMLCanvasElement|OffscreenCanvas;
type Source={canvas:Surface;context:CanvasRenderingContext2D};
type Vertex={x:number;y:number;z:number;u:number;v:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const sources:Source[]=[];let sourceIndex=0;

function canvas(width:number,height:number):Surface{
 if(typeof document!=='undefined'){const result=document.createElement('canvas');result.width=width;result.height=height;return result;}
 return new OffscreenCanvas(width,height);
}
function sourceFor(width:number,height:number):Source{
 let source=sources[sourceIndex];
 if(!source){const surface=canvas(width,height);source={canvas:surface,context:surface.getContext('2d') as CanvasRenderingContext2D};sources.push(source);}
 sourceIndex++;
 if(source.canvas.width!==width)source.canvas.width=width;
 if(source.canvas.height!==height)source.canvas.height=height;
 return source;
}
export function beginNativeArtworkFrame():void{sourceIndex=0;}

export function ribbonSampleAt(ribbon:AuthoredRibbon,u:number):RibbonSample{
 const at=clamp(u)*(ribbon.samples.length-1),i=Math.floor(at),j=Math.min(ribbon.samples.length-1,i+1),t=at-i,a=ribbon.samples[i],b=ribbon.samples[j];
 const point=(x:NativePoint,y:NativePoint)=>({x:x.x+(y.x-x.x)*t,y:x.y+(y.y-x.y)*t});
 return {...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,radius:a.radius+(b.radius-a.radius)*t,left:a.left&&b.left?point(a.left,b.left):undefined,right:a.right&&b.right?point(a.right,b.right):undefined};
}
export function ribbonArtworkMetrics(ribbon:AuthoredRibbon):{length:number;radius:number;bounds:ArtworkBounds}{
 let length=0,radius=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 ribbon.samples.forEach((q,i,list)=>{
  if(i)length+=Math.hypot(q.x-list[i-1].x,q.y-list[i-1].y);
  radius=Math.max(radius,q.radius);
  minX=Math.min(minX,q.x-q.radius,q.left?.x??q.x,q.right?.x??q.x);minY=Math.min(minY,q.y-q.radius,q.left?.y??q.y,q.right?.y??q.y);
  maxX=Math.max(maxX,q.x+q.radius,q.left?.x??q.x,q.right?.x??q.x);maxY=Math.max(maxY,q.y+q.radius,q.left?.y??q.y,q.right?.y??q.y);
 });
 return {length,radius,bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY}};
}
function visible(ribbon:AuthoredRibbon):boolean{
 if(ribbon.samples.length<2)return false;
 const metrics=ribbonArtworkMetrics(ribbon);return metrics.radius>.025&&metrics.radius*Math.max(metrics.length,metrics.radius)>.04;
}

/** Only the destination trajectory bends; colours, facets, veins and glows come from the entry painter. */
export function createRibbonMap(ribbon:AuthoredRibbon,spec:Omit<RibbonArtworkSpec,'bounds'>):NativePointMap{
 const dx=spec.end.x-spec.start.x,dy=spec.end.y-spec.start.y,sourceLength=Math.hypot(dx,dy)||1,tx=dx/sourceLength,ty=dy/sourceLength,nx=-ty,ny=tx;
 const metrics=ribbonArtworkMetrics(ribbon),crossScale=metrics.radius/Math.max(.001,spec.halfWidth);
 const map:NativePointMap=point=>{
  const px=point.x-spec.start.x,py=point.y-spec.start.y,u=(px*tx+py*ty)/sourceLength,at=clamp(u),q=ribbonSampleAt(ribbon,at),a=ribbonSampleAt(ribbon,Math.max(0,at-.012)),b=ribbonSampleAt(ribbon,Math.min(1,at+.012));
  let ex=b.x-a.x,ey=b.y-a.y,length=Math.hypot(ex,ey);if(length<.000001){ex=tx;ey=ty;length=1;}ex/=length;ey/=length;
  let cx=-ey,cy=ex;
  if(q.left&&q.right){const x=q.left.x-q.right.x,y=q.left.y-q.right.y,d=Math.hypot(x,y);if(d>.000001){cx=x/d;cy=y/d;}}
  const across=(px*nx+py*ny)*crossScale,extra=(u-at)*sourceLength*crossScale;
  return {x:q.x+cx*across+ex*extra,y:q.y+cy*across+ey*extra,z:q.z+(point.z??0)*crossScale};
 };
 map.meshBounds={x:Math.min(spec.start.x,spec.end.x)-Math.abs(nx)*spec.halfWidth,y:Math.min(spec.start.y,spec.end.y)-Math.abs(ny)*spec.halfWidth,width:Math.abs(dx)+Math.abs(nx)*spec.halfWidth*2,height:Math.abs(dy)+Math.abs(ny)*spec.halfWidth*2};
 map.meshAxis={x:tx,y:ty};return map;
}

/** Curved native subjects, such as the dragon, keep their original anatomical coordinates. */
export function createCurveRibbonMap(ribbon:AuthoredRibbon,spine:readonly NativePoint[],halfWidth:number):NativePointMap{
 const distances=[0];for(let i=1;i<spine.length;i++)distances.push(distances[i-1]+Math.hypot(spine[i].x-spine[i-1].x,spine[i].y-spine[i-1].y));
 const total=distances.at(-1)||1,metrics=ribbonArtworkMetrics(ribbon),crossScale=metrics.radius/Math.max(.001,halfWidth);
 return point=>{
  let best=Infinity,along=0,across=0;
  for(let i=1;i<spine.length;i++){
   const a=spine[i-1],b=spine[i],dx=b.x-a.x,dy=b.y-a.y,squared=dx*dx+dy*dy;if(squared<.000001)continue;
   const t=clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/squared),x=a.x+dx*t,y=a.y+dy*t,d=(point.x-x)**2+(point.y-y)**2;
   if(d<best){const length=Math.sqrt(squared);best=d;along=distances[i-1]+length*t;across=((point.x-x)*-dy+(point.y-y)*dx)/length;}
  }
  const u=along/total,q=ribbonSampleAt(ribbon,u),a=ribbonSampleAt(ribbon,Math.max(0,u-.012)),b=ribbonSampleAt(ribbon,Math.min(1,u+.012)),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
  return {x:q.x-dy/length*across*crossScale,y:q.y+dx/length*across*crossScale,z:q.z+(point.z??0)*crossScale};
 };
}

type MeshEngine={canvas:Surface;gl:WebGLRenderingContext;program:WebGLProgram;position:number;uv:number;buffer:WebGLBuffer;texture:WebGLTexture};
let mesh:MeshEngine|null|undefined;
function meshEngine():MeshEngine|null{
 if(mesh!==undefined)return mesh;
 try{
  const surface=canvas(1,1),gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true}) as WebGLRenderingContext|null;
  if(!gl)return mesh=null;
  const shader=(type:number,code:string)=>{const result=gl.createShader(type)!;gl.shaderSource(result,code);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw new Error('Native artwork shader');return result;};
  const program=gl.createProgram()!;
  gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;varying vec2 tex;void main(){tex=uv;gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D artwork;void main(){gl_FragColor=texture2D(artwork,tex);}'));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Native artwork program');
  const buffer=gl.createBuffer()!,texture=gl.createTexture()!;
  mesh={canvas:surface,gl,program,position:gl.getAttribLocation(program,'position'),uv:gl.getAttribLocation(program,'uv'),buffer,texture};return mesh;
 }catch{return mesh=null;}
}
function drawMesh(ctx:CanvasRenderingContext2D,source:Surface,vertices:readonly Vertex[],columns:number,rows:number):boolean{
 const engine=meshEngine();if(!engine||engine.gl.isContextLost())return false;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const q of vertices){if(!Number.isFinite(q.x)||!Number.isFinite(q.y))return true;minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);}
 const width=maxX-minX,height=maxY-minY;if(width<.01||height<.01)return true;
 const ratio=Math.min(1.5,2048/Math.max(width,height)),pixelWidth=Math.max(1,Math.ceil(width*ratio)),pixelHeight=Math.max(1,Math.ceil(height*ratio));
 const triangles:Array<{points:Vertex[];z:number}>=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const a=vertices[y*(columns+1)+x],b=vertices[y*(columns+1)+x+1],c=vertices[(y+1)*(columns+1)+x],d=vertices[(y+1)*(columns+1)+x+1];
  for(const points of [[a,b,c],[b,d,c]])triangles.push({points,z:points.reduce((n,q)=>n+q.z,0)/3});
 }
 const data=new Float32Array(triangles.length*12);let cursor=0;
 for(const triangle of triangles.sort((a,b)=>a.z-b.z))for(const q of triangle.points){data[cursor++]=(q.x-minX)/width*2-1;data[cursor++]=1-(q.y-minY)/height*2;data[cursor++]=q.u;data[cursor++]=q.v;}
 const {gl}=engine;if(engine.canvas.width!==pixelWidth)engine.canvas.width=pixelWidth;if(engine.canvas.height!==pixelHeight)engine.canvas.height=pixelHeight;
 gl.viewport(0,0,pixelWidth,pixelHeight);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(engine.program);
 gl.bindBuffer(gl.ARRAY_BUFFER,engine.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STREAM_DRAW);
 gl.enableVertexAttribArray(engine.position);gl.vertexAttribPointer(engine.position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(engine.uv);gl.vertexAttribPointer(engine.uv,2,gl.FLOAT,false,16,8);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,engine.texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1i(gl.getUniformLocation(engine.program,'artwork'),0);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,triangles.length*3);
 ctx.drawImage(engine.canvas,minX,minY,width,height);return true;
}
function drawTriangle(ctx:CanvasRenderingContext2D,source:Surface,points:readonly Vertex[]):void{
 const [a,b,c]=points,x0=a.u*source.width,y0=a.v*source.height,x1=b.u*source.width,y1=b.v*source.height,x2=c.u*source.width,y2=c.v*source.height;
 const denominator=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(denominator)<.000001)return;
 const solve=(p0:number,p1:number,p2:number)=>[(p0*(y1-y2)+p1*(y2-y0)+p2*(y0-y1))/denominator,(p0*(x2-x1)+p1*(x0-x2)+p2*(x1-x0))/denominator,(p0*(x1*y2-x2*y1)+p1*(x2*y0-x0*y2)+p2*(x0*y1-x1*y0))/denominator];
 const x=solve(a.x,b.x,c.x),y=solve(a.y,b.y,c.y);
 ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();ctx.transform(x[0],y[0],x[1],y[1],x[2],y[2]);ctx.drawImage(source,0,0);ctx.restore();
}

/** Native vector art is rasterized once, then warped as RGBA. Shared GPU edges avoid a visible mesh grid. */
export function drawMappedArtwork(ctx:CanvasRenderingContext2D,bounds:ArtworkBounds,map:NativePointMap,painter:(context:CanvasRenderingContext2D)=>void,scale=1.5):void{
 if(bounds.width<=0||bounds.height<=0)return;
 const resolution=Math.min(scale,2048/Math.max(bounds.width,bounds.height)),source=sourceFor(Math.max(1,Math.ceil(bounds.width*resolution)),Math.max(1,Math.ceil(bounds.height*resolution))),paint=source.context;
 paint.setTransform(resolution,0,0,resolution,-bounds.x*resolution,-bounds.y*resolution);paint.clearRect(bounds.x,bounds.y,bounds.width,bounds.height);paint.globalAlpha=1;paint.globalCompositeOperation='source-over';paint.shadowBlur=0;paint.save();painter(paint);paint.restore();
 const nodes=(start:number,size:number,low:number|undefined,span:number|undefined,detail:number)=>{
  if(low===undefined||span===undefined)return Array.from({length:detail+1},(_,i)=>i/detail);
  const a=clamp((low-start)/size),b=clamp((low+span-start)/size),values=[0,1];
  for(let i=0;i<=4;i++){values.push(a*i/4,b+(1-b)*i/4);}
  for(let i=0;i<=detail;i++)values.push(a+(b-a)*i/detail);
  return [...new Set(values)].sort((x,y)=>x-y);
 };
 // Concentrate deformation samples on the actual native body, rather than spending them on halo padding.
 const xDetail=map.meshAxis?Math.abs(map.meshAxis.x)>.6?36:12:Math.max(10,Math.min(32,Math.ceil(bounds.width/12)));
 const yDetail=map.meshAxis?Math.abs(map.meshAxis.y)>.6?36:12:Math.max(10,Math.min(32,Math.ceil(bounds.height/12)));
 const xs=nodes(bounds.x,bounds.width,map.meshBounds?.x,map.meshBounds?.width,xDetail),ys=nodes(bounds.y,bounds.height,map.meshBounds?.y,map.meshBounds?.height,yDetail),columns=xs.length-1,rows=ys.length-1,vertices:Vertex[]=[];
 for(const v of ys)for(const u of xs){const q=map({x:bounds.x+u*bounds.width,y:bounds.y+v*bounds.height});vertices.push({x:q.x,y:q.y,z:q.z??0,u,v});}
 if(drawMesh(ctx,source.canvas,vertices,columns,rows))return;
 // Canvas fallback is kept for environments without a WebGL drawing surface.
 const fallback:Array<{points:Vertex[];z:number}>=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const a=vertices[y*(columns+1)+x],b=vertices[y*(columns+1)+x+1],c=vertices[(y+1)*(columns+1)+x],d=vertices[(y+1)*(columns+1)+x+1];
  for(const points of [[a,b,c],[b,d,c]])fallback.push({points,z:points.reduce((n,q)=>n+q.z,0)/3});
 }
 for(const triangle of fallback.sort((a,b)=>a.z-b.z))drawTriangle(ctx,source.canvas,triangle.points);
}

export function paintRibbonArtwork(ctx:CanvasRenderingContext2D,ribbon:AuthoredRibbon,spec:RibbonArtworkSpec,painter:(context:CanvasRenderingContext2D)=>void):void{
 if(!visible(ribbon))return;
 const pad=spec.halfWidth+20,bounds=spec.bounds??{x:Math.min(spec.start.x,spec.end.x)-pad,y:Math.min(spec.start.y,spec.end.y)-pad,width:Math.abs(spec.end.x-spec.start.x)+pad*2,height:Math.abs(spec.end.y-spec.start.y)+pad*2};
 drawMappedArtwork(ctx,bounds,createRibbonMap(ribbon,spec),painter);
}

export function paintAnchoredArtwork(ctx:CanvasRenderingContext2D,ribbon:AuthoredRibbon,options:{bounds:ArtworkBounds;anchor?:NativePoint;at?:number;scale?:number;rotation?:number},painter:(context:CanvasRenderingContext2D)=>void):void{
 if(!visible(ribbon))return;
 const {bounds}=options,metrics=ribbonArtworkMetrics(ribbon),u=options.at??.5,q=ribbonSampleAt(ribbon,u),a=ribbonSampleAt(ribbon,Math.max(0,u-.012)),b=ribbonSampleAt(ribbon,Math.min(1,u+.012)),rotation=options.rotation??Math.atan2(b.y-a.y,b.x-a.x);
 const anchor=options.anchor??{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2},fit=Math.min(metrics.bounds.width/Math.max(1,bounds.width),metrics.bounds.height/Math.max(1,bounds.height))*(options.scale??1);
 if(fit<.00001)return;
 ctx.save();ctx.translate(q.x,q.y);ctx.rotate(rotation);ctx.scale(fit,fit);ctx.translate(-anchor.x,-anchor.y);painter(ctx);ctx.restore();
}
