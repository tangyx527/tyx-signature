import {useLayoutEffect,useRef} from 'react';
import type {PersonConfig} from './model';
import type {GradientConfig} from './gradient';
import {renderDecorationThumbnail} from './renderer';

/** The picker paints the same paths and ink as the exported design. */
export function DecorationThumbnail({id,person,background,backgroundGradient,transparent=false}:{id:string;person:PersonConfig;background:string;backgroundGradient?:GradientConfig;transparent?:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null);
  useLayoutEffect(()=>{
    if(canvas.current)renderDecorationThumbnail(canvas.current,id,person,background,transparent,backgroundGradient);
  },[id,background,backgroundGradient,transparent,person.name,person.decoration.scale,person.ink.color,person.ink.gradient,person.glow.enabled,person.glow.color,person.glow.strength,person.glow.radius]);
  return <canvas className={`decoration-thumbnail ${transparent?'is-transparent':''}`} ref={canvas} width={180} height={112} aria-hidden="true"/>;
}
