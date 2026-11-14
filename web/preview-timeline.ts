import type {PreparedScene} from './renderer';

export type PreviewPhase={id:'intro'|'writing'|'outro';label:string;start:number;end:number};

// Include the ornament drawing and reaction in the signature stage, so these
// controls follow the actual scene timing rather than an arbitrary percentage.
export function previewPhases(scene:PreparedScene):PreviewPhase[]{
  const plan=scene.people[0]?.plan;
  const writingStart=Math.max(0,Math.min(scene.duration,plan?.writing.start??0));
  const outroStart=Math.max(writingStart,Math.min(scene.duration,plan?.outro.start??scene.duration));
  return [
    {id:'intro',label:'开场',start:0,end:writingStart},
    {id:'writing',label:'签名',start:writingStart,end:outroStart},
    {id:'outro',label:'收尾',start:outroStart,end:scene.duration},
  ];
}

export function previewRange(scene:PreparedScene,id:PreviewPhase['id']|null){
  return id===null?{start:0,end:scene.duration}:previewPhases(scene).find(phase=>phase.id===id)!;
}
