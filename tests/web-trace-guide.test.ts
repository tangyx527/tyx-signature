import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACE_GUIDE_KEY,dismissTraceGuide,readTraceGuideDismissed} from '../web/trace-guide-state';

test('trace help appears for first visits and ignores unrelated or malformed stored values',()=>{
  for(const value of [null,'','0','false','true','{}','completed'])assert.equal(readTraceGuideDismissed({getItem:()=>value}),false);
  assert.equal(readTraceGuideDismissed({getItem:key=>{assert.equal(key,TRACE_GUIDE_KEY);return '1';}}),true);
});

test('dismissing trace help persists independently of signature data and the main tutorial',()=>{
  const values=new Map([['tyx-signature.website.v7','existing design'],['tyx-signature.onboarding.v1','main guide state']]);
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  assert.equal(dismissTraceGuide(storage),true);
  assert.equal(readTraceGuideDismissed(storage),true);
  assert.equal(values.get('tyx-signature.website.v7'),'existing design');
  assert.equal(values.get('tyx-signature.onboarding.v1'),'main guide state');
});

test('blocked trace help storage cannot interrupt drawing or closing the help',()=>{
  assert.equal(readTraceGuideDismissed({getItem:()=>{throw new Error('blocked');}}),false);
  assert.equal(dismissTraceGuide({setItem:()=>{throw new Error('quota');}}),false);
});
