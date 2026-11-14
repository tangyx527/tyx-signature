export const ONBOARDING_KEY='tyx-signature.onboarding.v1';
type Progress='started'|'completed'|'dismissed';

/** Tutorial preferences are kept outside the user's saved signature document. */
export function readOnboarding(storage:Pick<Storage,'getItem'>):boolean{
  try{
    const raw=storage.getItem(ONBOARDING_KEY);if(!raw)return false;
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object')return false;
    const progress=value as {version?:unknown;status?:unknown};
    return progress.version===1&&(progress.status==='started'||progress.status==='completed'||progress.status==='dismissed');
  }catch{return false;}
}

export function markOnboarding(storage:Pick<Storage,'setItem'>,status:Progress):boolean{
  if(status!=='started'&&status!=='completed'&&status!=='dismissed')return false;
  try{storage.setItem(ONBOARDING_KEY,JSON.stringify({version:1,status}));return true;}
  catch{return false;}
}
