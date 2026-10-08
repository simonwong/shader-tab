import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { browserSession, fromRoot, removeDir, tempDir } from './lib/browser.mjs';
const profile = await tempDir('glass-tab-random');
const { run, evaluate, close } = browserSession('glass-random');
const live = () =>
  run(
    'wait',
    '--fn',
    "document.querySelector('main')?.dataset.effect==='shader-gradient'&&document.querySelector('.ambient-background')?.dataset.renderer==='live'",
  );
try {
  run(
    '--profile',
    profile,
    '--extension',
    fromRoot('.output/chrome-mv3'),
    'open',
    '--init-script',
    fromRoot('scripts/performance-probe.js'),
    'about:blank',
  );
  run('open', 'chrome://newtab');
  const url = evaluate('location.href');
  const version = evaluate('chrome.runtime.getManifest().version');
  evaluate(
    "chrome.storage.local.set({'preference:v1:effects':['shader-gradient'],'preference:v1:activeEffect':'shader-gradient','preference:v1:shuffle':true,'preference:v1:shaderGradientShape':'sphere','effect-variant:shuffle:v1:shader-gradient':{remaining:[]}})",
  );
  live();
  evaluate(
    "chrome.storage.local.set({'effect-variant:shuffle:v1:shader-gradient':{remaining:[]}})",
  );
  const random = [];
  for (let i = 0; i < 12; i++) {
    run('open', url);
    live();
    random.push(
      evaluate(
        "({shape:document.querySelector('.ambient-background').dataset.variant,engine:document.querySelector('.ambient-background').dataset.engine})",
      ),
    );
  }
  evaluate("chrome.storage.local.set({'preference:v1:shuffle':false})");
  const fixed = [];
  for (let i = 0; i < 12; i++) {
    run('open', url);
    live();
    fixed.push(evaluate("document.querySelector('.ambient-background').dataset.variant"));
  }
  for (const sequence of [random.map(x => x.shape), fixed]) {
    for (let i = 0; i < sequence.length; i += 3)
      assert.equal(new Set(sequence.slice(i, i + 3)).size, 3);
    for (let i = 1; i < sequence.length; i++) assert.notEqual(sequence[i], sequence[i - 1]);
  }
  assert.ok(random.every(x => x.engine === 'shadergradient-official'));
  const consoleErrors = run('console').messages.filter(x => x.type === 'error');
  assert.deepEqual(consoleErrors, []);
  run('set', 'offline', 'on');
  const offline = [];
  evaluate(
    "chrome.storage.local.set({'effect-variant:shuffle:v1:shader-gradient':{remaining:['plane','waterPlane','sphere']}})",
  );
  for (const shape of ['plane', 'waterPlane', 'sphere']) {
    run('open', url);
    live();
    assert.equal(evaluate("document.querySelector('.ambient-background').dataset.variant"), shape);
    const draws = evaluate(
      '(async()=>{window.__glassProbe.reset();await new Promise(r=>setTimeout(r,1000));return window.__glassProbe.read().draws;})()',
    );
    assert.ok(draws > 0 && draws < 65);
    offline.push({ shape, draws, offline: true });
  }
  evaluate(
    `window.__hiddenSamples=[];for(const ms of [1500,32000])setTimeout(()=>window.__hiddenSamples.push({hidden:document.hidden,...window.__glassProbe.read()}),ms)`,
  );
  const activeTab = run('tab', 'list').tabs.find(tab => tab.active).tabId;
  run('tab', 'new', 'about:blank');
  await new Promise(done => setTimeout(done, 33500));
  run('tab', activeTab);
  const hidden = evaluate('window.__hiddenSamples');
  assert.equal(hidden.length, 2);
  assert.ok(hidden.every(x => x.hidden));
  assert.equal(hidden[0].draws, hidden[1].draws);
  assert.equal(hidden[1].buffer, null);
  live();
  run('set', 'viewport', '390', '844');
  run('press', 'Control+,');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  assert.equal(evaluate('document.body.innerText.includes("Shader Gradient 形态")'), false);
  assert.equal(evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  run('screenshot', fromRoot(`artifacts/shader-review/settings-${version}.png`));
  const errors = run('errors').errors;
  assert.equal(errors.length, 0);
  const result = { version, random, fixed, offline, hidden, errors };
  await writeFile(
    fromRoot(`artifacts/shader-review/random-${version}.json`),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  close();
  await removeDir(profile);
}
