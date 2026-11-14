import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {canvasSize,clamp,defaultWebConfig,loadConfig,parseConfigFile,saveConfig,validateConfig,type PersonConfig,type WebConfig} from './model';
import {prepareScene,renderScene,type PreparedScene} from './renderer';
import {Preview,type AnimationPreviewRequest} from './Preview';
import {Details,Icon,Range,Toggle,UtilityMenu} from './ui';
import {PaintField} from './PaintField';
import {gradientCss} from './gradient';
import {TraceEditor} from './TraceEditor';
import type {TraceData} from './tracing';
import {MorphNav} from './MorphNav';
import {DecorationThumbnail} from './DecorationThumbnail';
import {AnimationPicker} from './AnimationPicker';
import {Onboarding,type OnboardingState,type OnboardingStep} from './Onboarding';
import {markOnboarding,readOnboarding} from './onboarding-state';
import {ThemeSelector} from './ThemeSelector';
import {usePressRipple} from './usePressRipple';
import {useEditorHistory} from './useEditorHistory';
import {categoryForDecoration,decorationCatalog,decorationCategories,isDecorationId,type DecorationCategory} from './decoration-catalog';
import {introPresets,outroPresets,resolveMotionSelection,type IntroPreset,type OutroPreset} from './animation-catalog';
import './style.css';
import './motion-interactions.css';
import './motion-cards.css';
import './studio.css';

