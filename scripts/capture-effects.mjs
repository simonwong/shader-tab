import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { browserSession, fromRoot } from './lib/browser.mjs';

// Usage: node scripts/capture-effects.mjs [effect id ...]  (needs `pnpm dev` on port 4317)
const ids = [
  'grain-gradient',
  'dithering',
  'pixel-blast',
  'data-pixel-arc',
  'crt-terminal',
  'shader-gradient',
];
const names = [
  'Grain Gradient',
  'Dithering',
  'Pixel Field',
  'Data Pixel Arc',
  'CRT Terminal',
  'Shader Gradient',
];
const requested = process.argv.slice(2);
const captureIds = requested.length ? ids.filter(id => requested.includes(id)) : ids;
const output = fromRoot('artifacts/effects');
mkdirSync(output, { recursive: true });
const { run: browser, close } = browserSession('glass-effects');
try {
  browser(
    'open',
    '--init-script',
    fromRoot('scripts/shader-probe.js'),
    'http://127.0.0.1:4317/src/entrypoints/newtab/index.html',
  );
  browser('set', 'viewport', '1440', '900');
  browser(
    'eval',
    `localStorage.setItem('glass-tab-preview:effect-variant:shuffle:v1:crt-terminal', JSON.stringify({ remaining: ['terminal'] }))`,
  );
  browser(
    'eval',
    `localStorage.setItem('glass-tab-preview:effect-variant:shuffle:v1:shader-gradient', JSON.stringify({ remaining: ['plane'] }))`,
  );
  browser('reload');
  browser(
    'wait',
    '--fn',
    "document.querySelector('.ambient-background')?.dataset.renderer === 'live'",
  );
  browser(
    'eval',
    "(() => { const style=document.createElement('style'); style.textContent='main > :not(.ambient-background) { visibility: hidden !important; }'; document.head.append(style); })()",
  );
  for (const [shape, width, height] of [
    ['wide', 2560, 1600],
    ['tall', 780, 1688],
  ]) {
    browser('set', 'viewport', String(width), String(height));
    for (const theme of ['day', 'night'])
      for (const id of captureIds) {
        browser(
          'eval',
          `(async () => {
      window.__shaderProbe.crtTextReady = false;
      for (const [key, value] of Object.entries({ appearance: '${theme}', activeEffect: '${id}', shuffle: false })) localStorage.setItem('glass-tab-preview:preference:v1:' + key, JSON.stringify(value));
      dispatchEvent(new StorageEvent('storage', { key: 'glass-tab-preview:preference:v1:activeEffect' }));
      await new Promise(resolve => setTimeout(resolve, 5000));
      if (document.documentElement.dataset.theme !== '${theme}' || document.querySelector('main').dataset.effect !== '${id}' || document.querySelector('.ambient-background').dataset.renderer !== 'live') throw new Error('Effect not ready: ${id} ${theme}');
      return true;
    })()`,
        );
        browser(
          'wait',
          '--fn',
          "document.querySelector('.ambient-background').dataset.transitioning === 'false'",
        );
        if (id === 'crt-terminal') browser('wait', '--fn', 'window.__shaderProbe.crtTextReady');
        browser(
          'screenshot',
          resolve(output, `${id}-${theme}${shape === 'tall' ? '-tall' : ''}.png`),
        );
        console.log(`${id} ${theme} ${shape}: framework rendered`);
      }
  }
  writeFileSync(
    resolve(output, 'index.html'),
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Glass Tab · 6 组日夜背景</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#17181b;color:#eee;font:14px system-ui}h1{font-size:20px;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}figure{margin:0}img{width:100%;aspect-ratio:1.6;display:block;border-radius:12px}figcaption{padding:8px 0;color:#ccc}</style><h1>Glass Tab · 6 组背景 / 白天与黑夜</h1><div class="grid">${['day', 'night'].flatMap(theme => ids.map((id, i) => `<figure><img src="${id}-${theme}.png" alt="${names[i]} ${theme}"><figcaption>${names[i]} · ${id} / ${theme === 'day' ? '白天' : '黑夜'}</figcaption></figure>`)).join('')}</div></html>`,
  );
} finally {
  close();
}
