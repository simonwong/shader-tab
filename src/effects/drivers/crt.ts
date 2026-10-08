import {
  createCrtRenderer,
  CRT_DEFAULTS,
  CRT_NO_GRADE,
  type CrtGrade,
} from '../vendor/crtRenderer';
import { THEME_BRIGHTNESS, type Theme } from '../presets';
import { releaseCanvas } from './surface';
import { loseContext } from './webgl';
import type { DriverFactory } from './types';

/* Row-major matrices from the Filter Effects spec for hue-rotate() and saturate(). */
function hueRotate(degrees: number) {
  const radians = (degrees * Math.PI) / 180,
    c = Math.cos(radians),
    s = Math.sin(radians);
  return new Float32Array([
    0.213 + c * 0.787 - s * 0.213,
    0.715 - c * 0.715 - s * 0.715,
    0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143,
    0.715 + c * 0.285 + s * 0.14,
    0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787,
    0.715 - c * 0.715 + s * 0.715,
    0.072 + c * 0.928 + s * 0.072,
  ]);
}

function saturate(amount: number) {
  return new Float32Array([
    0.213 + 0.787 * amount,
    0.715 - 0.715 * amount,
    0.072 - 0.072 * amount,
    0.213 - 0.213 * amount,
    0.715 + 0.285 * amount,
    0.072 - 0.072 * amount,
    0.213 - 0.213 * amount,
    0.715 - 0.715 * amount,
    0.072 + 0.928 * amount,
  ]);
}

/* The day theme shifts the green phosphor to violet; this used to be
   `filter: hue-rotate(285deg) saturate(.8)` on the canvas. */
const grade = (theme: Theme): CrtGrade =>
  theme === 'day'
    ? { first: hueRotate(285), second: saturate(0.8), dim: THEME_BRIGHTNESS.day }
    : { ...CRT_NO_GRADE, dim: THEME_BRIGHTNESS.night };

export const createDriver: DriverFactory = (host, { theme }) => {
  const canvas = document.createElement('canvas');
  const options = { ...CRT_DEFAULTS };
  const renderer = createCrtRenderer(canvas, () => options, grade(theme));
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