type Tab='signature'|'decoration'|'animation'|'canvas';
type OutputFormat='mp4'|'gif';
type EditorDesign={config:WebConfig;audio:File|null;projectName:string};
const PROJECT_NAME_KEY='tyx-signature.project-name.v1';
type Job={status:'idle'|'checking'|'working'|'done'|'error'|'cancelled';progress:number;stage:string;url?:string;fileName?:string;format?:OutputFormat;transparent?:boolean};
const idle:Job={status:'idle',progress:0,stage:''};
function downloadText(text:string,name:string){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function directFontConfig(config:WebConfig):WebConfig{
  const next=structuredClone(config);
  next.people.forEach(person=>{person.scheme='classic';person.font.family='tyx-brush';person.font.size=240;});
  return next;
}
function App(){
  usePressRipple();
  const [initial]=useState(()=>{
    try{const loaded=loadConfig(window.localStorage);return {...loaded,config:directFontConfig(loaded.config)};}
    catch{return {config:defaultWebConfig(),warning:'浏览器暂时无法保存配置，你仍可设计并下载作品。'};}
  });
  const [initialProjectName]=useState(()=>{try{return window.localStorage.getItem(PROJECT_NAME_KEY)?.slice(0,80)||'我的动态签名';}catch{return '我的动态签名';}});
  const {value:design,update:updateDesign,undo,redo,canUndo,canRedo,beginGesture,endGesture}=useEditorHistory<EditorDesign>({config:initial.config,audio:null,projectName:initialProjectName});
  const {config,audio:audioFile,projectName}=design;
  const setConfig=(action:React.SetStateAction<WebConfig>)=>updateDesign(current=>({...current,config:typeof action==='function'?action(current.config):action}));
  const setAudioFile=(audio:File|null)=>updateDesign(current=>current.audio===audio?current:{...current,audio});
  const [selected,setSelected]=useState<0|1>(0),[tab,setTab]=useState<Tab>('signature');
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const openPanel=(panel:Tab)=>{setTab(panel);setSidebarCollapsed(false);};
  const [format,setFormat]=useState<OutputFormat>(initial.config.canvas.transparent?'gif':'mp4');
  const [decorationCategory,setDecorationCategory]=useState<DecorationCategory>(()=>categoryForDecoration(initial.config.people[0].decoration.id)??'pets');
  const [exportOpen,setExportOpen]=useState(false);
  const [traceTarget,setTraceTarget]=useState<0|1|null>(null);
  const exportDialog=useRef<HTMLDialogElement>(null);
  const tourExportHost=useRef<HTMLDivElement>(null);
  const [onboarding,setOnboarding]=useState<OnboardingState>(()=>{
    try{return {status:readOnboarding(window.localStorage)?'closed':'invite',step:0};}
    catch{return {status:'invite',step:0};}
  });
  const [notice,setNotice]=useState(initial.warning??''),[saved,setSaved]=useState('已保存');
  const [audioUrl,setAudioUrl]=useState<string>(),[audioDuration,setAudioDuration]=useState(0);
  const [job,setJob]=useState<Job>(idle),[pauseToken,setPauseToken]=useState(0),[completeToken,setCompleteToken]=useState(0);
  const [motionPreview,setMotionPreview]=useState<AnimationPreviewRequest>();
  const motionPreviewSerial=useRef(0);
  const audition=useRef<HTMLAudioElement>(null),importInput=useRef<HTMLInputElement>(null);
  const abort=useRef<AbortController|null>(null),lastUrl=useRef<string|undefined>(undefined),lastGood=useRef<PreparedScene|null>(null);
  const prepared=useMemo(()=>{
    try{return {scene:prepareScene(validateConfig(config)),error:''};}
    catch(error){return {scene:null,error:error instanceof Error?error.message:'暂时无法绘制，请检查参数'};}
  },[config]);
  if(prepared.scene)lastGood.current=prepared.scene;
  const scene=prepared.scene??lastGood.current,person=config.people[selected];
  const motionSelection=resolveMotionSelection(config.animation);
  const busy=job.status==='checking'||job.status==='working';
  const rememberOnboarding=(status:'started'|'dismissed'|'completed')=>{
    try{markOnboarding(window.localStorage,status);}catch{/* Teaching remains optional when browser storage is unavailable. */}
  };
  const locateOnboarding=(step:OnboardingStep)=>{
    setPauseToken(value=>value+1);setCompleteToken(value=>value+1);setMotionPreview(undefined);audition.current?.pause();
    if(step===3){setExportOpen(true);return;}
    setExportOpen(false);openPanel(step===0?'signature':step===1?'decoration':'animation');
  };
  const startOnboarding=()=>{
    if(busy)return;
    rememberOnboarding('started');setOnboarding({status:'active',step:0});locateOnboarding(0);
  };
  const changeOnboardingStep=(step:OnboardingStep)=>{
    if(busy)return;
    setOnboarding({status:'active',step});locateOnboarding(step);
  };
  const dismissOnboarding=()=>{
    rememberOnboarding('dismissed');setOnboarding(current=>({...current,status:'closed'}));
    if(!exportOpen&&traceTarget===null)requestAnimationFrame(()=>document.getElementById('editor-tab-'+tab)?.focus({preventScroll:true}));
  };
  const finishOnboarding=()=>{
    rememberOnboarding('completed');setOnboarding(current=>({...current,status:'closed'}));
    if(!busy){setExportOpen(false);requestAnimationFrame(()=>document.getElementById('editor-tab-'+tab)?.focus({preventScroll:true}));}
    setNotice('引导已完成，可以继续自由创作；“更多操作”中可重新查看。');
  };
  const travel=(direction:'undo'|'redo')=>{
    if(busy)return;
    (direction==='undo'?undo:redo)();setPauseToken(value=>value+1);setCompleteToken(value=>value+1);
  };
  const update=(fn:(next:WebConfig)=>void)=>setConfig(current=>{const next=structuredClone(current);fn(next);return next;});
  const changePerson=(fn:(next:PersonConfig)=>void)=>update(next=>fn(next.people[selected]));
  const changeMotion=(patch:{intro?:IntroPreset;outro?:OutroPreset})=>update(next=>{
    const selection={...resolveMotionSelection(next.animation),...patch};
    next.animation={...next.animation,...selection,introOutroEnabled:selection.intro!=='none'||selection.outro!=='none'};
  });
  const previewMotion=(phase:AnimationPreviewRequest['phase'],none:boolean)=>{
    if(prepared.error){setMotionPreview(undefined);setPauseToken(value=>value+1);return;}
    if(none){setMotionPreview(undefined);setCompleteToken(value=>value+1);return;}
    setMotionPreview({token:++motionPreviewSerial.current,phase});
  };
  const chooseIntro=(intro:IntroPreset)=>{
    if(busy)return;
    if(motionSelection.intro!==intro)changeMotion({intro});
    previewMotion('intro',intro==='none');
  };
  const chooseOutro=(outro:OutroPreset)=>{
    if(busy)return;
    if(motionSelection.outro!==outro)changeMotion({outro});
    previewMotion('outro',outro==='none');
  };
  useEffect(()=>{if(tab!=='animation')setMotionPreview(undefined);},[tab]);
  const renderTracePreview=useMemo(()=>{
    let previous:TraceData|undefined,previewScene:PreparedScene|undefined;
    return (canvas:HTMLCanvasElement,trace:TraceData,time:number,complete:boolean)=>{
      if(previous!==trace||!previewScene){
        const snapshot=structuredClone(config),target=traceTarget??selected;
        snapshot.mode='single';snapshot.canvas.aspect='landscape';
        snapshot.people[0]=structuredClone(snapshot.people[target]);
        snapshot.people[0].signatureSource='trace';snapshot.people[0].trace=trace;
        snapshot.people[0].position={x:0,y:0,scale:1,rotation:0};
        previewScene=prepareScene(validateConfig(snapshot));previous=trace;
      }
      renderScene(canvas,previewScene,time,complete);
    };
  },[config,selected,traceTarget]);
  const openTrace=()=>{setPauseToken(value=>value+1);audition.current?.pause();setTraceTarget(selected);};
  useEffect(()=>{if(config.mode==='single')setSelected(0);},[config.mode]);
  useEffect(()=>{
    const shortcut=(event:KeyboardEvent)=>{
      if(busy||event.defaultPrevented||event.isComposing||event.altKey||!(event.ctrlKey||event.metaKey)||document.querySelector('dialog[open]'))return;
      if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"],[data-editor-shortcuts="off"]'))return;
      const key=event.key.toLowerCase();
      if(key==='z'){event.preventDefault();(event.shiftKey?redo:undo)();}
      else if(key==='y'&&!event.shiftKey){event.preventDefault();redo();}
      else return;
      setPauseToken(value=>value+1);setCompleteToken(value=>value+1);
    };
    window.addEventListener('keydown',shortcut);
    window.addEventListener('blur',endGesture);
    return ()=>{window.removeEventListener('keydown',shortcut);window.removeEventListener('blur',endGesture);};
  },[busy,undo,redo,endGesture]);
  useEffect(()=>{
    const category=categoryForDecoration(person.decoration.id);
    setDecorationCategory(current=>category??(decorationCategories.some(item=>item.id===current)?current:'pets'));
  },[selected,person.decoration.id]);
  useEffect(()=>{
    if(config.people.every(next=>isDecorationId(next.decoration.id)))return;
    setConfig(current=>{
      const next=structuredClone(current);
      next.people.forEach(person=>{if(!isDecorationId(person.decoration.id))person.decoration.id='none';});
      return next;
    });
  },[config.people[0].decoration.id,config.people[1].decoration.id]);
  useEffect(()=>{if(config.canvas.transparent)setFormat('gif');},[config.canvas.transparent]);
  useEffect(()=>{
    const dialog=exportDialog.current;if(!dialog)return;
    if(exportOpen&&!dialog.open)dialog.showModal();
    else if(!exportOpen&&dialog.open)dialog.close();
  },[exportOpen]);
  useEffect(()=>{
    if(prepared.error){setSaved('修改尚未保存');return;}
    setSaved('正在保存…');
    const timer=setTimeout(()=>{try{saveConfig(window.localStorage,config);window.localStorage.setItem(PROJECT_NAME_KEY,projectName);setSaved('已保存');}catch{setSaved('本地保存不可用');}},300);
    return ()=>clearTimeout(timer);
  },[config,projectName,prepared.error]);
  useEffect(()=>{
    if(!audioFile){setAudioUrl(undefined);setAudioDuration(0);return;}
    const url=URL.createObjectURL(audioFile);setAudioUrl(url);
    return ()=>URL.revokeObjectURL(url);
  },[audioFile]);
  useEffect(()=>{
    if(lastUrl.current){URL.revokeObjectURL(lastUrl.current);lastUrl.current=undefined;}
    setJob(current=>current.status==='done'?idle:current);
  },[config,audioFile,format]);
  useEffect(()=>()=>{abort.current?.abort();if(lastUrl.current)URL.revokeObjectURL(lastUrl.current);},[]);
  const reset=()=>{
    updateDesign(current=>({...current,config:defaultWebConfig(),audio:null}));
    setSelected(0);setNotice('已恢复初始设计，可用顶部撤销返回。');
  };
  const importFile=async(file?:File)=>{
    if(!file)return;
    try{
      if(file.size>32*1024*1024)throw new Error('配置文件过大，请选择小于 32 MB 的签名配置');
      const imported=directFontConfig(parseConfigFile(await file.text()));
      updateDesign(current=>({...current,config:imported,audio:null}));setSelected(0);
      setNotice('配置已导入。若需要音乐，请重新选择音频文件。');
    }catch(error){setNotice(error instanceof Error?error.message:'配置导入失败');}
    finally{if(importInput.current)importInput.current.value='';}
  };
  const chooseAudio=(file?:File)=>{
    if(!file||busy)return;
    if(file.size>200*1024*1024){setNotice('这段音频超过 200 MB，请选择较短的音频片段。');return;}
    setAudioDuration(0);updateDesign(current=>({...current,audio:file,config:{...current.config,audio:{...current.config.audio,start:0}}}));
  };
  const generate=async()=>{
    if(busy||prepared.error)return;
    const outputFormat:OutputFormat=config.canvas.transparent?'gif':format;
    setPauseToken(value=>value+1);audition.current?.pause();
    setJob({status:'checking',progress:0,stage:outputFormat==='gif'?'正在准备 GIF…':'正在检查当前浏览器…'});
    const controller=new AbortController();abort.current=controller;
    try{
      const snapshot=validateConfig(structuredClone(config));
      const onProgress=(progress:number,stage:string)=>setJob({status:'working',progress:clamp(progress,0,1),stage});
      let blob:Blob;
      if(outputFormat==='gif'){
        const {exportGif}=await import('./gif-export');
        if(controller.signal.aborted)throw new DOMException('已取消','AbortError');
        blob=await exportGif(snapshot,{signal:controller.signal,onProgress});
      }else{
        const {checkExportSupport,exportVideo}=await import('./export');
        const support=await checkExportSupport(snapshot,audioFile);
        if(controller.signal.aborted)throw new DOMException('已取消','AbortError');
        if(!support.supported)throw new Error(support.reason??'当前浏览器无法导出 MP4，请换系统浏览器或电脑重试。');
        setJob({status:'working',progress:0,stage:'准备绘制…'});
        blob=await exportVideo(snapshot,{audioFile,signal:controller.signal,onProgress});
      }
      if(controller.signal.aborted)throw new DOMException('已取消','AbortError');
      if(lastUrl.current)URL.revokeObjectURL(lastUrl.current);
      const url=URL.createObjectURL(blob);lastUrl.current=url;
      const names=snapshot.people.slice(0,snapshot.mode==='couple'?2:1).map(next=>next.name.replace(/[^a-z0-9-]/gi,'')).filter(Boolean).join('-');
      setJob({status:'done',progress:1,stage:outputFormat==='gif'?'GIF 已生成，可以下载了。':'视频已生成，可以下载了。',url,format:outputFormat,transparent:outputFormat==='gif'&&snapshot.canvas.transparent,fileName:'tyx-'+(names||'signature')+'-'+snapshot.canvas.aspect+'.'+outputFormat});
    }catch(error){
      if(controller.signal.aborted||(error instanceof DOMException&&error.name==='AbortError'))setJob({status:'cancelled',progress:0,stage:'已取消，设计已保留。'});
      else setJob({status:'error',progress:0,stage:error instanceof Error?error.message:'导出失败，请重试。'});
    }finally{abort.current=null;}
  };
  const ratio=canvasSize(config.canvas.aspect),gifScale=960/Math.max(ratio.width,ratio.height);
  const outputSize=format==='gif'?{width:Math.round(ratio.width*gifScale),height:Math.round(ratio.height*gifScale)}:ratio;
  const personPicker=config.mode==='couple'&&<div className="person-tabs" role="group" aria-label="编辑哪一组签名">
    {([0,1] as const).map(index=><button key={index} className={['person-tab',selected===index?'active':''].join(' ')} aria-pressed={selected===index} onClick={()=>setSelected(index)}>
      <span className="person-dot" style={{background:config.people[index].ink.gradient?.enabled?gradientCss(config.people[index].ink.gradient):config.people[index].ink.color,borderColor:config.people[index].glow.color}}/>
      {index===0?'第一位':'第二位'}
    </button>)}
  </div>;
  return <div className="app-shell"
    onFocusCapture={event=>{if(event.target instanceof HTMLElement&&event.target.matches('input:not([type="checkbox"]):not([type="file"]),textarea'))beginGesture();}}
    onBlurCapture={endGesture}
    onPointerDownCapture={event=>{if(event.target instanceof HTMLElement&&event.target.matches('input[type="range"],input[type="color"]'))beginGesture();}}
    onInputCapture={event=>{if(event.target instanceof HTMLElement&&event.target.matches('input[type="color"]'))beginGesture();}}
    onPointerUpCapture={event=>{if(event.target instanceof HTMLElement&&event.target.matches('input[type="range"]'))endGesture();}}
    onPointerCancelCapture={endGesture}>
    <a className="skip-link" href="#signature-workspace">跳到签名编辑区</a>
    <header className="topbar">
      <h1 className="sr-only">TYX 签名工作室</h1>
      <div className="project-identity"><span className="brand-mark"><Icon name="pen" size={22}/></span><div className="project-copy"><label className="sr-only" htmlFor="project-name">项目名称</label><input id="project-name" className="project-title" aria-label="项目名称" value={projectName} maxLength={80} spellCheck={false} autoComplete="off" disabled={busy} onChange={event=>updateDesign(current=>({...current,projectName:event.target.value}))} onBlur={()=>{if(!projectName.trim())updateDesign(current=>({...current,projectName:'未命名签名'}));}}/><span className="project-kind">tyx 签名工作室</span></div></div>
      <div className="top-actions">
        <div className="history-actions" role="group" aria-label="编辑历史">
          <button type="button" className="icon-button" aria-label="撤销" title="撤销 · Ctrl / ⌘ Z" aria-keyshortcuts="Control+Z Meta+Z" disabled={busy||!canUndo} onClick={()=>travel('undo')}><Icon name="replay" size={19}/></button>
          <button type="button" className="icon-button" aria-label="重做" title="重做 · Ctrl / ⌘ Shift Z" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y" disabled={busy||!canRedo} onClick={()=>travel('redo')}><span className="redo-icon"><Icon name="replay" size={19}/></span></button>
        </div>
        <span className="save-state" role="status" aria-label={saved==='已保存'?'已保存到此浏览器':saved} title={saved==='已保存'?'已保存到此浏览器':saved}><span className={['save-dot',prepared.error?'is-unsaved':''].join(' ')} aria-hidden="true"/><span className="save-state-label">{saved}</span></span>
        <button className="button primary header-export-button" data-tour="export-button" onClick={()=>setExportOpen(true)}><Icon name="download" size={17}/>{busy?'正在导出':'导出视频'}</button>
      </div>
    </header>
    <main className="workspace" data-sidebar-collapsed={sidebarCollapsed} id="signature-workspace" tabIndex={-1}>
      <MorphNav active={tab} onActiveChange={openPanel} collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} busy={busy} footer={<><UtilityMenu>
        <button disabled={busy} onClick={startOnboarding}><Icon name="play" size={15}/>教学引导</button>
        <button disabled={busy||!!prepared.error} onClick={()=>downloadText(JSON.stringify(validateConfig(config),null,2),'tyx-signature.json')}><Icon name="file" size={15}/>下载配置</button>
        <button disabled={busy} onClick={()=>importInput.current?.click()}><Icon name="upload" size={15}/>导入配置</button>
        <button disabled={busy} onClick={reset}><Icon name="reset" size={15}/>重置设计</button>
      </UtilityMenu><ThemeSelector/></>}>
        <fieldset className="inspector-fields" disabled={busy} aria-label={tab==='signature'?'签名设置':tab==='decoration'?'装饰设置':tab==='animation'?'动画设置':'画面设置'}>
          {tab==='signature'&&<div className="inspector-cards">
            <section className="inspector-group signature-content" data-tour="signature-content" aria-labelledby="signature-content-title">
              <h2 className="section-heading" id="signature-content-title">签名内容</h2>
              <div className="mode-switch" role="group" aria-label="签名模式">
                {(['single','couple'] as const).map(mode=><button className="mode-option" key={mode} aria-pressed={config.mode===mode} onClick={()=>{update(next=>{next.mode=mode;});if(mode==='single')setSelected(0);}}>{mode==='single'?'单人':'双人'}</button>)}
              </div>
              <div className="name-fields">
                {([0,1] as const).filter(index=>config.mode==='couple'||index===0).map(index=>{
                  const editingPerson=config.people[index],invalid=editingPerson.signatureSource!=='trace'&&(!/[a-z]/i.test(editingPerson.name)||!/^[A-Za-z '\-]+$/.test(editingPerson.name));
                  const title=config.mode==='couple'?(index===0?'第一位':'第二位'):'姓名';
                  return <div className="person-name-field" key={index} data-active={selected===index}>
                    <div className="name-label"><label htmlFor={'signature-name-'+index}>{title}</label>{selected===index&&<span className="editing-badge">正在编辑</span>}</div>
                    <div className="name-input-shell" onClick={()=>setSelected(index)}>
                      <input id={'signature-name-'+index} className="name-input" aria-label={config.mode==='couple'?title+'姓名':'签名姓名'} aria-invalid={invalid} aria-describedby={invalid?'signature-name-error-'+index:undefined} value={editingPerson.name} maxLength={40} placeholder={editingPerson.signatureSource==='trace'?'称呼（可选）':'英文名字或拼音'} spellCheck={false} autoComplete="off" onFocus={()=>setSelected(index)} onChange={event=>update(next=>{next.people[index].name=event.target.value;})}/>
                      <span className="name-color-dot" aria-hidden="true" style={{background:editingPerson.ink.gradient?.enabled?gradientCss(editingPerson.ink.gradient):editingPerson.ink.color}}/>
                    </div>
                    {invalid&&<p className="field-error" id={'signature-name-error-'+index}>请输入英文字母或拼音，可保留空格、撇号和连字符。</p>}
                  </div>;
                })}
              </div>
            </section>
            <section className="inspector-group signature-style" aria-labelledby="signature-style-title">
              <h2 className="section-heading" id="signature-style-title"><span>签名样式</span><span className="section-context">{config.mode==='couple'?(selected===0?'第一位':'第二位'):'单人签名'}</span></h2>
              <div className="signature-source-control">
                <span className="field-label">签名来源</span>
                <div className="mode-switch" role="group" aria-label="签名来源">
                  <button type="button" className="mode-option" aria-pressed={person.signatureSource==='typed'} onClick={()=>changePerson(next=>{next.signatureSource='typed';})}>英文字母</button>
                  <button type="button" className="mode-option" aria-pressed={person.signatureSource==='trace'} onClick={()=>{if(person.trace?.strokes.length)changePerson(next=>{next.signatureSource='trace';});else openTrace();}}>描图签名</button>
                </div>
                {person.signatureSource==='trace'&&<button type="button" className="button secondary small trace-reedit" onClick={openTrace}><Icon name="pen" size={15}/>继续描摹 / 调整美化</button>}
              </div>
              <PaintField title="签名颜色" editingKey={selected} value={person.ink.color} gradient={person.ink.gradient} onEditCommit={endGesture} onChange={value=>changePerson(next=>{next.ink.color=value;next.glow.color=value;})} onGradientChange={gradient=>changePerson(next=>{next.ink.gradient=gradient;})}/>
              <div className="signature-style-controls" key={'signature-style-'+selected}>
                <Range title="签名大小" value={person.position.scale} min={.45} max={3} step={.05} suffix="×" onChange={value=>changePerson(next=>{next.position.scale=value;})}/>
                <Range title="笔迹粗细" value={person.font.penWidth} min={.5} max={2} step={.05} suffix="×" onChange={value=>changePerson(next=>{next.font.penWidth=value;})}/>
                <Details title="签名位置"><div className="advanced-grid">
                  <Range title="签名水平位置" value={person.position.x*100} min={-45} max={45} step={.5} suffix="%" displayDecimals={2} onChange={value=>changePerson(next=>{next.position.x=value/100;})}/>
                  <Range title="签名垂直位置" value={person.position.y*100} min={-45} max={45} step={.5} suffix="%" displayDecimals={2} onChange={value=>changePerson(next=>{next.position.y=value/100;})}/>
                </div></Details>
              </div>
            </section>
          </div>}
          {tab==='decoration'&&<div className="inspector-cards">
            <section className="inspector-group">
              <h2 className="section-heading">装饰设置</h2>
              {personPicker}
              <div className="decoration-library-head"><span className="caption-5">当前：{decorationCatalog.find(item=>item.id===person.decoration.id)?.label??'无装饰'}</span><button type="button" className="decoration-clear" aria-pressed={person.decoration.id==='none'} onClick={()=>changePerson(next=>{next.decoration.id='none';})}><Icon name="none" size={14}/>无装饰</button></div>
              {person.decoration.id!=='none'&&<Range key={'decoration-scale-'+selected} title="装饰大小" value={person.decoration.scale} min={.5} max={1.5} step={.05} suffix="×" onChange={value=>changePerson(next=>{next.decoration.scale=value;})}/>}
              {person.decoration.id!=='none'&&<Details title="装饰位置"><div className="advanced-grid">
                <Range title="装饰水平位置" value={person.decoration.offsetX*100} min={-45} max={45} step={.5} suffix="%" displayDecimals={2} onChange={value=>changePerson(next=>{next.decoration.offsetX=value/100;})}/>
                <Range title="装饰垂直位置" value={person.decoration.offsetY*100} min={-45} max={45} step={.5} suffix="%" displayDecimals={2} onChange={value=>changePerson(next=>{next.decoration.offsetY=value/100;})}/>
              </div></Details>}
              <div className="decoration-categories" role="group" aria-label="装饰分类">{decorationCategories.map(category=><button type="button" className="decoration-category" key={category.id} aria-pressed={decorationCategory===category.id} onClick={()=>setDecorationCategory(category.id)}>{category.label}</button>)}</div>
              <div className="decoration-grid" role="group" aria-label={decorationCategories.find(category=>category.id===decorationCategory)?.label+'图案'}>{decorationCatalog.filter(item=>item.category===decorationCategory).map((item,index)=><button type="button" key={item.id} data-tour={index===0?'decoration-library':undefined} className={['decoration-choice',person.decoration.id===item.id?'selected':''].join(' ')} aria-pressed={person.decoration.id===item.id} onClick={()=>changePerson(next=>{next.decoration.id=item.id;})}><DecorationThumbnail id={item.id} person={person} background={config.canvas.background} backgroundGradient={config.canvas.gradient} transparent={config.canvas.transparent}/><span>{item.label}</span></button>)}</div>
              <p className="export-note">点击画布中的装饰即可拖动；选中后也可用方向键微调位置。</p>
            </section>
          </div>}
          {tab==='canvas'&&<div className="inspector-cards">
            <section className="inspector-group">
              <h2 className="section-heading">画面设置</h2>
              <div className="field-label">画幅</div>
              <div className="format-switch" role="group" aria-label="画面比例">
                {([['landscape','横屏','16:9'],['portrait','竖屏','9:16'],['square','方形','1:1']] as const).map(([id,label,size])=><button type="button" className="format-option" key={id} aria-pressed={config.canvas.aspect===id} onClick={()=>update(next=>{next.canvas.aspect=id;})}>{label}<small>{size}</small></button>)}
              </div>
              <PaintField title="背景" value={config.canvas.background} gradient={config.canvas.gradient} onEditCommit={endGesture} onChange={value=>update(next=>{next.canvas.background=value;})} onGradientChange={gradient=>update(next=>{next.canvas.gradient=gradient;})}/>
              <Toggle title="透明背景" checked={config.canvas.transparent} onChange={value=>{update(next=>{next.canvas.transparent=value;});if(value)setFormat('gif');}}/>
              {config.canvas.transparent&&<p className="export-note">已使用透明背景，导出格式为 GIF。</p>}
            </section>
          </div>}
          {tab==='animation'&&<div className="inspector-cards">
            <section className="inspector-group">
              <h2 className="section-heading">动画设置</h2>
              <Range title="动画时长" value={config.timing.duration} min={3} max={15} step={.5} suffix="秒" onChange={value=>update(next=>{next.timing.duration=value;next.timing.hold=Math.min(next.timing.hold,value-2);})}/>
              <div className="field-label">帧率</div>
              <div className="format-switch" role="group" aria-label="动画帧率" aria-describedby="animation-fps-help">
                {([30,60] as const).map(fps=><button type="button" className="format-option" key={fps} aria-pressed={config.canvas.fps===fps} onClick={()=>update(next=>{next.canvas.fps=fps;})}>{fps} 帧</button>)}
              </div>
              <p className="export-note" id="animation-fps-help">应用于预览和 MP4 视频。</p>
              <AnimationPicker kind="intro" presets={introPresets} value={motionSelection.intro} config={config} onChoose={chooseIntro}/>
              <AnimationPicker kind="outro" presets={outroPresets} value={motionSelection.outro} config={config} onChoose={chooseOutro}/>
            </section>
            <section className="inspector-group setting-card-audio" aria-label="背景音乐">
              <h2 className="section-heading">背景音乐 <small>可选</small></h2>
              <p className="export-note">配乐用于预览与 MP4；GIF 不包含音频。</p>
              <label className="audio-attach" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();chooseAudio(event.dataTransfer.files[0]);}}><Icon name="music" size={16}/><span>{audioFile?'更换音乐':'添加音乐'}<small>本机音频文件</small></span><Icon name="upload" size={14}/><input className="file-input" aria-label="上传音乐" type="file" accept="audio/*" onChange={event=>{chooseAudio(event.target.files?.[0]);event.target.value='';}}/></label>
              {audioFile&&<div className="audio-card"><strong>{audioFile.name}</strong><button className="icon-button" aria-label="移除音乐" onClick={()=>setAudioFile(null)}><Icon name="close" size={13}/></button>{audioUrl&&<audio key={audioUrl} ref={audition} onPlay={()=>setPauseToken(value=>value+1)} src={audioUrl} controls preload="metadata" onLoadedMetadata={event=>setAudioDuration(event.currentTarget.duration)} onError={()=>setNotice('无法读取这段音频，请换一段浏览器能播放的音频。')}/>}</div>}
              {audioFile&&<Details title="音乐设置"><div className="advanced-grid">
                <Range title="音乐起点" value={config.audio.start} min={0} max={Math.max(1,Math.min(3600,audioDuration||60))} step={.1} suffix="秒" onChange={value=>update(next=>{next.audio.start=value;})}/>
                <Range title="音乐音量" value={config.audio.volume} min={0} max={1} step={.05} onChange={value=>update(next=>{next.audio.volume=value;})}/>
                <Range title="淡入" value={config.audio.fadeIn} min={0} max={3} step={.05} suffix="秒" onChange={value=>update(next=>{next.audio.fadeIn=value;})}/>
                <Range title="淡出" value={config.audio.fadeOut} min={0} max={3} step={.05} suffix="秒" onChange={value=>update(next=>{next.audio.fadeOut=value;})}/>
              </div></Details>}
            </section>
          </div>}
        </fieldset>
      </MorphNav>
      <section className="canvas-column" aria-label="作品预览">
        {(notice||prepared.error)&&<div className={['notice',prepared.error?'error':'warning'].join(' ')} role={prepared.error?'alert':'status'}><span>{prepared.error||notice}</span>{!prepared.error&&<button className="notice-close" aria-label="关闭提示" onClick={()=>setNotice('')}><Icon name="close" size={14}/></button>}</div>}
        {scene?<Preview disabled={busy} onStartPlayback={()=>audition.current?.pause()} scene={scene} selected={selected} config={config} audioUrl={audioUrl} pauseToken={pauseToken} completeToken={completeToken} previewRequest={motionPreview} onSelect={setSelected} onSelectElement={(index,target)=>{setSelected(index);setTab(target==='decoration'?'decoration':'signature');}} onGestureStart={beginGesture} onGestureEnd={endGesture} onDrag={(index,target,dx,dy)=>{
          if(busy)return;setSelected(index);update(next=>{const moving=next.people[index];if(target==='signature'){moving.position.x=clamp(moving.position.x+dx,-.45,.45);moving.position.y=clamp(moving.position.y+dy,-.45,.45);}else{moving.decoration.offsetX=clamp(moving.decoration.offsetX+dx,-.45,.45);moving.decoration.offsetY=clamp(moving.decoration.offsetY+dy,-.45,.45);}});
        }}/>:<div className="canvas-empty"><Icon name="pen" size={32}/><h2 className="title-3">写下名字，开始设计</h2><p className="body-6">在签名设置中输入英文名字或拼音，即可生成预览。</p></div>}
      </section>
    </main>
    <dialog className="export-dialog" ref={exportDialog} aria-labelledby="export-dialog-title" onCancel={event=>{if(busy)event.preventDefault();else setExportOpen(false);}} onClose={()=>{setExportOpen(false);audition.current?.pause();}}>
      <header className="export-dialog-header"><h2 id="export-dialog-title">导出设置</h2><button className="icon-button" aria-label="关闭导出设置" disabled={busy} onClick={()=>setExportOpen(false)}><Icon name="close" size={18}/></button></header>
      <div className="export-dialog-body">
        <div ref={tourExportHost}/>
        <fieldset className="inspector-fields" disabled={busy} aria-label="导出设置"><div className="inspector-cards">

            <section className="inspector-group">
              <h2 className="group-title">带走你的签名</h2>
              <div className="format-switch" role="group" aria-label="导出格式">
                <button type="button" className="output-choice" aria-pressed={format==='mp4'} disabled={config.canvas.transparent} title={config.canvas.transparent?'透明背景请使用 GIF；关闭透明背景后可选择 MP4':'普通视频，可选配乐'} onClick={()=>setFormat('mp4')}>MP4<small>视频</small></button>
                <button type="button" className="output-choice" aria-pressed={format==='gif'} onClick={()=>setFormat('gif')}>GIF<small>动图</small></button>
              </div>
              <p className="export-note">{format==='gif'?(config.canvas.transparent?'透明动图，可叠加使用；GIF 不包含音频。':'循环动图，使用当前背景；GIF 不包含音频。'):'普通视频，支持配乐。时长和帧率在“动画”中调整，比例和背景在“画面”中调整。'}</p>
              <div className="export-inline-summary">{format.toUpperCase()} · {outputSize.width} × {outputSize.height} · {format==='gif'?20:config.canvas.fps} 帧/秒</div>
            </section>
            {format==='mp4'&&<section className="inspector-group">
              <h2 className="group-title">背景音乐</h2>
              <p className="export-note">{audioFile?audioFile.name:'未添加音乐'}</p>
              <button type="button" className="button secondary small" onClick={()=>{setExportOpen(false);openPanel('animation');}}>调整音乐</button>
            </section>}
        </div></fieldset>
        <div className="export-inline-actions">

          {job.status!=='idle'&&<div className={['export-progress',job.status==='error'?'notice error':''].join(' ')} data-status={job.status} role="status"><span>{job.stage}</span>{busy&&<div className="progress-track" role="progressbar" aria-label="文件生成进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress*100)}><span style={{transform:'scaleX('+job.progress+')'}}/></div>}</div>}
          {job.status==='done'&&job.url&&<div className={['export-result',job.transparent?'is-transparent':''].join(' ')}>{job.format==='gif'?<img src={job.url} className="export-result-image" alt={job.transparent?'透明 GIF 导出结果':'GIF 导出结果'}/>:<video src={job.url} controls playsInline preload="metadata" className="export-result-video"/>}</div>}
          <div className="export-actions">
            {busy?<button className="button secondary" onClick={()=>{abort.current?.abort();setJob(current=>({...current,stage:'正在取消…'}));}}>取消导出</button>:<>
              {job.status==='done'&&job.url&&<a className="button primary" href={job.url} download={job.fileName}><Icon name="download" size={15}/>{job.format==='gif'?'下载 GIF':'下载视频'}</a>}
              <button className={['button',job.status==='done'?'secondary':'primary'].join(' ')} disabled={!!prepared.error} onClick={()=>void generate()}><Icon name="download" size={15}/>{job.status==='done'?'重新生成':'生成 '+format.toUpperCase()}</button>
            </>}
          </div>
        </div>
      </div>
    </dialog>
    <TraceEditor open={traceTarget!==null} initialTrace={config.people[traceTarget??selected].trace} inkColor={config.people[traceTarget??selected].ink.color} inkGradient={config.people[traceTarget??selected].ink.gradient} penWidth={config.people[traceTarget??selected].font.penWidth} duration={config.timing.duration} renderPreview={renderTracePreview} onClose={()=>setTraceTarget(null)} onApply={trace=>{
      if(traceTarget===null)return;
      const target=traceTarget;
      update(next=>{next.people[target].signatureSource='trace';next.people[target].trace=trace;next.people[target].position.rotation=0;});
      setSelected(target);setCompleteToken(value=>value+1);setTraceTarget(null);
    }}/>
    <input className="sr-only" ref={importInput} type="file" accept="application/json,.json" aria-label="导入签名配置文件" onChange={event=>void importFile(event.target.files?.[0])}/>
    <Onboarding state={onboarding} onStart={startOnboarding} onDismiss={dismissOnboarding} onStepChange={changeOnboardingStep} onFinish={finishOnboarding} onLocateStep={()=>locateOnboarding(onboarding.step)} exportHost={exportOpen?tourExportHost.current:null} paused={traceTarget!==null||busy||(exportOpen&&!(onboarding.status==='active'&&onboarding.step===3))}/>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
