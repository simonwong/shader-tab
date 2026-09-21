import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const session=`glass-variant-life-${process.pid}`,profile=await mkdtemp('/private/tmp/glass-variant-life-'),output=resolve('artifacts/variants-review');
const run=(...args)=>{const r=JSON.parse(execFileSync('agent-browser',['--session',session,'--json',...args],{encoding:'utf8',timeout:60000}));if(!r.success)throw new Error(JSON.stringify(r.error));return r.data;};
const evaluate=code=>run('eval',code).result;
const wait=code=>run('wait','--fn',code);
const variants=['data-pixel','predictive','signal-particles','override-grid','ribbon-field','void-field','halftone-flow','amber-halftone'];
try {
 await mkdir(output,{recursive:true});
 run('--profile',profile,'--extension',resolve('.output/chrome-mv3'),'open','--init-script',resolve('scripts/performance-probe.js'),'chrome://newtab');
 run('set','offline','on');run('set','viewport','390','844','2');
 evaluate(`chrome.storage.local.set({'preference:v1:shuffle':false,'preference:v1:activeEffect':'data-pixel-arc','preference:v1:appearance':'night','effect-variant:shuffle:v1:data-pixel-arc':{remaining:${JSON.stringify(variants)}}})`);
 wait("document.querySelector('main')?.dataset.effect==='data-pixel-arc' && document.querySelector('.ambient-background')?.dataset.renderer==='live'");
 evaluate(`chrome.storage.local.set({'effect-variant:shuffle:v1:data-pixel-arc':{remaining:${JSON.stringify(variants)}}})`);
 const samples=[];
 for(const variant of variants){
  run('reload');wait(`document.querySelector('.ambient-background')?.dataset.variant===${JSON.stringify(variant)} && document.querySelector('.ambient-background')?.dataset.renderer==='live'`);
  const sample=evaluate('(async()=>{window.__glassProbe.reset();await new Promise(r=>setTimeout(r,2100));return window.__glassProbe.read()})()');
  assert.ok(sample.draws>0&&sample.draws<=65);assert.ok(sample.raf<=70);assert.ok(sample.buffer[0]*sample.buffer[1]<=4002000);
  samples.push({variant,...sample});run('screenshot',resolve(output,`narrow-${variant}.png`));
 }
 evaluate("window.__hidden=[];for(const ms of [1000,32000])setTimeout(()=>window.__hidden.push({hidden:document.hidden,...window.__glassProbe.read()}),ms)");
 run('tab','new','about:blank');await new Promise(r=>setTimeout(r,33000));run('tab','t1');
 const hidden=evaluate('window.__hidden');assert.equal(hidden.length,2);assert.ok(hidden.every(x=>x.hidden));assert.equal(hidden[0].draws,hidden[1].draws);assert.equal(hidden[1].buffer,null);
 wait("document.querySelector('.ambient-background')?.dataset.renderer==='live'");assert.equal(evaluate("document.querySelector('.ambient-background').dataset.variant"),'amber-halftone');
 evaluate("(async()=>{for(const id of ['pixel-blast','data-pixel-arc','grain-gradient','crt-terminal','data-pixel-arc']){await chrome.storage.local.set({'preference:v1:activeEffect':id});await new Promise(r=>setTimeout(r,60))}})()");
 wait("document.querySelector('main')?.dataset.effect==='data-pixel-arc' && document.querySelector('.ambient-background')?.dataset.renderer==='live'");
 assert.equal(evaluate("document.querySelectorAll('.ambient-background canvas').length"),1);
 const errors=run('errors').errors;assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'lifecycle.json'),JSON.stringify({offline:true,narrow:[390,844],samples,hidden,restoredVariant:'amber-halftone',rapidSwitch:true,errors},null,2));
 console.log('Eight Arc variants offline at 390px, bounded frame rate, hidden stop/release, same-variant restore, rapid switching passed.');
}finally{try{run('close');await rm(profile,{recursive:true,force:true});}catch{}}
