import {useEffect,useLayoutEffect,useState} from 'react';
import {APPEARANCE_KEY,SYSTEM_THEME_QUERY,applyAppearance,readAppearance,resolveAppearance,saveAppearance,type AppearanceMode} from './theme';
import {usePopoverMotion} from './usePopoverMotion';

const labels:Record<AppearanceMode,string>={light:'浅色',dark:'深色',system:'系统'};
function AppearanceIcon({mode}:{mode:AppearanceMode}){
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {mode==='light'?<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>:mode==='dark'?<path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5a8.7 8.7 0 1 0 10.6 10.6Z"/>:<><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></>}
  </svg>;
}
function currentPreference():AppearanceMode{
  try{return readAppearance(window.localStorage);}catch{return 'system';}
}
export function ThemeSelector(){
  const [mode,setMode]=useState<AppearanceMode>(currentPreference);
  const [systemDark,setSystemDark]=useState(()=>window.matchMedia(SYSTEM_THEME_QUERY).matches);
  const [persisted,setPersisted]=useState(true);
  const {detailsRef,panelRef,expanded,onSummaryClick,close}=usePopoverMotion();
  const theme=resolveAppearance(mode,systemDark);
  useLayoutEffect(()=>applyAppearance(document,mode,systemDark),[mode,systemDark]);
  useEffect(()=>{
    const media=window.matchMedia(SYSTEM_THEME_QUERY),syncSystem=()=>setSystemDark(media.matches);
    const syncStorage=(event:StorageEvent)=>{
      if(event.key!==null&&event.key!==APPEARANCE_KEY)return;
      // A sessionStorage event must not reset a session-only choice.
      try{if(event.storageArea&&event.storageArea!==window.localStorage)return;}catch{return;}
      setMode(currentPreference());setPersisted(true);
    };
    syncSystem();media.addEventListener('change',syncSystem);window.addEventListener('storage',syncStorage);
    return ()=>{media.removeEventListener('change',syncSystem);window.removeEventListener('storage',syncStorage);};
  },[]);
  const choose=(next:AppearanceMode)=>{
    setMode(next);
    try{setPersisted(saveAppearance(window.localStorage,next));}catch{setPersisted(false);}
    close(true);
  };
  return <details className="appearance-menu" ref={detailsRef}>
    <summary className="appearance-trigger" onClick={onSummaryClick} aria-label="界面模式" aria-expanded={expanded} aria-controls="appearance-options" title={`界面模式：${labels[mode]}`}><AppearanceIcon mode={mode}/><span className="appearance-current-label">{labels[mode]}</span></summary>
    <div className="appearance-panel" id="appearance-options" ref={panelRef}>
      <div className="appearance-label">界面模式</div>
      <div className="appearance-options" role="group" aria-label="选择界面模式">
        {(['light','dark','system'] as const).map(option=><button className="appearance-option" key={option} aria-pressed={mode===option} onClick={()=>choose(option)}><AppearanceIcon mode={option}/><span className="appearance-option-label">{labels[option]}</span></button>)}
      </div>
      <p className="appearance-hint">{!persisted?'本次已切换，浏览器暂时无法保存。':mode==='system'?`跟随系统，当前为${labels[theme]}。`:'外观选择会在此浏览器保存。'}</p>
    </div>
  </details>;
}
