import { createDataPixelArcRenderer, DATA_PIXEL_ARC_DEFAULTS } from '../vendor/dataPixelArcRenderer';
import type { DriverFactory } from './types';
export const createDriver: DriverFactory = async (host, effect, theme, shape, variant) => {
  if (variant === 'signal-particles' || variant === 'override-grid') return (await import('./arc-particles')).createDriver(host, effect, theme, shape, variant);
  if (variant === 'ribbon-field' || variant === 'void-field' || variant === 'halftone-flow') return (await import('./arc-fields')).createDriver(host, effect, theme, shape, variant);
  if (variant === 'amber-halftone') return (await import('./arc-amber')).createDriver(host, effect, theme, shape, variant);
  if (variant === 'predictive') {
    const { createPredictiveArcRenderer, PREDICTIVE_ARC_DEFAULTS } = await import('../vendor/predictiveArcRenderer');
    const canvas = document.createElement('canvas');
    const options = { ...PREDICTIVE_ARC_DEFAULTS, mode: theme === 'day' ? 'light' as const : 'dark' as const };
    const renderer = createPredictiveArcRenderer(canvas, () => options);
    if (!renderer) throw new Error('Canvas 2D is unavailable');
    host.append(canvas);
    return { canvas, engine: 'threeui-canvas2d', resize: renderer.resize,
      render(seconds, _delta, pointer) { options.archHeight = .7 + pointer.y * .04; renderer.render(seconds); },
      dispose() { canvas.width = canvas.height = 1; canvas.remove(); },
    };
  }
  const canvas = document.createElement('canvas');
  const options = { ...DATA_PIXEL_ARC_DEFAULTS, mode: theme === 'day' ? 'light' as const : 'dark' as const, speed: .55 };
  const renderer = createDataPixelArcRenderer(canvas, () => options);
  if (!renderer) throw new Error('Canvas 2D is unavailable');
  host.append(canvas);
  return {
    canvas, engine: 'threeui-canvas2d', resize: renderer.resize,
    render(seconds, _delta, pointer) { options.arcCenter = .4 + pointer.y * .035; options.arcDrop = .9 + pointer.x * .08; renderer.render(seconds); },
    dispose() { canvas.width = canvas.height = 1; canvas.remove(); },
  };
};
