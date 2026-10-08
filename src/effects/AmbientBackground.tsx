import { useLayoutEffect, useRef, useState } from 'react';
import { resolveVariant, type VariantDef } from './variants';
import type { EffectId, Theme } from './presets';
import type { AmbientController, AmbientFailure } from './ambient';

interface Props {
  effect: EffectId;
  /** Variant id from the registry; undefined until the shuffle draw resolves. */
  variant: string | undefined;
  theme: Theme;
  /** @deprecated Ignored: open panels no longer raise the frame rate (see rate-policy.ts). */
  interactive?: boolean;
  /** The settings dialog is open: ignore the pointer and draw at a lower rate. */
  pointerBlocked: boolean;
}

/**
 * `switching`: a new scene is loading or fading in over the previous one.
 * `paused`: the tab is hidden and the canvas is kept. `suspended`: released while hidden.
 */
type Renderer = 'static' | 'live' | 'switching' | 'paused' | 'suspended';

/** A hidden tab keeps its WebGL context this long before releasing it. Tabs share a small context pool. */
const HIDDEN_RELEASE_MS = 10_000;
/** After a context loss while visible, wait this long before the one rebuild attempt. */
const LOSS_RETRY_MS = 2_000;

interface Scene { key: string; definition: VariantDef; theme: Theme }
interface Layer { key: string; controller?: AmbientController; paused: boolean }

interface Stage {
  show: (scene: Scene) => void;
  setPointerBlocked: (blocked: boolean) => void;
  dispose: () => void;
}

const loadAmbient = () => import('./ambient');

/** Longest CSS transition on the layer, so the outgoing scene is removed only after the fade. */
function fadeDuration(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const seconds = (value: string) => value.split(',').map(part => parseFloat(part) || 0);
  const durations = seconds(style.transitionDuration);
  const delays = seconds(style.transitionDelay);
  return Math.max(0, ...durations.map((duration, index) => (duration + (delays[index] ?? 0)) * 1000));
}

/**
 * Owns the canvas layers of one background host. A new scene loads while
 * the current one keeps drawing, then fades in above it; the old scene is
 * frozen during the fade and disposed afterwards, so at most two WebGL
 * contexts exist at once. If the new scene fails, the old one stays.
 */
