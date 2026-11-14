export const SIGNATURE_COLORS=['#F5FFFD','#111111','#0BEABD','#B7F239','#5B8CFF','#A78BFA','#FF8FB1','#FFD166'] as const;
export const RECENT_COLORS_KEY='tyx-signature-recent-colors-v1';
const MAX_RECENT_COLORS=6;

export function normalizeHexColor(input:string):string|null{
  const value=input.trim();
  return /^#?[\da-f]{6}$/i.test(value)?`#${value.replace(/^#/,'').toUpperCase()}`:null;
}

function normalizeHistory(values:readonly unknown[]):string[]{
  const colors:string[]=[];
  for(const value of values){
    const color=typeof value==='string'?normalizeHexColor(value):null;
    if(color&&!colors.includes(color))colors.push(color);
    if(colors.length===MAX_RECENT_COLORS)break;
  }
  return colors;
}

export function addRecentColor(colors:readonly string[],color:string):string[]{
  const normalized=normalizeHexColor(color);
  return normalizeHistory(normalized?[normalized,...colors]:colors);
}

export function loadRecentColors(storage:Pick<Storage,'getItem'>):string[]{
  try{
    const value:unknown=JSON.parse(storage.getItem(RECENT_COLORS_KEY)??'null');
    return Array.isArray(value)?normalizeHistory(value):[];
  }catch{return [];}
}

export function rememberRecentColor(storage:Pick<Storage,'getItem'|'setItem'>,color:string):string[]{
  const previous=loadRecentColors(storage),normalized=normalizeHexColor(color);
  if(!normalized)return previous;
  const next=addRecentColor(previous,normalized);
  try{storage.setItem(RECENT_COLORS_KEY,JSON.stringify(next));}catch{/* Keep the selection usable when local persistence is unavailable. */}
  return next;
}
