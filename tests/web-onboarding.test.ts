import test from 'node:test';
import assert from 'node:assert/strict';
import {ONBOARDING_KEY,markOnboarding,readOnboarding} from '../web/onboarding-state';

test('starting, completing or dismissing the tutorial suppresses another invitation without changing the design',()=>{
  const values=new Map([['tyx-signature.website.v7','existing signature']]);
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  assert.equal(readOnboarding(storage),false);
  for(const status of ['started','dismissed','completed'] as const){
    assert.equal(markOnboarding(storage,status),true);
    assert.equal(readOnboarding(storage),true);
    assert.deepEqual(JSON.parse(values.get(ONBOARDING_KEY)!),{version:1,status});
    assert.equal(values.get('tyx-signature.website.v7'),'existing signature');
  }
});

test('invalid, unfinished, or future tutorial records do not suppress the invitation',()=>{
  for(const raw of [null,'','{','null','true','"completed"','{}','{"version":1,"status":"active"}','{"version":2,"status":"completed"}']){
    assert.equal(readOnboarding({getItem:()=>raw}),false,raw??'no value');
  }
});

test('blocked tutorial storage remains optional and never throws into the editor',()=>{
  const blocked={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('quota');}};
  assert.equal(readOnboarding(blocked),false);
  assert.equal(markOnboarding(blocked,'completed'),false);
  assert.equal(markOnboarding(blocked,'dismissed'),false);
});
