import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPerson,defaultWebConfig,validateConfig,parseConfigFile,loadConfig,saveConfig,STORAGE_KEY,canvasSize,asBrushConfig} from '../web/model';
import defaultDesign from '../web/default-design.json';
import {ACTIVE_DECORATION_IDS} from '../web/decoration-catalog';
import {introPresets,outroPresets,resolveMotionSelection} from '../web/animation-catalog';

test('website config preserves two independent names and colors through storage',()=>{
  const c=defaultWebConfig();c.mode='couple';c.people[0].name='LiXin';c.people[1].name='TYX';c.people[1].ink.color='#ff88bb';
  const store=new Map<string,string>();const storage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>{store.set(k,v);}};
  saveConfig(storage,c);const loaded=loadConfig(storage).config;
  assert.equal(loaded.people[0].name,'LiXin');assert.equal(loaded.people[1].name,'TYX');assert.equal(loaded.people[1].ink.color,'#ff88bb');
  assert.equal(loaded.people[0].ink.color,c.people[0].ink.color);assert.ok(store.has(STORAGE_KEY));
});
test('bad files, unsupported versions, nonfinite values and invalid timing are rejected',()=>{
  assert.throws(()=>parseConfigFile('{ broken'),/JSON/);
  const c=defaultWebConfig();assert.throws(()=>validateConfig({...c,version:1}));
  c.people[0].font.penWidth=Infinity;assert.throws(()=>validateConfig(c));
  const short=defaultWebConfig();short.timing.duration=3;short.timing.hold=2;assert.throws(()=>validateConfig(short),/至少 2 秒/);
  const invalidName=defaultWebConfig();invalidName.people[0].name='太阳';assert.throws(()=>validateConfig(invalidName),/英文字母/);
});
test('corrupt or inaccessible storage recovers with an explicit warning',()=>{
  assert.equal(loadConfig({getItem:()=>'{'}).config.version,2);
  assert.ok(loadConfig({getItem:()=>{throw new Error('disabled');}}).warning);
});
test('a saved website design without a font family keeps the original brush when migrated',()=>{
  const c=JSON.parse(JSON.stringify(defaultWebConfig()));delete c.people[0].font.family;delete c.people[1].font.family;
  const restored=validateConfig(c);assert.equal(restored.people[0].font.family,'tyx-brush');
  restored.people[1].font.family='tyx-soft';restored.people[1].decoration.id='rabbit';
  const imported=parseConfigFile(JSON.stringify(restored));
  assert.equal(imported.people[1].font.family,'tyx-brush');
  assert.equal(imported.people[1].decoration.id,'none');
});
test('an unfinished second name does not block single mode and is retained when switching back',()=>{
  const c=defaultWebConfig();c.mode='single';c.people[1].name='';assert.equal(validateConfig(c).people[1].name,'');
  c.mode='couple';assert.throws(()=>validateConfig(c),/第二位/);
});
test('all output aspects are even 1080p frames and the brush adapter selects original paths',()=>{
  const c=defaultWebConfig();
  for(const aspect of ['landscape','portrait','square'] as const){const size=canvasSize(aspect);assert.equal(Math.min(size.width,size.height),1080);assert.equal(size.width%2,0);assert.equal(size.height%2,0);}
  c.people[0].name="J-Anne O'Neil";
  const brush=asBrushConfig(c.people[0],c);assert.equal(brush.font.id,'tyx-brush');assert.equal(brush.name,"J-Anne O'Neil");assert.equal(brush.canvas.fps,30);
});

test('defaults clone the default design and never share nested state',()=>{
  const first=defaultWebConfig();
  const expected={...structuredClone(defaultDesign),canvas:{...defaultDesign.canvas,transparent:false}};
  assert.deepEqual(first,expected);
  assert.deepEqual(defaultPerson(1),defaultDesign.people[1]);
  first.people[0].name='Changed';first.people[0].position.x=.2;first.people[0].decoration.scale=.5;first.audio.volume=0;
  const person=defaultPerson();person.ink.color='#000000';
  assert.deepEqual(defaultWebConfig(),expected);
  assert.deepEqual(defaultPerson(),defaultDesign.people[0]);
});

