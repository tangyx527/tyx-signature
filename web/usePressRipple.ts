import {useEffect} from 'react';
import {MOTION_EASE_OUT,MOTION_EASE_IN_OUT,easedFrames} from './motion-easing';

// Motion Prompt #085 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#085
// Real presses replace the sample cursor: 600ms growth, 300ms hold, fade until 800ms.
const PRESS_TARGETS=[
  'button.button','button.play-button','button.editor-tab','button.mode-option','button.person-tab',
  'button.format-option','button.decoration-category','button.decoration-clear',
  'button.appearance-option','button.complete-preview-button','a.button[download]',
].join(',');
export function usePressRipple(){
  useEffect(()=>{
    const root=document.documentElement,query=window.matchMedia('(prefers-reduced-motion: reduce)');
    const oldOut=root.style.getPropertyValue('--motion-prompt-out'),oldInOut=root.style.getPropertyValue('--motion-prompt-in-out');
    root.style.setProperty('--motion-prompt-out',MOTION_EASE_OUT);
    root.style.setProperty('--motion-prompt-in-out',MOTION_EASE_IN_OUT);
    type Wave={span:HTMLSpanElement;animations:Animation[]};
    const waves=new Map<HTMLElement,Wave>();
    const clear=(button:HTMLElement,wave:Wave)=>{
      wave.animations.forEach(animation=>animation.cancel());wave.span.remove();
      if(waves.get(button)===wave)waves.delete(button);
    };
    const clearAll=()=>{for(const [button,wave] of waves)clear(button,wave);};
    const press=(event:MouseEvent,center=false)=>{
      if(query.matches||event.button!==0||!(event.target instanceof Element))return;
      const button=event.target.closest<HTMLElement>(PRESS_TARGETS);
      if(!button||button.matches(':disabled')||button.getAttribute('aria-disabled')==='true'||typeof button.animate!=='function')return;
      const box=button.getBoundingClientRect();if(!box.width||!box.height)return;
      const x=center?box.width/2:Math.max(0,Math.min(box.width,event.clientX-box.left));
      const y=center?box.height/2:Math.max(0,Math.min(box.height,event.clientY-box.top));
      const radius=Math.max(Math.hypot(x,y),Math.hypot(x-box.width,y),Math.hypot(x,y-box.height),Math.hypot(x-box.width,y-box.height));
      const previous=waves.get(button);if(previous)clear(button,previous);
      const span=document.createElement('span');span.className='press-ripple';span.setAttribute('aria-hidden','true');
      Object.assign(span.style,{left:`${x-radius}px`,top:`${y-radius}px`,width:`${radius*2}px`,height:`${radius*2}px`});
      button.append(span);
      const growth=span.animate(easedFrames(amount=>({transform:`scale(${amount})`})),{duration:600,easing:'linear',fill:'forwards'});
      const fade=span.animate([{opacity:.4,offset:0},{opacity:.4,offset:.375},{opacity:0,offset:1}],{duration:800,easing:'linear',fill:'forwards'});
      const wave={span,animations:[growth,fade]};waves.set(button,wave);
      void fade.finished.then(()=>clear(button,wave),()=>clear(button,wave));
    };
    const pointerDown=(event:PointerEvent)=>{if(event.isPrimary)press(event);};
    const keyboardClick=(event:MouseEvent)=>{if(event.detail===0)press(event,true);};
    const reduced=()=>{if(query.matches)clearAll();};
    document.addEventListener('pointerdown',pointerDown,true);
    document.addEventListener('click',keyboardClick,true);query.addEventListener('change',reduced);
    return ()=>{
      document.removeEventListener('pointerdown',pointerDown,true);
      document.removeEventListener('click',keyboardClick,true);query.removeEventListener('change',reduced);clearAll();
      if(oldOut)root.style.setProperty('--motion-prompt-out',oldOut);else root.style.removeProperty('--motion-prompt-out');
      if(oldInOut)root.style.setProperty('--motion-prompt-in-out',oldInOut);else root.style.removeProperty('--motion-prompt-in-out');
    };
  },[]);
}
