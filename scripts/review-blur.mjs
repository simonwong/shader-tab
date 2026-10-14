import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { browserSession, fromRoot, removeDir, tempDir } from './lib/browser.mjs';
const root = fromRoot('.'),
  profile = await tempDir('glass-blur');
const { run, evaluate: ev, waitFor: wait, close } = browserSession('glass-blur');
await mkdir(root + '/artifacts/opacity-review', { recursive: true });
try {
  run('--profile', profile, '--extension', root + '/.output/chrome-mv3', 'open', 'chrome://newtab');
  run('set', 'viewport', '600', '300', '2');
  ev(
    "chrome.storage.local.set({'preference:v1:appearance':'day','preference:v1:shuffle':false,'preference:v1:activeEffect':'dithering','preference:v1:idleDelay':1000})",
  );
  wait("document.querySelector('.ambient-background').dataset.renderer==='live'");
  ev(
    "const style=document.createElement('style');style.textContent='.ambient-background {background:repeating-conic-gradient(#403e3c 0% 25%,#eee9df 0% 50%) 0 0 / 12px 12px !important} .effect-layer {display:none}';document.head.append(style);window.__wake=setInterval(()=>window.dispatchEvent(new PointerEvent('pointermove',{clientX:300,clientY:innerHeight-60,pointerType:'mouse'})),200)",
  );
  wait("document.querySelector('.dock-zone').dataset.visible==='true'");
  const results = [];
  for (const theme of ['day', 'night']) {
    ev(`chrome.storage.local.set({'preference:v1:appearance':'${theme}'})`);
    wait(`document.documentElement.dataset.theme==='${theme}'`);
    const state = ev(
      "[...document.querySelectorAll('.dock.glass,.source-glass')].map(e=>({source:e.classList.contains('source-glass'),filter:getComputedStyle(e).backdropFilter,background:getComputedStyle(e).backgroundColor}))",
    );
    console.log(
      theme,
      state,
      ev(
        "({reduce:matchMedia('(prefers-reduced-transparency: reduce)').matches,visible:document.querySelector('.dock-zone').dataset.visible})",
      ),
    );
    // Dock glass keeps its blur (liquid glass adds an SVG map on top); the resting source pill has none.
    for (const item of state) {
      if (item.source) assert.equal(item.filter, 'none');
      else assert.ok(item.filter.includes('blur('), item.filter);
    }
    results.push({ theme, state });
    ev('new Promise(r=>setTimeout(r,750))');
    for (const [name, background] of [
      ['fine-checker', 'repeating-conic-gradient(#403e3c 0% 25%,#eee9df 0% 50%) 0 0 / 12px 12px'],
      [
        'color-bands',
        'repeating-linear-gradient(120deg,#2563eb 0px 28px,#25c7c3 28px 56px,#ac68eb 56px 84px)',
      ],
    ]) {
      ev(
        `document.querySelector('.ambient-background').style.setProperty('background',${JSON.stringify(background)},'important')`,
      );
      run('screenshot', root + `/artifacts/opacity-review/light-blur-${name}-${theme}.png`);
    }
    ev(
      "document.querySelector('.effect-layer').style.setProperty('display','block','important');document.querySelector('.ambient-background').style.removeProperty('background')",
    );
    run('screenshot', root + `/artifacts/opacity-review/light-blur-live-${theme}.png`);
    ev("document.querySelector('.effect-layer').style.removeProperty('display')");
  }
  ev('clearInterval(window.__wake)');
  wait("document.querySelector('.dock-zone').dataset.visible==='false'");
  assert.ok(
    ev("getComputedStyle(document.querySelector('.dock')).backdropFilter.includes('blur(3px)')"),
  );
  wait("getComputedStyle(document.querySelector('.dock-zone')).visibility==='hidden'");
  run('press', 'Tab');
  wait("getComputedStyle(document.querySelector('.dock-zone')).visibility==='visible'");
  const errors = run('errors').errors;
  assert.deepEqual(errors, []);
  await writeFile(
    root + '/artifacts/opacity-review/checks.json',
    JSON.stringify({ results, fadePreservesBlur: true, keyboardWake: true, errors }, null, 2),
  );
  console.log('Day/night blur, fade and keyboard wake passed.');
} finally {
  close();
  await removeDir(profile);
}
