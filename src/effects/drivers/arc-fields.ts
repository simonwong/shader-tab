import { releaseCanvas } from './surface';
import { bindFullscreenTriangle, deleteProgram, linkProgram, loseContext, type LinkedProgram } from './webgl';
import type { DriverFactory } from './types';

interface FieldShaders { vertex: string; fragment: string }
interface FieldConfig {
  shaders: () => Promise<FieldShaders>;
  uniforms: { resolution: string; time: string; pointer: string };
}

/** Single-pass fullscreen fragment shaders from the ThreeUI Arc collection. */
function createFieldDriver({ shaders: loadShaders, uniforms }: FieldConfig): DriverFactory {
  return async (host, { theme }) => {
    const shaders = await loadShaders();
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL is unavailable');
    let linked: LinkedProgram | undefined;
    let buffer: WebGLBuffer | null = null;
    const dispose = () => {
      gl.deleteBuffer(buffer);
      deleteProgram(gl, linked);
      loseContext(gl);
      releaseCanvas(canvas);
    };
    try {
      linked = linkProgram(gl, shaders.vertex, shaders.fragment);
      const { program } = linked;
      gl.useProgram(program);
      buffer = bindFullscreenTriangle(gl, program, 'position');
      const resolution = gl.getUniformLocation(program, uniforms.resolution);
      const time = gl.getUniformLocation(program, uniforms.time);
      const pointer = gl.getUniformLocation(program, uniforms.pointer);
      gl.uniform1f(gl.getUniformLocation(program, 'lightMode'), theme === 'day' ? 1 : 0);
      host.append(canvas);
      return {
        canvas,
        engine: 'threeui-webgl',
        resize(width, height, density) {
          canvas.width = Math.max(1, Math.round(width * density));
          canvas.height = Math.max(1, Math.round(height * density));
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.uniform2f(resolution, canvas.width, canvas.height);
        },
        render(seconds, _delta, mouse) {
          gl.uniform1f(time, seconds);
          gl.uniform2f(pointer, .5 + mouse.x * .15, .5 - mouse.y * .15);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        dispose,
      };
    } catch (error) {
      dispose();
      throw error;
    }
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