test('saved designs and imported files without transparency default to an opaque canvas without changing their content',()=>{
  const text=JSON.stringify(defaultDesign),expected={...structuredClone(defaultDesign),canvas:{...defaultDesign.canvas,transparent:false}};
  assert.deepEqual(parseConfigFile(text),expected);
  for(const key of [STORAGE_KEY,'tyx-signature.website.v6']){
    const loaded=loadConfig({getItem:requested=>requested===key?text:null});
    assert.equal(loaded.warning,undefined);assert.deepEqual(loaded.config,expected);
  }
  assert.equal('transparent' in defaultDesign.canvas,false,'the saved default artwork remains unchanged');
});

test('transparency round trips through files and storage while retaining names, paint, timing and placement',()=>{
  const c=defaultWebConfig();c.canvas.transparent=true;c.canvas.background='#7451a3';c.people[0].name="J-Anne O'Neil";c.people[1].name='QX';c.people[0].position.x=.11;c.people[1].position.y=-.07;c.people[0].font.penWidth=1.2;c.people[1].ink.color='#ffc1d8';
  const original=structuredClone(c);let saved='';saveConfig({setItem:(key,value)=>{assert.equal(key,STORAGE_KEY);saved=value;}},c);
  assert.deepEqual(c,original);assert.equal(JSON.parse(saved).canvas.transparent,true);assert.deepEqual(parseConfigFile(saved),original);assert.deepEqual(loadConfig({getItem:key=>key===STORAGE_KEY?saved:null}).config,original);
  const adapted=asBrushConfig(c.people[0],c);assert.equal(adapted.background.mode,'transparent');assert.equal(adapted.background.color,c.canvas.background);
  for(const value of ['true',1,null])assert.throws(()=>validateConfig({...c,canvas:{...c.canvas,transparent:value}}));
});

test('every active decoration survives independent-person file and storage round trips',()=>{
  for(const id of ACTIVE_DECORATION_IDS){
    const c=defaultWebConfig();c.people[0].decoration.id=id;c.people[1].decoration.id='paw';
    let text='';saveConfig({setItem:(_key,value)=>{text=value;}},c);
    const restored=loadConfig({getItem:key=>key===STORAGE_KEY?text:null}).config;
    assert.equal(restored.people[0].decoration.id,id);
    assert.equal(restored.people[1].decoration.id,'paw');
    assert.deepEqual(parseConfigFile(text),restored);
  }
  const invalid=defaultWebConfig();
  assert.throws(()=>parseConfigFile(JSON.stringify({...invalid,people:[{...invalid.people[0],decoration:{...invalid.people[0].decoration,id:'unknown-decoration'}},invalid.people[1]]})));
});

test('legacy storage preserves authored names, duration, animation choice, colors and supported ornaments',()=>{
  const c=defaultWebConfig();c.people[0].name='Tangyanxing';c.people[1].decoration.id='puppy-face';
  c.animation.introOutroEnabled=false;c.canvas.background='#030608';c.people[0].glow.color='#6de9de';
  for(const key of ['tyx-signature.website.v6','tyx-signature.website.v5','tyx-signature.website.v2']){
    const restored=loadConfig({getItem:requested=>requested===key?JSON.stringify(c):null});
    assert.equal(restored.warning,undefined);
    assert.deepEqual(restored.config,c);
  }
});

test('older animation switches migrate without re-enabling effects or replacing the authored design',()=>{
  for(const enabled of [true,false]){
    const original=defaultWebConfig();original.people[0].name='LiXin';original.canvas.background='#7451a3';original.timing.duration=7;
    const legacy={...original,animation:{introOutroEnabled:enabled}};
    const imported=parseConfigFile(JSON.stringify(legacy));
    assert.deepEqual(imported,{...original,animation:{introOutroEnabled:enabled,intro:'classic',outro:'classic'}});
    assert.deepEqual(resolveMotionSelection(imported.animation),enabled?{intro:'classic',outro:'classic'}:{intro:'none',outro:'none'});
    const loaded=loadConfig({getItem:key=>key===STORAGE_KEY?JSON.stringify(legacy):null});
    assert.equal(loaded.warning,undefined);assert.deepEqual(loaded.config,imported);
  }
});

test('independent opening and ending choices round trip through files and browser storage',()=>{
  for(const intro of introPresets)for(const outro of outroPresets){
    const config=defaultWebConfig();config.animation={introOutroEnabled:intro.id!=='none'||outro.id!=='none',intro:intro.id,outro:outro.id};
    config.people[0].position.x=.11;config.people[1].ink.color='#ee88bb';
    let saved='';saveConfig({setItem:(_key,value)=>{saved=value;}},config);
    assert.deepEqual(parseConfigFile(saved),config,`${intro.id}/${outro.id}`);
    assert.deepEqual(loadConfig({getItem:key=>key===STORAGE_KEY?saved:null}).config,config);
    assert.deepEqual(resolveMotionSelection(config.animation),{intro:intro.id,outro:outro.id});
  }
  const config=defaultWebConfig();
  for(const animation of [{...config.animation,intro:'unknown'},{...config.animation,outro:'unknown'},{...config.animation,intro:null},{...config.animation,outro:1}]){
    assert.throws(()=>parseConfigFile(JSON.stringify({...config,animation})));
  }
});

