import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const session = `shader-brand-${process.pid}`;
const profile = await mkdtemp('/private/tmp/shader-brand-');
const output = resolve('artifacts/brand-review');
const run = (...args) => {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 60000 }));
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data;
};
const evaluate = code => run('eval', code).result;
try {
  await mkdir(output,{recursive:true});
  run('--profile',profile,'--extension',resolve('.output/chrome-mv3'),'open','chrome://newtab');
  run('wait','--fn',"document.querySelector('main')?.dataset.mode==='extension'");
  run('set','offline','on');
  const manifest=evaluate('chrome.runtime.getManifest()');
  const base=evaluate('chrome.runtime.getURL("")');
  assert.equal(manifest.version,'0.3.13');
  const icons=evaluate(`Promise.all(Object.entries(chrome.runtime.getManifest().icons).map(async([size,path])=>{const image=new Image();image.src=chrome.runtime.getURL(path);await image.decode();const c=document.createElement('canvas');c.width=c.height=Number(size);const x=c.getContext('2d');x.drawImage(image,0,0);return {size:Number(size),width:image.naturalWidth,height:image.naturalHeight,cornerAlpha:x.getImageData(0,0,1,1).data[3]};}))`);
  assert.equal(icons.length,4);
  assert.ok(icons.every(i=>i.width===i.size&&i.height===i.size&&i.cornerAlpha===0));
  const pages=[];
  for(const page of ['newtab.html','privacy.html','licenses.html']) {
    if(page!=='newtab.html')run('open',base+page);
    run('wait','--fn',"document.querySelectorAll('link[rel=icon]').length===2");
    const favicons=evaluate("[...document.querySelectorAll('link[rel=icon]')].map(l=>({href:l.href,size:l.sizes.value}))");
    assert.deepEqual(favicons.map(i=>i.size),['16x16','32x32']);
    assert.ok(favicons.every(i=>i.href.startsWith(base+'icon/')));
    pages.push({page,favicons});
  }
  run('open','chrome://extensions');
  run('wait','--fn',"document.querySelector('extensions-manager')?.shadowRoot?.querySelector('extensions-item-list')?.shadowRoot?.querySelector('extensions-item')!==null");
  const management=evaluate(`(()=>{const manager=document.querySelector('extensions-manager');const list=manager.shadowRoot.querySelector('extensions-item-list');const items=[...list.shadowRoot.querySelectorAll('extensions-item')];const item=items.find(el=>el.shadowRoot.textContent.includes('Shader Tab'));return {found:!!item,images:item?[...item.shadowRoot.querySelectorAll('img')].map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0})):[]};})()`);
  assert.equal(management.found,true);assert.ok(management.images.some(i=>i.loaded));
  run('set','viewport','1100','800');
  run('screenshot',resolve(output,'extension-management.png'));
  await writeFile(resolve(output,'checks.json'),JSON.stringify({version:manifest.version,icons,pages,management},null,2));
  console.log('Manifest icon sizes, transparent PNG decoding, three page favicons and extension management icon passed.');
} finally {try{run('close');}finally{await rm(profile,{recursive:true,force:true});}}
