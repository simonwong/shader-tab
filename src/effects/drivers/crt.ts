import { createCrtRenderer, CRT_DEFAULTS } from '../vendor/crtRenderer';
import { loseContext } from './webgl';
import type { DriverFactory } from './types';

export const createDriver: DriverFactory = (host, { theme }) => {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const options = { ...CRT_DEFAULTS };
  if (theme === 'day') canvas.style.filter = 'hue-rotate(285deg) saturate(.8)';
  const renderer = createCrtRenderer(host, canvas, () => options);
  let elapsedMs = 0;
  return {
    canvas,
    engine: 'threeui-webgl',
    resize: renderer.resize,
    render(seconds, delta, pointer) {
      elapsedMs += delta * 1000;
      renderer.render(seconds * 1000, elapsedMs, pointer);
    },
    dispose() {
      renderer.dispose();
      loseContext(canvas.getContext('webgl'));
      canvas.remove();
    },
  };
};
