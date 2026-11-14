import type {VariantInk,MotionGeometry} from './motion-variants';
import {drawInkRibbonOutro} from './ink-ribbon-outro';
import {openingSubjectColors,type OutroAppearance} from './motion-palette';

export type AuthoredOutroPreset='vortex';
export type OutroBeat={progress:number;collapse:number;sourceScale:number;spread:number;fade:number;phase:'collapse'|'point'|'expand'|'gather'|'fade'};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const u=clamp(n);return u*u*(3-2*u);};

/** Compatibility clock for companions of the retained classic exit. Authored scenes own their clocks. */
export function outroBeat(progress:number):OutroBeat{
 const p=clamp(Number.isFinite(progress)?progress:0),collapse=ease(p/.28),sourceScale=1-collapse;
 const spread=p<=.33?0:p<.66?ease((p-.33)/.33):1-ease((p-.66)/.26),fade=p<=.92?1:1-ease((p-.92)/.08);
 const phase:OutroBeat['phase']=p<.28?'collapse':p<.33?'point':p<.66?'expand':p<.92?'gather':'fade';
 return {progress:p,collapse,sourceScale,spread,fade,phase};
}

/** The retained authored ending keeps its existing seven flights and entry artwork. */
export function drawAuthoredOutroInk(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],id:AuthoredOutroPreset,progress:number,geometry:MotionGeometry,colors:readonly string[]=openingSubjectColors('classic'),appearance?:OutroAppearance):void{
 const p=clamp(Number.isFinite(progress)?progress:0);if(p>=1)return;
 if(id==='vortex')drawInkRibbonOutro(ctx,inks,p,geometry,colors,appearance);
}
