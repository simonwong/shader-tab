import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const session = `shader-locales-${process.pid}`;
const profile = await mkdtemp('/private/tmp/shader-locales-');
const output = resolve('artifacts/locales');
const run = (...args) => {
  const response = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 60000 }));
  if (!response.success) throw new Error(JSON.stringify(response.error));
  return response.data;
};
const evaluate = code => run('eval', code).result;
const wait = code => run('wait', '--fn', code);
const labels = { en: 'Settings', 'zh-CN': '设置', 'zh-TW': '設定', ja: '設定', ko: '설정', fr: 'Paramètres', de: 'Einstellungen', es: 'Ajustes' };
try {
  await mkdir(output, { recursive: true });
  run('--profile', profile, '--extension', resolve('.output/chrome-mv3'), 'open', 'chrome://newtab');
  wait("document.querySelector('main')?.dataset.mode==='extension'");
  const base = evaluate('chrome.runtime.getURL("")');
  const initial = evaluate("({ui:chrome.i18n.getUILanguage(),lang:document.documentElement.lang,name:chrome.runtime.getManifest().name,resources:performance.getEntriesByType('resource').map(r=>r.name)})");
  assert.equal(initial.name, 'Shader Tab');
  const fixture = evaluate(`(async()=>{const folder=await chrome.bookmarks.create({parentId:'1',title:'语言测试 · Folder'});const b=await chrome.bookmarks.create({parentId:folder.id,title:'我的书签 · Café {count}',url:'https://example.invalid/locale'});await chrome.storage.local.set({'preference:v1:shuffle':false,'preference:v1:activeEffect':'grain-gradient','preference:v1:language':'zh-CN'});return b.id;})()`);
  run('set','offline','on');
  run('set','viewport','1440','900');
  run('press','Control+,');
  wait("document.documentElement.lang==='zh-CN'&&document.querySelector('#interface-language')!==null");
  run('snapshot','-i');
  run('find','text','语言测试 · Folder','click','--exact');
  wait("document.querySelector('[aria-label=\"添加 我的书签 · Café {count}\"]')!==null");
  run('find','role','button','click','--name','添加 我的书签 · Café {count}','--exact');
  wait("document.querySelectorAll('.pinned-row').length===1&&document.querySelector('.ambient-background').dataset.renderer==='live'");
  evaluate("window.localeCanvas=document.querySelector('.ambient-background canvas');window.localeVariant=document.querySelector('.ambient-background').dataset.variant");
  const before = evaluate('chrome.storage.local.get(null)');
  const layouts=[];
  for (const [locale,label] of Object.entries(labels)) {
    run('snapshot','-i');
    run('select','#interface-language',locale);
    wait(`document.documentElement.lang===${JSON.stringify(locale)}&&document.querySelector('#interface-language').disabled===false`);
    assert.equal(evaluate("document.querySelector('.settings-header h2').textContent"),label);
    assert.equal(evaluate("document.querySelector('.pinned-row .truncate').textContent"),'我的书签 · Café {count}');
    assert.equal(evaluate("document.querySelector('.ambient-background canvas')===window.localeCanvas&&document.querySelector('.ambient-background').dataset.variant===window.localeVariant"),true);
    const state=evaluate('chrome.storage.local.get(null)');
    assert.equal(state['preference:v1:language'],locale);
    delete state['preference:v1:language'];
    const saved={...before};delete saved['preference:v1:language'];assert.deepEqual(state,saved);
    const links=evaluate("[...document.querySelectorAll('.settings-legal a')].map(a=>a.href)");
    assert.equal(links[0],base+(locale==='zh-CN'?'privacy.html':`locales/${locale}/privacy.html`));
    for (const width of [1440,390,320]) {
      run('set','viewport',String(width),'900');
      evaluate("document.querySelector('#language-heading').scrollIntoView({block:'start'})");
      const layout=evaluate("(()=>{const dialog=document.querySelector('[role=dialog]');const footer=document.querySelector('.settings-legal').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,bodyOverflow:document.querySelector('.settings-body').scrollWidth>document.querySelector('.settings-body').clientWidth,footerVisible:footer.top>=0&&footer.bottom<=innerHeight,dialogWidth:dialog.getBoundingClientRect().width};})()");
      assert.equal(layout.overflow,false,locale+' '+width);assert.equal(layout.bodyOverflow,false,locale+' '+width);assert.equal(layout.footerVisible,true);
      layouts.push({locale,width,...layout});
      if(width===320||width===1440)run('screenshot',resolve(output,`${locale}-${width}.png`));
    }
    run('set','viewport','1440','900');
  }
  run('select','#interface-language','auto');
  wait("document.querySelector('#interface-language').value==='auto'&&!document.querySelector('#interface-language').disabled");
  const auto=evaluate('document.documentElement.lang');
  assert.equal(auto,initial.lang);
  run('select','#interface-language','ja');
  wait("document.documentElement.lang==='ja'");
  run('reload');
  wait("document.documentElement.lang==='ja'&&document.querySelector('main')?.dataset.mode==='extension'");
  run('press','Control+,');
  wait("document.querySelector('#interface-language')?.value==='ja'");
  assert.equal(evaluate("document.querySelector('.pinned-row .truncate').textContent"),'我的书签 · Café {count}');
  const legal=[];
  for(const locale of Object.keys(labels))for(const page of ['privacy','licenses']) {
    const path=locale==='zh-CN'?`${page}.html`:`locales/${locale}/${page}.html`;
    run('open',base+path);
    wait(`document.documentElement.lang===${JSON.stringify(locale)}&&document.querySelector('h1')!==null`);
    run('set','viewport','320','900');
    assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    const statuses=evaluate("Promise.all([...document.querySelectorAll('a,link')].filter(a=>a.href.startsWith(location.origin+'/')).map(async a=>({url:a.href,status:(await fetch(a.href)).status})))");
    assert.ok(statuses.every(item=>item.status===200));
    assert.equal(evaluate("document.querySelectorAll('nav a').length"),8);
    legal.push({locale,page,links:statuses.length});
  }
  const errors=run('errors').errors;assert.deepEqual(errors,[]);
  await writeFile(resolve(output,'checks.json'),JSON.stringify({version:'0.4.0',initial,auto,fixture,layouts,legal,offline:true,languageSavedAfterReload:true,favoritesPreserved:true,canvasPreserved:true,errors},null,2));
  console.log('8 locales, 24 settings layouts, 16 legal pages, offline loading, persistence and unchanged favorite/background passed.');
} catch(error) {
  console.error(JSON.stringify(run('snapshot')));
  throw error;
} finally {try{run('close');}finally{await rm(profile,{recursive:true,force:true});}}
