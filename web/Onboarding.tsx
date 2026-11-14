import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {Icon,type IconName} from './ui';
import './onboarding.css';

export type OnboardingStep=0|1|2|3;
export type OnboardingState={status:'invite'|'active'|'closed';step:OnboardingStep};
type Props={
  state:OnboardingState;onStart:()=>void;onDismiss:()=>void;onStepChange:(step:OnboardingStep)=>void;
  onFinish:()=>void;onLocateStep:()=>void;paused?:boolean;exportHost:HTMLElement|null;
};
const steps:{title:string;short:string;body:string;hint:string;target:string;icon:IconName}[]=[
  {title:'先写下你的名字',short:'签名',body:'把示例名字换成你的英文名或拼音，画布会同步更新。想保留自己的手写笔迹，也可以选择“描图签名”。',hint:'可以使用当前设计继续，不会替换你的作品。',target:'signature-content',icon:'pen'},
  {title:'给签名一点个人风格',short:'样式',body:'选一个装饰，然后在画布上点选、拖动到合适位置。想调整笔迹颜色和粗细，随时回到左侧“签名”。',hint:'方向键微调位置，Shift + 方向键移动得更快。',target:'decoration-library',icon:'sparkle'},
  {title:'选好开场和收尾',short:'动画',body:'点击预览图卡选择动画，主画布会播放对应片段。底部还能单独查看开场、签名过程和收尾。',hint:'点“查看全部”浏览更多开场，也可以选择“无动画”。',target:'animation-picker',icon:'play'},
  {title:'把作品带走',short:'导出',body:'选择 MP4 视频或 GIF 动图，再生成并下载。需要透明背景时，使用 GIF；配乐可随 MP4 一起导出。',hint:'时长与帧率在“动画”中，比例与背景在“画面”中。',target:'export-button',icon:'download'},
];
type Placement={left:number;top:number;width:number;maxHeight:number;side:'left'|'right'|'bottom'};

