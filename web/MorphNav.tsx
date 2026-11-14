import {useEffect,useRef,useState,type ReactNode,type KeyboardEvent} from 'react';
import {Icon,type IconName} from './ui';

export type CreativePanel='signature'|'decoration'|'animation'|'canvas';
const panels:{id:CreativePanel;label:string;description:string;icon:IconName}[]=[
  {id:'signature',label:'签名',description:'写下名字，调整你的笔迹',icon:'pen'},
  {id:'decoration',label:'装饰',description:'为签名添加一点个人风格',icon:'sparkle'},
  {id:'animation',label:'动画',description:'编排开场、书写与收尾',icon:'play'},
  {id:'canvas',label:'画面',description:'设置作品的比例与背景',icon:'frame'},
];

export function MorphNav({active,onActiveChange,collapsed,onCollapsedChange,children,footer,busy=false}:{active:CreativePanel;onActiveChange:(panel:CreativePanel)=>void;collapsed:boolean;onCollapsedChange:(collapsed:boolean)=>void;children:ReactNode;footer?:ReactNode;busy?:boolean}){
  const buttons=useRef<Partial<Record<CreativePanel,HTMLButtonElement|null>>>({});
  const [horizontal,setHorizontal]=useState(()=>window.matchMedia('(max-width: 760px)').matches);
  useEffect(()=>{
    const query=window.matchMedia('(max-width: 760px)'),sync=()=>setHorizontal(query.matches);
    sync();query.addEventListener('change',sync);
    return ()=>query.removeEventListener('change',sync);
  },[]);
  const activePanel=panels.find(panel=>panel.id===active)!;
  const navigate=(event:KeyboardEvent<HTMLButtonElement>,panel:CreativePanel)=>{
    if(busy)return;
    const index=panels.findIndex(item=>item.id===panel);
    let next:number|undefined;
    if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%panels.length;
    if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+panels.length-1)%panels.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=panels.length-1;
    if(next===undefined)return;
    event.preventDefault();
    const id=panels[next].id;
    onActiveChange(id);buttons.current[id]?.focus();
  };
  return <aside className="editor-sidebar" data-collapsed={collapsed} aria-label="创作设置">
    <nav className="editor-rail" role="tablist" aria-label="创作工具" aria-orientation={horizontal?'horizontal':'vertical'}>
      {panels.map(panel=><button
        type="button" id={'editor-tab-'+panel.id} key={panel.id}
        className="editor-tab" role="tab" aria-selected={active===panel.id}
        aria-label={panel.label} title={collapsed?panel.label:undefined}
        aria-controls="signature-creative-panel" tabIndex={active===panel.id?0:-1}
        disabled={busy} ref={element=>{buttons.current[panel.id]=element;}}
        onClick={()=>onActiveChange(panel.id)} onKeyDown={event=>navigate(event,panel.id)}
      ><span className="editor-tab-icon"><Icon name={panel.icon} size={23}/></span><span className="editor-tab-label">{panel.label}</span></button>)}
      <span className="editor-rail-caption" aria-hidden="true">TYX</span>
    </nav>
    <button type="button" className="editor-sidebar-toggle" aria-label={collapsed?'展开设置栏':'收起设置栏'} title={collapsed?'展开设置栏':'收起设置栏'} aria-expanded={!collapsed} aria-controls="editor-settings" onClick={event=>{event.currentTarget.focus({preventScroll:true});onCollapsedChange(!collapsed);}}><Icon name="chevron" size={16}/></button>
    <div className="editor-inspector" id="editor-settings" hidden={collapsed}>
      <header className="editor-inspector-heading"><h2>{activePanel.label}</h2><p>{activePanel.description}</p></header>
      <div id="signature-creative-panel" className="editor-sidebar-body" role="tabpanel" aria-labelledby={'editor-tab-'+active} key={active}>{children}</div>
      {footer&&<footer className="editor-inspector-footer">{footer}</footer>}
    </div>
  </aside>;
}
