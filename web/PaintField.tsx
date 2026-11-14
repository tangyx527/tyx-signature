import {useId,useState} from 'react';
import {SignatureColorField} from './SignatureColorField';
import {ColorField,Range} from './ui';
import {defaultGradient,gradientCss,mixHex,sortedGradientStops,type GradientConfig} from './gradient';
import './paint-field.css';

type PaintFieldProps={
  value:string;
  gradient?:GradientConfig;
  onChange:(color:string)=>void;
  onGradientChange:(gradient:GradientConfig)=>void;
  onEditCommit?:()=>void;
  editingKey?:0|1;
  title?:string;
};

const directionPresets=[{angle:90,label:'向右',arrow:'→'},{angle:180,label:'向下',arrow:'↓'},{angle:135,label:'右下',arrow:'↘'},{angle:45,label:'右上',arrow:'↗'}] as const;

/** Isolate selection and input drafts when switching between the two signatures. */
export function PaintField(props:PaintFieldProps){
  return <PaintEditor key={`${props.title??'颜色'}-${props.editingKey??0}`} {...props}/>;
}
function PaintEditor({value,gradient,onChange,onGradientChange,onEditCommit,editingKey=0,title='颜色'}:PaintFieldProps){
  const id=useId(),[activeStop,setActiveStop]=useState(0);
  const paint=gradient??defaultGradient(value),enabled=gradient?.enabled===true;
  const selected=Math.min(activeStop,paint.stops.length-1),stop=paint.stops[selected];
  const orderedStops=paint.stops.map((item,index)=>({item,index})).sort((a,b)=>a.item.offset-b.item.offset);
  const change=(edit:(next:GradientConfig)=>void,commit=false)=>{
    const next=structuredClone(paint);edit(next);onGradientChange(next);if(commit)onEditCommit?.();
  };
  const addStop=()=>{
    const ordered=sortedGradientStops(paint);let left=ordered[0],right=ordered[1],gap=-1;
    for(let i=1;i<ordered.length;i++){
      const distance=ordered[i].offset-ordered[i-1].offset;
      if(distance>gap){left=ordered[i-1];right=ordered[i];gap=distance;}
    }
    const added={offset:(left.offset+right.offset)/2,color:mixHex(left.color,right.color,.5)};
    setActiveStop(paint.stops.length);
    change(next=>{next.stops.push(added);},true);
  };
  const removeStop=()=>{
    setActiveStop(Math.max(0,selected-1));
    change(next=>{next.stops.splice(selected,1);},true);
  };
  return <div className="paint-field" role="group" aria-label={`${title}设置`}>
    <div className="paint-mode-header"><span className="paint-mode-title" id={`${id}-title`}>{title}</span><div className="paint-mode-switch" role="group" aria-labelledby={`${id}-title`}>
      <button type="button" className="paint-mode-option" aria-label={`${title}纯色`} aria-pressed={!enabled} onClick={()=>{if(enabled)change(next=>{next.enabled=false;},true);}}>纯色</button>
      <button type="button" className="paint-mode-option" aria-label={`${title}渐变`} aria-pressed={enabled} onClick={()=>{if(!enabled)change(next=>{next.enabled=true;},true);}}>渐变</button>
    </div></div>
    {!enabled?<SignatureColorField editingKey={editingKey} title={title} value={value} onChange={onChange} onEditCommit={onEditCommit}/>:<div className="paint-gradient-editor">
      <div className="paint-gradient-preview" role="img" aria-label={`${title}渐变预览`} style={{background:gradientCss(paint)}}/>
      <div className="paint-stops-header"><span>渐变色标</span><span>{paint.stops.length} / 5</span></div>
      <div className="paint-stops" role="group" aria-label={`${title}渐变色标`}>
        {orderedStops.map(({item,index})=><button type="button" key={index} className="paint-stop" aria-label={`${title}色标 ${index+1}，位置 ${Math.round(item.offset*100)}%`} aria-pressed={index===selected} onClick={()=>{onEditCommit?.();setActiveStop(index);}}>
          <span className="paint-stop-chip" style={{background:item.color}} aria-hidden="true"/><span>{Math.round(item.offset*100)}%</span>
        </button>)}
        {paint.stops.length<5&&<button type="button" className="paint-add-stop" aria-label={`${title}添加渐变颜色`} title="添加颜色" onClick={addStop}>+</button>}
      </div>
      <div className="paint-stop-editor" role="group" aria-label={`${title}当前色标设置`}>
        <ColorField key={selected} title={`${title}渐变色 ${selected+1}`} value={stop.color} editable onChange={color=>change(next=>{next.stops[selected].color=color;})} onCommit={()=>onEditCommit?.()}/>
        <div className="paint-stop-position"><Range key={selected} title={`${title}色标位置`} value={stop.offset*100} min={0} max={100} step={1} suffix="%" onChange={position=>change(next=>{next.stops[selected].offset=position/100;})}/><button type="button" className="paint-remove-stop" aria-label={`${title}删除当前色标`} disabled={paint.stops.length<=2} onClick={removeStop}>删除色标</button></div>
      </div>
      <div className="paint-direction-heading"><span>渐变方向</span><div className="paint-directions" role="group" aria-label={`${title}渐变方向`}>
        {directionPresets.map(preset=><button type="button" key={preset.angle} aria-label={`${title}渐变${preset.label}`} title={preset.label} aria-pressed={paint.angle===preset.angle} onClick={()=>change(next=>{next.angle=preset.angle;},true)}>{preset.arrow}</button>)}
      </div></div>
      <Range title={`${title}渐变角度`} value={paint.angle} min={0} max={360} step={1} suffix="°" onChange={angle=>change(next=>{next.angle=angle;})}/>
    </div>}
  </div>;
}
