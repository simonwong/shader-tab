// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Modified by Shader Tab: Signal Particles and Override Grid use the shared clock
// and resolution budget, and run as fragment shaders instead of per-dot Canvas 2D
// draws. Grid layout, timing, colours and alpha follow the original loops.
import { ARC_SURFACE, type Theme } from '../presets';
import { cssSurfaceUniforms, glslColor, mountFullscreenShader } from './webgl';
import type { DriverFactory } from './types';

/* Shared by both shaders: top-down CSS-pixel coordinates of the fragment. */
const PRELUDE = `precision highp float;
uniform vec2 uCanvas;
uniform float uDensity;
uniform vec2 uSize;
uniform float uTime;
uniform vec2 uPointer;
uniform float uDim;
vec2 cssCoord() { return vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y) / uDensity; }
`;

const signalFragment = (theme: Theme) => {
  const light = theme === 'day';
  return `${PRELUDE}
const float SPACING = 16.0;
const float RADIUS = 1.5;
const float TAU = 6.2831853;

void main() {
  vec2 css = cssCoord();
  vec3 color = ${glslColor(ARC_SURFACE[theme])};
  vec2 count = floor(uSize / SPACING);
  vec2 offset = (uSize - count * SPACING) / 2.0;
  vec2 index = floor((css - offset) / SPACING + 0.5);
  if (all(greaterThanEqual(index, vec2(0.0))) && all(lessThanEqual(index, count))) {
    float coverage = clamp((RADIUS - length(css - offset - index * SPACING)) * uDensity + 0.5, 0.0, 1.0);
    vec2 n = index * 0.1 + uPointer * 0.15;
    float value = sin(n.x + uTime * 0.5) * cos(n.y - uTime * 0.3) + sin(n.x * 0.5 - n.y * 0.5 + uTime * 0.8);
    if (coverage > 0.0 && value > 0.1) {
      float highlight = sin(mod(index.x * 12.34, TAU)) * cos(mod(index.y * 56.78, TAU));
      vec3 ink = ${light ? 'vec3(36.0, 48.0, 68.0)' : 'vec3(148.0, 163.0, 184.0)'} / 255.0;
      float alpha = min(0.6, (value - 0.1) * 0.8);
      if (highlight > 0.98) { ink = ${glslColor(light ? '#1d4ed8' : '#3b82f6')}; alpha = 1.0; }
      else if (highlight < -0.98) { ink = ${glslColor(light ? '#5b21b6' : '#8b5cf6')}; alpha = 1.0; }
      color = mix(color, ink, alpha * coverage);
    }
  }
  gl_FragColor = vec4(color * uDim, 1.0);
}
`;
};

const gridFragment = (theme: Theme) => {
  const light = theme === 'day';
  return `${PRELUDE}
const float PITCH = 50.0;
const float BLOCK = 48.0;

void main() {
  vec2 css = cssCoord();
  vec3 color = ${glslColor(ARC_SURFACE[theme])};
  vec2 center = ceil(uSize / PITCH) / 2.0 + uPointer;
  vec2 index = floor(css / PITCH);
  float wave = sin(uTime - length(index - center) * 0.4);
  if (wave > 0.0) {
    float size = BLOCK * (wave * 0.7 + 0.3);
    vec2 low = (index * PITCH + (PITCH - size) / 2.0) * uDensity;
    vec2 high = low + size * uDensity;
    vec2 device = css * uDensity;
    vec2 overlap = clamp(min(device + 0.5, high) - max(device - 0.5, low), 0.0, 1.0);
    color = mix(color, ${light ? 'vec3(194.0, 65.0, 12.0)' : 'vec3(249.0, 115.0, 22.0)'} / 255.0, wave * ${light ? '0.2025' : '0.15'} * overlap.x * overlap.y);
  }
  gl_FragColor = vec4(color * uDim, 1.0);
}
`;
};

function createParticleDriver(fragment: (theme: Theme) => string, timeScale: number): DriverFactory {
  return (host, { theme }) => mountFullscreenShader(host, {
    engine: 'threeui-webgl',
    fragment: fragment(theme),
    setup(gl, uniform) {
      const time = uniform('uTime'), pointer = uniform('uPointer');
      gl.uniform1f(uniform('uDim'), 1);
      return {
        resize: cssSurfaceUniforms(gl, uniform),
        frame(seconds, mouse) {
          gl.uniform1f(time, seconds * timeScale);
          gl.uniform2f(pointer, mouse.x, mouse.y);
        },
      };
    },
  });
}

export const createSignalParticlesDriver = createParticleDriver(signalFragment, 1.2);
export const createOverrideGridDriver = createParticleDriver(gridFragment, 2.4);
