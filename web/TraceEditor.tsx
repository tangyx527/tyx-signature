import {useCallback,useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {appendCapsules} from './brush-engine';
import {appendTraceStroke,beautifyTrace,buildTraceBrush,traceBrushTransform,TRACE_BASE_RADIUS,type TraceData,type TracePoint,type TraceStroke,type TraceStrength} from './tracing';
import {Icon,Range,Toggle} from './ui';
import './trace-editor.css';

type Props={open:boolean;initialTrace?:TraceData;inkColor:string;penWidth:number;duration?:number;renderPreview?:(canvas:HTMLCanvasElement,trace:TraceData,time:number,complete:boolean)=>void;onApply:(trace:TraceData)=>void;onClose:()=>void};
type Mode='adjust'|'draw'|'preview';
type Guide={image:HTMLImageElement;url:string;name:string};
type Capture={id:number;kind:TraceStroke['pointerType'];points:TracePoint[];display:TracePoint[]};
const BOARD_WIDTH=1600,MAX_POINTS=40000,MAX_STROKES=300;
const bounded=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));
const newTrace=():TraceData=>({version:1,aspect:16/9,strength:'standard',strokes:[]});
const strengthLabels:Record<TraceStrength,string>={light:'轻度',standard:'标准',strong:'强力'};