function createStage(host: HTMLElement, report: (renderer: Renderer) => void): Stage {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let desired: Scene | undefined;
  let live: Layer | undefined;
  let incoming: Layer | undefined;
  let outgoing: Layer | undefined;
  let outgoingTimer = 0, releaseTimer = 0, retryTimer = 0;
  let pointerBlocked = false, disposed = false, suspended = false;
  /** Scenes that failed for good (driver error, or a second context loss while visible). */
  const failed = new Set<string>();
  /** Scenes that already used their one rebuild after a context loss while visible. */
  const lossRetried = new Set<string>();

  const setTransitioning = (value: boolean) => { host.dataset.transitioning = String(value); };
  const drop = (layer: Layer | undefined) => {
    if (!layer) return;
    layer.controller?.dispose();
    layer.controller = undefined;
  };
  const finishOutgoing = () => {
    window.clearTimeout(outgoingTimer);
    drop(outgoing);
    outgoing = undefined;
  };
  const cancelIncoming = () => {
    drop(incoming);
    incoming = undefined;
  };
  const publish = () => {
    if (disposed) return;
    setTransitioning(Boolean(incoming || outgoing));
    if (document.hidden || !desired) report(live ? 'paused' : suspended ? 'suspended' : 'static');
    else if (live && (incoming || outgoing || live.key !== desired.key && !failed.has(desired.key))) report('switching');
    else report(live ? 'live' : 'static');
  };

  const onReady = (layer: Layer) => {
    if (layer !== incoming || disposed) return;
    incoming = undefined;
    const previous = live;
    live = layer;
    suspended = false;
    if (previous) {
      finishOutgoing();
      const fade = document.hidden || motion.matches ? 0 : fadeDuration(layer.controller!.layer);
      if (fade > 0) {
        // Freeze the old frame under the fade; only the new scene keeps drawing.
        previous.controller?.pause();
        previous.paused = true;
        outgoing = previous;
        outgoingTimer = window.setTimeout(() => { finishOutgoing(); publish(); }, fade + 50);
      } else {
        drop(previous);
      }
    }
    publish();
  };

  const onFailure = (layer: Layer, reason: AmbientFailure) => {
    if (disposed) return;
    const wasPaused = layer.paused || document.hidden;
    layer.controller = undefined;
    if (layer === incoming) incoming = undefined;
    if (layer === outgoing) { finishOutgoing(); publish(); return; }
    if (layer === live) live = undefined;
    if (reason === 'lost' && wasPaused) {
      // The browser reclaimed the context of a background tab: a suspension, not a failure.
      suspended = true;
    } else if (reason === 'lost' && !lossRetried.has(layer.key)) {
      lossRetried.add(layer.key);
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => { retryTimer = 0; sync(); }, LOSS_RETRY_MS);
    } else {
      failed.add(layer.key);
    }
    publish();
  };

  const mount = (scene: Scene) => {
    finishOutgoing();
    cancelIncoming();
    const layer: Layer = { key: scene.key, paused: false };
    incoming = layer;
    performance.mark('ambient:start', { detail: scene.key });
    // Fetch the controller and the driver chunk in parallel.
    void Promise.all([loadAmbient(), scene.definition.load()]).then(([{ mountAmbient }]) => {
      if (layer !== incoming || disposed || document.hidden) return;
      layer.controller = mountAmbient(host, scene.definition, scene.theme, () => onReady(layer), reason => onFailure(layer, reason));
      layer.controller.setPointerBlocked(pointerBlocked);
      // Lets CSS give a crossfade over a previous scene a different duration than the first fade-in.
      layer.controller.layer.dataset.enter = live ? 'crossfade' : 'fade';
    }).catch(() => {
      if (layer === incoming) onFailure(layer, 'error');
    });
  };

  const sync = () => {
    if (disposed || !desired) return;
    if (motion.matches) {
      finishOutgoing();
      cancelIncoming();
      drop(live);
      live = undefined;
      publish();
      return;
    }
    if (document.hidden) {
      finishOutgoing();
      cancelIncoming();
      if (live && live.key !== desired.key) { drop(live); live = undefined; }
      if (live && !live.paused) {
        live.controller?.pause();
        live.paused = true;
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(() => {
          drop(live);
          live = undefined;
          suspended = true;
          publish();
        }, HIDDEN_RELEASE_MS);
      }
      // Warm the chunks so the scene mounts quickly when the tab is shown.
      void loadAmbient().catch(() => {});
      void desired.definition.load().catch(() => {});
      publish();
      return;
    }
    window.clearTimeout(releaseTimer);
    if (live?.key === desired.key) {
      cancelIncoming();
      if (live.paused) {
        live.paused = false;
        live.controller?.resume();
      }
    } else if (incoming?.key !== desired.key && !failed.has(desired.key) && !retryTimer) {
      mount(desired);
    } else if (live?.paused && incoming?.key !== desired.key) {
      // The new scene cannot be shown; keep the previous one running.
      live.paused = false;
      live.controller?.resume();
    }
    publish();
  };

  const onVisibility = () => {
    if (!document.hidden && retryTimer) {
      // Visible again after a loss: rebuild now instead of waiting for the timer.
      window.clearTimeout(retryTimer);
      retryTimer = 0;
    }
    sync();
  };
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', onVisibility);
  setTransitioning(false);

  return {
    show(scene) {
      if (desired?.key === scene.key) return;
      desired = scene;
      window.clearTimeout(retryTimer);
      retryTimer = 0;
      sync();
    },
    setPointerBlocked(blocked) {
      pointerBlocked = blocked;
      for (const layer of [live, incoming]) layer?.controller?.setPointerBlocked(blocked);
    },
    dispose() {
      disposed = true;
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(releaseTimer);
      window.clearTimeout(retryTimer);
      finishOutgoing();
      cancelIncoming();
      drop(live);
      live = undefined;
    },
  };
}

export function AmbientBackground({ effect, variant, theme, pointerBlocked }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage>(undefined);
  const [renderer, setRenderer] = useState<Renderer>('static');
  // Layout effects so `data-renderer` turns to `switching` in the same commit as `data-variant`.
  useLayoutEffect(() => {
    const created = createStage(host.current!, setRenderer);
    stage.current = created;
    return () => {
      created.dispose();
      stage.current = undefined;
    };
  }, []);
  useLayoutEffect(() => {
    if (!variant) return;
    const definition = resolveVariant(effect, variant);
    stage.current?.show({ key: `${effect}/${definition.id}/${theme}`, definition, theme });
  }, [effect, theme, variant]);
  useLayoutEffect(() => { stage.current?.setPointerBlocked(pointerBlocked); }, [pointerBlocked]);
  return <div
    ref={host}
    className="ambient-background"
    aria-hidden="true"
    data-renderer={renderer}
    data-variant={variant}
    style={{ background: resolveVariant(effect, variant).background(theme) }}
  />;
}
