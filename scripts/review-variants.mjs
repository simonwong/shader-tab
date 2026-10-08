import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { loadVariants } from './lib/variants.mjs';
const { variantIds: variants, shuffleKey } = await loadVariants();
const session=`glass-variants-${process.pid}`, profile=await mkdtemp('/private/tmp/glass-variants-'), output=resolve('artifacts/variants-review');
const run=(...args)=>{const r=JSON.parse(execFileSync('agent-browser',['--session',session,'--json',...args],{encoding:'utf8',timeout:60000}));if(!r.success)throw new Error(JSON.stringify(r.error));return r.data;};
const evaluate=code=>run('eval',code).result;
const wait=code=>run('wait','--fn',code);
const delay=ms=>evaluate(`new Promise(r=>setTimeout(r,${ms}))`);
const preference=values=>evaluate(`chrome.storage.local.set(${JSON.stringify(Object.fromEntries(Object.entries(values).map(([k,v])=>['preference:v1:'+k,v])))})`);
const settled=(effect,variant)=>wait(`document.querySelector('main')?.dataset.effect===${JSON.stringify(effect)} && document.querySelector('.ambient-background')?.dataset.variant===${JSON.stringify(variant)} && document.querySelector('.ambient-background')?.dataset.renderer==='live'`);
try {
 await mkdir(output,{recursive:true});
 run('--profile',profile,'--extension',resolve('.output/chrome-mv3'),'open','--init-script',resolve('scripts/shader-probe.js'),'chrome://newtab');
 run('set','viewport','1200','760');
 const records=[];
 for(const [effect,choices] of Object.entries(variants).filter(([effect])=>process.argv.length<=2||process.argv.slice(2).includes(effect))) {
  await preference({shuffle:false,activeEffect:effect,appearance:'night'});
  wait(`document.querySelector('main')?.dataset.effect===${JSON.stringify(effect)} && document.querySelector('.ambient-background')?.dataset.renderer==='live'`);
  const key=shuffleKey(effect);
  evaluate(`chrome.storage.local.set({[${JSON.stringify(key)}]:{remaining:${JSON.stringify(choices)}}})`);
  for(const variant of choices){
   run('reload');settled(effect,variant);
   for(const theme of ['night','day']) {
    preference({appearance:theme});settled(effect,variant);
    wait(`document.documentElement.dataset.theme==='${theme}'`);
    delay(1200);
    const before=evaluate('JSON.parse(JSON.stringify(window.__shaderProbe))');
    run('mouse','move','200','200');delay(600);
    const after=evaluate('JSON.parse(JSON.stringify(window.__shaderProbe))');
    assert.notDeepEqual(after,before,`${effect}/${variant}/${theme} must animate or react`);
    const state=evaluate(`(()=>{const h=document.querySelector('.ambient-background'),c=h.querySelector('canvas');return {variant:h.dataset.variant,renderer:h.dataset.renderer,engine:h.dataset.engine,width:c.width,height:c.height,canvases:h.querySelectorAll('canvas').length,source:document.querySelector('.effect-source').href};})()`);
    assert.equal(state.variant,variant);assert.equal(state.canvases,1);assert.ok(state.width*state.height<=4002000);
    run('screenshot',resolve(output,`${effect}-${variant.replace(':','-')}-${theme}.png`));
    records.push({effect,variant,theme,...state});
   }
   preference({appearance:'night'});settled(effect,variant);
  }
  await writeFile(resolve(output,`${effect}-checks.json`),JSON.stringify(records.filter(record=>record.effect===effect),null,2));
  console.log(`${effect}: ${choices.length} variants, both themes passed`);
 }
 for(const [effect,choices] of Object.entries(variants)) {
  preference({shuffle:true,effects:[effect]});run('reload');
  wait(`document.querySelector('main')?.dataset.effect===${JSON.stringify(effect)} && document.querySelector('.ambient-background')?.dataset.renderer==='live'`);
  const before=evaluate("document.querySelector('.ambient-background').dataset.variant");
  run('reload');wait("document.querySelector('.ambient-background')?.dataset.renderer==='live'");
  const after=evaluate("document.querySelector('.ambient-background').dataset.variant");
  assert.ok(choices.includes(after));if(choices.length>1)assert.notEqual(after,before);
 }
 run('set','viewport','390','844');preference({shuffle:false,activeEffect:'data-pixel-arc'});run('reload');wait("document.querySelector('.ambient-background')?.dataset.renderer==='live'");
 run('press','Control+,');wait("document.querySelector('[role=dialog]')!==null");assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'),false);
 run('screenshot',resolve(output,'settings-narrow.png'));run('press','Escape');
 run('set','media','light','reduced-motion');wait("document.querySelector('.ambient-background')?.dataset.renderer==='static'");assert.equal(evaluate("document.querySelectorAll('.ambient-background canvas').length"),0);
 const errors=run('errors').errors;assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'checks.json'),JSON.stringify({records,shuffleSingleFamily:true,narrowOverflow:false,reducedMotion:true,errors},null,2));
 console.log(`${records.length} theme combinations, one-family random, responsive settings and reduced motion passed.`);
} catch(error) { try { console.error(JSON.stringify(run('snapshot')));console.error(JSON.stringify(run('errors'))); }catch{} throw error; }
finally {try{run('close');await rm(profile,{recursive:true,force:true});}catch{}}
