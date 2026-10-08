import { THEME_BRIGHTNESS } from '../presets';
import { mountFullscreenShader } from './webgl';
import type { DriverFactory } from './types';

interface FieldShaders {
  vertex: string;
  fragment: string;
}
interface FieldConfig {
  shaders: () => Promise<FieldShaders>;
  uniforms: { resolution: string; time: string; pointer: string };
}

/** Single-pass fullscreen fragment shaders from the ThreeUI Arc collection. */
function createFieldDriver({ shaders: loadShaders, uniforms }: FieldConfig): DriverFactory {
  return async (host, { theme }) => {
    const shaders = await loadShaders();
    return mountFullscreenShader(host, {
      engine: 'threeui-webgl',
      vertex: shaders.vertex,
      fragment: shaders.fragment,
      setup(gl, uniform) {
        const resolution = uniform(uniforms.resolution);
        const time = uniform(uniforms.time);
        const pointer = uniform(uniforms.pointer);
        gl.uniform1f(uniform('lightMode'), theme === 'day' ? 1 : 0);
        gl.uniform1f(uniform('uDim'), THEME_BRIGHTNESS[theme]);
        return {
          resize(surface) {
            gl.uniform2f(resolution, surface.pixelWidth, surface.pixelHeight);
          },
          frame(seconds, mouse) {
            gl.uniform1f(time, seconds);
            gl.uniform2f(pointer, 0.5 + mouse.x * 0.15, 0.5 - mouse.y * 0.15);
          },
        };
      },
    });
  };
}

export const createRibbonFieldDriver = createFieldDriver({
  shaders: () => import('../vendor/ribbon-field-shaders'),
  uniforms: { resolution: 'resolution', time: 'time', pointer: 'pointer' },
});

export const createVoidFieldDriver = createFieldDriver({
  shaders: () => import('../vendor/void-field-shaders'),
  uniforms: { resolution: 'iResolution', time: 'iTime', pointer: 'uMouse' },
});
