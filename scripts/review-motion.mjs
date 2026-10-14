import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { browserSession, fromRoot } from './lib/browser.mjs';
import { loadVariants } from './lib/variants.mjs';

/*
 * Motion budget for every background variant. Shader Tab is opened many times a
 * day, so a background should drift, not flicker, and the pointer should only
 * nudge it. For each variant this measures the share of screen pixels that
 * visibly change (colour distance above THRESHOLD) over one second:
 *
 *   idle     nothing happens
 *   pointer  the pointer sweeps across the middle of the screen
 *   click    one click in the middle of the screen
 *
 * `idle` is the mean of three idle windows; `pointer` and `click` are reported
 * as the extra change over the idle windows around them.
 *
 * A still of each variant is saved to artifacts/motion-review/frames.
 *
 * The budget applies to the default motion level (soft) and to still; lively
 * is measured and reported but never fails the run.
 *
 * Usage: node scripts/review-motion.mjs [--theme day|night] [--motion still|soft|lively]
 *   [effect or effect/variant ...]
 * Needs `pnpm dev` serving the preview on port 4317.
 */
export const BUDGET = { idle: 2.5, pointer: 1.5, click: 1.5 };
const THRESHOLD = '0.04';
const WINDOW_MS = 1000;
/** Pause after a reaction so pointer lenses and click rings have faded before the next idle window. */
const SETTLE_MS = 3000;
const WIDTH = 1440,
  HEIGHT = 900;
const url = 'http://localhost:4317/src/entrypoints/newtab/index.html';

const argv = process.argv.slice(2);
const themeIndex = argv.indexOf('--theme');
const theme = themeIndex === -1 ? 'day' : argv.splice(themeIndex, 2)[1];
const motionIndex = argv.indexOf('--motion');
const motion = motionIndex === -1 ? 'soft' : argv.splice(motionIndex, 2)[1];
if (!['still', 'soft', 'lively'].includes(motion)) throw new Error(`Unknown motion: ${motion}`);
const filters = argv;
const { variantIds, shuffleKey } = await loadVariants();
const cases = Object.entries(variantIds)
  .flatMap(([effect, ids]) => ids.map(variant => ({ effect, variant })))
  .filter(
    ({ effect, variant }) =>
      !filters.length || filters.includes(effect) || filters.includes(`${effect}/${variant}`),
  );

const output = fromRoot('artifacts/motion-review');
const { run, evaluate, waitFor, sleep, screenshot, close } = browserSession('glass-motion', {
  timeout: 90_000,
});
const hideControls =
  "(() => { const s = document.createElement('style'); s.textContent = 'main > :not(.ambient-background) { visibility: hidden !important; }'; document.head.append(s); })()";
const baseline = resolve(output, 'baseline.png');
const frames = resolve(output, 'frames');
/** Percentage of pixels that differ from the last baseline screenshot. */
const changed = () =>
  run('diff', 'screenshot', '--baseline', baseline, '-t', THRESHOLD).mismatchPercentage;
const round = value => Math.round(value * 10) / 10;
/** Runs `action`, waits out the rest of WINDOW_MS and returns the share of pixels that changed. */
const measure = (action = () => {}) => {
  screenshot(baseline);
  const start = Date.now();
  action();
  sleep(Math.max(0, WINDOW_MS - (Date.now() - start)));
  return changed();
};

const records = [];
try {
  await mkdir(frames, { recursive: true });
  run('open', url);
  run('set', 'viewport', String(WIDTH), String(HEIGHT));
  for (const { effect, variant } of cases) {
    evaluate(`(() => {
      localStorage.setItem('glass-tab-preview:' + ${JSON.stringify(shuffleKey(effect))}, JSON.stringify({ remaining: [${JSON.stringify(variant)}] }));
      for (const [key, value] of Object.entries({ appearance: '${theme}', activeEffect: '${effect}', shuffle: false, motion: '${motion}' }))
        localStorage.setItem('glass-tab-preview:preference:v1:' + key, JSON.stringify(value));
      location.reload();
    })()`);
    waitFor(
      `(() => { const h = document.querySelector('.ambient-background'); return h?.dataset.variant === ${JSON.stringify(variant)} && h.dataset.renderer === 'live' && h.dataset.transitioning === 'false'; })()`,
    );
    evaluate(hideControls);
    sleep(2500);

    screenshot(resolve(frames, `${effect}-${variant.replace(':', '_')}-${theme}.png`));
    const idleBefore = measure();
    const pointer = measure(() => {
      for (let step = 0; step <= 12; step++)
        run(
          'mouse',
          'move',
          String(Math.round(WIDTH * (0.3 + (0.4 * step) / 12))),
          String(Math.round(HEIGHT * (0.45 + 0.1 * Math.sin(step / 2)))),
        );
    });
    sleep(SETTLE_MS);
    const idleBetween = measure();
    const click = measure(() => {
      run('mouse', 'down');
      run('mouse', 'up');
    });
    sleep(SETTLE_MS);
    const idleAfter = measure();

    // The breathing clock changes speed over its cycle, so each reaction is
    // compared with the busier of the idle windows on either side of it.
    const record = {
      variant: `${effect}/${variant}`,
      idle: round((idleBefore + idleBetween + idleAfter) / 3),
      pointer: round(Math.max(0, pointer - Math.max(idleBefore, idleBetween))),
      click: round(Math.max(0, click - Math.max(idleBetween, idleAfter))),
    };
    record.over = Object.keys(BUDGET).filter(key => record[key] > BUDGET[key]);
    records.push(record);
    console.log(
      `${record.variant.padEnd(36)} idle ${String(record.idle).padStart(4)}%  pointer +${String(record.pointer).padStart(4)}%  click +${String(record.click).padStart(4)}%${record.over.length ? `  OVER: ${record.over.join(', ')}` : ''}`,
    );
  }
  await writeFile(
    resolve(output, motion === 'soft' ? `${theme}.json` : `${theme}-${motion}.json`),
    JSON.stringify({ theme, motion, budget: BUDGET, records }, null, 2),
  );
} finally {
  close();
}
const over = records.filter(record => record.over.length);
console.log(
  over.length
    ? `${over.length} of ${records.length} variants exceed the motion budget.`
    : `All ${records.length} variants are within the motion budget.`,
);
process.exitCode = over.length && motion !== 'lively' ? 1 : 0;
