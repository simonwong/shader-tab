/** Upper bound for any render target's backing store, in device pixels. */
export const MAX_RENDER_PIXELS = 4_000_000;
/** Upper bound for the longest edge of a render target, in device pixels. */
export const MAX_RENDER_EDGE = 2560;
/* Density is solved against a slightly smaller budget so rounding the backing
   store to whole pixels never pushes it past MAX_RENDER_PIXELS. */
const DENSITY_PIXEL_BUDGET = 3_996_000;
const MAX_DENSITY = 2;

/**
 * Device-pixel density for a CSS-sized surface, bounded by the device ratio,
 * the global edge and pixel budgets, and an optional per-variant cap.
 */
export function pixelDensity(width: number, height: number, cap = MAX_DENSITY): number {
  return Math.min(
    devicePixelRatio || 1,
    MAX_DENSITY,
    cap,
    MAX_RENDER_EDGE / Math.max(width, height),
    Math.sqrt(DENSITY_PIXEL_BUDGET / (width * height)),
  );
}

/** Drops a canvas backing store before detaching it so the memory is released promptly. */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 1;
  canvas.height = 1;
  canvas.remove();
}
