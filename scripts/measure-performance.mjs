import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { browserSession, removeDir, root, tempDir } from './lib/browser.mjs';
// Usage: node scripts/measure-performance.mjs [output name, default "latest"]
const outputName = process.argv[2] ?? 'latest';
const COLD_LOADS = 5;
const median = values => {
  const sorted = values.filter(value => value !== null).toSorted((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const fcp = entry =>
  entry.paints.find(paint => paint.name === 'first-contentful-paint')?.start ?? null;
const profile = await tempDir('glass-tab-performance');
const { run, evaluate, close } = browserSession('glass-performance');
const sample = ms =>
  evaluate(
    `(async()=>{window.__glassProbe.reset();await new Promise(r=>setTimeout(r,${ms}));return {...window.__glassProbe.read(),hidden:document.hidden}})()`,
  );
let extensionUrl;
try {
  run(
    '--profile',
    profile,
    '--extension',
    `${root}.output/chrome-mv3`,
    'open',
    '--init-script',
    `${root}scripts/performance-probe.js`,
    'about:blank',
  );
  run('set', 'viewport', '1440', '900', '2');
  run('open', 'chrome://newtab');
  extensionUrl = evaluate('location.href');
  evaluate(`(async()=>{
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
  const navigationPreferences = evaluate(
    "chrome.storage.local.get(['preference:v1:showFavorites','preference:v1:showBookmarks'])",
  );
  assert.deepEqual(navigationPreferences, {
    'preference:v1:showFavorites': false,
    'preference:v1:showBookmarks': false,
  });
  run('open', extensionUrl);
  run(
    'wait',
    '--fn',
    'document.querySelector("[aria-label=书签导航]") === null && document.querySelector("button[aria-label=设置]") !== null',
  );
  evaluate(
    "chrome.storage.local.set({'preference:v1:showFavorites':true,'preference:v1:showBookmarks':true})",
  );
  run('wait', '--fn', 'document.querySelectorAll("[aria-label=书签导航] button").length === 2');
  run('set', 'offline', 'on');
  run('open', extensionUrl);
  run('wait', '--fn', 'document.querySelector(".ambient-background")?.dataset.renderer === "live"');
  run('wait', '--fn', 'performance.getEntriesByType("paint").length > 0');
  const startups = [];
  for (let i = 0; i < COLD_LOADS; i++) {
    run('open', extensionUrl);
    run(
      'wait',
      '--fn',
      'document.querySelector(".ambient-background")?.dataset.renderer === "live" && window.__glassProbe.startup().readyMs !== null',
    );
    run('wait', '1000');
    startups.push(evaluate('window.__glassProbe.startup()'));
  }
  const startup = {
    loads: startups.length,
    medianStartMs: median(startups.map(entry => entry.startMs)),
    medianReadyMs: median(startups.map(entry => entry.readyMs)),
    medianFcpMs: median(startups.map(fcp)),
    medianLongTaskMs: median(startups.map(entry => entry.longTaskMs)),
    runs: startups,
  };
  console.log(
    `startup: ambient ready ${Math.round(startup.medianReadyMs)} ms, FCP ${Math.round(startup.medianFcpMs)} ms, long tasks ${Math.round(startup.medianLongTaskMs)} ms (median of ${startups.length})`,
  );
  const effects = [];
  for (const theme of ['day', 'night'])
    for (const id of [
      'grain-gradient',
      'dithering',
      'pixel-blast',
      'data-pixel-arc',
      'crt-terminal',
      'shader-gradient',
    ]) {
      evaluate(
        `chrome.storage.local.set({'preference:v1:appearance':${JSON.stringify(theme)},'preference:v1:activeEffect':${JSON.stringify(id)}})`,
      );
      run(
        'wait',
        '--fn',
        `document.querySelector('main').dataset.effect === '${id}' && document.documentElement.dataset.theme === '${theme}'`,
      );
      run(
        'wait',
        '--fn',
        'document.querySelector(".ambient-background").dataset.transitioning === "false"',
      );
      const result = sample(2000);
      assert.ok(result.draws > 0 && result.draws <= (id === 'shader-gradient' ? 84 : 42));
      effects.push({ id, theme, ...result });
      console.log(
        `${id}/${theme}: ${result.draws} draw passes, ${result.raf} rAF / 2s, buffer ${result.buffer}`,
      );
    }
  evaluate(
    "chrome.storage.local.set({'preference:v1:appearance':'day','preference:v1:activeEffect':'crt-terminal'})",
  );
  run('wait', '--fn', 'document.documentElement.dataset.theme === "day"');
  run(
    'wait',
    '--fn',
    'document.querySelector(".ambient-background").dataset.transitioning === "false"',
  );
  const idle = sample(10_000);
  // The frame loop is pure rAF (one callback per vsync), so only draw passes are bounded.
  assert.equal(idle.hidden, false);
  assert.ok(idle.draws > 0 && idle.draws <= 205);
  assert.ok(Math.max(...idle.buffer) <= 2560);
  assert.ok(idle.buffer[0] * idle.buffer[1] <= 4_000_000);
  run('mouse', 'move', '720', '820');
  run('find', 'role', 'button', 'hover', '--name', '全部书签', '--exact');
  run('wait', '--fn', 'document.querySelector(".bookmark-menu") !== null');
  const glass = sample(5000);
  // Open dock panels keep the base 20 fps (the glass blur re-filters every drawn frame).
  assert.ok(glass.draws > 0 && glass.draws <= 105);
  assert.equal(evaluate('document.querySelectorAll("canvas").length'), 1);
  run('mouse', 'move', '720', '300');
  run('press', 'Control+,');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  run('wait', '1000');
  const settings = sample(5000);
  // The settings dialog covers the background with a blurred panel: 10 fps.
  assert.ok(settings.draws > 0 && settings.draws <= 55);
  console.log(`settings dialog: ${settings.draws} draws / 5s`);
  run('press', 'Escape');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") === null');
  evaluate(
    `window.__hiddenSamples=[];for(const ms of [1500,12000,32000]) setTimeout(()=>window.__hiddenSamples.push({at:ms,hidden:document.hidden,...window.__glassProbe.read()}),ms);`,
  );
  run('tab', 'new', 'about:blank');
  await new Promise(resolve => setTimeout(resolve, 33500));
  run('tab', 't1');
  const hidden = evaluate('window.__hiddenSamples');
  assert.equal(hidden.length, 3);
  assert.ok(hidden.every(x => x.hidden));
  // Hidden tabs release their WebGL context after 10 s.
  assert.equal(hidden[0].draws, hidden[2].draws);
  assert.notEqual(hidden[0].buffer, null);
  assert.equal(hidden[1].buffer, null);
  console.log(
    `hidden: buffer at 1.5s ${hidden[0].buffer}, 12s ${hidden[1].buffer}, 32s ${hidden[2].buffer}`,
  );
  run('wait', '--fn', 'document.querySelector(".ambient-background")?.dataset.renderer === "live"');
  run('press', 'Control+,');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  run('press', 'Escape');
  assert.equal(evaluate('document.querySelector("main").inert'), false);
  const errors = run('errors').errors;
  assert.equal(errors.length, 0);
  await mkdir(`${root}artifacts/performance`, { recursive: true });
  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  await writeFile(
    `${root}artifacts/performance/${outputName}.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        commit,
        viewport: [1440, 900],
        dpr: 2,
        offline: true,
        navigationPreferences,
        visibilityPersisted: true,
        effect: 'crt-terminal/day',
        startup,
        effects,
        idle,
        glass,
        settings,
        hidden,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `Performance checks passed: idle ${idle.draws}/10s, glass ${glass.draws}/5s, settings ${settings.draws}/5s, hidden draws unchanged, context released, errors 0.`,
  );
} finally {
  close();
  await removeDir(profile);
}
