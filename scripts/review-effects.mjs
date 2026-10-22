import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { browserSession, fromRoot } from './lib/browser.mjs';
// Needs `pnpm dev` serving the preview on port 4317.
const output = fromRoot('artifacts/shader-review');
const url = 'http://localhost:4317/src/entrypoints/newtab/index.html';
const ids = [
  'grain-gradient',
  'shader-gradient',
  'dithering',
  'fluted-glass',
  'pixel-blast',
  'data-pixel-arc',
  'mesh-gradient',
  'warp',
  'simplex-noise',
  'perlin-noise',
  'neuro-noise',
  'dot-orbit',
  'smoke-ring',
  'god-rays',
  'water',
];
const { run, evaluate, sleep: wait, close } = browserSession('glass-framework-review');
const preference = values =>
  evaluate(
    `(() => {for (const [key,value] of Object.entries(${JSON.stringify(values)})) localStorage.setItem('glass-tab-preview:preference:v1:'+key, JSON.stringify(value));dispatchEvent(new StorageEvent('storage',{key:'glass-tab-preview:preference:v1:activeEffect'}));})()`,
  );
const settled = id =>
  run(
    'wait',
    '--fn',
    `document.querySelector('main').dataset.effect === '${id}' && document.querySelector('.ambient-background').dataset.renderer === 'live' && document.querySelector('.ambient-background').dataset.transitioning === 'false'`,
  );
