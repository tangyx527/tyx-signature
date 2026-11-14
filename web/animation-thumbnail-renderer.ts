import {prepareScene,renderScene} from './renderer';
import {resolveMotionSelection,type IntroPreset,type OutroPreset} from './animation-catalog';
import type {WebConfig} from './model';

export type AnimationThumbnailKind='intro'|'outro';
type Surfaces={frame:HTMLCanvasElement;mask:HTMLCanvasElement};
let surfaces:Surfaces|undefined;

function sharedSurfaces():Surfaces{
  if(!surfaces){
    const frame=document.createElement('canvas'),mask=document.createElement('canvas');
    mask.width=240;mask.height=135;
    surfaces={frame,mask};
  }
  return surfaces;
}

function thumbnailConfig(source:WebConfig,kind:AnimationThumbnailKind,preset:IntroPreset|OutroPreset):WebConfig{
  const config=structuredClone(source),selection=resolveMotionSelection(source.animation);
  // These are catalog views, not changes to the authored design. Keep its real
  // handwriting and palette while removing placement and ornament distractions.
  config.mode='single';
  config.canvas={...config.canvas,aspect:'landscape',transparent:true,fps:30};
  config.timing={...config.timing,duration:5,hold:.6};
  config.people[0].position={x:0,y:0,scale:1,rotation:0};
  config.people[0].decoration={...config.people[0].decoration,id:'none',offsetX:0,offsetY:0};
  config.animation={introOutroEnabled:true,intro:kind==='intro'?preset as IntroPreset:preset==='vortex'?selection.intro:'classic',outro:kind==='outro'?preset as OutroPreset:'none'};
  return config;
}

function artworkBounds(frame:HTMLCanvasElement,mask:HTMLCanvasElement){
  const ctx=mask.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.clearRect(0,0,mask.width,mask.height);ctx.drawImage(frame,0,0,mask.width,mask.height);
  const pixels=ctx.getImageData(0,0,mask.width,mask.height).data;
  let minX=mask.width,minY=mask.height,maxX=-1,maxY=-1;
  for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++){
    if(pixels[(y*mask.width+x)*4+3]<12)continue;
    minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  if(maxX<minX||maxY<minY)return null;
  const sx=frame.width/mask.width,sy=frame.height/mask.height;
  const pad=Math.max(24,Math.max((maxX-minX)*sx,(maxY-minY)*sy)*.055);
  const x=Math.max(0,minX*sx-pad),y=Math.max(0,minY*sy-pad);
  return {x,y,width:Math.min(frame.width,(maxX+1)*sx+pad)-x,height:Math.min(frame.height,(maxY+1)*sy+pad)-y};
}

/** Draw a real representative frame, then fit the visible art rather than the empty artboard. */
export function renderAnimationThumbnail(canvas:HTMLCanvasElement,kind:AnimationThumbnailKind,preset:IntroPreset|OutroPreset,source:WebConfig):void{
  const ctx=canvas.getContext('2d');if(!ctx)return;
  if(preset==='none'){
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#10131b';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#8f99b0';ctx.lineWidth=2.5;ctx.beginPath();
    const r=Math.min(canvas.width,canvas.height)*.19,cx=canvas.width/2,cy=canvas.height/2;
    ctx.arc(cx,cy,r,0,Math.PI*2);ctx.moveTo(cx-r*.7,cy+r*.7);ctx.lineTo(cx+r*.7,cy-r*.7);ctx.stroke();
    return;
  }
  const scene=prepareScene(thumbnailConfig(source,kind,preset)),plan=scene.people[0].plan;
  const time=kind==='intro'?plan.writing.start*.52:plan.outro.start+(scene.duration-plan.outro.start)*.60;
  const {frame,mask}=sharedSurfaces();
  // One shared full-size surface preserves the production renderer's glow and
  // native crystal facets. Cards retain only their small, static bitmap.
  renderScene(frame,scene,time);
  const bounds=artworkBounds(frame,mask);
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#10131b';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(!bounds)return;
  const pad=8,fit=Math.min((canvas.width-pad*2)/bounds.width,(canvas.height-pad*2)/bounds.height);
  const width=bounds.width*fit,height=bounds.height*fit;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(frame,bounds.x,bounds.y,bounds.width,bounds.height,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
}
