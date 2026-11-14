import test from 'node:test';
import assert from 'node:assert/strict';
import {commitHistory,createHistory,travelHistory} from '../web/editor-history';

test('drag and typing groups undo as a single operation, and redo restores the last edit',()=>{
  const initial={x:0,name:'Ada'};
  let history=createHistory(initial);
  for(let x=1;x<=30;x++)history=commitHistory(history,{x,name:'Ada'},1);
  assert.equal(history.past.length,1);
  const dragged=history.present;
  history=commitHistory(history,{x:30,name:'Grace'},2);
  history=travelHistory(history,'undo');assert.equal(history.present,dragged);
  history=travelHistory(history,'undo');assert.equal(history.present,initial);
  history=travelHistory(history,'redo');assert.equal(history.present,dragged);
  history=travelHistory(history,'redo');assert.equal(history.present.name,'Grace');
});

test('an edit after undo clears redo and retains the undo origin, even with the previous gesture id',()=>{
  let history=commitHistory(createHistory(0),1,1);
  history=commitHistory(history,2,2);
  history=travelHistory(history,'undo');
  history=commitHistory(history,3,2);
  assert.deepEqual(history.future,[]);
  assert.equal(travelHistory(history,'undo').present,1);
  assert.equal(travelHistory(history,'redo'),history);
});

test('history bounds snapshots and handles no-op edits and empty traversal without changing state',()=>{
  let history=createHistory(0);
  assert.equal(travelHistory(history,'undo'),history);
  assert.equal(travelHistory(history,'redo'),history);
  assert.equal(commitHistory(history,0,1),history);
  for(let i=1;i<=100;i++)history=commitHistory(history,i,i);
  assert.equal(history.past.length,50);
  for(let i=0;i<50;i++)history=travelHistory(history,'undo');
  assert.equal(history.present,50);
});
