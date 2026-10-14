import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, fromRoot } from './lib/browser.mjs';
// Needs `pnpm dev` serving the preview on port 4317.
const output = fromRoot('artifacts/settings-review');
const { run, evaluate, waitFor: wait, close: closeBrowser } = browserSession('glass-settings');
const click = (role, name) => run('find', 'role', role, 'click', '--name', name, '--exact');
const preference = values =>
  evaluate(
    `(()=>{for(const [key,value]of Object.entries(${JSON.stringify(values)}))localStorage.setItem('glass-tab-preview:preference:v1:'+key,JSON.stringify(value));dispatchEvent(new StorageEvent('storage',{key:'glass-tab-preview:preference:v1:activeEffect'}));})()`,
  );
const revealed = selector =>
  `document.querySelector('${selector}')?.getBoundingClientRect().width > 20`;
const settings = () => {
  run('press', 'Control+,');
  wait('document.querySelector("[role=dialog]") !== null');
};
const close = () => {
  run('press', 'Escape');
  wait('document.querySelector("[role=dialog]") === null');
};
try {
  await mkdir(output, { recursive: true });
  run(
    'open',
    '--init-script',
    fromRoot('scripts/shader-probe.js'),
    'http://localhost:4317/src/entrypoints/newtab/index.html',
  );
  run('set', 'viewport', '1440', '900', '2');
  preference({
    appearance: 'day',
    shuffle: false,
    activeEffect: 'pixel-blast',
    showFavorites: true,
    showBookmarks: true,
    motion: 'soft',
    hiddenVariants: [],
    pinnedVariant: null,
  });
  wait(
    'document.querySelector("main").dataset.effect === "pixel-blast" && document.querySelector(".ambient-background").dataset.renderer === "live" && document.querySelector(".ambient-background").dataset.transitioning === "false"',
  );
  const timing = evaluate(
    `(async()=>{const a=window.__shaderProbe.uniforms.uTime,start=performance.now();await new Promise(r=>setTimeout(r,3000));return {wall:(performance.now()-start)/1000,shader:window.__shaderProbe.uniforms.uTime-a};})()`,
  );
  // The shared breathing clock runs between 0.08 and 0.16 shader seconds per second.
  assert.ok(
    timing.shader / timing.wall > 0.07 && timing.shader / timing.wall < 0.17,
    JSON.stringify(timing),
  );
  run('mouse', 'move', '700', '760');
  wait('document.querySelector(".source-glass").classList.contains("liquid-glass")');
  const controls = evaluate(
    `(()=>{const buttons=[...document.querySelectorAll('.dock-button')].map(b=>({name:b.getAttribute('aria-label'),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}));return {buttons};})()`,
  );
  assert.ok(controls.buttons.every(b => b.width === 34 && b.height === 34));
  const sourcePill = () =>
    evaluate(
      `(()=>{const a=document.querySelector('.effect-source');return {opacity:+getComputedStyle(a).opacity,filter:getComputedStyle(a.parentElement).backdropFilter,variant:getComputedStyle(document.querySelector('.source-variant')).display};})()`,
    );
  // At rest the source pill is faint text: no glass and no variant name.
  run('wait', '400');
  const resting = sourcePill();
  assert.ok(resting.opacity < 0.7, JSON.stringify(resting));
  assert.equal(resting.filter, 'none');
  assert.equal(resting.variant, 'none');
  run('screenshot', resolve(output, 'controls-day.png'));
  run('hover', '.effect-source');
  run('wait', '400');
  const hovered = sourcePill();
  assert.ok(hovered.opacity >= 0.8, JSON.stringify(hovered));
  assert.ok(hovered.filter.includes('blur'));
  assert.notEqual(hovered.variant, 'none');
  run('screenshot', resolve(output, 'controls-source-hover.png'));
  // Pin, unpin and hide from the pill. Pinning and unpinning keep the background on screen.
  const shown = () => evaluate('document.querySelector(".ambient-background").dataset.variant');
  const stored = key =>
    evaluate(`JSON.parse(localStorage.getItem('glass-tab-preview:preference:v1:${key}'))`);
  const first = shown();
  run('click', '.source-pin');
  wait(
    `document.querySelector('.source-pin').ariaPressed === 'true' && !document.querySelector('.source-shuffle') && !document.querySelector('.source-hide')`,
  );
  assert.equal(stored('pinnedVariant'), `pixel-blast/${first}`);
  run('click', '.source-pin');
  wait(
    `document.querySelector('.source-pin').ariaPressed === 'false' && ${revealed('.source-hide')}`,
  );
  assert.equal(stored('pinnedVariant'), null);
  assert.equal(shown(), first);
  run('click', '.source-hide');
  wait(
    `document.querySelector('.ambient-background').dataset.variant !== ${JSON.stringify(first)} && document.querySelector('.ambient-background').dataset.transitioning === 'false'`,
  );
  assert.deepEqual(stored('hiddenVariants'), [`pixel-blast/${first}`]);
  run('mouse', 'move', '700', '760');
  settings();
  // Motion level and restoring hidden variants sit under the background cards.
  const idle = `[...document.querySelectorAll('.background-settings button')].every(b => !b.disabled)`;
  click('button', '静');
  wait(
    `JSON.parse(localStorage.getItem('glass-tab-preview:preference:v1:motion')) === 'still' && ${idle}`,
  );
  click('button', '全部恢复');
  wait(
    `JSON.parse(localStorage.getItem('glass-tab-preview:preference:v1:hiddenVariants')).length === 0 && ${idle}`,
  );
  click('button', '柔');
  wait(
    `JSON.parse(localStorage.getItem('glass-tab-preview:preference:v1:motion')) === 'soft' && ${idle}`,
  );
  assert.ok(evaluate('document.querySelectorAll(".picker-folder").length') >= 5);
  assert.equal(evaluate('document.querySelectorAll(".candidate-list").length'), 0);
  evaluate('window.__backgroundBefore=document.querySelector(".ambient-background canvas")');
  run('find', 'role', 'radio', 'hover', '--name', 'Predictive Arc,');
  assert.equal(evaluate('document.querySelector("main").dataset.effect'), 'pixel-blast');
  run('focus', 'button[aria-label^="Dithering,"]');
  assert.equal(
    evaluate('document.querySelector(".ambient-background canvas")===window.__backgroundBefore'),
    true,
  );
  assert.equal(
    evaluate(
      'document.querySelectorAll(".picker-bookmark button[aria-label=\\"添加 GitHub · Pull requests\\"]").length',
    ),
    0,
  );
  run('find', 'text', '工作', 'click', '--exact');
  wait('document.querySelector("button[aria-label=\\"添加 GitHub · Pull requests\\"]") !== null');
  click('button', '添加 GitHub · Pull requests');
  wait('document.querySelectorAll(".pinned-row").length===7');
  assert.equal(
    evaluate(
      'document.querySelector("button[aria-label=\\"已添加 GitHub · Pull requests\\"]").disabled',
    ),
    true,
  );
  run('find', 'role', 'searchbox', 'fill', '--name', '搜索 Chrome 书签', 'Confluence');
  wait('document.querySelector("button[aria-label=\\"添加 Confluence\\"]") !== null');
  const searchPath = evaluate(
    `[...document.querySelectorAll('.picker-folder .truncate')].map(e=>e.textContent)`,
  );
  assert.deepEqual(searchPath, ['书签栏', '工作', '团队文档']);
  click('button', '添加 Confluence');
  wait('document.querySelectorAll(".pinned-row").length===8');
  run('find', 'role', 'searchbox', 'fill', '--name', '搜索 Chrome 书签', '');
  run('screenshot', resolve(output, 'settings-tree-day.png'));
  click('switch', '显示常用书签');
  close();
  assert.equal(
    evaluate('document.querySelectorAll("button[aria-label=\\"常用书签\\"]").length'),
    0,
  );
  assert.equal(
    evaluate('document.querySelectorAll("button[aria-label=\\"全部书签\\"]").length'),
    1,
  );
  settings();
  click('switch', '显示系统书签');
  close();
  assert.equal(evaluate('document.querySelectorAll("[aria-label=\\"书签导航\\"]").length'), 0);
  assert.equal(evaluate('document.querySelectorAll("button[aria-label=\\"设置\\"]").length'), 1);
  run('reload');
  wait('document.querySelector("button[aria-label=\\"设置\\"]") !== null');
  wait('document.querySelectorAll("[aria-label=\\"书签导航\\"]").length===0');
  settings();
  assert.equal(evaluate('document.querySelectorAll(".pinned-row").length'), 8);
  assert.equal(
    evaluate(
      'document.querySelector("[aria-label=\\"显示常用书签\\"]").getAttribute("aria-checked")',
    ),
    'false',
  );
  assert.equal(
    evaluate(
      'document.querySelector("[aria-label=\\"显示系统书签\\"]").getAttribute("aria-checked")',
    ),
    'false',
  );
  click('switch', '显示常用书签');
  close();
  assert.equal(
    evaluate('document.querySelectorAll("button[aria-label=\\"常用书签\\"]").length'),
    1,
  );
  assert.equal(
    evaluate('document.querySelectorAll("button[aria-label=\\"全部书签\\"]").length'),
    0,
  );
  settings();
  click('switch', '显示系统书签');
  click('button', '黑夜');
  wait('document.documentElement.dataset.theme === "night"');
  run('screenshot', resolve(output, 'settings-tree-night.png'));
  close();
  run('mouse', 'move', '700', '760');
  run('screenshot', resolve(output, 'controls-night.png'));
  const narrow = [];
  for (const width of [390, 320]) {
    run('set', 'viewport', String(width), '844');
    run('mouse', 'move', '160', '600');
    const layout = evaluate(
      `(()=>{const d=document.querySelector('[aria-label="书签导航"]').getBoundingClientRect(),s=document.querySelector('.settings-zone').getBoundingClientRect(),r=document.querySelector('.source-zone').getBoundingClientRect();return {width:innerWidth,center:d.left+d.width/2,settingsGap:d.left-s.right,sourceSeparated:r.top>=d.bottom||r.left>=d.right,overflow:document.documentElement.scrollWidth>innerWidth};})()`,
    );
    assert.equal(layout.center, width / 2);
    assert.ok(layout.settingsGap >= 0);
    assert.ok(layout.sourceSeparated);
    assert.equal(layout.overflow, false);
    narrow.push(layout);
    settings();
    assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'), false);
    if (width === 390) run('screenshot', resolve(output, 'settings-narrow.png'));
    close();
  }
  run('set', 'media', 'light', 'reduced-motion');
  wait('document.querySelectorAll(".ambient-background canvas").length===0');
  run('mouse', 'move', '100', '500');
  assert.equal(
    evaluate('getComputedStyle(document.querySelector(".dock-button")).transitionDuration'),
    '0s',
  );
  const errors = run('errors').errors;
  assert.equal(errors.length, 0);
  await writeFile(
    resolve(output, 'checks.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        timing,
        controls,
        searchPath,
        narrow,
        treeAdd: true,
        noHoverPreview: true,
        visibilityPersisted: true,
        favoritesPreserved: true,
        reducedMotion: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'Settings passed: smaller glass controls, slower motion, pill pin/hide, motion levels, no hover preview, nested bookmark search/add, independent persisted visibility and narrow layout.',
  );
} finally {
  closeBrowser();
}