test('legacy size and removed options normalize once without moving either person',()=>{
  const c=defaultWebConfig();c.people[0].font.size=120;c.people[0].position.scale=1.2;
  c.people[0].decoration.id='cat';c.people[1].decoration.id='bow';
  const normalized=validateConfig(c);
  assert.equal(normalized.people[0].position.scale,.6);
  assert.deepEqual([normalized.people[0].position.x,normalized.people[0].position.y],[c.people[0].position.x,c.people[0].position.y]);
  assert.equal(normalized.people[0].decoration.id,'none');assert.equal(normalized.people[1].decoration.id,'none');
  assert.deepEqual(parseConfigFile(JSON.stringify(normalized)),normalized);
  assert.equal(c.people[0].font.size,120);
});

test('retired ornaments become none without replacing the authored design during import or storage migration',()=>{
  const retired=[
    'cat','rabbit','bow','dog','sun','heart','star',
    'accent-moon','accent-saturn','accent-shooting-star','accent-cloud',
    'accent-lightning','accent-ribbon','accent-crown','accent-clover',
    'accent-flower','accent-music','accent-envelope','accent-candy',
  ] as const;
  for(const id of retired){
    const authored=defaultWebConfig();
    authored.mode='couple';authored.people[0].name='Li Xin';authored.people[1].name='Qingzhi';
    authored.people[0].ink.color='#15d7b7';authored.people[1].ink.color='#f4abc9';
    authored.people[0].position={x:.12,y:-.08,scale:1.2,rotation:-6};
    authored.people[1].position={x:-.06,y:.09,scale:.85,rotation:-6};
    authored.people[0].decoration={...authored.people[0].decoration,id,scale:1.1,offsetX:.07,offsetY:-.04};
    authored.people[1].decoration.id='puppy-face';authored.people[1].decoration.scale=.9;
    authored.people[0].font.penWidth=1.25;authored.canvas.background='#e6e6e6';
    authored.timing.duration=7.5;authored.animation.introOutroEnabled=false;
    const original=structuredClone(authored),expected=structuredClone(authored);
    expected.people[0].decoration.id='none';
    const text=JSON.stringify(authored);
    assert.deepEqual(parseConfigFile(text),expected,id);
    for(const key of [STORAGE_KEY,'tyx-signature.website.v6','tyx-signature.website.v2']){
      const restored=loadConfig({getItem:requested=>requested===key?text:null});
      assert.equal(restored.warning,undefined,`${id}/${key}`);
      assert.deepEqual(restored.config,expected,`${id}/${key}`);
    }
    assert.deepEqual(validateConfig(authored),expected,id);
    assert.deepEqual(authored,original,'normalizing a retired ornament does not mutate the supplied design');
  }
});

test('active names, RGB colors and numeric limits reject unsafe file values',()=>{
  const c=defaultWebConfig();c.people[0].name='A'.repeat(40);c.people[0].ink.color='#aB09fF';
  c.people[0].position.scale=.45;c.people[1].font.penWidth=2;c.timing.duration=15;c.audio.start=3600;
  assert.doesNotThrow(()=>validateConfig(c));
  const invalids=[
    (d:typeof c)=>{d.people[0].name='A'.repeat(41);},
    (d:typeof c)=>{d.people[0].name=" -- ' ";},
    (d:typeof c)=>{d.people[1].name='A\nB';},
    (d:typeof c)=>{d.people[0].ink.color='#fff';},
    (d:typeof c)=>{d.canvas.background='red';},
    (d:typeof c)=>{d.people[0].position.x=NaN;},
    (d:typeof c)=>{d.people[0].font.penWidth=.49;},
    (d:typeof c)=>{d.timing.duration=15.01;},
    (d:typeof c)=>{d.audio.start=-.01;},
    (d:typeof c)=>{d.audio.volume=1.01;},
  ];
  for(const invalidate of invalids){const copy=structuredClone(c);invalidate(copy);assert.throws(()=>validateConfig(copy));}
});
