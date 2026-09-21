import type { EffectId, ShaderGradientType, Theme } from './presets';
import { breathingTime } from './motion';
import { createFrameLoop } from './frame-loop';
import { pixelDensity, type EffectDriver, type Pointer } from './drivers/types';
export interface AmbientController { dispose: () => void; pause: () => void; resume: () => void; setActive: (active: boolean) => void }
async function loadDriver(effect: EffectId) {
  if (effect === 'grain-gradient' || effect === 'dithering') return import('./drivers/paper');
  if (effect === 'pixel-blast') return import('./drivers/pixel-blast');
  if (effect === 'data-pixel-arc') return import('./drivers/arc');
  if (effect === 'shader-gradient') return import('./drivers/shader-gradient');
  return import('./drivers/crt');
}
export function mountAmbient(host: HTMLElement, effect: EffectId, theme: Theme, onReady: () => void, onFailure: () => void, shaderGradientType: ShaderGradientType = 'plane', variant?: string): AmbientController {
  const layer = document.createElement('div');
  layer.className = 'effect-layer';
  host.prepend(layer);
  host.dataset.transitioning = 'true';
  let driver: EffectDriver | undefined;
  let disposed = false, paused = document.hidden, active = false;
  let lastFrame = 0, seconds = 0, resizeTimer = 0, interactionTimer = 0;
  const target: Pointer = { x: 0, y: 0 }, pointer: Pointer = { x: 0, y: 0 };
  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    driver?.resize(width, height, pixelDensity(width, height));
  };
  const requestResize = () => { clearTimeout(resizeTimer); if (!paused) resizeTimer = window.setTimeout(resize, 100); };
  const resetPointer = () => { target.x = target.y = 0; };
  const leavePointer = (event: PointerEvent) => { if (!event.relatedTarget) resetPointer(); };
  const overControls = (event: PointerEvent) => document.querySelector('[role="dialog"]') || event.target instanceof Element && event.target.closest('.ui-surface');
  const normalize = (event: PointerEvent) => ({ x: Math.max(-1, Math.min(1, event.clientX / host.clientWidth * 2 - 1)), y: Math.max(-1, Math.min(1, event.clientY / host.clientHeight * 2 - 1)) });
  const movePointer = (event: PointerEvent) => {
    if (paused || event.pointerType !== 'mouse') return;
    if (overControls(event)) { resetPointer(); return; }
    Object.assign(target, normalize(event)); driver?.move?.(target);
    loop.setFps(30); clearTimeout(interactionTimer);
    interactionTimer = window.setTimeout(() => loop.setFps(active ? 30 : 20), 1000);
  };
  const clickPointer = (event: PointerEvent) => { if (!paused && !overControls(event)) driver?.click?.(normalize(event)); };
  const render = (now: number) => {
    if (disposed || paused || document.hidden || !driver) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .25) : 0;
    lastFrame = now; seconds += delta;
    const follow = 1 - Math.exp(-delta * 2.5);
    pointer.x += (target.x - pointer.x) * follow; pointer.y += (target.y - pointer.y) * follow;
    try { driver.render(breathingTime(seconds), delta, pointer); } catch { fail(); }
  };
  const loop = createFrameLoop(render, 20);
  const dispose = () => {
    if (disposed) return;
    disposed = true; loop.stop(); clearTimeout(resizeTimer); clearTimeout(interactionTimer);
    window.removeEventListener('resize', requestResize); window.removeEventListener('pointermove', movePointer);
    window.removeEventListener('pointerdown', clickPointer); window.removeEventListener('pointerout', leavePointer); window.removeEventListener('blur', resetPointer);
    driver?.canvas.removeEventListener('webglcontextlost', lost);
    driver?.dispose(); driver = undefined; layer.remove();
  };
  const fail = () => { dispose(); host.dataset.transitioning = 'false'; onFailure(); };
  const lost = (event: Event) => { event.preventDefault(); fail(); };
  void loadDriver(effect).then(async ({ createDriver }) => {
    if (disposed) return;
    const next = await createDriver(layer, effect, theme, shaderGradientType, variant);
    if (disposed) { next.dispose(); return; }
    driver = next; resize();
    driver.canvas.addEventListener('webglcontextlost', lost);
    window.addEventListener('resize', requestResize); window.addEventListener('pointermove', movePointer, { passive: true });
    window.addEventListener('pointerdown', clickPointer, { passive: true }); window.addEventListener('pointerout', leavePointer); window.addEventListener('blur', resetPointer);
    host.dataset.engine = driver.engine; host.dataset.transitioning = 'false';
    if (!paused && !document.hidden) { render(performance.now()); if (!disposed) loop.start(); }
    if (!disposed) { layer.classList.add('ready'); onReady(); }
  }).catch(() => { if (!disposed) fail(); });
  return {
    dispose,
    pause() { paused = true; loop.stop(); clearTimeout(resizeTimer); clearTimeout(interactionTimer); lastFrame = 0; resetPointer(); pointer.x = pointer.y = 0; },
    resume() { if (disposed || document.hidden) return; paused = false; resize(); lastFrame = 0; if (driver) loop.start(); },
    setActive(value) { active = value; loop.setFps(active ? 30 : 20); },
  };
}
