import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const execute = promisify(execFile);
const profile = await mkdtemp('/private/tmp/glass-tab-favicon-');
const session = `glass-favicons-${process.pid}`;
const output = resolve('artifacts/favicon-review');
const requests = [];
const server = createServer((request, response) => {
  requests.push(request.url);
  if (request.url === '/favicon.png') {
    response.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
    response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAZUlEQVR4nGMUz7/9n2EAAdNAWj7qgNEQGA0BEGAhNru8mKBCVjaTKLgzmg2HSRogNW6HTAgwjXgHsJAbAoTKBWLTCNOIjwKmgQ4BFnI1jpYDwyYNMI14BzCO9owYRhPhAIMBjwIAZ64Nz7J1aYUAAAAASUVORK5CYII=', 'base64'));
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><title>Cached icon fixture</title><link rel="icon" type="image/png" sizes="32x32" href="/favicon.png"><h1>Cached icon fixture</h1>');
  }
});
const run = async (...args) => {
  const { stdout } = await execute('agent-browser', ['--session', session, '--json', ...args], { timeout: 60_000 });
  const result = JSON.parse(stdout);
  if (!result.success) throw new Error(JSON.stringify(result.error));
  return result.data;
};
const evaluate = async code => (await run('eval', code)).result;
let folder;
let extensionUrl;
try {
  await mkdir(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const page = `http://127.0.0.1:${server.address().port}/cached`;
  await run('--profile', profile, '--extension', resolve('.output/chrome-mv3'), 'open', page);
  await run('wait', '--text', 'Cached icon fixture');
  const deadline = Date.now() + 10_000;
  while (!requests.includes('/favicon.png') && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(requests.includes('/favicon.png'));
  await run('tab', 'new', 'chrome://newtab');
  extensionUrl = await evaluate('location.href');
  folder = await evaluate(`(async()=>{
    const folder=await chrome.bookmarks.create({parentId:'1',title:'Glass Tab favicon fixture'});
    const ids=[];
    for(const [title,url] of ${JSON.stringify([['缓存图标', page], ['同站新路径', page + '/unvisited'], ['无缓存图标', 'https://glass-tab-no-icon.invalid/']])}) ids.push((await chrome.bookmarks.create({parentId:folder.id,title,url})).id);
    await chrome.storage.local.set({'favorites:v2':ids,'preference:v1:appearance':'day','preference:v1:activeEffect':'grain-gradient','preference:v1:shuffle':false});
    return folder.id;
  })()`);
  await run('set', 'viewport', '1440', '900', '2');
  await run('tab', 'new', 'chrome://newtab');
  await run('wait', '--fn', 'document.querySelector(".ambient-background")?.dataset.renderer === "live"');
  await run('wait', '--fn', 'performance.getEntriesByType("paint").length > 0');
  assert.equal(await evaluate('document.querySelectorAll(".site-mark img").length'), 0);
  const before = requests.length;
  const cached = `async()=>{const url=new URL(chrome.runtime.getURL('/_favicon/'));url.searchParams.set('pageUrl',${JSON.stringify(page)});url.searchParams.set('size','32');const image=new Image();image.src=url.href;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const context=canvas.getContext('2d');context.drawImage(image,0,0,32,32);return context.getImageData(5,16,1,1).data[0]===23;}`;
  await run('wait', '--fn', `(${cached})()`);
  await new Promise(resolve => server.close(resolve));
  await run('press', 'Tab');
  await run('find','role','button','hover','--name','常用书签','--exact');
  await run('wait','--fn','document.querySelectorAll(".favorites-tray .site-mark[data-favicon=true]").length === 3');
  const trayIcons = await evaluate(`Array.from(document.querySelectorAll('.favorites-tray .site-mark img'),img=>({src:img.src,width:img.naturalWidth,opacity:getComputedStyle(img).opacity}))`);
  assert.ok(trayIcons.every(icon=>icon.width>0&&icon.opacity==='1'));
  await run('screenshot', resolve(output, 'favorite-tray-icons.png'));
  await run('press','Escape');
  await run('press', 'Control+,');
  await run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  await run('wait', '--fn', 'document.querySelectorAll(".site-mark[data-favicon=true]").length === 3');
  const icons = await evaluate(`Array.from(document.querySelectorAll('.site-mark img'),img=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
    const context=canvas.getContext('2d');context.drawImage(img,0,0,32,32);
    return {src:img.src,width:img.naturalWidth,pixel:Array.from(context.getImageData(5,16,1,1).data)};
  })`);
  assert.deepEqual(icons[0].pixel, [23,111,219,255]);
  const hostFallback = icons[1].pixel.join(',') === icons[0].pixel.join(',');
  assert.notDeepEqual(icons[2].pixel, icons[0].pixel);
  assert.ok(icons.every(icon => icon.src.startsWith(new URL('_favicon/', extensionUrl).href)));
  assert.equal(requests.length, before);
  await run('screenshot', resolve(output, 'cached-icons.png'));
  await run('press', 'Escape');
  const retina = await evaluate('({dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],buffer:[document.querySelector("canvas").width,document.querySelector("canvas").height]})');
  assert.equal(retina.dpr, 2);
  assert.ok(retina.buffer[0] > 1440 && retina.buffer[0] <= 2560);
  assert.ok(retina.buffer[0] * retina.buffer[1] <= 4_000_000);
  await run('set', 'viewport', '390', '844', '2');
  await run('wait', '--fn', 'document.querySelector("canvas").width === 780');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await run('screenshot', resolve(output, 'retina-narrow.png'));
  const errors = (await run('errors')).errors;
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'checks.json'), JSON.stringify({ date: new Date().toISOString(), entry: 'chrome://newtab', icons, trayIcons, retina, fixtureRequests: requests, offlineCache: true, hostFallback, missingCacheDefault: true, narrowOverflow: false, errors }, null, 2));
  console.log(`Favicon checks passed: local cache offline, missing cache default, lazy UI, Retina resolution, narrow layout. Same-host fallback observed: ${hostFallback}.`);
} catch (error) {
  try {
    console.log(await evaluate('({visibility:document.visibilityState,html:document.querySelector(".favorites-tray")?.outerHTML,renderer:document.querySelector(".ambient-background")?.dataset.renderer})'));
    console.log(await run('errors'));
    await run('screenshot', resolve(output, 'failure.png'));
  } catch {}
  throw error;
} finally {
  server.close();
  try { await run('close'); await rm(profile, { recursive: true, force: true }); } catch {}
}
