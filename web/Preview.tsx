import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,type PointerEvent,type KeyboardEvent as ReactKeyboardEvent,type CSSProperties} from 'react';
import {hitTest,renderScene,type Hit,type PreparedScene} from './renderer';
import type {WebConfig} from './model';
import {audioEnvelope,audioWindow} from './audio';
import {Icon} from './ui';
import {resolveMotionSelection} from './animation-catalog';
import {previewPhases,previewRange,type PreviewPhase} from './preview-timeline';

type DragTarget='signature'|'decoration';
export type AnimationPreviewRequest={token:number;phase:'intro'|'outro'};
type PreviewProps={scene:PreparedScene;selected:0|1;config:WebConfig;audioUrl?:string;pauseToken:number;completeToken?:number;previewRequest?:AnimationPreviewRequest;disabled?:boolean;repeat?:boolean;controlsTarget?:HTMLElement|null;onStartPlayback?:()=>void;onSelect:(i:0|1)=>void;onSelectElement?:(index:0|1,target:DragTarget)=>void;onGestureStart?:()=>void;onGestureEnd?:()=>void;onDrag:(index:0|1,target:DragTarget,dx:number,dy:number)=>void};

export function Preview({scene,selected,config,audioUrl,pauseToken,completeToken=0,previewRequest,disabled=false,repeat=true,onStartPlayback,onSelect,onSelectElement,onGestureStart,onGestureEnd,onDrag}:PreviewProps){
  const canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null),audio=useRef<HTMLAudioElement>(null);
  const [display,setDisplay]=useState({width:640,height:360});
  const stageRoom=useRef({width:0,height:0});
  const [time,setTime]=useState(scene.editingTime),[playing,setPlaying]=useState(false),[loop,setLoop]=useState(repeat);
  const [selectedTarget,setSelectedTarget]=useState<DragTarget|null>(null);
  const [segment,setSegment]=useState<PreviewPhase['id']|null>(null),segmentRef=useRef<PreviewPhase['id']|null>(null);
  const [completePreview,setCompletePreview]=useState(true),completePreviewRef=useRef(true);
  const clock=useRef(0),currentScene=useRef(scene),playingRef=useRef(false),musicEnabled=useRef(false);
  const latest=useRef({config,audioUrl,disabled,repeat:loop,onStartPlayback,pauseToken,onGestureStart,onGestureEnd});
  const anchor=useRef<{startedAt:number;offset:number;finishedAt:number|null}>({startedAt:0,offset:0,finishedAt:null});
  const drag=useRef<{id:number;x:number;y:number;index:0|1;target:DragTarget;element:HTMLElement}|null>(null);
  const keyboardGesture=useRef(false);
  const previousIdentity=useRef<object|null>(null),previousPauseToken=useRef(pauseToken),previousCompleteToken=useRef(completeToken);
  const previousPreviewRequest=useRef<number|undefined>(undefined);
  currentScene.current=scene;
  latest.current={config,audioUrl,disabled,repeat:loop,onStartPlayback,pauseToken,onGestureStart,onGestureEnd};
  const motionSelection=resolveMotionSelection(scene.config.animation),motionIdentity=motionSelection.intro+'/'+motionSelection.outro;
  const identity=useMemo(()=>({}),[scene.config.mode,motionIdentity,scene.people[0]?.brush,scene.people[1]?.brush]);
  const phases=useMemo(()=>previewPhases(scene),[scene]);
  useEffect(()=>setLoop(repeat),[repeat]);

  const setPlayback=useCallback((value:boolean)=>{playingRef.current=value;setPlaying(value);},[]);
  const resetAnchor=useCallback((offset:number)=>{anchor.current={startedAt:performance.now(),offset,finishedAt:null};},[]);
  const showFrame=useCallback((value:number,skipUnchanged=false)=>{
    const current=currentScene.current,fps=current.config.canvas.fps,bounded=Math.max(0,Math.min(current.duration,value));
    const t=completePreviewRef.current?current.editingTime:bounded>=current.duration?current.duration:Math.floor(bounded*fps+1e-7)/fps;
    if(skipUnchanged&&t===clock.current)return;
    clock.current=t;
    setTime(t);
    if(canvas.current)renderScene(canvas.current,current,t,completePreviewRef.current);
  },[]);
  const pause=useCallback(()=>{musicEnabled.current=false;setPlayback(false);audio.current?.pause();},[setPlayback]);
  const showComplete=useCallback(()=>{
    if(latest.current.disabled)return;
    pause();completePreviewRef.current=true;setCompletePreview(true);
    segmentRef.current=null;setSegment(null);
    const editingTime=currentScene.current.editingTime;
    resetAnchor(editingTime);showFrame(editingTime);
  },[pause,resetAnchor,showFrame]);
  useEffect(()=>{
    if(previousCompleteToken.current===completeToken)return;
    previousCompleteToken.current=completeToken;showComplete();
  },[completeToken,showComplete]);
  const syncAudio=useCallback((t:number,play:boolean)=>{
    const player=audio.current,props=latest.current;
    if(!player||!props.audioUrl)return;
    if(!play||!musicEnabled.current){player.pause();return;}
    if(!Number.isFinite(player.duration)){player.pause();return;}
    let window;
    try{window=audioWindow(player.duration,currentScene.current.duration,props.config.audio.start);}
    catch{player.pause();return;}
    if(t>=window.duration){player.pause();return;}
    const target=window.offset+t;
    if(Math.abs(player.currentTime-target)>.18)player.currentTime=target;
    const points=audioEnvelope(window.duration,props.config.audio);
    let volume=points[0].gain;
    for(let i=1;i<points.length;i++){
      const from=points[i-1],to=points[i];
      if(t<=to.time){const u=Math.max(0,Math.min(1,(t-from.time)/(to.time-from.time||1)));volume=from.gain+(to.gain-from.gain)*u;break;}
      volume=to.gain;
    }
    player.volume=Math.max(0,Math.min(1,volume));
    if(player.paused)void player.play().catch(()=>{});
  },[]);

  const fitDisplay=useCallback(()=>{
    const room=stageRoom.current;
    if(room.width<=0||room.height<=0)return;
    const current=currentScene.current,ratio=current.width/current.height;
    // ResizeObserver's content box already excludes the stage padding. Letter bounds never enter this fit.
    const width=Math.max(1,Math.floor(Math.min(room.width,room.height*ratio))),height=width/ratio;
    setDisplay(previous=>previous.width===width&&Math.abs(previous.height-height)<.01?previous:{width,height});
  },[]);
  useLayoutEffect(()=>{
    if(!stage.current)return;
    const observer=new ResizeObserver(([entry])=>{
      stageRoom.current={width:entry.contentRect.width,height:entry.contentRect.height};
      fitDisplay();
    });
    observer.observe(stage.current);
    return ()=>observer.disconnect();
  },[fitDisplay]);
  useLayoutEffect(()=>{fitDisplay();},[scene.width,scene.height,fitDisplay]);

  // Keep a complete design visible during edits; otherwise replay a new signature.
  useLayoutEffect(()=>{
    if(previousIdentity.current===identity)return;
    previousIdentity.current=identity;
    musicEnabled.current=false;
    audio.current?.pause();
    const pointer=drag.current;
    if(pointer?.element.hasPointerCapture(pointer.id))pointer.element.releasePointerCapture(pointer.id);
    if(pointer)latest.current.onGestureEnd?.();
    drag.current=null;
    segmentRef.current=null;setSegment(null);
    completePreviewRef.current=true;setCompletePreview(true);
    const next=currentScene.current.editingTime;
    resetAnchor(next);
    showFrame(next);
    setPlayback(false);
  },[identity,motionIdentity,resetAnchor,setPlayback,showFrame]);

  useLayoutEffect(()=>{
    if(completePreviewRef.current||drag.current){
      pause();resetAnchor(scene.editingTime);showFrame(scene.editingTime);
      return;
    }
    const previous=clock.current,next=Math.max(0,Math.min(scene.duration,previous));
    if(next!==previous||(anchor.current.finishedAt!==null&&next<scene.duration))resetAnchor(next);
    showFrame(next);
  },[scene,pause,resetAnchor,showFrame]);

  useEffect(()=>{
    if(previousPauseToken.current===pauseToken)return;
    previousPauseToken.current=pauseToken;
    pause();
  },[pauseToken,pause]);
  useEffect(()=>{
    if(!disabled)return;
    pause();
    const pointer=drag.current;
    drag.current=null;
    if(pointer?.element.hasPointerCapture(pointer.id))pointer.element.releasePointerCapture(pointer.id);
    if(pointer)latest.current.onGestureEnd?.();
  },[disabled,pause]);

  useEffect(()=>{
    if(!playing)return;
    let raf=0;
    const tick=(now:number)=>{
      if(!playingRef.current||latest.current.disabled)return;
      const current=currentScene.current,transport=anchor.current,range=previewRange(current,segmentRef.current);
      const elapsed=transport.offset+(now-transport.startedAt)/1000,span=range.end-range.start;
      if(span<=0){pause();return;}
      const t=latest.current.repeat?range.start+Math.max(0,elapsed-range.start)%span:Math.min(range.end,elapsed);
      // Audio follows scene time, including when replaying only one phase.
      showFrame(t,true);syncAudio(t,t<range.end);
      if(!latest.current.repeat&&t>=range.end)pause();
      if(playingRef.current)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(raf);audio.current?.pause();};
  },[playing,pause,resetAnchor,showFrame,syncAudio]);

  const toggle=useCallback(()=>{
    if(latest.current.disabled)return;
    if(playingRef.current){pause();return;}
    const wasComplete=completePreviewRef.current;
    completePreviewRef.current=false;setCompletePreview(false);
    latest.current.onStartPlayback?.();
    musicEnabled.current=true;
    const range=previewRange(currentScene.current,segmentRef.current);
    const t=wasComplete||clock.current>=range.end-.01||clock.current<range.start?range.start:clock.current;
    resetAnchor(t);showFrame(t);syncAudio(t,true);setPlayback(true);
  },[pause,resetAnchor,setPlayback,showFrame,syncAudio]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||document.querySelector('dialog[open]')||event.code!=='Space'||(event.target as HTMLElement)?.closest('input,button,select,textarea,summary,a,audio,video,[contenteditable=true]'))return;
      event.preventDefault();toggle();
    };
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  },[toggle]);
  useEffect(()=>()=>{musicEnabled.current=false;audio.current?.pause();},[]);
  useEffect(()=>{
    const visibility=()=>{if(document.hidden)pause();};
    const blur=()=>{
      if(!keyboardGesture.current)return;
      keyboardGesture.current=false;latest.current.onGestureEnd?.();
    };
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('blur',blur);
    return ()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);};
  },[pause]);

  const finishGesture=useCallback(()=>{
    if(!drag.current)return;
    drag.current=null;latest.current.onGestureEnd?.();
  },[]);
  const selectElement=(hit:Hit,openPanel=true)=>{
    setSelectedTarget(hit.target);onSelect(hit.index);
    if(openPanel)onSelectElement?.(hit.index,hit.target);
    showComplete();
  };
  const down=(event:PointerEvent<HTMLElement>,target?:Hit)=>{
    if(disabled||!event.isPrimary||event.button!==0)return;
    const rect=canvas.current?.getBoundingClientRect();if(!rect)return;
    const x=(event.clientX-rect.left)/rect.width*scene.width,y=(event.clientY-rect.top)/rect.height*scene.height,hit=target??hitTest(scene,x,y);
    if(!hit){setSelectedTarget(null);return;}
    event.preventDefault();selectElement(hit);event.currentTarget.focus({preventScroll:true});
    onGestureStart?.();
    drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,index:hit.index,target:hit.target,element:event.currentTarget};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move=(event:PointerEvent<HTMLElement>)=>{
    const pointer=drag.current;
    if(disabled||!pointer||pointer.id!==event.pointerId)return;
    const rect=canvas.current?.getBoundingClientRect();if(!rect)return;
    onDrag(pointer.index,pointer.target,(event.clientX-pointer.x)/rect.width,(event.clientY-pointer.y)/rect.height);
    pointer.x=event.clientX;pointer.y=event.clientY;
  };
  const up=(event:PointerEvent<HTMLElement>)=>{
    if(drag.current?.id===event.pointerId)finishGesture();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const endKeyboardGesture=()=>{
    if(!keyboardGesture.current)return;
    keyboardGesture.current=false;onGestureEnd?.();
  };
  const nudge=(event:ReactKeyboardEvent<HTMLButtonElement>,hit:Hit)=>{
    if(disabled||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();selectElement(hit,false);
    if(!keyboardGesture.current){keyboardGesture.current=true;onGestureStart?.();}
    const step=event.shiftKey?10:1;
    onDrag(hit.index,hit.target,(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0)/scene.width,(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)/scene.height);
  };
  const startRange=useCallback((id:PreviewPhase['id']|null)=>{
    if(latest.current.disabled)return;
    const range=previewRange(currentScene.current,id);if(range.end<=range.start)return;
    pause();segmentRef.current=id;setSegment(id);
    completePreviewRef.current=false;setCompletePreview(false);latest.current.onStartPlayback?.();musicEnabled.current=true;
    resetAnchor(range.start);showFrame(range.start);syncAudio(range.start,true);setPlayback(true);
  },[pause,resetAnchor,showFrame,syncAudio,setPlayback]);
  useEffect(()=>{
    if(!previewRequest||previousPreviewRequest.current===previewRequest.token)return;
    previousPreviewRequest.current=previewRequest.token;
    if(latest.current.disabled||document.hidden||document.querySelector('dialog[open]'))return;
    const range=previewRange(currentScene.current,previewRequest.phase);
    if(range.end-range.start<=1e-6){showComplete();return;}
    startRange(previewRequest.phase);
  },[previewRequest,startRange,showComplete]);
  const goStart=()=>{
    pause();completePreviewRef.current=false;setCompletePreview(false);
    const start=previewRange(currentScene.current,segmentRef.current).start;
    resetAnchor(start);showFrame(start);
  };
  return <>
    <div className="preview-toolbar">
      <div className="preview-title"><strong>签名画布</strong><span>{scene.width} × {scene.height}</span>{scene.config.canvas.transparent&&<small>透明背景</small>}</div>
      <div className="preview-tools" role="group" aria-label="设计查看">
        <span className="canvas-mode-label">{completePreview?'正在编辑':'动画预览'}</span>
        <button type="button" className="complete-preview-button" disabled={disabled} aria-pressed={completePreview} title="暂停动画，完整展示签名与装饰" onClick={showComplete}><Icon name="frame" size={16}/>完整展开</button>
      </div>
    </div>
    <div className="canvas-stage" ref={stage}><div className={`canvas-surface is-draggable ${scene.config.canvas.transparent?'is-transparent':''}`} style={{width:display.width,height:display.height,aspectRatio:scene.width/scene.height}}>
      <canvas ref={canvas} width={scene.width} height={scene.height} tabIndex={-1} role="img" aria-label={`${config.mode==='couple'?'情侣':'单人'}动态签名预览`} aria-describedby="signature-preview-help" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={finishGesture}/>
      {completePreview&&!playing&&<div className="canvas-element-layer" role="group" aria-label="画布元素">
        {[...scene.hitAreas].sort((a,b)=>(a.target==='decoration'?1:0)-(b.target==='decoration'?1:0)).map(area=>{
          const name=(config.mode==='couple'?(area.index===0?'第一位':'第二位'):'')+(area.target==='signature'?'签名':'装饰');
          const active=selected===area.index&&selectedTarget===area.target,b=area.bounds;
          return <button type="button" className={`canvas-element-target ${active?'is-selected':''}`} key={`${area.index}-${area.target}`} disabled={disabled} aria-label={`选择${name}，方向键移动，Shift 加速`} aria-pressed={active} style={{left:`${b.minX/scene.width*100}%`,top:`${b.minY/scene.height*100}%`,width:`${(b.maxX-b.minX)/scene.width*100}%`,height:`${(b.maxY-b.minY)/scene.height*100}%`}} onFocus={()=>{setSelectedTarget(area.target);onSelect(area.index);}} onClick={()=>selectElement(area)} onPointerDown={event=>down(event,area)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={finishGesture} onKeyDown={event=>nudge(event,area)} onKeyUp={event=>{if(event.key.startsWith('Arrow'))endKeyboardGesture();}} onBlur={endKeyboardGesture}>
            {active&&<><span className="element-selection-label" aria-hidden="true">{name}</span>{(['nw','ne','sw','se'] as const).map(corner=><span className="selection-handle" data-corner={corner} key={corner} aria-hidden="true"/>)}</>}
          </button>;
        })}
      </div>}
    </div></div>
    <p className="canvas-help" id="signature-preview-help">{completePreview?'点击签名或装饰选中，直接拖动调整位置；方向键微调。':'点击阶段单独预览，或播放完整动画；空格播放 / 暂停。'}</p>
    <div className="animation-controls" role="group" aria-label="动画控制区">
      <div className="control-toolbar">
        <div className="transport-primary">
          <button type="button" className="transport-button" disabled={disabled} aria-label="回到片段开头" title="回到片段开头" onClick={goStart}><Icon name="replay" size={17}/></button>
          <button type="button" className="play-button" disabled={disabled} aria-label={playing?'暂停':'播放动画'} title={playing?'暂停（空格）':'播放（空格）'} onClick={toggle}><Icon name={playing?'pause':'play'} size={17}/></button>
          <span className="transport-time"><strong>{time.toFixed(2)}</strong><span> / {scene.duration.toFixed(2)} 秒</span></span>
        </div>
        <div className="transport-options">
          <button type="button" className="transport-button loop-button" disabled={disabled} aria-pressed={loop} onClick={()=>setLoop(value=>!value)} title="循环播放当前片段"><Icon name="replay" size={15}/><span>循环</span></button>
          <span className="preview-fps">{config.canvas.fps} 帧</span>
        </div>
      </div>
      <div className="phase-track" role="group" aria-label="选择动画预览片段">
        <button type="button" className="phase-button phase-all" disabled={disabled} aria-pressed={segment===null&&!completePreview} onClick={()=>startRange(null)}><span>完整动画</span><small>{scene.duration.toFixed(1)}s</small></button>
        {phases.map((phase,index)=>{
          const available=phase.end-phase.start>1e-6,current=!completePreview&&time>=phase.start&&time<phase.end;
          return <button type="button" key={phase.id} className={`phase-button phase-${phase.id}`} disabled={disabled||!available} aria-pressed={segment===phase.id&&!completePreview} data-current={current} title={available?`单独播放${phase.label}`:`未设置${phase.label}动画`} onClick={()=>startRange(phase.id)}><span><i aria-hidden="true">{String(index+1).padStart(2,'0')}</i>{phase.label}</span><small>{available?`${(phase.end-phase.start).toFixed(1)}s`:'未设置'}</small></button>;
        })}
      </div>
      <div className="playbar">
        <span className="time-label">0s</span><span className="timeline-control" style={{'--range-progress':time/scene.duration} as CSSProperties}><span className="range-rail" aria-hidden="true"><span className="range-fill"/></span><input className="timeline" type="range" disabled={disabled} aria-label="动画进度" aria-valuetext={`${time.toFixed(2)}秒，共${scene.duration.toFixed(2)}秒`} min={0} max={scene.duration} step={1/config.canvas.fps} value={time} onChange={event=>{pause();segmentRef.current=null;setSegment(null);completePreviewRef.current=false;setCompletePreview(false);const next=Number(event.target.value);resetAnchor(next);showFrame(next);}}/></span><span className="time-label">{scene.duration.toFixed(1)}s</span>
      </div>
    </div>
    {audioUrl&&<audio ref={audio} src={audioUrl} preload="metadata"/>}
  </>;
}