export function TraceEditor({open,initialTrace,inkColor,penWidth,duration=5,renderPreview,onApply,onClose}:Props){
  const id=useId(),dialog=useRef<HTMLDialogElement>(null),stage=useRef<HTMLDivElement>(null),guideCanvas=useRef<HTMLCanvasElement>(null),inkCanvas=useRef<HTMLCanvasElement>(null),fileInput=useRef<HTMLInputElement>(null);
  const latest=useRef({initialTrace,onClose,renderPreview});latest.current={initialTrace,onClose,renderPreview};
  const [strokes,setStrokes]=useState<TraceStroke[]>([]),[strength,setStrength]=useState<TraceStrength>('standard'),[aspect,setAspect]=useState(16/9),[mode,setMode]=useState<Mode>('adjust');
  const [guide,setGuide]=useState<Guide|null>(null),[guideOpacity,setGuideOpacity]=useState(.3),[guideZoom,setGuideZoom]=useState(1),[guideOffset,setGuideOffset]=useState({x:0,y:0}),[showGuide,setShowGuide]=useState(true);
  const [room,setRoom]=useState({width:800,height:450}),[error,setError]=useState(''),[playing,setPlaying]=useState(false),[playhead,setPlayhead]=useState(0),[previewFinished,setPreviewFinished]=useState(false),[previewAspect,setPreviewAspect]=useState(16/9);
  const guideRef=useRef<Guide|null>(null),uploadGeneration=useRef(0),capture=useRef<Capture|null>(null),imageDrag=useRef<{id:number;x:number;y:number;offset:{x:number;y:number}}|null>(null),origin=useRef(0),clearedBackup=useRef<TraceStroke[]|null>(null),paintFrame=useRef(0);
  const blockedPointers=useRef(new Set<number>());
  const lastSampleTime=useRef(0);
  const trace=useMemo<TraceData>(()=>({version:1,aspect,strength,strokes}),[aspect,strength,strokes]);
  const pointCount=useMemo(()=>strokes.reduce((total,stroke)=>total+stroke.points.length,0),[strokes]);
  const beauty=useMemo(()=>strokes.length?beautifyTrace(trace):[],[trace]);
  const brush=useMemo(()=>strokes.length?buildTraceBrush(trace):null,[trace]);
  const brushTransform=useMemo(()=>brush?traceBrushTransform(trace):null,[brush,trace]);
  const hasInk=strokes.some(stroke=>stroke.points.length>0);
  const displayAspect=mode==='preview'?previewAspect:aspect;
  const displayWidth=Math.max(1,Math.min(room.width,room.height*displayAspect)),displayHeight=displayWidth/displayAspect;
  const luminance=[1,3,5].map(start=>parseInt(inkColor.slice(start,start+2),16)||0).reduce((n,value,index)=>n+value*[.2126,.7152,.0722][index],0);
  const paper=luminance<120?'#fafafa':'#111214';

  const releaseGuide=useCallback(()=>{const previous=guideRef.current;if(previous)URL.revokeObjectURL(previous.url);guideRef.current=null;setGuide(null);},[]);
  const cancelGesture=useCallback(()=>{
    const canvas=inkCanvas.current,ids=[capture.current?.id,imageDrag.current?.id];
    capture.current=null;imageDrag.current=null;
    for(const pointerId of ids)if(pointerId!==undefined&&canvas?.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
  },[]);
  useEffect(()=>{
    const target=dialog.current;if(!target)return;
    if(open){
      // A live code update must not replace an open, unapplied draft with saved ink.
      if(target.open)return;
      const initial=structuredClone(latest.current.initialTrace??newTrace());
      setStrokes(initial.strokes);setStrength(initial.strength);setAspect(initial.aspect);
      setMode(initial.strokes.length?'draw':'adjust');setError('');setPlaying(false);setPlayhead(0);setPreviewFinished(false);
      setGuideOpacity(.3);setGuideZoom(1);setGuideOffset({x:0,y:0});setShowGuide(true);releaseGuide();
      cancelGesture();clearedBackup.current=null;
      lastSampleTime.current=Math.max(0,...initial.strokes.map(stroke=>stroke.points.at(-1)?.t??0));
      origin.current=performance.now()-lastSampleTime.current;
      if(!target.open)target.showModal();
    }else{
      uploadGeneration.current++;cancelGesture();setPlaying(false);
      if(target.open)target.close();
      releaseGuide();
    }
  },[cancelGesture,open,releaseGuide]);
  useEffect(()=>()=>{uploadGeneration.current++;if(guideRef.current)URL.revokeObjectURL(guideRef.current.url);cancelAnimationFrame(paintFrame.current);},[]);
  useLayoutEffect(()=>{
    if(!open||!stage.current)return;
    const observer=new ResizeObserver(([entry])=>setRoom({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(stage.current);return ()=>observer.disconnect();
  },[open]);

  const paintGuide=useCallback(()=>{
    const canvas=guideCanvas.current;if(!canvas)return;
    const height=Math.round(BOARD_WIDTH/aspect);if(canvas.width!==BOARD_WIDTH)canvas.width=BOARD_WIDTH;if(canvas.height!==height)canvas.height=height;
    const context=canvas.getContext('2d');if(!context)return;context.clearRect(0,0,canvas.width,canvas.height);
    if(!guide||!showGuide||mode==='preview')return;
    const fit=Math.min(canvas.width/guide.image.naturalWidth,canvas.height/guide.image.naturalHeight),width=guide.image.naturalWidth*fit*guideZoom,imageHeight=guide.image.naturalHeight*fit*guideZoom;
    context.globalAlpha=guideOpacity;context.drawImage(guide.image,(canvas.width-width)/2+guideOffset.x*canvas.width,(canvas.height-imageHeight)/2+guideOffset.y*canvas.height,width,imageHeight);context.globalAlpha=1;
  },[aspect,guide,guideOffset,guideOpacity,guideZoom,mode,showGuide]);

  const paintInk=useCallback(()=>{
    const canvas=inkCanvas.current;if(!canvas)return;
    if(mode==='preview'&&latest.current.renderPreview&&hasInk){
      try{latest.current.renderPreview(canvas,trace,playhead,previewFinished);const next=canvas.width/canvas.height;setPreviewAspect(previous=>Math.abs(previous-next)<.00001?previous:next);}catch(reason){setPlaying(false);setError(reason instanceof Error?reason.message:'暂时无法预览这份笔迹。');}
      return;
    }
    const height=Math.round(BOARD_WIDTH/aspect);if(canvas.width!==BOARD_WIDTH)canvas.width=BOARD_WIDTH;if(canvas.height!==height)canvas.height=height;
    const context=canvas.getContext('2d');if(!context)return;context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle=inkColor;context.strokeStyle=inkColor;context.lineCap='round';context.lineJoin='round';
    // Invert only the brush's fit transform: the guide and finished ink retain
    // their original normalized positions while using the product's fixed ink.
    if(brush&&brushTransform){
      context.save();
      context.translate(brushTransform.offsetX*canvas.width,brushTransform.offsetY*canvas.height*aspect);
      context.scale(canvas.width/brushTransform.scale,canvas.height*aspect/brushTransform.scale);
      for(const stroke of brush.strokes){context.beginPath();appendCapsules(context,stroke.samples.map(point=>({...point,radius:point.radius*penWidth})));context.fill();}
      context.restore();
    }
    const width=2*TRACE_BASE_RADIUS*BOARD_WIDTH*penWidth;
    const drawPoints=(points:readonly TracePoint[])=>{
      if(!points.length)return;
      if(points.length===1){context.beginPath();context.arc(points[0].x*canvas.width,points[0].y*canvas.height,width/2,0,Math.PI*2);context.fill();return;}
      context.beginPath();context.moveTo(points[0].x*canvas.width,points[0].y*canvas.height);for(const point of points.slice(1))context.lineTo(point.x*canvas.width,point.y*canvas.height);context.lineWidth=width;context.stroke();
    };
    if(capture.current)drawPoints(capture.current.display);
  },[aspect,brush,brushTransform,hasInk,inkColor,mode,penWidth,playhead,previewFinished,trace]);
  const paintInkLatest=useRef(paintInk);paintInkLatest.current=paintInk;
  const scheduleInk=()=>{if(paintFrame.current)return;paintFrame.current=requestAnimationFrame(()=>{paintFrame.current=0;paintInkLatest.current();});};
  useLayoutEffect(()=>{if(open){paintGuide();paintInk();}},[open,paintGuide,paintInk]);
  useEffect(()=>{
    if(mode!=='preview'||!playing)return;
    const started=performance.now()-playhead*1000;let request=0;
    const tick=(now:number)=>{const next=Math.min(duration,(now-started)/1000);setPlayhead(next);if(next>=duration){setPlaying(false);setPreviewFinished(true);return;}request=requestAnimationFrame(tick);};
    request=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(request);
  // playhead is the captured starting offset; updates are generated by this clock.
  },[duration,mode,playing,trace]);

  const pointFrom=(event:PointerEvent):TracePoint=>{
    const rect=inkCanvas.current!.getBoundingClientRect(),stamp=event.timeStamp>performance.now()+100000?performance.now():event.timeStamp;
    const time=Math.max(lastSampleTime.current,bounded(stamp-origin.current,0,86400000));lastSampleTime.current=time;
    const point:TracePoint={x:bounded((event.clientX-rect.left)/rect.width),y:bounded((event.clientY-rect.top)/rect.height),t:time};
    if(event.pointerType==='pen'&&Number.isFinite(event.pressure)&&event.pressure>0)point.pressure=bounded(event.pressure);
    return point;
  };
  const addPoints=(event:PointerEvent)=>{
    const current=capture.current;if(!current)return;
    const events=event.getCoalescedEvents?.()??[],samples=events.length?events:[event];
    for(const sample of samples){
      if(pointCount+current.points.length>=MAX_POINTS){setError('笔迹采样已达上限，请完成并应用这份签名。');break;}
      const point=pointFrom(sample),last=current.points.at(-1);point.t=Math.max(last?.t??0,point.t);current.points.push(point);
      const before=current.display.at(-1);if(!before){current.display.push({...point});continue;}
      const distance=Math.hypot(point.x-before.x,(point.y-before.y)/aspect),blend=distance>.008?.85:.65;
      current.display.push({...point,x:before.x+(point.x-before.x)*blend,y:before.y+(point.y-before.y)*blend});
    }
    scheduleInk();
  };
  const down=(event:ReactPointerEvent<HTMLCanvasElement>)=>{
    if(mode==='preview'||!event.isPrimary||event.button!==0||capture.current||imageDrag.current)return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    const point=pointFrom(event.nativeEvent);
    if(mode==='adjust'){
      if(guide)imageDrag.current={id:event.pointerId,x:point.x,y:point.y,offset:guideOffset};
      return;
    }
    if(strokes.length>=MAX_STROKES){setError('描写次数已达上限，请撤销部分笔迹或先完成应用。');return;}
    if(pointCount>=MAX_POINTS){setError('笔迹采样已达上限，请完成并应用这份签名。');return;}
    setError('');const kind=event.pointerType==='pen'?'pen':event.pointerType==='touch'?'touch':'mouse';
    capture.current={id:event.pointerId,kind,points:[point],display:[{...point}]};scheduleInk();
  };
  const move=(event:ReactPointerEvent<HTMLCanvasElement>)=>{
    const drag=imageDrag.current;if(drag&&drag.id===event.pointerId){event.preventDefault();const point=pointFrom(event.nativeEvent);setGuideOffset({x:bounded(drag.offset.x+point.x-drag.x,-1.5,1.5),y:bounded(drag.offset.y+point.y-drag.y,-1.5,1.5)});return;}
    if(capture.current?.id!==event.pointerId)return;event.preventDefault();addPoints(event.nativeEvent);
  };
  const finish=(event:ReactPointerEvent<HTMLCanvasElement>,cancelled=false)=>{
    const current=capture.current;
    if(current?.id===event.pointerId){
      if(!cancelled){addPoints(event.nativeEvent);const stroke:TraceStroke={points:current.points,join:false,pointerType:current.kind};setStrokes(previous=>appendTraceStroke(previous,stroke,aspect));clearedBackup.current=null;}
      capture.current=null;scheduleInk();
    }
    if(imageDrag.current?.id===event.pointerId)imageDrag.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const chooseImage=async(file?:File)=>{
    if(!file)return;
    if(file.size>16*1024*1024){setError('参考图请控制在 16 MB 以内。');return;}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)&&!/^.+\.(png|jpe?g|webp)$/i.test(file.name)){setError('请选择 PNG、JPEG 或 WebP 图片。');return;}
    const generation=++uploadGeneration.current,url=URL.createObjectURL(file),image=new Image();image.src=url;
    try{
      await image.decode();
      if(generation!==uploadGeneration.current){URL.revokeObjectURL(url);return;}
      if(image.naturalWidth*image.naturalHeight>36000000)throw new Error('参考图尺寸过大，请先缩小图片。');
      releaseGuide();const next={image,url,name:file.name};guideRef.current=next;setGuide(next);setGuideZoom(1);setGuideOffset({x:0,y:0});setGuideOpacity(.3);setShowGuide(true);setMode('adjust');setPlaying(false);setError('');
    }catch(reason){URL.revokeObjectURL(url);if(generation===uploadGeneration.current)setError(reason instanceof Error&&reason.message.startsWith('参考图')?reason.message:'这张图片无法打开，请换一张图片。');}
    finally{if(fileInput.current)fileInput.current.value='';}
  };
  const changeMode=(next:Mode)=>{cancelGesture();setPlaying(false);setMode(next);};
  const preview=()=>{if(!hasInk)return;setMode('preview');setPlayhead(0);setPreviewFinished(false);setPlaying(true);};
  const undo=()=>{changeMode('draw');if(strokes.length)setStrokes(current=>current.slice(0,-1));else if(clearedBackup.current){setStrokes(clearedBackup.current);clearedBackup.current=null;}};
  const clear=()=>{if(!strokes.length)return;clearedBackup.current=strokes;setStrokes([]);changeMode('draw');setError('');};

  return <dialog className="trace-editor" ref={dialog} aria-labelledby={`${id}-title`} onCancel={event=>{event.preventDefault();onClose();}} onClose={()=>{if(open)latest.current.onClose();}} onPointerDownCapture={event=>{
    const active=capture.current??imageDrag.current;
    if(active&&event.pointerId!==active.id){blockedPointers.current.add(event.pointerId);event.preventDefault();event.stopPropagation();}
    else if(!active)blockedPointers.current.clear();
  }} onClickCapture={event=>{
    const pointerId=(event.nativeEvent as PointerEvent).pointerId;
    if(blockedPointers.current.has(pointerId)||(pointerId===undefined&&blockedPointers.current.size>0)){event.preventDefault();event.stopPropagation();}
  }}>
    <header className="trace-editor-header"><div><h2 id={`${id}-title`}>描图签名</h2><p>沿着参考图描写，留下自己的笔迹。</p></div><button type="button" className="icon-button" aria-label="关闭描图签名" onClick={onClose}><Icon name="close" size={18}/></button></header>
    <div className="trace-editor-body">
      <aside className="trace-editor-tools" aria-label="描摹设置">
        <section className="trace-tool-group"><h3>参考图</h3><button type="button" className="button secondary trace-upload" onClick={()=>fileInput.current?.click()}><Icon name="upload" size={16}/>{guide?'更换参考图':'上传参考图'}</button><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="file-input" aria-label="上传签名参考图" onChange={event=>{void chooseImage(event.currentTarget.files?.[0]);}}/>{guide&&<span className="trace-file-name" title={guide.name}>{guide.name}</span>}
          <div className="mode-switch" role="group" aria-label="描摹模式"><button type="button" className="mode-option" aria-pressed={mode==='adjust'} onClick={()=>changeMode('adjust')}>调整底图</button><button type="button" className="mode-option" aria-pressed={mode==='draw'} onClick={()=>changeMode('draw')}>{strokes.length?'继续描写':'开始描写'}</button></div>
          {guide&&mode==='adjust'&&<><Range title="底图缩放" value={guideZoom} min={.25} max={3} step={.05} suffix="×" onChange={setGuideZoom}/><Range title="底图透明度" value={Math.round(guideOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={value=>setGuideOpacity(value/100)}/><p className="hint">拖动图片调整位置，开始描写后底图会锁定。</p></>}
          {guide&&mode!=='preview'&&<Toggle title="显示参考图" checked={showGuide} onChange={setShowGuide}/>}
        </section>
        <section className="trace-tool-group"><h3>自动美化</h3><div className="mode-switch" role="group" aria-label="美化强度">{(['light','standard','strong'] as const).map(value=><button type="button" className="mode-option" key={value} aria-pressed={strength===value} onClick={()=>{setStrength(value);setPlaying(false);}}>{strengthLabels[value]}</button>)}</div><p className="hint">松手后自动圆润线路，保留字形与基础粗细。</p></section>
        <section className="trace-tool-group"><div className="trace-history-actions"><button type="button" className="button secondary small" disabled={!strokes.length&&!clearedBackup.current} onClick={undo}><Icon name="reset" size={15}/>撤销</button><button type="button" className="button secondary small" disabled={!strokes.length} onClick={clear}>清空轨迹</button></div><span className="hint">已记录 {strokes.length} 次描写 · {beauty.length} 段笔迹</span></section>
        <p className="trace-privacy-note">参考图仅辅助描写，不进入成品或配置文件。</p>
      </aside>
      <div className="trace-workspace">
        <div className="trace-workspace-caption"><strong>{mode==='adjust'?'定位参考图':mode==='preview'?'成品预览':'沿图描写'}</strong><span>{mode==='adjust'?'拖动底图，调整缩放与透明度':mode==='preview'?'仅显示签名笔迹，参考图已隐藏':'从末端附近继续落笔可续描，远处落笔保留断点'}</span></div>
        <div className="trace-stage" ref={stage}>
          <div className={`trace-board trace-board-${mode}`} style={{width:displayWidth,height:displayHeight,backgroundColor:paper}}>
            <canvas ref={guideCanvas} className="trace-guide-canvas" aria-hidden="true"/>
            <canvas ref={inkCanvas} className="trace-ink-canvas" role="img" aria-label="描摹画布" aria-describedby={`${id}-help`} onPointerDown={down} onPointerMove={move} onPointerUp={event=>finish(event)} onPointerCancel={event=>finish(event,true)} onLostPointerCapture={event=>{if(capture.current?.id===event.pointerId){capture.current=null;scheduleInk();}if(imageDrag.current?.id===event.pointerId)imageDrag.current=null;}}/>
            {!hasInk&&!guide&&<div className="trace-empty"><Icon name="pen" size={30}/><span>上传参考图后开始描写</span><small>也可以直接在画布上自由签名</small></div>}
          </div>
        </div>
        <div className="trace-workspace-footer" id={`${id}-help`}>{error?<p className="trace-error" role="alert">{error}</p>:<p>{mode==='draw'?'按住鼠标、手指或笔描写；松开后仍可继续。底图已锁定。':mode==='preview'?'预览与成品使用同一套笔迹绘制。':'参考图会自动居中适配，图片比例保持不变。'}</p>}
          {mode==='preview'&&<div className="trace-preview-controls"><button type="button" className="button secondary small" onClick={()=>{if(previewFinished){setPlayhead(0);setPreviewFinished(false);}setPlaying(value=>!value);}}>{playing?'暂停':previewFinished?'重播':'播放'}</button><Range title="预览进度" displayDecimals={1} value={playhead} min={0} max={duration} step={1/30} suffix="秒" onChange={value=>{setPlaying(false);setPreviewFinished(false);setPlayhead(value);}}/><button type="button" className="button secondary small" onClick={()=>changeMode('draw')}>返回描写</button></div>}
        </div>
      </div>
    </div>
    <footer className="trace-editor-footer"><span>一笔签名 · {strengthLabels[strength]}美化</span><div><button type="button" className="button secondary" disabled={!hasInk} onClick={preview}><Icon name="play" size={16}/>预览动画</button><button type="button" className="button primary" disabled={!hasInk} onClick={()=>{setPlaying(false);onApply(structuredClone(trace));}}>完成并应用</button></div></footer>
  </dialog>;
}
