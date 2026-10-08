import { createDataPixelArcRenderer, DATA_PIXEL_ARC_DEFAULTS } from '../vendor/dataPixelArcRenderer';
import { mountCanvas2dRenderer } from './canvas2d';
import type { DriverFactory } from './types';

const mode = (theme: 'day' | 'night') => theme === 'day' ? 'light' as const : 'dark' as const;

export const createDataPixelDriver: DriverFactory = (host, { theme }) => {
  const options = { ...DATA_PIXEL_ARC_DEFAULTS, mode: mode(theme), speed: .55 };
  return mountCanvas2dRenderer(host, canvas => createDataPixelArcRenderer(canvas, () => options), pointer => {
    options.arcCenter = .4 + pointer.y * .035;
    options.arcDrop = .9 + pointer.x * .08;
  });
};

export const createPredictiveDriver: DriverFactory = async (host, { theme }) => {
  const { createPredictiveArcRenderer, PREDICTIVE_ARC_DEFAULTS } = await import('../vendor/predictiveArcRenderer');
  const options = { ...PREDICTIVE_ARC_DEFAULTS, mode: mode(theme) };
  return mountCanvas2dRenderer(host, canvas => createPredictiveArcRenderer(canvas, () => options), pointer => {
    options.archHeight = .7 + pointer.y * .04;
  });
};
