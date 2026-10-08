import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { browserSessionAsync, fromRoot, removeDir, tempDir } from './lib/browser.mjs';

const temporary = await tempDir('glass-favicon-api');
const results = [];
try {
  for (const permission of [true, false]) {
    const { run, close } = browserSessionAsync(`glass-favicon-api-${permission}`);
    const extension = join(temporary, `extension-${permission}`);
    await mkdir(extension);
    await writeFile(
      join(extension, 'manifest.json'),
      JSON.stringify({
        manifest_version: 3,
        name: 'Favicon API fixture',
        version: '1.0',
        permissions: permission ? ['favicon'] : [],
        chrome_url_overrides: { newtab: 'newtab.html' },
      }),
    );
    await writeFile(
      join(extension, 'newtab.html'),
      '<!doctype html><title>Favicon API fixture</title><h1>Favicon API fixture</h1>',
    );
    try {
      await run(
        '--profile',
        join(temporary, `profile-${permission}`),
        '--extension',
        extension,
        'open',
        'chrome://newtab',
      );
      const report = (
        await run(
          'eval',
          `(async()=>{
        const samples=[];
        for(const query of ['pageUrl=https%3A%2F%2Ffavicon-fixture.invalid%2F&size=32','pageUrl=https%3A%2F%2Ffavicon-fixture.invalid%2F&size=32&fallbackToHost=1','size=32']) {
          const url=chrome.runtime.getURL('/_favicon/?'+query);
          const result=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve({loaded:true,width:image.naturalWidth});image.onerror=()=>resolve({loaded:false,width:0});image.src=url;});
          samples.push({query,...result});
        }
        return {browser:navigator.userAgent,granted:await chrome.permissions.contains({permissions:['favicon']}),samples};
      })()`,
        )
      ).result;
      assert.equal(report.granted, permission);
      assert.deepEqual(
        report.samples.map(sample => sample.loaded),
        [permission, permission, false],
      );
      report.console = (await run('console')).messages;
      results.push(report);
    } finally {
      await close();
    }
  }
  await mkdir(fromRoot('artifacts/favicon-review'), { recursive: true });
  await writeFile(
    fromRoot('artifacts/favicon-review/api-diagnosis.json'),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await removeDir(temporary);
}
