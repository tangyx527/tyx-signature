import {useEffect,useRef} from 'react';
import {resolveMotionSelection,type IntroPreset,type OutroPreset} from './animation-catalog';
import type {WebConfig} from './model';
import {renderAnimationThumbnail,type AnimationThumbnailKind} from './animation-thumbnail-renderer';

const queue=new Set<()=>void>();
let scheduled:number|undefined;
function paintNext(){
  scheduled=undefined;
  const next=queue.values().next().value;
  if(next){queue.delete(next);next();}
  if(queue.size)scheduled=requestAnimationFrame(paintNext);
}
function enqueue(paint:()=>void){
  queue.add(paint);scheduled??=requestAnimationFrame(paintNext);
  return ()=>{queue.delete(paint);if(!queue.size&&scheduled!==undefined){cancelAnimationFrame(scheduled);scheduled=undefined;}};
}

/** Only visible cards paint, once per input change; no thumbnail owns an animation loop. */
export function AnimationThumbnail({kind,preset,config}:{kind:AnimationThumbnailKind;preset:IntroPreset|OutroPreset;config:WebConfig}){
  const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(config);latest.current=config;
  const person=config.people[0],intro=kind==='outro'&&preset==='vortex'?resolveMotionSelection(config.animation).intro:'';
  useEffect(()=>{
    const target=canvas.current;if(!target)return;
    let cancel:(()=>void)|undefined;
    const paint=()=>{cancel=enqueue(()=>{
      try{renderAnimationThumbnail(target,kind,preset,latest.current);}
      catch{/* Keep the previous image while an unfinished signature input is invalid. */}
    });};
    if(typeof IntersectionObserver==='undefined'){paint();return ()=>cancel?.();}
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      observer.disconnect();paint();
    },{rootMargin:'80px'});
    observer.observe(target);
    return ()=>{observer.disconnect();cancel?.();};
  },[kind,preset,intro,person.name,person.signatureSource,person.trace,person.ink.color,person.ink.gradient,person.font.penWidth,person.glow.enabled,person.glow.color,person.glow.strength,person.glow.radius]);
  return <canvas className="animation-thumbnail" ref={canvas} width={220} height={156} aria-hidden="true"/>;
}
