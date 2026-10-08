import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { presets } from '@shadergradient/react';
const session = `glass-official-check-${process.pid}`;
const output = resolve('artifacts/shader-official');
const run = (...args) => {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 60000 }));
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data;
};
const evaluate = code => run('eval', code).result;
const wait = code => run('wait', '--fn', code);
const preference = values => evaluate(`(()=>{for(const [key,value] of Object.entries(${JSON.stringify(values)}))localStorage.setItem('glass-tab-preview:preference:v1:'+key,JSON.stringify(value));dispatchEvent(new StorageEvent('storage',{key:'glass-tab-preview:preference:v1:activeEffect'}));})()`);
const shapes = [['plane', 'Plane', 'halo'], ['sphere', 'Sphere', 'pensive'], ['waterPlane', 'Water', 'mint']];
const results = [];
try {
  await mkdir(output, {recursive:true});
  run('open','--init-script',resolve('scripts/shader-probe.js'),'http://localhost:4317/src/entrypoints/newtab/index.html');
  run('set','viewport','1440','900');
  preference({shuffle:false,activeEffect:'shader-gradient'});
  wait("document.querySelector('.ambient-background')?.dataset.renderer==='live'");
  for(const [shape,label] of shapes) {
    evaluate(`localStorage.setItem('glass-tab-preview:shader-gradient:shuffle:v1',JSON.stringify({remaining:['${shape}']}))`);
    run('reload');
    wait(`document.querySelector('.ambient-background')?.dataset.variant==='${shape}'&&document.querySelector('.ambient-background')?.dataset.renderer==='live'`);
    const engine=evaluate("document.querySelector('.ambient-background').dataset.engine");
    assert.equal(engine,'shadergradient-official');
    const timing=evaluate(`(async()=>{const start=performance.now(),before=window.__shaderProbe.uniforms.uTime;await new Promise(r=>setTimeout(r,1500));return {wall:(performance.now()-start)/1000,shader:window.__shaderProbe.uniforms.uTime-before};})()`);
    assert.ok(timing.shader/timing.wall>.07&&timing.shader/timing.wall<.18,JSON.stringify(timing));
    run('screenshot',resolve(output,`${shape}-app.png`));
    results.push({shape,engine,timing,queuedShape:true});
  }
  run('set','viewport','390','844');run('press','Control+,');wait('document.querySelector("[role=dialog]") !== null');
  assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  assert.equal(evaluate('document.body.innerText.includes("Shader Gradient 形态")'),false);
  run('screenshot',resolve(output,'settings-narrow.png'));
  run('press','Escape');run('set','viewport','1440','900');
  run('set','media','light','reduced-motion');wait('document.querySelectorAll(".ambient-background canvas").length === 0');
  evaluate("(()=>{const host=document.createElement('div');host.id='shader-fixture';host.style='position:fixed;inset:0;z-index:99999;background:white';document.body.append(host);window.__host=host;})()");
  for(const [shape] of shapes) {
    const stats=evaluate(`(async()=>{const {createDriver}=await import('/src/effects/drivers/shader-gradient.tsx');const d=window.__driver=await createDriver(window.__host,'shader-gradient','day','${shape}');d.resize(innerWidth,innerHeight,1);const samples=[];for(const t of [0,2,8]){d.render(t,.05,{x:0,y:0});const gl=d.canvas.getContext('webgl2'),p=new Uint8Array(innerWidth*innerHeight*4);gl.readPixels(0,0,innerWidth,innerHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);let hash=0;const colors=new Set();for(let i=0;i<p.length;i+=64){hash=(Math.imul(hash,31)+p[i]+p[i+1]*256+p[i+2]*65536)|0;colors.add(p[i]+p[i+1]*256+p[i+2]*65536);}samples.push({time:t,hash,colors:colors.size,error:gl.getError()});}window.__frame=requestAnimationFrame(function draw(){d.render(0,.05,{x:0,y:0});window.__frame=requestAnimationFrame(draw)});return samples;})()`);
    assert.ok(stats.every(x=>x.error===0&&x.colors>100),JSON.stringify(stats));assert.notEqual(stats[0].hash,stats[1].hash);
    run('screenshot',resolve(output,`${shape}-local-t0.png`));
    evaluate('cancelAnimationFrame(window.__frame);window.__driver.dispose()');
    results.find(x=>x.shape===shape).frames=stats;
  }
  const errors=run('errors').errors;assert.deepEqual(errors,[]);
  const consoleErrors=run('console').messages.filter(x=>x.type==='error');assert.deepEqual(consoleErrors,[]);
  await writeFile(resolve(output,'checks.json'),JSON.stringify({results,errors,consoleErrors},null,2));
  run('set','media','light','no-preference');
  run('open','https://shadergradient.co/customize');
  for(const [index,[shape,,key]] of shapes.entries()) {
    if(index)run('find','text','↑','click','--exact');
    wait(`document.body.innerText.includes('${presets[key].title}') && document.querySelector('canvas')?.width>0`);
    run('wait','3500');
    run('screenshot',resolve(output,`${shape}-website.png`));
  }
  console.log(JSON.stringify({results,errors,output}));
} finally {try {run('close');}catch{}}
