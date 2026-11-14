export type EditorHistory<T>={past:T[];present:T;future:T[];group:number|null};
const HISTORY_LIMIT=50;

export function createHistory<T>(present:T):EditorHistory<T>{
  return {past:[],present,future:[],group:null};
}

// All values are immutable snapshots; a pointer or typing gesture records its initial state once.
export function commitHistory<T>(history:EditorHistory<T>,present:T,group:number):EditorHistory<T>{
  if(Object.is(present,history.present))return history;
  return {
    past:history.group===group?history.past:[...history.past,history.present].slice(-HISTORY_LIMIT),
    present,future:[],group,
  };
}

export function travelHistory<T>(history:EditorHistory<T>,direction:'undo'|'redo'):EditorHistory<T>{
  if(direction==='undo'){
    if(!history.past.length)return history;
    return {past:history.past.slice(0,-1),present:history.past.at(-1)!,future:[history.present,...history.future],group:null};
  }
  if(!history.future.length)return history;
  return {past:[...history.past,history.present].slice(-HISTORY_LIMIT),present:history.future[0],future:history.future.slice(1),group:null};
}
