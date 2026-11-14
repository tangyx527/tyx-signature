import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWebConfig} from '../web/model';
import {prepareScene} from '../web/renderer';
import {previewPhases,previewRange} from '../web/preview-timeline';

test('signature preview includes ornament drawing and reaction before the ending',()=>{
  const config=defaultWebConfig();
  config.mode='couple';config.timing.duration=8;
  config.animation={introOutroEnabled:true,intro:'comet',outro:'vortex'};
  config.people[0].decoration.id='cat-ears';
  const scene=prepareScene(config),[intro,writing,outro]=previewPhases(scene);
  assert.equal(intro.start,0);
  assert.equal(intro.end,scene.people[0].plan.writing.start);
  assert.equal(writing.start,intro.end);
  assert.ok(writing.end>=scene.people[0].plan.reaction.end);
  assert.ok(writing.end>scene.people[0].plan.writing.end);
  assert.equal(writing.end,outro.start);
  assert.equal(outro.end,8);
  assert.deepEqual(previewRange(scene,null),{start:0,end:8});
  assert.deepEqual(previewRange(scene,'outro'),outro);
});

test('disabled opening and ending leave the complete duration available for signature playback',()=>{
  const config=defaultWebConfig();
  config.animation={introOutroEnabled:true,intro:'none',outro:'none'};
  config.timing.duration=12;config.canvas.fps=60;
  const scene=prepareScene(config),[intro,writing,outro]=previewPhases(scene);
  assert.equal(intro.end-intro.start,0);
  assert.equal(outro.end-outro.start,0);
  assert.equal(writing.start,0);
  assert.equal(writing.end,12);
  assert.deepEqual(previewRange(scene,'writing'),writing);
});
