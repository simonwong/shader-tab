import { releaseCanvas } from './surface';
import type { EffectDriver, Pointer } from './types';

const ENGINE = 'threeui-canvas2d';

interface Canvas2dRenderer {
  resize: (width: number, height: number, density: number) => void;
  render: (seconds: number) => void;
}

/**
 * Wraps a self-contained Canvas 2D renderer (one that owns its context and
 * sizing) as an effect driver. `beforeRender` lets the caller feed pointer
 * state into the renderer's options before each frame.
 */
export function mountCanvas2dRenderer(
  host: HTMLElement,
  create: (canvas: HTMLCanvasElement) => Canvas2dRenderer | null | undefined,
  beforeRender?: (pointer: Pointer) => void,
): EffectDriver {
  const canvas = document.createElement('canvas');
  const renderer = create(canvas);
  if (!renderer) throw new Error('Canvas 2D is unavailable');
  host.append(canvas);
  return {
    canvas,
    engine: ENGINE,
    resize: renderer.resize,
    render(seconds, _delta, pointer) {
      beforeRender?.(pointer);
      renderer.render(seconds);
    },
    dispose() { releaseCanvas(canvas); },
  };
}

export interface Canvas2dFrame {
  context: CanvasRenderingContext2D;
  /** CSS-pixel size; the context transform already maps it to device pixels. */
  width: number;
  height: number;
  seconds: number;
  pointer: Pointer;
}

/** Creates an opaque Canvas 2D driver whose `paint` callback draws each frame in CSS pixels. */
export function mountCanvas2dPainter(host: HTMLElement, paint: (frame: Canvas2dFrame) => void): EffectDriver {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas 2D is unavailable');
  host.append(canvas);
  let width = 1;
  let height = 1;
  return {
    canvas,
    engine: ENGINE,
    resize(nextWidth, nextHeight, density) {
      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.round(nextWidth * density);
      canvas.height = Math.round(nextHeight * density);
      context.setTransform(density, 0, 0, density, 0, 0);
    },
    render(seconds, _delta, pointer) { paint({ context, width, height, seconds, pointer }); },
    dispose() { releaseCanvas(canvas); },
  };
}
