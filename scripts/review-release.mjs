import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const session = `shader-release-${process.pid}`;
const profile = await mkdtemp('/private/tmp/shader-release-');
const output = resolve('artifacts/release-review');
const run = (...args) => {
  const response = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 60000 }));
  if (!response.success) throw new Error(JSON.stringify(response.error));
  return response.data;
};
const evaluate = code => run('eval', code).result;
const wait = code => run('wait', '--fn', code);
try {
  await mkdir(output, { recursive: true });
  run('--profile', profile, '--extension', resolve('.output/chrome-mv3'), 'open', 'chrome://newtab');
  wait("document.querySelector('main')?.dataset.mode==='extension'");
  const base = evaluate('chrome.runtime.getURL("")');
  evaluate(`(async()=>{const folder=await chrome.bookmarks.create({parentId:'1',title:'Review folder'}); await chrome.bookmarks.create({parentId:folder.id,title:'Review bookmark',url:'https://example.invalid/'}); await chrome.storage.local.set({'preference:v1:language':'zh-CN','preference:v1:shuffle':false,'preference:v1:activeEffect':'grain-gradient'});})()`);
  run('set', 'offline', 'on');
  run('set', 'viewport', '1440', '900');
  run('press', 'Tab');
  wait("document.querySelector('.dock-button svg')!==null");
  assert.equal(evaluate("document.querySelectorAll('.dock-button svg').length"), 3);
  const buttons = evaluate("[...document.querySelectorAll('.dock-button')].map(b=>({label:b.getAttribute('aria-label'),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,paths:b.querySelectorAll('svg path').length}))");
  assert.ok(buttons.every(b => b.width === 34 && b.height === 34 && b.paths > 0));
  run('press', 'Control+,');
  wait("document.querySelector('[role=dialog]')!==null");
  run('snapshot', '-i');
  run('find','text','Review folder','click','--exact');
  wait("document.querySelector('[aria-label=\"添加 Review bookmark\"]')!==null");
  run('snapshot','-i');
  run('find','role','button','click','--name','添加 Review bookmark','--exact');
  wait("document.querySelectorAll('.pinned-row').length===1");
  const layouts = [];
  for (const width of [1440, 390, 320]) {
    run('set', 'viewport', String(width), '900');
    for (const theme of ['day', 'night']) {
      evaluate(`chrome.storage.local.set({'preference:v1:appearance':'${theme}'})`);
      wait(`document.documentElement.dataset.theme==='${theme}'`);
      const layout = evaluate("(()=>{const r=document.querySelector('.settings-legal').getBoundingClientRect(); return {overflow:document.documentElement.scrollWidth>innerWidth,footerVisible:r.top>=0&&r.bottom<=innerHeight,left:r.left,right:r.right};})()");
      assert.equal(layout.overflow, false); assert.equal(layout.footerVisible, true);
      assert.ok(layout.left>=0 && layout.right<=width);
      layouts.push({width,theme,...layout});
      run('screenshot',resolve(output,`settings-${width}-${theme}.png`));
    }
  }
  run('find','role','link','click','--name','隐私政策','--exact');
  wait(`location.href===${JSON.stringify(base+'privacy.html')}`);
  const tabs=run('tab','list');
  await writeFile(resolve(output,'tabs.json'),JSON.stringify(tabs,null,2));
  run('set','viewport','320','900');
  evaluate('scrollTo(0,0)');
  wait("document.querySelector('h1')?.textContent==='隐私政策'");
  assert.ok(evaluate('document.body.textContent').includes('support@simonwong.cn'));
  assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  run('screenshot',resolve(output,'privacy-320.png'));
  run('open',base+'licenses.html');
  run('set','viewport','320','900');
  wait("document.querySelector('h1')?.textContent==='第三方许可'");
  assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  const links=evaluate("[...document.querySelectorAll('a')].map(a=>a.href)");
  assert.ok(links.some(href=>href.endsWith('embedded-dependencies.txt')));
  const statuses=evaluate("Promise.all([...document.querySelectorAll('a')].map(async a=>({url:a.href,status:(await fetch(a.href)).status})))");
  assert.ok(statuses.every(item=>item.status===200));
  const errors=run('errors').errors;assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'checks.json'),JSON.stringify({version:'0.4.0',buttons,layouts,offline:true,bookmarkAdd:true,legalLinks:statuses,errors},null,2));
  console.log('Hugeicons, bookmark add, 320/390/1440px settings, offline privacy and license pages passed.');
} catch (error) {
  console.error(JSON.stringify(run('snapshot')));
  throw error;
} finally { try { run('close'); } finally { await rm(profile,{recursive:true,force:true}); } }
