import {useEffect,useId,useRef,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {iconPaths} from './icon-paths';
import {usePopoverMotion} from './usePopoverMotion';
import {normalizeHexColor} from './color-history';

export type IconName=keyof typeof iconPaths;
export function Icon({name,size=18}:{name:IconName;size?:number}){
  return <svg className="ui-icon" data-icon={name} data-icon-family="phosphor" width={size} height={size} viewBox="0 0 256 256" fill="currentColor" stroke="none" aria-hidden="true" focusable="false">{iconPaths[name].map((path,index)=><path key={index} d={path}/>)}</svg>;
}
export function Range({title,value,min,max,step=.01,suffix='',displayDecimals,onChange}:{title:string;value:number;min:number;max:number;step?:number;suffix?:string;displayDecimals?:number;onChange:(n:number)=>void}){
  const id=useId(),editing=useRef(false),dirty=useRef(false),lastValue=useRef(value);
  const decimalPlaces=(number:number)=>{
    const [digits,exponent='0']=String(number).toLowerCase().split('e');
    return Math.max(0,(digits.split('.')[1]?.length??0)-Number(exponent));
  };
  const precision=Math.min(12,Math.max(decimalPlaces(min),decimalPlaces(step)));
  // Saved designs can contain finer values than the control's editing step.
  const digits=Math.max(0,Math.min(12,displayDecimals??12));
  const format=(number:number)=>String(Number(number.toFixed(digits)));
  const [draft,setDraft]=useState(()=>format(value));
  const progress=Math.max(0,Math.min(1,(value-min)/(max-min||1)));
  lastValue.current=value;
  useEffect(()=>{if(!editing.current)setDraft(String(Number(value.toFixed(digits))));},[value,digits]);
  const parse=(text:string)=>{
    const trimmed=text.trim();
    if(!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed))return null;
    const number=Number(trimmed);
    return Number.isFinite(number)?number:null;
  };
  const commit=(text:string)=>{
    const parsed=parse(text);
    if(!dirty.current||parsed===null){setDraft(format(lastValue.current));dirty.current=false;return;}
    dirty.current=false;
    const candidate=parsed;
    const bounded=Math.max(min,Math.min(max,candidate));
    const snapped=step>0?min+Math.round((bounded-min)/step)*step:bounded;
    const lastStep=step>0?min+Math.floor((max-min)/step+1e-9)*step:max;
    const next=Number(Math.max(min,Math.min(lastStep,snapped)).toFixed(precision));
    setDraft(format(next));
    if(next!==value)onChange(next);
  };
  return <div className="range-field"><span className="range-header"><label className="range-title" htmlFor={id}>{title}</label><span className="range-value-box"><input
    className="range-value-input"
    type="text"
    inputMode="decimal"
    aria-label={`${title}数值`}
    aria-describedby={suffix?`${id}-unit`:undefined}
    autoComplete="off"
    spellCheck={false}
    value={draft}
    style={{width:`${Math.max(2,Math.min(8,draft.length))}ch`}}
    onFocus={()=>{editing.current=true;dirty.current=false;}}
    onChange={event=>{
      const text=event.target.value;
      dirty.current=true;
      setDraft(text);
      const number=parse(text);
      // Keep partial decimals and out-of-range drafts intact; only usable numbers reach the live design.
      if(number!==null&&number>=min&&number<=max&&number!==value)onChange(number);
    }}
    onBlur={event=>{editing.current=false;commit(event.currentTarget.value);}}
    onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.blur();}}}
  />{suffix&&<span className="range-value-suffix" id={`${id}-unit`}>{suffix}</span>}</span></span><span className="range-control" style={{'--range-progress':progress} as CSSProperties}><span className="range-rail" aria-hidden="true"><span className="range-fill"/></span><input id={id} type="range" aria-label={title} aria-valuetext={`${format(value)}${suffix}`} min={min} max={max} step={step} value={value} onChange={event=>{const next=Number(event.target.value);editing.current=false;dirty.current=false;setDraft(format(next));onChange(next);}}/></span></div>;
}
export function Toggle({title,checked,onChange}:{title:string;checked:boolean;onChange:(v:boolean)=>void}){
  return <label className="toggle-row" data-checked={checked}><span>{title}</span><input className="toggle" aria-label={title} aria-checked={checked} type="checkbox" role="switch" checked={checked} onChange={e=>onChange(e.target.checked)}/></label>;
}
export function ColorField({title,value,onChange,onCommit,editable=false,pickerRef}:{title:string;value:string;onChange:(v:string)=>void;onCommit?:(v:string)=>void;editable?:boolean;pickerRef?:RefObject<HTMLInputElement|null>}){
  const id=useId(),localPicker=useRef<HTMLInputElement>(null),picker=pickerRef??localPicker;
  const [draft,setDraft]=useState(value.toUpperCase()),editing=useRef(false),dirty=useRef(false);
  const previewed=useRef(value.toUpperCase());
  previewed.current=value.toUpperCase();
  useEffect(()=>{if(!editing.current)setDraft(value.toUpperCase());},[value]);
  const preview=(input:string)=>{
    const color=normalizeHexColor(input);if(!color)return;
    setDraft(color);
    if(previewed.current!==color){previewed.current=color;onChange(color);}
  };
  // Native input previews continuously; native change commits the final picker selection.
  useEffect(()=>{
    const input=picker.current;if(!input||!onCommit)return;
    const commit=()=>{const color=normalizeHexColor(input.value);if(color){preview(color);onCommit(color);}};
    input.addEventListener('change',commit);
    return ()=>input.removeEventListener('change',commit);
  },[picker,onCommit,onChange]);
  const invalid=editable&&!normalizeHexColor(draft);
  if(!editable)return <label className="color-row"><span>{title}</span><span className="color-swatch" style={{background:value}}><input ref={picker} className="color-input" aria-label={`${title}颜色`} type="color" value={value} onInput={event=>preview(event.currentTarget.value)} onChange={event=>preview(event.currentTarget.value)}/></span><code>{value.toUpperCase()}</code></label>;
  return <div className="color-field"><div className="color-row"><label htmlFor={`${id}-picker`}>{title}</label><span className="color-swatch" style={{background:value}}><input ref={picker} id={`${id}-picker`} className="color-input" aria-label={title} type="color" value={value} onInput={event=>preview(event.currentTarget.value)} onChange={event=>preview(event.currentTarget.value)}/></span><input
    className="color-hex" aria-label={`${title} HEX 色号`} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined}
    value={draft} placeholder="#F5FFFD" spellCheck={false} autoComplete="off" autoCapitalize="characters"
    onFocus={()=>{editing.current=true;dirty.current=false;}}
    onBlur={()=>{
      editing.current=false;
      const color=normalizeHexColor(draft);
      setDraft(color??value.toUpperCase());
      if(dirty.current&&color)onCommit?.(color);
      dirty.current=false;
    }}
    onChange={event=>{
      const next=event.target.value;dirty.current=true;setDraft(next);
      const color=normalizeHexColor(next);if(color)onChange(color);
    }}
    onKeyDown={event=>{
      if(event.nativeEvent.isComposing)return;
      if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}
      if(event.key==='Escape'){dirty.current=false;setDraft(value.toUpperCase());event.currentTarget.blur();}
    }}
  /></div>{invalid&&<p className="field-error caption-4" id={`${id}-error`}>请输入6位 HEX 色号，可省略 #。</p>}</div>;
}
export function Section({title,icon,children,collapsible=false}:{title:string;icon?:IconName;children:ReactNode;collapsible?:boolean}){
  const id=useId();
  const heading=<>{icon&&<Icon name={icon} size={15}/>}<span>{title}</span></>;
  if(collapsible)return <details className="panel-section section-accordion"><summary className="section-heading" aria-controls={`${id}-body`}>{heading}<Icon name="chevron" size={13}/></summary><div id={`${id}-body`} className="section-accordion-body">{children}</div></details>;
  return <section className="panel-section" aria-labelledby={id}><h2 id={id} className="section-heading">{heading}</h2>{children}</section>;
}
export function Details({title,children,open=false}:{title:string;children:ReactNode;open?:boolean}){
  const id=useId();
  return <details className="details-group" open={open||undefined}><summary aria-controls={id}>{title}<Icon name="chevron" size={14}/></summary><div id={id} className="details-body">{children}</div></details>;
}
export function UtilityMenu({children}:{children:ReactNode}){
  const id=useId(),{detailsRef,panelRef,expanded,onSummaryClick,close}=usePopoverMotion();
  return <details className="utility-menu" ref={detailsRef}><summary className="utility-menu-trigger" onClick={onSummaryClick} aria-label="更多操作" aria-expanded={expanded} aria-controls={id} title="更多操作"><Icon name="more" size={20}/></summary><div id={id} className="utility-menu-panel" ref={panelRef} role="group" aria-label="设计文件操作" onClick={event=>{if(event.target instanceof Element&&event.target.closest('button:not(:disabled)'))close();}}>{children}</div></details>;
}
