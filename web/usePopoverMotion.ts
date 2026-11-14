import {useCallback,useEffect,useRef,useState,type MouseEvent as ReactMouseEvent} from 'react';
import {easedFrames,easeInOutCubic,easeOutCubic} from './motion-easing';

// Motion Prompt #055 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#055
// Real details menus retain the published 280ms entrance, 200ms exit and 6px drift.
export function usePopoverMotion(){
  const detailsRef=useRef<HTMLDetailsElement>(null),panelRef=useRef<HTMLDivElement>(null);
  const desiredOpen=useRef(false),restoreFocus=useRef(false),motion=useRef<Animation|null>(null);
  const reduced=useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [expanded,setExpanded]=useState(false);
  const settle=useCallback(()=>{
    const details=detailsRef.current,panel=panelRef.current;
    motion.current?.cancel();motion.current=null;
    if(!details||!panel)return;
    details.open=desiredOpen.current;
    panel.inert=!desiredOpen.current;
    panel.style.removeProperty('opacity');panel.style.removeProperty('transform');
    setExpanded(desiredOpen.current);
    if(!desiredOpen.current&&restoreFocus.current)details.querySelector('summary')?.focus();
    restoreFocus.current=false;
  },[]);
  const move=useCallback((next:boolean,focusSummary=false)=>{
    const details=detailsRef.current,panel=panelRef.current;
    if(!details||!panel)return;
    if(next===desiredOpen.current&&details.open===next){
      if(!next&&focusSummary)details.querySelector('summary')?.focus();
      return;
    }
    const measured=details.open?Number(getComputedStyle(panel).opacity):0;
    const from=Number.isFinite(measured)?Math.max(0,Math.min(1,measured)):Number(details.open);
    motion.current?.cancel();motion.current=null;
    desiredOpen.current=next;restoreFocus.current=!next&&focusSummary;
    panel.style.opacity=String(from);panel.style.transform=`translateX(${6*(1-from)}px)`;
    if(next)details.open=true;
    panel.inert=!next;setExpanded(next);
    if(reduced.current||typeof panel.animate!=='function'){settle();return;}
    const animation=panel.animate(easedFrames(amount=>{
      const visible=from+((next?1:0)-from)*amount;
      return {opacity:visible,transform:`translateX(${6*(1-visible)}px)`};
    },next?easeOutCubic:easeInOutCubic),{duration:next?280:200,easing:'linear',fill:'forwards'});
    motion.current=animation;
    void animation.finished.then(()=>{if(motion.current===animation)settle();},()=>{});
  },[settle]);
  const close=useCallback((focusSummary=false)=>move(false,focusSummary),[move]);
  const onSummaryClick=useCallback((event:ReactMouseEvent<HTMLElement>)=>{
    event.preventDefault();move(!desiredOpen.current);
  },[move]);
  useEffect(()=>{
    const details=detailsRef.current,panel=panelRef.current;if(!details||!panel)return;
    const query=window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current=query.matches;desiredOpen.current=details.open;panel.inert=!details.open;
    setExpanded(details.open);
    const preference=()=>{reduced.current=query.matches;if(query.matches)settle();};
    const outside=(event:PointerEvent)=>{if(desiredOpen.current&&event.target instanceof Node&&!details.contains(event.target))close();};
    const escape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||!desiredOpen.current)return;
      // Handle the active popup before the editor's document-level Escape listener.
      event.preventDefault();event.stopPropagation();close(true);
    };
    const nativeToggle=()=>{
      if(!details.open){desiredOpen.current=false;settle();}
      else if(!desiredOpen.current&&!motion.current)move(true);
    };
    query.addEventListener('change',preference);details.addEventListener('toggle',nativeToggle);
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);
    return ()=>{
      query.removeEventListener('change',preference);details.removeEventListener('toggle',nativeToggle);
      document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);
      motion.current?.cancel();motion.current=null;
    };
  },[close,move,settle]);
  return {detailsRef,panelRef,expanded,onSummaryClick,close};
}
