import type {MotionGeometry,VariantInk} from './motion-variants';
import {drawInkRibbonHandoff,type AuthoredRibbon} from './ink-ribbon-handoff';
import {beginNativeArtworkFrame} from './native-artwork';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};

/** Source ink hands off to the retained vortex's actual selected-entry artwork. */
export function drawAuthoredInkScene(ctx:CanvasRenderingContext2D,inks:readonly VariantInk[],p:number,g:MotionGeometry,ribbons:readonly AuthoredRibbon[],paintTarget:(ctx:CanvasRenderingContext2D)=>void):void{
 if(p>=1||!inks.some(ink=>ink.samples.length))return;
 const blend=ease((p-.22)/.06),alpha=blend*(1-ease((p-.955)/.030));
 // Compensate source-over coverage while the .84–.93 crystal body replaces opaque ink.
 // Complementary raw alpha weights would create a dark dip halfway through the handoff.
 if(p<.28){ctx.save();ctx.globalAlpha*=(1-blend)/(1-blend*.88);drawInkRibbonHandoff(ctx,inks,ribbons,p,g);ctx.restore();}
 if(alpha>0){beginNativeArtworkFrame();ctx.save();ctx.globalAlpha*=alpha;paintTarget(ctx);ctx.restore();}
}
