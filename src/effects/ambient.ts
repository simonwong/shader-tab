import type { Theme } from './presets';
import type { VariantDef } from './variants';
import { breathingTime } from './motion';
import { createFrameLoop } from './frame-loop';
import { pixelDensity } from './drivers/surface';
import type { EffectDriver, Pointer } from './drivers/types';

export interface AmbientController {
  dispose: () => void;
  pause: () => void;
  resume: () => void;
  setActive: (active: boolean) => void;
  /** While blocked (e.g. a modal is open) the background ignores the pointer. */
  setPointerBlocked: (blocked: boolean) => void;
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function mountAmbient(
  host: HTMLElement,
  variant: VariantDef,
  theme: Theme,
  onReady: () => void,
  onFailure: () => void,
): AmbientController {
  const layer = document.createElement('div');
  layer.className = 'effect-layer';
  host.prepend(layer);
  host.dataset.transitioning = 'true';
  let driver: EffectDriver | undefined;
  let disposed = false, paused = document.hidden, active = false, pointerBlocked = false;
  let lastFrame = 0, seconds = 0, resizeTimer = 0, interactionTimer = 0;
  const target: Pointer = { x: 0, y: 0 }, pointer: Pointer = { x: 0, y: 0 };
  const size = () => ({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) });

  const resize = () => {
    const { width, height } = size();
    driver?.resize(width, height, pixelDensity(width, height, variant.density));
  };
  const requestResize = () => {
    clearTimeout(resizeTimer);
    if (!paused) resizeTimer = window.setTimeout(resize, 100);
  };
  const resetPointer = () => { target.x = target.y = 0; };
  const leavePointer = (event: PointerEvent) => { if (!event.relatedTarget) resetPointer(); };
  const overControls = (event: PointerEvent) =>
    pointerBlocked || event.target instanceof Element && event.target.closest('.ui-surface') !== null;
  const normalize = (event: PointerEvent): Pointer => {
    const { width, height } = size();
    return { x: clamp(event.clientX / width * 2 - 1), y: clamp(event.clientY / height * 2 - 1) };
  };
  const movePointer = (event: PointerEvent) => {
    if (paused || event.pointerType !== 'mouse') return;
    if (overControls(event)) { resetPointer(); return; }
    Object.assign(target, normalize(event));
    driver?.move?.(target);
    loop.setFps(30);
    clearTimeout(interactionTimer);
    interactionTimer = window.setTimeout(() => loop.setFps(active ? 30 : 20), 1000);
  };
  const clickPointer = (event: PointerEvent) => {
    if (!paused && !overControls(event)) driver?.click?.(normalize(event));
  };
  const render = (now: number) => {
    if (disposed || paused || document.hidden || !driver) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .25) : 0;
    lastFrame = now;
    seconds += delta;
    const follow = 1 - Math.exp(-delta * 1.2);
    pointer.x += (target.x * .35 - pointer.x) * follow;
    pointer.y += (target.y * .35 - pointer.y) * follow;
    try { driver.render(breathingTime(seconds), delta, pointer); } catch { fail(); }
  };
  const loop = createFrameLoop(render, 20);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loop.stop();
    clearTimeout(resizeTimer);
    clearTimeout(interactionTimer);
    window.removeEventListener('resize', requestResize);
    window.removeEventListener('pointermove', movePointer);
    window.removeEventListener('pointerdown', clickPointer);
    window.removeEventListener('pointerout', leavePointer);
    window.removeEventListener('blur', resetPointer);
    driver?.canvas.removeEventListener('webglcontextlost', lost);
    driver?.dispose();
    driver = undefined;
    layer.remove();
  };
  const fail = () => { dispose(); host.dataset.transitioning = 'false'; onFailure(); };
  const lost = (event: Event) => { event.preventDefault(); fail(); };

  void variant.load().then(async createDriver => {
    if (disposed) return;
    const next = await createDriver(layer, { effect: variant.effect, theme, variant: variant.id });
    if (disposed) { next.dispose(); return; }
    driver = next;
    resize();
    driver.canvas.addEventListener('webglcontextlost', lost);
    window.addEventListener('resize', requestResize);
    window.addEventListener('pointermove', movePointer, { passive: true });
    window.addEventListener('pointerdown', clickPointer, { passive: true });
    window.addEventListener('pointerout', leavePointer);
    window.addEventListener('blur', resetPointer);
    host.dataset.engine = driver.engine;
    host.dataset.transitioning = 'false';
    if (!paused && !document.hidden) {
      render(performance.now());
      if (!disposed) loop.start();
    }
    if (!disposed) { layer.classList.add('ready'); onReady(); }
  }).catch(() => { if (!disposed) fail(); });

  return {
    dispose,
    pause() {
      paused = true;
      loop.stop();
      clearTimeout(resizeTimer);
      clearTimeout(interactionTimer);
      lastFrame = 0;
      resetPointer();
      pointer.x = pointer.y = 0;
    },
    resume() {
      if (disposed || document.hidden) return;
      paused = false;
      resize();
      lastFrame = 0;
      if (driver) loop.start();
    },
    setActive(value) {
      active = value;
      loop.setFps(active ? 30 : 20);
    },
    setPointerBlocked(blocked) {
      pointerBlocked = blocked;
      if (blocked) resetPointer();
    },
  };
}
