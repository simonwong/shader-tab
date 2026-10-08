import type { Theme } from './presets';
import type { VariantDef } from './variants';
import { breathingTime } from './motion';
import { createFrameLoop } from './frame-loop';
import { createRateMonitor } from './rate-policy';
import { pixelDensity } from './drivers/surface';
import type { EffectDriver, Pointer } from './drivers/types';

/**
 * `lost`: the WebGL context was lost (GPU reset, or the browser reclaimed it
 * for another tab); the scene can be rebuilt. `error`: the driver failed.
 */
export type AmbientFailure = 'error' | 'lost';

export interface AmbientController {
  /** The element that holds this scene's canvas; it gets `.ready` once the first frame is drawn. */
  readonly layer: HTMLElement;
  dispose: () => void;
  /** Stops drawing; the canvas keeps its last frame. */
  pause: () => void;
  resume: () => void;
  /** While blocked (the settings dialog is open) the background ignores the pointer and draws slower. */
  setPointerBlocked: (blocked: boolean) => void;
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function mountAmbient(
  host: HTMLElement,
  variant: VariantDef,
  theme: Theme,
  onReady: () => void,
  onFailure: (reason: AmbientFailure) => void,
): AmbientController {
  const layer = document.createElement('div');
  layer.className = 'effect-layer';
  // Appended so a newer scene fades in above the one it replaces.
  host.append(layer);
  let driver: EffectDriver | undefined;
  let disposed = false,
    paused = document.hidden,
    pointerBlocked = false;
  let lastFrame = 0,
    seconds = 0,
    resizeTimer = 0;
  const target: Pointer = { x: 0, y: 0 },
    pointer: Pointer = { x: 0, y: 0 };
  const size = () => ({
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
  });

  const monitor = createRateMonitor(plan => {
    loop.setFps(plan.fps);
    if (plan.densityCap !== appliedDensityCap && driver && !paused) resizeAndDraw();
  });
  let appliedDensityCap = monitor.plan.densityCap;

  const resize = () => {
    const { width, height } = size();
    appliedDensityCap = monitor.plan.densityCap;
    const cap = Math.min(variant.density ?? Infinity, appliedDensityCap ?? Infinity);
    driver?.resize(
      width,
      height,
      pixelDensity(width, height, Number.isFinite(cap) ? cap : undefined),
    );
  };
  // Resizing clears the canvas; redraw at once so a slow or held frame rate never shows it blank.
  const resizeAndDraw = () => {
    resize();
    render(performance.now());
  };
  const requestResize = () => {
    clearTimeout(resizeTimer);
    if (!paused) resizeTimer = window.setTimeout(resizeAndDraw, 100);
  };
  const resetPointer = () => {
    target.x = target.y = 0;
  };
  const leavePointer = (event: PointerEvent) => {
    if (!event.relatedTarget) resetPointer();
  };
  const overControls = (event: PointerEvent) =>
    pointerBlocked ||
    (event.target instanceof Element && event.target.closest('.ui-surface') !== null);
  const normalize = (event: PointerEvent): Pointer => {
    const { width, height } = size();
    return {
      x: clamp((event.clientX / width) * 2 - 1),
      y: clamp((event.clientY / height) * 2 - 1),
    };
  };
  const movePointer = (event: PointerEvent) => {
    if (paused || event.pointerType !== 'mouse') return;
    if (overControls(event)) {
      resetPointer();
      return;
    }
    Object.assign(target, normalize(event));
    if (driver?.move) {
      driver.move(target);
      monitor.notePointer();
    }
  };
  const clickPointer = (event: PointerEvent) => {
    if (paused || overControls(event) || !driver?.click) return;
    driver.click(normalize(event));
    monitor.notePointer();
  };
  const render = (now: number) => {
    if (disposed || paused || document.hidden || !driver) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.25) : 0;
    lastFrame = now;
    seconds += delta;
    const follow = 1 - Math.exp(-delta * 1.2);
    pointer.x += (target.x * 0.35 - pointer.x) * follow;
    pointer.y += (target.y * 0.35 - pointer.y) * follow;
    try {
      driver.render(breathingTime(seconds), delta, pointer);
    } catch {
      fail('error');
    }
  };
  const loop = createFrameLoop(render, monitor.plan.fps);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loop.stop();
    monitor.dispose();
    clearTimeout(resizeTimer);
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
  const fail = (reason: AmbientFailure) => {
    if (disposed) return;
    dispose();
    onFailure(reason);
  };
  // preventDefault keeps the context restorable; the owner decides whether to rebuild.
  const lost = (event: Event) => {
    event.preventDefault();
    fail('lost');
  };

  void variant
    .load()
    .then(async createDriver => {
      if (disposed) return;
      const next = await createDriver(layer, {
        effect: variant.effect,
        theme,
        variant: variant.id,
      });
      if (disposed) {
        next.dispose();
        return;
      }
      driver = next;
      resize();
      driver.canvas.addEventListener('webglcontextlost', lost);
      window.addEventListener('resize', requestResize);
      window.addEventListener('pointermove', movePointer, { passive: true });
      window.addEventListener('pointerdown', clickPointer, { passive: true });
      window.addEventListener('pointerout', leavePointer);
      window.addEventListener('blur', resetPointer);
      host.dataset.engine = driver.engine;
      if (!paused && !document.hidden) {
        const now = performance.now();
        render(now);
        if (!disposed) loop.start(now);
      }
      if (disposed) return;
      layer.classList.add('ready');
      performance.mark('ambient:ready', { detail: `${variant.effect}/${variant.id}` });
      onReady();
    })
    .catch(() => fail('error'));

  return {
    layer,
    dispose,
    pause() {
      paused = true;
      loop.stop();
      clearTimeout(resizeTimer);
      lastFrame = 0;
      resetPointer();
      pointer.x = pointer.y = 0;
    },
    resume() {
      if (disposed || document.hidden || !paused) return;
      paused = false;
      resize();
      lastFrame = 0;
      if (driver) loop.start();
    },
    setPointerBlocked(blocked) {
      pointerBlocked = blocked;
      monitor.setDialogOpen(blocked);
      if (blocked) resetPointer();
    },
  };
}
