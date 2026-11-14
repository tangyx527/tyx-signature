import {useId,useState} from 'react';
import {AnimationThumbnail} from './AnimationThumbnail';
import {Icon} from './ui';
import type {IntroPreset,OutroPreset} from './animation-catalog';
import type {WebConfig} from './model';

type Preset<Id extends string>={id:Id;label:string;description:string};
type Props<Id extends IntroPreset|OutroPreset>={
  kind:'intro'|'outro';presets:readonly Preset<Id>[];value:Id;config:WebConfig;onChoose:(value:Id)=>void;
};

export function AnimationPicker<Id extends IntroPreset|OutroPreset>({kind,presets,value,config,onChoose}:Props<Id>){
  const heading=useId(),description=useId(),grid=useId();
  const [expanded,setExpanded]=useState(false);
  const selected=presets.find(preset=>preset.id===value);
  const title=kind==='intro'?'开场动画':'收尾动画';
  const compact=presets.filter(preset=>preset.id!=='none').slice(0,3);
  if(selected&&selected.id!=='none'&&!compact.some(preset=>preset.id===value))compact[compact.length-1]=selected;
  const none=presets.find(preset=>preset.id==='none');
  if(none)compact.push(none);
  const visible=expanded||presets.length<=4?presets:compact;
  return <section className="animation-picker" aria-labelledby={heading}>
    <div className="animation-picker-heading"><h3 className="section-heading" id={heading}>{title}</h3><span className="animation-picker-current">{selected?.label}</span></div>
    <div className="animation-grid" id={grid} role="group" aria-label={title} aria-describedby={description}>
      {visible.map((preset,index)=><button type="button" key={preset.id} data-tour={kind==='intro'&&index===0?'animation-picker':undefined} className="animation-choice" aria-pressed={value===preset.id} title={preset.description} onClick={()=>onChoose(preset.id)}>
        <AnimationThumbnail kind={kind} preset={preset.id} config={config}/>
        <span className="animation-choice-name">{preset.label}</span>
        {value===preset.id&&<span className="animation-choice-check" aria-hidden="true"><Icon name="check" size={12}/></span>}
      </button>)}
    </div>
    {presets.length>4&&<button type="button" className="animation-more" aria-expanded={expanded} aria-controls={grid} onClick={()=>setExpanded(current=>!current)}>{expanded?'收起更多动画':`查看全部 ${presets.length} 款`}<Icon name="chevron" size={13}/></button>}
    <p className="export-note" id={description}>{selected?.description}</p>
  </section>;
}
