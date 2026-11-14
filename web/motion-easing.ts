// Motion Prompt #049-072 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#049
// Motion Prompt #073-096 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#073
// The ui/lp kit cubic functions, carried into real CSS and Web Animations events.
export const easeOutCubic=(x:number)=>1-Math.pow(1-x,3);
export const easeInOutCubic=(x:number)=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;

function cssEasing(ease:(x:number)=>number):string{
  return `linear(${Array.from({length:61},(_,index)=>ease(index/60).toFixed(6)).join(',')})`;
}
export const MOTION_EASE_OUT=cssEasing(easeOutCubic);
export const MOTION_EASE_IN_OUT=cssEasing(easeInOutCubic);
export function easedFrames(frame:(amount:number)=>Keyframe,ease= easeOutCubic):Keyframe[]{
  return Array.from({length:61},(_,index)=>({...frame(ease(index/60)),offset:index/60}));
}
