import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const execute = promisify(execFile);
const temporary = await mkdtemp('/private/tmp/glass-favicon-api-');
const results = [];
try {
  for (const permission of [true, false]) {
    const session = `glass-favicon-api-${process.pid}-${permission}`;
    const extension = join(temporary, `extension-${permission}`);
    await mkdir(extension);
    await writeFile(join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Favicon API fixture', version: '1.0', permissions: permission ? ['favicon'] : [], chrome_url_overrides: { newtab: 'newtab.html' } }));
    await writeFile(join(extension, 'newtab.html'), '<!doctype html><title>Favicon API fixture</title><h1>Favicon API fixture</h1>');
    const run = async (...args) => {
      const { stdout } = await execute('agent-browser', ['--session', session, '--json', ...args], { timeout: 60_000 });
      const result = JSON.parse(stdout);
      if (!result.success) throw new Error(JSON.stringify(result.error));
      return result.data;
    };
    try {
      await run('--profile', join(temporary, `profile-${permission}`), '--extension', extension, 'open', 'chrome://newtab');
      const report = (await run('eval', `(async()=>{
        const samples=[];
        for(const query of ['pageUrl=https%3A%2F%2Ffavicon-fixture.invalid%2F&size=32','pageUrl=https%3A%2F%2Ffavicon-fixture.invalid%2F&size=32&fallbackToHost=1','size=32']) {
          const url=chrome.runtime.getURL('/_favicon/?'+query);
          const result=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve({loaded:true,width:image.naturalWidth});image.onerror=()=>resolve({loaded:false,width:0});image.src=url;});
          samples.push({query,...result});
        }
        return {browser:navigator.userAgent,granted:await chrome.permissions.contains({permissions:['favicon']}),samples};
      })()`)).result;
      assert.equal(report.granted, permission);
      assert.deepEqual(report.samples.map(sample => sample.loaded), [permission, permission, false]);
      report.console = (await run('console')).messages;
      results.push(report);
    } finally { await run('close').catch(() => {}); }
  }
  await mkdir(resolve('artifacts/favicon-review'), { recursive: true });
  await writeFile(resolve('artifacts/favicon-review/api-diagnosis.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await rm(temporary, { recursive: true, force: true }); }
