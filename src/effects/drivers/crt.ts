import { createCrtRenderer, CRT_DEFAULTS, CRT_NO_GRADE, type CrtGrade } from '../vendor/crtRenderer';
import { THEME_BRIGHTNESS, type Theme } from '../presets';
import { releaseCanvas } from './surface';
import { loseContext } from './webgl';
import type { DriverFactory } from './types';

/* Row-major matrices from the Filter Effects spec for hue-rotate() and saturate(). */
function hueRotate(degrees: number) {
  const radians = degrees * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
  return new Float32Array([
    .213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928,
    .213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283,
    .213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072,
  ]);
}

function saturate(amount: number) {
  return new Float32Array([
    .213 + .787 * amount, .715 - .715 * amount, .072 - .072 * amount,
    .213 - .213 * amount, .715 + .285 * amount, .072 - .072 * amount,
    .213 - .213 * amount, .715 - .715 * amount, .072 + .928 * amount,
  ]);
}

/* The day theme shifts the green phosphor to violet; this used to be
   `filter: hue-rotate(285deg) saturate(.8)` on the canvas. */
const grade = (theme: Theme): CrtGrade => theme === 'day'
  ? { first: hueRotate(285), second: saturate(.8), dim: THEME_BRIGHTNESS.day }
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
