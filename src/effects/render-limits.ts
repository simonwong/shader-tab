/*
 * Why the background may be held on one frame instead of animating. On a
 * machine without a usable GPU, WebGL runs on the CPU (SwiftShader, or WARP,
 * "Microsoft Basic Render Driver", on Windows) and a full-screen shader costs
 * several cores; a still frame costs one draw. A variant whose real frame rate
 * stays far below plan is marked slow on this device for a few days.
 *
 * The slow marks live in localStorage, like the first-paint cache: they
 * describe this device, are read synchronously when the stage starts, and
 * losing them only means measuring again.
 */

const KEY = 'shader-tab:slow-variants:v1';
/** A slow mark is retried after this long, so a driver update or a new GPU is noticed. */
export const SLOW_MARK_MS = 3 * 24 * 60 * 60_000;

/** Renderer names of WebGL implementations that run on the CPU. */
const SOFTWARE_RENDERER = /swiftshader|basic render|llvmpipe|softpipe|software/i;

export const isSoftwareRenderer = (name: string) => SOFTWARE_RENDERER.test(name);

/** The unmasked renderer of the canvas's existing WebGL context, if the browser exposes it. */
export function rendererName(canvas: HTMLCanvasElement): string | undefined {
  // getContext returns the canvas's existing context of that type, or null for the other type.
  const gl = (canvas.getContext('webgl2') ??
    canvas.getContext('webgl')) as WebGLRenderingContext | null;
  if (!gl) return undefined;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return typeof name === 'string' ? name : undefined;
}

export interface RenderLimits {
  /** WebGL runs on the CPU in this page. */
  software: boolean;
  /** Variants (`effect/variant`) currently marked slow on this device. */
  slow: readonly string[];
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface RenderLimitStore {
  get: () => RenderLimits;
  isSlow: (variant: string) => boolean;
  markSlow: (variant: string) => void;
  noteSoftware: () => void;
  /** Forgets the slow marks and the software note so the next scene is measured again. */
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
}

export function createRenderLimitStore(
  backing: KeyValueStore | undefined,
  now: () => number = Date.now,
): RenderLimitStore {
  const read = (): Record<string, number> => {
    let raw: unknown;
    try {
      raw = JSON.parse(backing?.getItem(KEY) ?? 'null');
    } catch {
      return {};
    }
    if (!raw || typeof raw !== 'object') return {};
    const at = now();
    const marks: Record<string, number> = {};
    for (const [variant, markedAt] of Object.entries(raw)) {
      if (typeof markedAt === 'number' && at - markedAt < SLOW_MARK_MS && markedAt <= at)
        marks[variant] = markedAt;
    }
    return marks;
  };
  const write = () => {
    try {
      if (Object.keys(marks).length) backing?.setItem(KEY, JSON.stringify(marks));
      else backing?.removeItem(KEY);
    } catch {
      /* Private storage may be unavailable; the marks then last for this page. */
    }
  };

  let marks = read();
  let software = false;
  let snapshot: RenderLimits = { software, slow: Object.keys(marks) };
  const listeners = new Set<() => void>();
  const changed = () => {
    snapshot = { software, slow: Object.keys(marks) };
    for (const listener of listeners) listener();
  };

  return {
    get: () => snapshot,
    isSlow: variant => variant in marks && now() - marks[variant]! < SLOW_MARK_MS,
    markSlow(variant) {
      marks = { ...read(), [variant]: now() };
      write();
      changed();
    },
    noteSoftware() {
      if (software) return;
      software = true;
      changed();
    },
    clear() {
      marks = {};
      software = false;
      write();
      changed();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function localStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export const renderLimits = createRenderLimitStore(localStore());
