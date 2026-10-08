import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, fromRoot, removeDir, tempDir } from './lib/browser.mjs';
const profile = await tempDir('shader-brand');
const output = fromRoot('artifacts/brand-review');
const { run, evaluate, close } = browserSession('shader-brand');
const { version } = JSON.parse(await readFile(fromRoot('package.json'), 'utf8'));
try {
  await mkdir(output, { recursive: true });
  run(
    '--profile',
    profile,
    '--extension',
    fromRoot('.output/chrome-mv3'),
    'open',
    'chrome://newtab',
  );
  run('wait', '--fn', "document.querySelector('main')?.dataset.mode==='extension'");
  run('set', 'offline', 'on');
  const manifest = evaluate('chrome.runtime.getManifest()');
  const base = evaluate('chrome.runtime.getURL("")');
  assert.equal(manifest.version, version);
  const icons = evaluate(
    `Promise.all(Object.entries(chrome.runtime.getManifest().icons).map(async([size,path])=>{const image=new Image();image.src=chrome.runtime.getURL(path);await image.decode();const c=document.createElement('canvas');c.width=c.height=Number(size);const x=c.getContext('2d');x.drawImage(image,0,0);return {size:Number(size),width:image.naturalWidth,height:image.naturalHeight,cornerAlpha:x.getImageData(0,0,1,1).data[3]};}))`,
  );
  assert.equal(icons.length, 4);
  assert.ok(icons.every(i => i.width === i.size && i.height === i.size && i.cornerAlpha === 0));
  const pages = [];
  for (const page of ['newtab.html', 'privacy.html', 'licenses.html']) {
    if (page !== 'newtab.html') run('open', base + page);
    run('wait', '--fn', "document.querySelectorAll('link[rel=icon]').length===2");
    const favicons = evaluate(
      "[...document.querySelectorAll('link[rel=icon]')].map(l=>({href:l.href,size:l.sizes.value}))",
    );
    assert.deepEqual(
      favicons.map(i => i.size),
      ['16x16', '32x32'],
    );
    assert.ok(favicons.every(i => i.href.startsWith(base + 'icon/')));
    pages.push({ page, favicons });
  }
  run('open', 'chrome://extensions');
  run(
    'wait',
    '--fn',
    "document.querySelector('extensions-manager')?.shadowRoot?.querySelector('extensions-item-list')?.shadowRoot?.querySelector('extensions-item')!==null",
  );
  const management = evaluate(
    `(()=>{const manager=document.querySelector('extensions-manager');const list=manager.shadowRoot.querySelector('extensions-item-list');const items=[...list.shadowRoot.querySelectorAll('extensions-item')];const item=items.find(el=>el.shadowRoot.textContent.includes('Shader Tab'));return {found:!!item,images:item?[...item.shadowRoot.querySelectorAll('img')].map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0})):[]};})()`,
  );
  assert.equal(management.found, true);
  assert.ok(management.images.some(i => i.loaded));
  run('set', 'viewport', '1100', '800');
  run('screenshot', resolve(output, 'extension-management.png'));
  await writeFile(
    resolve(output, 'checks.json'),
    JSON.stringify({ version: manifest.version, icons, pages, management }, null, 2),
  );
  console.log(
    'Manifest icon sizes, transparent PNG decoding, three page favicons and extension management icon passed.',
  );
} finally {
  close();
  await removeDir(profile);
}
