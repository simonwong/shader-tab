import { createCrtRenderer, CRT_DEFAULTS } from '../vendor/crtRenderer';
import { releaseCanvas } from './surface';
import { loseContext } from './webgl';
import type { DriverFactory } from './types';

export const createDriver: DriverFactory = (host, { theme }) => {
  const canvas = document.createElement('canvas');
  const options = { ...CRT_DEFAULTS };
  if (theme === 'day') canvas.style.filter = 'hue-rotate(285deg) saturate(.8)';
  const renderer = createCrtRenderer(canvas, () => options);
  host.append(canvas);
  return {
    canvas,
    engine: 'threeui-webgl',
    resize: renderer.resize,
    render(seconds, _delta, pointer) {
      renderer.render(seconds * 1000, pointer);
    },
    dispose() {
      renderer.dispose();
      loseContext(canvas.getContext('webgl'));
      releaseCanvas(canvas);
    },
  };
};
