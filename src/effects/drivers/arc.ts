import { DATA_PIXEL_ARC_DEFAULTS, DATA_PIXEL_ARC_FRAGMENT } from '../vendor/dataPixelArcRenderer';
import { PREDICTIVE_ARC_DEFAULTS, PREDICTIVE_ARC_FRAGMENT } from '../vendor/predictiveArcRenderer';
import { cssSurfaceUniforms, mountFullscreenShader } from './webgl';
import type { DriverFactory, Pointer } from './types';

type Uniform = (name: string) => WebGLUniformLocation | null;

/** Mounts one of the Arc fragment shaders that share the CSS-space uniforms. */
function mountArc(
  host: HTMLElement,
  light: boolean,
  fragment: string,
  setup: (gl: WebGLRenderingContext, uniform: Uniform) => (seconds: number, pointer: Pointer) => void,
) {
  return mountFullscreenShader(host, {
    engine: 'threeui-webgl',
    fragment,
    setup(gl, uniform) {
      gl.uniform1f(uniform('uLight'), light ? 1 : 0);
      gl.uniform1f(uniform('uDim'), 1);
      return { resize: cssSurfaceUniforms(gl, uniform), frame: setup(gl, uniform) };
    },
  });
}

export const createDataPixelDriver: DriverFactory = (host, { theme }) => {
  const options = { ...DATA_PIXEL_ARC_DEFAULTS, speed: .55 };
  return mountArc(host, theme === 'day', DATA_PIXEL_ARC_FRAGMENT, (gl, uniform) => {
    const time = uniform('uTime'), arc = uniform('uArc');
    gl.uniform1f(uniform('uCell'), options.pixelSize);
    gl.uniform1f(uniform('uGain'), options.brightness);
    return (seconds, pointer) => {
      gl.uniform1f(time, seconds * 1.2 * options.speed);
      gl.uniform3f(arc, options.arcCenter + pointer.y * .035, options.arcDrop + pointer.x * .08, options.thickness);
    };
  });
};

export const createPredictiveDriver: DriverFactory = (host, { theme }) => {
  const options = PREDICTIVE_ARC_DEFAULTS;
  return mountArc(host, theme === 'day', PREDICTIVE_ARC_FRAGMENT, (gl, uniform) => {
    const time = uniform('uTime'), arch = uniform('uArch');
    gl.uniform1f(uniform('uThickness'), options.thickness);
    gl.uniform1f(uniform('uGain'), options.brightness);
    return (seconds, pointer) => {
      gl.uniform1f(time, seconds * .9 * options.speed);
      gl.uniform1f(arch, options.archHeight + pointer.y * .04);
    };
  });
};
