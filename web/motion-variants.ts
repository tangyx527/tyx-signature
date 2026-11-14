import type {Point} from '../src/geometry';
import type {InkSample} from './brush-engine';
import {drawAuthoredOutroInk} from './outro-choreography';
import type {OutroAppearance} from './motion-palette';
import type {LinearGradientPaint} from './gradient';

export type OutroVariant='vortex';
export type MotionGeometry={center:Point;radius:number;unit:number};
export type VariantInk={id:number;paintKey:string;samples:readonly InkSample[];color:string;gradient?:LinearGradientPaint;glowColor:string;glowStrength:number;glowRadius:number};

/** The retained authored ink ending follows its seven existing vortex flights. */
export function drawVariantOutro(context:CanvasRenderingContext2D,inks:readonly VariantInk[],preset:OutroVariant,progress:number,geometry:MotionGeometry,colors?:readonly string[],appearance?:OutroAppearance):void{
 drawAuthoredOutroInk(context,inks,preset,progress,geometry,colors,appearance);
}
