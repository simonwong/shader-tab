import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const profile = await mkdtemp('/private/tmp/glass-tab-performance-');
const session = `glass-performance-${process.pid}`;
const run = (...args) => {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8', timeout: 60_000 }));
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data;
};
const evaluate = (code) => run('eval', code).result;
const sample = (ms) => evaluate(`(async()=>{window.__glassProbe.reset();await new Promise(r=>setTimeout(r,${ms}));return {...window.__glassProbe.read(),hidden:document.hidden}})()`);
let extensionUrl;
let fixture;
try {
  run('--profile', profile, '--extension', `${root}.output/chrome-mv3`, 'open', '--init-script', `${root}scripts/performance-probe.js`, 'about:blank');
  run('set', 'viewport', '1440', '900', '2');
  run('open', 'chrome://newtab');
  extensionUrl = evaluate('location.href');
  fixture = evaluate(`(async()=>{
    const folder=await chrome.bookmarks.create({parentId:'1',title:'Glass Tab Performance Fixture'});
    const ids=[];
    for(let i=0;i<6;i++) ids.push((await chrome.bookmarks.create({parentId:folder.id,title:'Example '+i,url:'https://example.com/'+i})).id);
    await chrome.storage.local.set({'favorites:v2':ids,'preference:v1:appearance':'day','preference:v1:shuffle':false,'preference:v1:activeEffect':'crt-terminal'});
    return folder.id;
  })()`);
  run('press', 'Control+,');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  run('find', 'role', 'switch', 'click', '--name', '显示常用书签', '--exact');
  run('find', 'role', 'switch', 'click', '--name', '显示系统书签', '--exact');
  run('press', 'Escape');
  run('wait', '--fn', 'document.querySelector("[aria-label=书签导航]") === null');
  const navigationPreferences = evaluate("chrome.storage.local.get(['preference:v1:showFavorites','preference:v1:showBookmarks'])");
  assert.deepEqual(navigationPreferences, {'preference:v1:showFavorites':false,'preference:v1:showBookmarks':false});
  run('open', extensionUrl);
  run('wait', '--fn', 'document.querySelector("[aria-label=书签导航]") === null && document.querySelector("button[aria-label=设置]") !== null');
  evaluate("chrome.storage.local.set({'preference:v1:showFavorites':true,'preference:v1:showBookmarks':true})");
  run('wait', '--fn', 'document.querySelectorAll("[aria-label=书签导航] button").length === 2');
  run('set', 'offline', 'on');
  run('open', extensionUrl);
  run('wait', '--fn', 'document.querySelector(".ambient-background")?.dataset.renderer === "live"');
  run('wait', '--fn', 'performance.getEntriesByType("paint").length > 0');
  const effects = [];
  for (const theme of ['day', 'night']) for (const id of ['grain-gradient', 'dithering', 'pixel-blast', 'data-pixel-arc', 'crt-terminal', 'shader-gradient']) {
    evaluate(`chrome.storage.local.set({'preference:v1:appearance':${JSON.stringify(theme)},'preference:v1:activeEffect':${JSON.stringify(id)}})`);
    run('wait', '--fn', `document.querySelector('main').dataset.effect === '${id}' && document.documentElement.dataset.theme === '${theme}'`);
    run('wait', '--fn', 'document.querySelector(".ambient-background").dataset.transitioning === "false"');
    const result = sample(2000);
    assert.ok(result.draws > 0 && result.draws <= (id === 'shader-gradient' ? 84 : 42));
    assert.ok(result.raf <= 45);
    effects.push({ id, theme, ...result });
    console.log(`${id}/${theme}: ${result.draws} draw passes, ${result.raf} rAF / 2s`);
  }
  evaluate("chrome.storage.local.set({'preference:v1:appearance':'day','preference:v1:activeEffect':'crt-terminal'})");
  run('wait', '--fn', 'document.documentElement.dataset.theme === "day"');
  run('wait', '--fn', 'document.querySelector(".ambient-background").dataset.transitioning === "false"');
  const idle = sample(10_000);
  assert.equal(idle.hidden, false); assert.ok(idle.draws > 0 && idle.draws <= 205); assert.ok(idle.raf <= 210);
  assert.ok(Math.max(...idle.buffer) <= 2560);
  assert.ok(idle.buffer[0] * idle.buffer[1] <= 4_000_000);
  run('mouse', 'move', '720', '820');
  run('find', 'role', 'button', 'hover', '--name', '全部书签', '--exact');
  run('wait', '--fn', 'document.querySelector(".bookmark-menu") !== null');
  const glass = sample(5000);
  assert.ok(glass.draws > 0 && glass.draws <= 155);
  assert.equal(evaluate('document.querySelectorAll("canvas").length'), 1);
  evaluate(`window.__hiddenSamples=[];for(const ms of [1500,32000]) setTimeout(()=>window.__hiddenSamples.push({hidden:document.hidden,...window.__glassProbe.read()}),ms);`);
  run('tab', 'new', 'about:blank');
  await new Promise((resolve) => setTimeout(resolve, 33500));
  run('tab', 't1');
  const hidden = evaluate('window.__hiddenSamples');
  assert.equal(hidden.length, 2); assert.ok(hidden.every(x=>x.hidden));
  assert.equal(hidden[0].draws, hidden[1].draws); assert.equal(hidden[1].buffer, null);
  run('wait', '--fn', 'document.querySelector(".ambient-background")?.dataset.renderer === "live"');
  run('press', 'Control+,');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  run('press', 'Escape');
  assert.equal(evaluate('document.querySelector("main").inert'), false);
  const errors = run('errors').errors;
  assert.equal(errors.length, 0);
  await mkdir(`${root}artifacts/performance`, { recursive: true });
  await writeFile(`${root}artifacts/performance/latest.json`, JSON.stringify({ date: new Date().toISOString(), viewport: [1440,900], dpr: 2, offline: true, navigationPreferences, visibilityPersisted: true, effect: 'crt-terminal/day', effects, idle, glass, hidden, errors }, null, 2));
  console.log(`Performance checks passed: idle ${idle.draws}/10s, glass ${glass.draws}/5s, hidden draws unchanged, context released, errors 0.`);
} finally {
  try { run('close'); await rm(profile, { recursive: true, force: true }); } catch {}
}