export function Onboarding(props:Props){
  const {state,paused=false,exportHost}=props;
  const id=useId(),dialog=useRef<HTMLDialogElement>(null),startButton=useRef<HTMLButtonElement>(null),card=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null),locatePending=useRef(false);
  const latest=useRef(props);latest.current=props;
  const [placement,setPlacement]=useState<Placement>({left:16,top:100,width:326,maxHeight:600,side:'right'});
  const [locateToken,setLocateToken]=useState(0),[targetFound,setTargetFound]=useState(false);
  const inline=state.status==='active'&&state.step===3&&exportHost!==null;

  useEffect(()=>{
    const target=dialog.current;if(!target)return;
    if(state.status==='invite'&&!paused){
      if(!target.open){target.showModal();startButton.current?.focus();}
    }else if(target.open)target.close();
  },[state.status,paused]);

  useEffect(()=>{
    if(state.status!=='active'||paused)return;
    const escape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('dialog[open]'))return;
      event.preventDefault();latest.current.onDismiss();
    };
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[state.status,paused]);

  useLayoutEffect(()=>{
    if(state.status!=='active'||paused||inline)return;
    let frame=0,target:HTMLElement|null=null,didScroll=false;
    const targetSelector=`[data-tour="${steps[state.step].target}"]`;
    const resize=new ResizeObserver(()=>schedule());
    const measure=()=>{
      frame=0;
      const found=document.querySelector<HTMLElement>(targetSelector);
      const visible=found&&found.getClientRects().length>0?found:null;
      if(target!==visible){
        if(target){target.classList.remove('tour-target-active');resize.unobserve(target);}
        target=visible;
        if(target){target.classList.add('tour-target-active');resize.observe(target);}
      }
      setTargetFound(!!target);
      if(target&&!didScroll){
        didScroll=true;
        target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
      }
      if(target&&locatePending.current){
        const control=target.matches('input,button,select,textarea,[tabindex]')?target:target.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled])')??target.querySelector<HTMLElement>('button:not([disabled]),[tabindex]');
        if(control){locatePending.current=false;control.focus({preventScroll:true});}
      }
      const viewport=window.visualViewport,width=viewport?.width??window.innerWidth,height=viewport?.height??window.innerHeight,offsetTop=viewport?.offsetTop??0;
      const cardWidth=Math.max(1,Math.min(326,width-32)),maxHeight=Math.max(1,Math.min(height-24,width<800?height*.48:height-24)),cardHeight=Math.min(card.current?.getBoundingClientRect().height??268,maxHeight);
      const bounds=target?.getBoundingClientRect();
      let left=width-cardWidth-20,top=height-cardHeight-20+offsetTop,side:Placement['side']='bottom';
      if(bounds&&width>=800){
        const inspectorRight=target?.closest('.editor-inspector')?.getBoundingClientRect().right??bounds.right;
        if(inspectorRight+cardWidth+24<=width){left=inspectorRight+16;side='right';}
        else if(bounds.left-cardWidth-16>=16){left=bounds.left-cardWidth-16;side='left';}
        top=Math.max(76+offsetTop,Math.min(bounds.top,height-cardHeight-16+offsetTop));
        const controlsTop=document.querySelector('.animation-controls')?.getBoundingClientRect().top;
        if(controlsTop!==undefined&&controlsTop>76+offsetTop+cardHeight+12)top=Math.min(top,controlsTop-cardHeight-12);
      }
      left=Math.max(16,Math.min(left,width-cardWidth-16));
      top=Math.max(12+offsetTop,Math.min(top,height-cardHeight-12+offsetTop));
      setPlacement(current=>current.left===left&&current.top===top&&current.width===cardWidth&&current.maxHeight===maxHeight&&current.side===side?current:{left,top,width:cardWidth,maxHeight,side});
    };
    function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
    const mutation=new MutationObserver(schedule);
    mutation.observe(document.querySelector('.workspace')??document.body,{childList:true,subtree:true});
    if(card.current)resize.observe(card.current);
    window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);
    window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
    schedule();
    return ()=>{
      cancelAnimationFrame(frame);mutation.disconnect();resize.disconnect();target?.classList.remove('tour-target-active');
      window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true);
      window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
    };
  },[state.status,state.step,paused,inline,locateToken]);

  useEffect(()=>{
    if(state.status!=='active'||paused)return;
    const frame=requestAnimationFrame(()=>{
      if(latest.current.state.status!=='active'||latest.current.state.step!==state.step||latest.current.paused)return;
      if(document.querySelector('dialog[open]')&&!inline)return;
      if(inline&&!exportHost?.closest('dialog')?.open)return;
      locatePending.current=false;heading.current?.focus({preventScroll:true});
    });
    return ()=>cancelAnimationFrame(frame);
  },[state.status,state.step,paused,inline,exportHost]);

  const locate=useCallback(()=>{locatePending.current=true;latest.current.onLocateStep();setLocateToken(token=>token+1);},[]);
  const step=steps[state.step];
  const content=<section className={`tour-card ${inline?'tour-card-inline':''}`} ref={card} role="region" aria-labelledby={`${id}-step-title`} data-editor-shortcuts="off" data-side={placement.side} style={inline?undefined:{left:placement.left,top:placement.top,width:placement.width,maxHeight:placement.maxHeight} as CSSProperties}>
    <div className="tour-card-top"><span className="tour-step-count" role="status" aria-live="polite">教学引导 · 第 {state.step+1} / 4 步</span><button type="button" className="tour-dismiss" aria-label="退出教学引导" title="退出教学引导" onClick={()=>props.onDismiss()}><Icon name="close" size={15}/></button></div>
    <div className="tour-step-track" aria-label="引导进度">{steps.map((item,index)=><span className={index===state.step?'is-current':index<state.step?'is-done':''} key={item.short} aria-current={index===state.step?'step':undefined}><i aria-hidden="true">{index<state.step?<Icon name="check" size={10}/>:index+1}</i>{item.short}</span>)}</div>
    <div className="tour-card-body" aria-live="polite" aria-atomic="true"><h3 id={`${id}-step-title`} ref={heading} tabIndex={-1}><span className="tour-step-icon"><Icon name={step.icon} size={18}/></span>{step.title}</h3><p>{step.body}</p><p className="tour-hint">{step.hint}</p>
      {!inline&&<button type="button" className="tour-locate" onClick={locate}>{targetFound?'定位操作区域':'打开对应设置'}<Icon name="chevron" size={12}/></button>}
    </div>
    <div className="tour-card-actions"><button type="button" className="tour-skip" onClick={()=>props.onDismiss()}>跳过引导</button><div>{state.step>0&&<button type="button" className="button secondary small" onClick={()=>props.onStepChange((state.step-1) as OnboardingStep)}>上一步</button>}{state.step<3?<button type="button" className="button primary small" onClick={()=>props.onStepChange((state.step+1) as OnboardingStep)}>下一步：{steps[state.step+1].short}<Icon name="chevron" size={12}/></button>:<button type="button" className="button primary small" onClick={()=>props.onFinish()}><Icon name="check" size={13}/>完成引导</button>}</div></div>
  </section>;
  return <>
    <dialog className="tour-welcome" ref={dialog} aria-labelledby={`${id}-welcome-title`} aria-describedby={`${id}-welcome-copy`} onCancel={event=>{event.preventDefault();latest.current.onDismiss();}} onClose={()=>{if(latest.current.state.status==='invite'&&!latest.current.paused)latest.current.onDismiss();}}>
      <button type="button" className="tour-welcome-close icon-button" aria-label="跳过教学引导" onClick={()=>props.onDismiss()}><Icon name="close" size={17}/></button>
      <div className="tour-welcome-art" aria-hidden="true"><span className="tour-art-line"/><span className="tour-art-mark"><Icon name="pen" size={31}/></span><i className="tour-art-spark"><Icon name="sparkle" size={22}/></i><span className="tour-art-dots"><i/><i/><i/></span></div>
      <span className="tour-welcome-eyebrow">开始你的第一个作品</span><h2 id={`${id}-welcome-title`}>30 秒，做出你的动态签名</h2><p id={`${id}-welcome-copy`}>从写下名字到选好动画，跟着四个小步骤体验一遍。</p>
      <ol className="tour-welcome-steps">{steps.map((item,index)=><li key={item.short}><span>{index+1}</span>{item.short}</li>)}</ol>
      <div className="tour-welcome-actions"><button type="button" className="button primary" ref={startButton} onClick={()=>props.onStart()}>开始体验<Icon name="chevron" size={14}/></button><button type="button" className="tour-welcome-skip" onClick={()=>props.onDismiss()}>先自己试试</button></div>
      <p className="tour-welcome-note">随时可退出，也可在“更多操作”里重新打开。</p>
    </dialog>
    {state.status==='active'&&!paused&&(inline&&exportHost?createPortal(content,exportHost):content)}
  </>;
}
