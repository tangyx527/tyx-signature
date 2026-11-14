export const TRACE_GUIDE_KEY='tyx-signature.trace-guide.v1';

export function readTraceGuideDismissed(storage:Pick<Storage,'getItem'>):boolean{
  try{return storage.getItem(TRACE_GUIDE_KEY)==='1';}catch{return false;}
}

export function dismissTraceGuide(storage:Pick<Storage,'setItem'>):boolean{
  try{storage.setItem(TRACE_GUIDE_KEY,'1');return true;}catch{return false;}
}