try {
  await mkdir(output, { recursive: true });
  run('open', '--init-script', fromRoot('scripts/shader-probe.js'), url);
  run('set', 'viewport', '1440', '900', '2');
  evaluate(`(() => {
    const variants = { 'grain-gradient': 'blob', 'shader-gradient': 'dusk', dithering: 'swirl:8x8', 'fluted-glass': 'default', 'pixel-blast': 'square', 'data-pixel-arc': 'data-pixel', 'mesh-gradient': 'tide', 'warp': 'marble', 'simplex-noise': 'contour', 'perlin-noise': 'fog', 'neuro-noise': 'filament', 'dot-orbit': 'drift', 'smoke-ring': 'halo', 'god-rays': 'dawn', 'water': 'pool' };
    for (const [id, variant] of Object.entries(variants)) localStorage.setItem('glass-tab-preview:effect-variant:shuffle:v1:' + id, JSON.stringify({ remaining: [variant] }));
  })()`);
  preference({ appearance: 'night', shuffle: false, activeEffect: ids[0] });
  run('reload');
  settled(ids[0]);
  const effects = [];
  for (const id of ids) {
    preference({ activeEffect: id });
    settled(id);
    wait(1000);
    const before = evaluate('JSON.parse(JSON.stringify(window.__shaderProbe))');
    run('screenshot', resolve(output, `${id}-before.png`));
    run('mouse', 'move', '100', '180');
    wait(1800);
    const left = evaluate('JSON.parse(JSON.stringify(window.__shaderProbe))');
    run('mouse', 'move', '1340', '650');
    run('mouse', 'down');
    run('mouse', 'up');
    wait(1800);
    const right = evaluate('JSON.parse(JSON.stringify(window.__shaderProbe))');
    run('screenshot', resolve(output, `${id}-pointer.png`));
    if (id === 'grain-gradient') {
      assert.ok(right.uniforms.u_time > before.uniforms.u_time);
      // Shifting a grain gradient slides its grain, so it ignores the pointer.
      assert.ok(
        left.uniforms.u_offsetX === 0 && right.uniforms.u_offsetX === 0,
        'Grain Gradient must not follow the pointer',
      );
    } else if (id === 'dithering') {
      assert.ok(right.uniforms.u_time > before.uniforms.u_time);
      assert.ok(
        left.uniforms.u_offsetX < -0.006 && right.uniforms.u_offsetX > 0.006,
        'Dithering must follow both pointer directions',
      );
      assert.ok(
        Math.abs(left.uniforms.u_offsetX) <= 0.0106 && Math.abs(right.uniforms.u_offsetX) <= 0.0106,
        'Dithering pointer must stay gentle',
      );
    } else if (id === 'shader-gradient') {
      assert.ok(right.uniforms.uTime > before.uniforms.uTime);
      assert.ok(right.draws - before.draws > 0);
    } else if (id === 'fluted-glass') {
      // The glass filter has no clock; the rib grid slides on the breathing clock instead.
      assert.ok(right.draws - before.draws > 0);
      assert.notEqual(right.uniforms.u_shift, before.uniforms.u_shift);
      assert.equal(right.uploads, before.uploads, 'Fluted Glass uploads its photo only once');
    } else if (id === 'pixel-blast') {
      assert.ok(right.uniforms.uTime > before.uniforms.uTime);
      assert.ok(
        right.uniforms.uRipples.some((value, index) => index % 4 === 3 && value > 0),
        'Pixel Field must start a ripple on click',
      );
      assert.ok(right.draws - before.draws > 0);
    } else if (id === 'dot-orbit' || id === 'god-rays') {
      assert.ok(right.uniforms.u_time > before.uniforms.u_time);
      // Shifting would slide every dot or sweep every ray at once, so these ignore the pointer.
      assert.ok(
        left.uniforms.u_offsetX === 0 && right.uniforms.u_offsetX === 0,
        `${id} must not follow the pointer`,
      );
    } else if (id !== 'data-pixel-arc') {
      // The other Paper families follow the pointer, each by its own share of Dithering's offset.
      assert.ok(right.uniforms.u_time > before.uniforms.u_time);
      assert.ok(
        left.uniforms.u_offsetX < 0 && right.uniforms.u_offsetX > 0,
        `${id} must follow both pointer directions`,
      );
    } else {
      assert.ok(right.uniforms.uTime > before.uniforms.uTime);
      assert.ok(right.draws - before.draws > 0);
    }
    const state = evaluate(
      `(()=>{const h=document.querySelector('.ambient-background'),c=h.querySelector('canvas');return {engine:h.dataset.engine,buffer:[c.width,c.height],canvases:h.querySelectorAll('canvas').length};})()`,
    );
    assert.equal(state.canvases, 1);
    assert.ok(Math.max(...state.buffer) <= 2560 && state.buffer[0] * state.buffer[1] <= 4_002_000);
    effects.push({
      id,
      ...state,
      animation: true,
      pointer: { left: left.uniforms, right: right.uniforms },
    });
    console.log(`${id}: live, animated, one canvas`);
  }
  evaluate(
    `(async()=>{for(const id of ${JSON.stringify([...ids, ...ids])}){localStorage.setItem('glass-tab-preview:preference:v1:activeEffect',JSON.stringify(id));dispatchEvent(new StorageEvent('storage',{key:'glass-tab-preview:preference:v1:activeEffect'}));await new Promise(r=>setTimeout(r,65));}})()`,
  );
  settled(ids.at(-1));
  wait(600);
  assert.equal(evaluate('document.querySelectorAll(".ambient-background canvas").length'), 1);
  run('press', 'Control+,');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  assert.equal(evaluate('document.querySelectorAll(".effect-card").length'), ids.length);
  assert.equal(
    evaluate(
      `(()=>{const grid=document.querySelector('.effect-grid').getBoundingClientRect();return [...document.querySelectorAll('.effect-card')].every(card=>card.getBoundingClientRect().bottom <= grid.bottom);})()`,
    ),
    true,
    'All cards must be visible without inner scrolling',
  );
  run('screenshot', resolve(output, 'settings.png'));
  run('find', 'role', 'radio', 'click', '--name', 'Pixel Field,');
  run('press', 'Escape');
  run('mouse', 'move', '720', '450');
  settled('pixel-blast');
  run('reload');
  settled('pixel-blast');
  run('set', 'media', 'light', 'reduced-motion');
  run(
    'wait',
    '--fn',
    'document.querySelector(".ambient-background").dataset.still === "reduced-motion"',
  );
  // The static fallback sits under the canvas and shows until a scene's first frame.
  const fallbacks = [];
  for (const appearance of ['day', 'night'])
    for (const id of ids) {
      preference({ appearance, activeEffect: id });
      run(
        'wait',
        '--fn',
        `document.querySelector('main').dataset.effect==='${id}' && document.documentElement.dataset.theme==='${appearance}'`,
      );
      const background = evaluate(
        'getComputedStyle(document.querySelector(".ambient-background")).backgroundImage',
      );
      assert.ok(!background.includes('url('));
      const backgroundColor = evaluate(
        'getComputedStyle(document.querySelector(".ambient-background")).backgroundColor',
      );
      assert.ok(
        background.includes('gradient(') ||
          (background === 'none' && backgroundColor !== 'rgba(0, 0, 0, 0)'),
        'Static fallback must contain a gradient or an opaque color',
      );
      fallbacks.push({ id, appearance });
    }
  run('set', 'viewport', '390', '844');
  preference({ appearance: 'day', activeEffect: 'grain-gradient' });
  run(
    'wait',
    '--fn',
    'getComputedStyle(document.querySelector(".ambient-background")).backgroundImage.includes("radial-gradient")',
  );
  run('screenshot', resolve(output, 'reduced-motion-narrow.png'));
  run('press', 'Control+,');
  run('wait', '--fn', 'document.querySelector("[role=dialog]") !== null');
  assert.equal(evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  run('screenshot', resolve(output, 'settings-narrow.png'));
  run('press', 'Escape');
  run('set', 'media', 'light');
  settled('grain-gradient');
  evaluate(
    'document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()',
  );
  run(
    'wait',
    '--fn',
    'document.querySelector(".ambient-background").dataset.renderer === "static"',
  );
  assert.equal(evaluate('document.querySelectorAll("canvas").length'), 0);
  const errors = run('errors').errors;
  assert.equal(errors.length, 0);
  await writeFile(
    resolve(output, 'checks.json'),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        effects,
        rapidSwitch: true,
        fallbacks,
        cards: ids.length,
        persisted: 'pixel-blast',
        narrowOverflow: false,
        contextLossFallback: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'Framework review passed: animation, interaction, rapid switching, settings, persistence, static fallback, narrow layout, context loss.',
  );
} finally {
  close();
}
