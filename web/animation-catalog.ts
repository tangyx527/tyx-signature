import {newOrnatePresets} from './ornate-types';

export const introPresets = [
  {id:'classic',label:'原版气泡流光',description:'气泡与光弧汇入起笔，流光伴随书写。'},
  {id:'comet',label:'流星落笔',description:'彗星拖着宽长光带划入，转弯减速后接成真实笔迹。'},
  {id:'orbit',label:'星环聚光',description:'多层星轨展开，随后流光滴与卫星晶体沿签名运动。'},
  {id:'bloom',label:'光点绽放',description:'双层晶瓣展开，随后单片晶瓣绕着字迹穿行。'},
  ...newOrnatePresets.map(preset=>({id:preset.id,label:preset.label,description:preset.description})),
  {id:'none',label:'无动画',description:'直接开始书写。'},
] as const;

export const outroPresets = [
  {id:'classic',label:'原版彩片收尾',description:'签名与装饰一起变形成彩色笔片。'},
  {id:'vortex',label:'旋涡收拢',description:'沿用开场配色，墨带错峰转弯、回穿交叠，最后收束退场。'},
  {id:'none',label:'无动画',description:'写完后保留签名。'},
] as const;

export type IntroPreset = typeof introPresets[number]['id'];
export type OutroPreset = typeof outroPresets[number]['id'];
export type MotionSelection = {intro:IntroPreset;outro:OutroPreset};

/** Keep the old switch authoritative when reading an existing saved design. */
export function resolveMotionSelection(animation:{introOutroEnabled:boolean;intro?:IntroPreset;outro?:OutroPreset}):MotionSelection{
  return animation.introOutroEnabled
    ? {intro:animation.intro??'classic',outro:outroPresets.find(preset=>preset.id===animation.outro)?.id??'classic'}
    : {intro:'none',outro:'none'};
}
