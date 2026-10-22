import type { Theme } from './presets';
import type { VariantDef } from './variants';
import { breathingTime, MOTION_SPEED, type Motion } from './motion';
import { createFrameLoop } from './frame-loop';
import { createRateMonitor, createRateWatch } from './rate-policy';
import { isSoftwareRenderer, rendererName } from './render-limits';
import { pixelDensity } from './drivers/surface';
import type { EffectDriver, Pointer } from './drivers/types';

/**
 * `lost`: the WebGL context was lost (GPU reset, or the browser reclaimed it
 * for another tab); the scene can be rebuilt. `error`: the driver failed.
 */
export type AmbientFailure = 'error' | 'lost';
/**
 * `software`: WebGL runs on the CPU. `slow`: the real frame rate stayed far
 * below plan. The scene has already frozen on its current frame.
 */
export type AmbientLimit = 'software' | 'slow';

export interface AmbientController {
  /** The element that holds this scene's canvas; it gets `.ready` once the first frame is drawn. */
  readonly layer: HTMLElement;
  dispose: () => void;
  /** Stops drawing; the canvas keeps its last frame. */
  pause: () => void;
  resume: () => void;
  /** While blocked (the settings dialog is open) the background ignores the pointer and draws slower. */
  setPointerBlocked: (blocked: boolean) => void;
  /** Motion level: clock speed, base frame rate, and (unless still) pointer reactions. */
  setMotion: (motion: Motion) => void;
  /** While frozen the scene shows one frame, redrawn only when its size changes, and ignores the pointer. */
  setFrozen: (frozen: boolean) => void;
}

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function mountAmbient(
  host: HTMLElement,
  variant: VariantDef,
  theme: Theme,
  onReady: () => void,
  onFailure: (reason: AmbientFailure) => void,
  onLimit: (limit: AmbientLimit) => void,
): AmbientController {
  const layer = document.createElement('div');
  layer.className = 'effect-layer';
  // Appended so a newer scene fades in above the one it replaces.
  host.append(layer);
  let driver: EffectDriver | undefined;
  let disposed = false,
    paused = document.hidden,
    pointerBlocked = false,
    frozen = false;
  let motion: Motion = 'soft';
  let lastFrame = 0,
    seconds = 0,
    resizeTimer = 0;
  const target: Pointer = { x: 0, y: 0 },
    pointer: Pointer = { x: 0, y: 0 };
  const size = () => ({
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
  });

  const watch = createRateWatch();
  const monitor = createRateMonitor(plan => {
    loop.setFps(plan.fps);
    watch.reset(performance.now());
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
  /** Resizes, and redraws only if that changed the canvas (which clears it). */
  const resizeIfNeeded = () => {
    if (!driver) return;
    const { width, height } = driver.canvas;
    resize();
    if (driver.canvas.width !== width || driver.canvas.height !== height) render(performance.now());
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
  // Still motion ignores the pointer entirely, like the open settings dialog.
  const overControls = (event: PointerEvent) =>
    pointerBlocked ||
    frozen ||
    motion === 'still' ||
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
    seconds += delta * MOTION_SPEED[motion];
    const follow = 1 - Math.exp(-delta * 1.2);
    pointer.x += (target.x * 0.35 - pointer.x) * follow;
    pointer.y += (target.y * 0.35 - pointer.y) * follow;
    try {
      driver.render(breathingTime(seconds), delta, pointer);
    } catch {
      fail('error');
    }
  };
  const loop = createFrameLoop(now => {
    render(now);
    if (!paused && !document.hidden && watch.frame(now, monitor.plan.fps)) {
      freeze();
      onLimit('slow');
    }
  }, monitor.plan.fps);
  const startLoop = (drawnAt?: number) => {
    if (frozen || !driver) return;
    watch.reset(performance.now());
    loop.start(drawnAt);
  };
  const freeze = () => {
    if (frozen || disposed) return;
    frozen = true;
    loop.stop();
    resetPointer();
    pointer.x = pointer.y = 0;
    lastFrame = 0;
    // Redraw without the pointer offset; the canvas then holds this frame.
    render(performance.now());
  };

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
      const renderer = rendererName(driver.canvas);
      if (renderer && isSoftwareRenderer(renderer)) {
        frozen = true;
        onLimit('software');
        if (disposed) return;
      }
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
        if (!disposed) startLoop(now);
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
      lastFrame = 0;
      if (frozen) resizeIfNeeded();
      else {
        resize();
        startLoop();
      }
    },
    setPointerBlocked(blocked) {
      pointerBlocked = blocked;
      monitor.setDialogOpen(blocked);
      if (blocked) resetPointer();
    },
    setMotion(next) {
      motion = next;
      monitor.setMotion(next);
      if (next === 'still') resetPointer();
    },
    setFrozen(next) {
      if (next === frozen) return;
      if (next) {
        freeze();
        return;
      }
      frozen = false;
      lastFrame = 0;
      if (!paused && !document.hidden) startLoop();
    },
  };
}
