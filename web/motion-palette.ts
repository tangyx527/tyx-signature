import type {IntroPreset,OutroPreset} from './animation-catalog';
import {isOrnatePreset,ornatePresets,type OrnatePreset} from './ornate-types';
export type OutroAppearance={intro:IntroPreset;ink:string};

const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');

/** The entry's existing frame colours, shared with its matching exit. */
export function ornateOpeningFrameColors(id:OrnatePreset,ink:string):{color:string;accent:string}{
 const accent=ornatePresets.find(preset=>preset.id===id)!.accent;
 return {color:mix(ink,accent,.68),accent};
}

/** Subject colours include the same local tints used by the entry motif. */
export function openingSubjectColors(id:IntroPreset,ink='#ffffff'):readonly string[]{
 if(!isOrnatePreset(id)){
  if(id==='comet')return [mix(ink,'#59dfff',.58),mix(ink,'#c5afff',.48),mix(ink,'#ffffff',.88)];
  return ['#fff9f5','#39f8ee','#ebe6ff'];
 }
 const frame=ornateOpeningFrameColors(id,ink);
 let color=frame.color,accent=frame.accent,lightMix=.82;
 switch(id){
  case 'crystal-vine':color=mix(color,'#a77dff',.50);accent=mix(accent,'#e9bdff',.42);lightMix=.72;break;
  case 'butterfly':color=mix(color,'#48aaff',.57);accent=mix(accent,'#adf4ff',.48);lightMix=.80;break;
  case 'lotus':color=mix(color,'#f19acb',.61);accent=mix(accent,'#ffe0ee',.60);lightMix=.75;break;
  case 'umbrella':color=mix(color,'#55e5d3',.65);accent=mix(accent,'#c8fff0',.62);lightMix=.71;break;
  case 'snowflake':color=mix(color,'#b18bf1',.58);accent=mix(accent,'#e8d4ff',.62);lightMix=.81;break;
  case 'petals':color=mix(color,'#ec6ca3',.61);accent=mix(accent,'#ffd0e5',.60);lightMix=.74;break;
  case 'unicorn':lightMix=.90;break;
  case 'wings':case 'fan':lightMix=.86;break;
  case 'dragon':lightMix=.84;break;
  case 'orbit':return [accent,mix(accent,'#78e8ff',.6),mix(color,'#ffffff',.9),color];
  case 'bloom':return [mix(accent,'#ffbce6',.46),mix(color,'#a8e9ff',.45),color,mix(color,'#ffffff',.86)];
  case 'moon':{
   const gold=mix(accent,'#ffd784',.74);
   return [gold,mix(color,'#ff96cf',.55),mix(gold,'#ffffff',.84)];
  }
  case 'stellar':return [mix(accent,'#b8d8ff',.53),accent,mix(color,'#ffffff',.94),mix(color,'#27185e',.56)];
 }
 return [color,accent,mix(accent,'#ffffff',lightMix)];
}

/** The retained vortex inherits the selected entry theme. */
export function outroThemeColors(_outro:OutroPreset,intro:IntroPreset,ink='#ffffff'):readonly string[]{
 return openingSubjectColors(intro,ink);
}
