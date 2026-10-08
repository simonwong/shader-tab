// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Modified by Shader Tab: drawn with raw WebGL instead of three.js.
import { fragment } from '../vendor/amber-halftone-shaders';
import { ARC_SURFACE, THEME_BRIGHTNESS } from '../presets';
import { hexColor, mountFullscreenShader } from './webgl';
import type { DriverFactory } from './types';

/* three.js converted the original sRGB hex colours to linear RGB before passing
   them to the shader, which wrote them out unconverted; keep that look. */
const linear = (hex: string) => hexColor(hex).map(channel =>
  channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) as [number, number, number];
const SPACING = .085;

export const createDriver: DriverFactory = (host, { theme }) => {
  const light = theme === 'day';
  return mountFullscreenShader(host, {
    engine: 'threeui-webgl',
    fragment,
    setup(gl, uniform) {
      const canvas = uniform('uCanvas'), aspect = uniform('uAspect'), density = uniform('uDensity');
      const columns = uniform('uColumns'), time = uniform('uTime'), offset = uniform('uOffset');
      gl.uniform3f(uniform('uColor1'), ...linear(light ? '#b45309' : '#fbbf24'));
      gl.uniform3f(uniform('uColor2'), ...linear(light ? '#1a1f2a' : '#ffffff'));
      gl.uniform3f(uniform('uBackground'), ...hexColor(ARC_SURFACE[theme]));
      gl.uniform1f(uniform('uDim'), THEME_BRIGHTNESS[theme]);
      return {
        resize(surface) {
          const ratio = surface.width / surface.height;
          gl.uniform2f(canvas, surface.pixelWidth, surface.pixelHeight);
          gl.uniform1f(aspect, ratio);
          gl.uniform1f(density, surface.density);
          gl.uniform1f(columns, Math.ceil(ratio / SPACING));
        },
        frame(seconds, pointer) {
          gl.uniform1f(time, seconds);
          gl.uniform2f(offset, pointer.x * .025, -pointer.y * .025);
        },
      };
    },
  });
};
