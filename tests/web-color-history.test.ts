import test from 'node:test';
import assert from 'node:assert/strict';
import {SIGNATURE_COLORS,RECENT_COLORS_KEY,normalizeHexColor,addRecentColor,loadRecentColors,rememberRecentColor} from '../web/color-history';

test('HEX colors accept pasted whitespace and optional hash without accepting incomplete values',()=>{
  assert.deepEqual(SIGNATURE_COLORS,['#F5FFFD','#111111','#0BEABD','#B7F239','#5B8CFF','#A78BFA','#FF8FB1','#FFD166']);
  for(const value of ['#a78bfa','a78bfa','  #a78bfa\n',' A78BFA '])assert.equal(normalizeHexColor(value),'#A78BFA');
  for(const value of ['','#','#fff','12345','1234567','##123456','#GGGGGG','rgba(0,0,0,1)','123 456'])assert.equal(normalizeHexColor(value),null);
});

test('recent colors are normalized, deduplicated, moved to the front and capped at six without mutating callers',()=>{
  const original=['#f5fffd','0beabd','#111111','#0BEABD','#B7F239','#5B8CFF','#A78BFA','#FF8FB1'];
  const snapshot=[...original];
  assert.deepEqual(addRecentColor(original,' #0beabd '),['#0BEABD','#F5FFFD','#111111','#B7F239','#5B8CFF','#A78BFA']);
  assert.deepEqual(addRecentColor(original,'#ffd166'),['#FFD166','#F5FFFD','#0BEABD','#111111','#B7F239','#5B8CFF']);
  assert.deepEqual(addRecentColor(original,'invalid'),['#F5FFFD','#0BEABD','#111111','#B7F239','#5B8CFF','#A78BFA']);
  assert.deepEqual(original,snapshot);
});

test('stored history recovers from malformed data and filters invalid entries',()=>{
  for(const value of [null,'{','null','{}','"#FFFFFF"','7'])assert.deepEqual(loadRecentColors({getItem:()=>value}),[]);
  const values=['#a78bfa',null,123,'broken','a78bfa','#0beabd','#111111','#B7F239','#5B8CFF','#FF8FB1','#FFD166'];
  assert.deepEqual(loadRecentColors({getItem:()=>JSON.stringify(values)}),['#A78BFA','#0BEABD','#111111','#B7F239','#5B8CFF','#FF8FB1']);
  assert.deepEqual(loadRecentColors({getItem:()=>{throw new Error('denied');}}),[]);
});

test('committed colors persist under their own key while invalid colors never write',()=>{
  const entries=new Map([['tyx-signature.website.v7','existing design']]);
  let writes=0;
  const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{writes++;entries.set(key,value);}};
  assert.deepEqual(rememberRecentColor(storage,'#a78bfa'),['#A78BFA']);
  assert.deepEqual(rememberRecentColor(storage,'111111'),['#111111','#A78BFA']);
  assert.deepEqual(rememberRecentColor(storage,'A78BFA'),['#A78BFA','#111111']);
  assert.deepEqual(JSON.parse(entries.get(RECENT_COLORS_KEY)!),['#A78BFA','#111111']);
  assert.equal(entries.get('tyx-signature.website.v7'),'existing design');
  assert.deepEqual(rememberRecentColor(storage,'#12'),['#A78BFA','#111111']);
  assert.equal(writes,3);
});

test('blocked reads or writes cannot prevent the user from choosing a color',()=>{
  const blocked={getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');}};
  assert.deepEqual(rememberRecentColor(blocked,'0beabd'),['#0BEABD']);
  assert.deepEqual(rememberRecentColor(blocked,'invalid'),[]);
  const quota={getItem:()=>JSON.stringify(['#111111']),setItem:()=>{throw new Error('quota');}};
  assert.deepEqual(rememberRecentColor(quota,'#FFD166'),['#FFD166','#111111']);
});
