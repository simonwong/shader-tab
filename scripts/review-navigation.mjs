import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, fromRoot } from './lib/browser.mjs';
// Needs `pnpm dev` serving the preview on port 4317.
const output = fromRoot('artifacts/navigation-review');
const { run, evaluate, waitFor: wait, close } = browserSession('glass-navigation');
try {
  await mkdir(output, { recursive: true });
  run('open', 'http://localhost:4317/src/entrypoints/newtab/index.html');
  run('set', 'media', 'light', 'reduced-motion');
  run('set', 'viewport', '1440', '900');
  run('press', 'Tab');
  run('find', 'role', 'button', 'hover', '--name', '常用书签', '--exact');
  wait('document.querySelectorAll(".favorites-tray a").length===6');
  const favorites = evaluate(
    '[...document.querySelectorAll(".favorites-tray a")].map(a=>({title:a.title,url:a.href}))',
  );
  assert.equal(favorites[0].title, 'GitHub');
  assert.equal(favorites[0].url, 'https://github.com/');
  assert.equal(evaluate('document.querySelectorAll(".favorites-tray button").length'), 0);
  run('screenshot', resolve(output, 'favorites-desktop.png'));
  run('find', 'role', 'button', 'click', '--name', '设置', '--exact');
  wait('document.querySelector("[role=dialog]") !== null');
  assert.equal(evaluate('document.querySelectorAll(".pinned-row").length'), 6);
  run('press', 'Escape');
  wait('document.querySelector("[role=dialog]") === null');
  assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), '设置');
  run('find', 'role', 'button', 'hover', '--name', '全部书签', '--exact');
  wait(
    'document.querySelector(".bookmark-menu") !== null && document.querySelector(".favorites-tray") === null',
  );
  run('mouse', 'move', '40', '820');
  run('find', 'role', 'button', 'click', '--name', '设置', '--exact');
  wait('document.querySelector("[role=dialog]") !== null');
  run('press', 'Escape');
  wait('document.querySelector("[role=dialog]") === null');
  assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), '设置');
  const layouts = [];
  for (const width of [1440, 390, 320]) {
    run('set', 'viewport', String(width), '844');
    run('mouse', 'move', '160', '720');
    run('find', 'role', 'button', 'hover', '--name', '常用书签', '--exact');
    wait('document.querySelector(".favorites-tray") !== null');
    const layout = evaluate(
      `(()=>{const d=document.querySelector('.dock-zone:not(.settings-zone)').getBoundingClientRect(),s=document.querySelector('.settings-zone').getBoundingClientRect(),t=document.querySelector('.favorites-tray').getBoundingClientRect();return {width:innerWidth,center:d.left+d.width/2,settingsLeft:s.left,gap:d.left-s.right,trayLeft:t.left,trayRight:t.right,overflow:document.documentElement.scrollWidth>innerWidth};})()`,
    );
    assert.equal(layout.center, width / 2);
    assert.ok(layout.settingsLeft >= 16, JSON.stringify(layout));
    assert.ok(layout.gap >= 0);
    assert.ok(layout.trayLeft >= 0 && layout.trayRight <= width);
    assert.equal(layout.overflow, false);
    layouts.push(layout);
    if (width === 390) run('screenshot', resolve(output, 'favorites-narrow.png'));
  }
  run('press', 'Escape');
  wait('document.querySelector(".favorites-tray") === null');
  assert.equal(evaluate('document.activeElement.getAttribute("aria-label")'), '常用书签');
  run('press', 'Enter');
  wait('document.querySelector(".favorites-tray") !== null');
  // Opening the tray from the keyboard moves focus to the first favorite.
  assert.equal(evaluate('document.activeElement.title'), 'GitHub');
  run('reload');
  run('press', 'Tab');
  run('find', 'role', 'button', 'hover', '--name', '常用书签', '--exact');
  wait('document.querySelectorAll(".favorites-tray a").length===6');
  assert.deepEqual(
    evaluate(
      '[...document.querySelectorAll(".favorites-tray a")].map(a=>({title:a.title,url:a.href}))',
    ),
    favorites,
  );
  run('press', 'Escape');
  run('mouse', 'move', '120', '700');
  wait('document.querySelector(".favorites-tray") === null');
  // A dock button opens its panel only after the pointer rests on it for 140 ms.
  const hoverDelay = evaluate(
    `(async()=>{const b=document.querySelector('button[aria-label="常用书签"]');const send=t=>b.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerType:'mouse',relatedTarget:document.body}));const sleep=ms=>new Promise(r=>setTimeout(r,ms));const open=()=>document.querySelector('.favorites-tray')!==null;send('pointerover');await sleep(60);const early=open();send('pointerout');await sleep(300);const crossed=open();send('pointerover');await sleep(300);const rested=open();send('pointerout');return {early,crossed,rested};})()`,
  );
  assert.deepEqual(hoverDelay, { early: false, crossed: false, rested: true });
  wait('document.querySelector(".favorites-tray") === null');
  wait('document.querySelector(".source-zone").dataset.visible === "true"');
  const sources = {
    'grain-gradient': 'https://shaders.paper.design/grain-gradient',
    'shader-gradient': 'https://shadergradient.co/',
    dithering: 'https://shaders.paper.design/dithering',
    'fluted-glass': 'https://shaders.paper.design/fluted-glass',
    'pixel-blast': 'https://github.com/simonwong/shader-tab',
    // Arc variants each link their own page; the variant is picked from the shuffle bag.
    'data-pixel-arc': 'https://threeui.com/backgrounds/predictive-arc/',
    'mesh-gradient': 'https://shaders.paper.design/mesh-gradient',
    warp: 'https://shaders.paper.design/warp',
    'simplex-noise': 'https://shaders.paper.design/simplex-noise',
    'perlin-noise': 'https://shaders.paper.design/perlin-noise',
    'neuro-noise': 'https://shaders.paper.design/neuro-noise',
    'dot-orbit': 'https://shaders.paper.design/dot-orbit',
    'smoke-ring': 'https://shaders.paper.design/smoke-ring',
    'god-rays': 'https://shaders.paper.design/god-rays',
    water: 'https://shaders.paper.design/water',
  };
  for (const [id, url] of Object.entries(sources)) {
    evaluate(
      `(()=>{for(const [key,value] of Object.entries({activeEffect:'${id}',shuffle:false}))localStorage.setItem('glass-tab-preview:preference:v1:'+key,JSON.stringify(value));dispatchEvent(new StorageEvent('storage',{key:'glass-tab-preview:preference:v1:activeEffect'}));})()`,
    );
    wait(`document.querySelector('main').dataset.effect==='${id}'`);
    assert.ok(evaluate('document.querySelector(".effect-source").href').startsWith(url));
  }
  assert.match(evaluate('document.querySelector(".effect-source").textContent'), /^ThreeUI · /);
  run('mouse', 'move', '120', '400');
  const sourceLayout = evaluate(
    `(()=>{const a=document.querySelector('.effect-source'),r=a.getBoundingClientRect(),d=document.querySelector('.dock-zone:not(.settings-zone)').getBoundingClientRect();return {right:innerWidth-r.right,bottom:innerHeight-r.bottom,separate:r.left>=d.right||r.top>=d.bottom,target:a.target,rel:a.rel};})()`,
  );
  assert.ok(sourceLayout.right >= 16 && sourceLayout.separate, JSON.stringify(sourceLayout));
  assert.equal(sourceLayout.target, '_blank');
  assert.ok(sourceLayout.rel.includes('noopener'));
  run('mouse', 'move', '120', '400');
  run('mouse', 'down');
  run('mouse', 'up');
  run('reload');
  wait('document.querySelector(".effect-source") !== null');
  run('mouse', 'move', '150', '450');
  wait('document.querySelector(".source-zone").dataset.visible === "true"');
  wait('document.querySelector(".source-zone").dataset.visible === "false"');
  assert.equal(
    evaluate('getComputedStyle(document.querySelector(".effect-source")).pointerEvents'),
    'none',
  );
  // Mouse movement in the upper part of the page (towards the tab strip) leaves the controls asleep.
  run('mouse', 'move', '150', '100');
  run('mouse', 'move', '200', '300');
  run('wait', '800');
  assert.equal(evaluate('document.querySelector(".source-zone").dataset.visible'), 'false');
  run('set', 'viewport', '1440', '900');
  run('mouse', 'move', '100', '800');
  wait('document.querySelector(".source-zone").dataset.visible === "true"');
  run('screenshot', resolve(output, 'navigation-and-source.png'));
  const errors = run('errors').errors;
  assert.equal(errors.length, 0);
  await writeFile(
    resolve(output, 'checks.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        favorites,
        layouts,
        editFocusRestored: true,
        settingsFocusRestored: true,
        keyboard: true,
        persisted: true,
        sourceLayout,
        sources,
        sourceAutoHides: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'Navigation passed: centered favorites and bookmarks, separate left settings, tray, edit, focus, keyboard, reload and narrow layout.',
  );
} finally {
  close();
}
