import {useEffect,useRef,useState} from 'react';
import {addRecentColor,loadRecentColors,RECENT_COLORS_KEY,SIGNATURE_COLORS} from './color-history';
import {ColorField} from './ui';

export function SignatureColorField({value,onChange,onEditCommit,editingKey=0,title='颜色'}:{value:string;onChange:(color:string)=>void;onEditCommit?:()=>void;editingKey?:0|1;title?:string}){
  const picker=useRef<HTMLInputElement>(null);
  const [recent,setRecent]=useState(()=>{
    try{return loadRecentColors(window.localStorage);}catch{return [];}
  });
  useEffect(()=>{
    try{window.localStorage.setItem(RECENT_COLORS_KEY,JSON.stringify(recent));}catch{/* Color editing remains usable without storage. */}
  },[recent]);
  const remember=(color:string)=>{setRecent(current=>addRecentColor(current,color));onEditCommit?.();};
  const choose=(color:string)=>{onChange(color);remember(color);};
  const swatches=(colors:readonly string[],label:string)=><div className="color-palette-swatches" role="group" aria-label={label}>
    {colors.map(color=><button type="button" className="color-choice" key={color} title={color} aria-label={`${label} ${color}`} aria-pressed={value.toUpperCase()===color} onClick={()=>choose(color)}><span className="color-chip" style={{backgroundColor:color}}/></button>)}
  </div>;
  return <div className="signature-color-field">
    <ColorField key={editingKey} title={title} value={value} onChange={onChange} onCommit={remember} pickerRef={picker} editable/>
    <div className="color-palette">
      <div className="color-palette-heading"><span>常用颜色</span><button type="button" className="color-custom-button" onClick={()=>{picker.current?.focus({preventScroll:true});picker.current?.click();}}>自定义</button></div>
      {swatches(SIGNATURE_COLORS,'常用颜色')}
    </div>
    {recent.length>0&&<div className="color-palette"><div className="color-palette-heading"><span>最近使用</span></div>{swatches(recent,'最近使用')}</div>}
  </div>;
}
