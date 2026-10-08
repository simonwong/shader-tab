/*
 * Pixel Field: an original single-pass WebGL shader written for Shader Tab.
 *
 * The screen is divided into a grid of small cells. A slow, domain-warped
 * gradient-noise field gives every cell a density; an 8x8 ordered-dither
 * (Bayer) threshold decides whether the cell is lit, so dense regions read as
 * solid colour and thin regions break into scattered pixels. Pointer movement
 * and clicks start expanding rings that brighten cells and nudge their shapes
 * outward. Everything is drawn by one fragment shader over a fullscreen
 * triangle: one draw call per frame, no offscreen buffers.
 */
import { getEffect, THEME_BRIGHTNESS } from '../presets';
import { releaseCanvas } from './surface';
import {
  bindFullscreenTriangle,
  deleteProgram,
  linkProgram,
  loseContext,
  type LinkedProgram,
} from './webgl';
import type { DriverFactory, Pointer } from './types';

/** Output brightness per theme, baked into the shader instead of a CSS filter. */
const SHAPES: Record<string, number> = { square: 0, circle: 1, triangle: 2, diamond: 3 };
/** Cell pitch in CSS pixels; rounded to an even number of device pixels. */
const CELL_CSS = 8;
const RIPPLES = 10;
/** Seconds a ripple stays visible; must match RIPPLE_LIFE in the shader. */
const RIPPLE_LIFE = 2.6;
const TRAIL_INTERVAL = 0.3;
const TRAIL_DISTANCE = 0.07;
const TRAIL_STRENGTH = 0.32;
const CLICK_STRENGTH = 1;

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

#define RIPPLES ${RIPPLES}
#define RIPPLE_LIFE ${RIPPLE_LIFE.toFixed(2)}

uniform vec2 uResolution;
uniform float uTime;
uniform float uCell;
uniform float uShape;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uGlow;
uniform float uInkStrength;
uniform float uBrightness;
uniform vec3 uHover;          // xy: pointer in 0..1 (y up), z: strength
uniform vec4 uRipples[RIPPLES]; // xy: origin in 0..1 (y up), z: age in seconds, w: strength

vec2 grad(vec2 cell) {
  vec3 q = fract(vec3(cell.xyx) * vec3(.1013, .1171, .0927));
  q += dot(q, q.yzx + 19.19);
  float angle = fract((q.x + q.y) * q.z) * 6.2831853;
  return vec2(cos(angle), sin(angle));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad(i), f);
  float b = dot(grad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(grad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(grad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  const mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
  float sum = 0.0;
  float weight = .55;
  for (int octave = 0; octave < 3; octave++) {
    sum += weight * noise(p);
    p = turn * p + 7.31;
    weight *= .48;
  }
  return sum;
}

// Ordered-dither threshold of an 8x8 Bayer matrix, built from the 2x2 one.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * .5 + a.y * a.y * .75);
}
float bayer4(vec2 a) {
  return bayer2(a * .5) * .25 + bayer2(a);
}
float bayer8(vec2 a) {
  return bayer4(a * .5) * .25 + bayer2(a);
}

float shapeDistance(vec2 p, float size) {
  if (uShape < .5) return max(abs(p.x), abs(p.y)) - size;
  if (uShape < 1.5) return length(p) - size * 1.12;
  if (uShape < 2.5) {
    float inradius = size * .68;
    p.y += inradius * .5;
    return max(-p.y, abs(p.x) * .8660254 + p.y * .5) - inradius;
  }
  return (abs(p.x) + abs(p.y)) * .7071068 - size * .98;
}

// Matches the CSS fallback gradients so the canvas fades in without a jump.
float glow(vec2 uv, vec2 center, vec2 radius, float stop) {
  return 1.0 - smoothstep(0.0, stop, length((uv - center) / radius));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 cellId = floor(frag / uCell);
  vec2 local = fract(frag / uCell) - .5;
  vec2 center = (cellId + .5) * uCell / uResolution.y;

  float t = uTime * 1.6;
  vec2 p = center * 2.1;
  vec2 warp = vec2(
    noise(p * .55 + vec2(t * .21, -t * .13)),
    noise(p * .55 + vec2(4.7 - t * .17, 2.3 + t * .19))
  );
  float field = fbm(p + warp * 1.1 + vec2(t * .07, t * .03));
  vec2 focus = vec2(aspect * (.7 + .08 * sin(t * .23)), .32 + .07 * cos(t * .19));
  float pool = 1.0 - smoothstep(.15, 1.15, length(center - focus));
  float density = smoothstep(-.12, .42, field + pool * .26 - .09);

  vec2 push = vec2(0.0);
  float energy = 0.0;
  for (int index = 0; index < RIPPLES; index++) {
    vec4 ripple = uRipples[index];
    if (ripple.w <= 0.0 || ripple.z > RIPPLE_LIFE) continue;
    vec2 offset = center - vec2(ripple.x * aspect, ripple.y);
    float dist = length(offset);
    float life = ripple.z / RIPPLE_LIFE;
    float band = (dist - ripple.z * .42) / (.026 + ripple.z * .02);
    float trough = band + 1.9;
    float fade = (1.0 - life) * (1.0 - life) * ripple.w;
    float wave = (exp(-band * band) - .38 * exp(-trough * trough)) * fade;
    energy += wave;
    push += offset / max(dist, 1e-3) * wave;
  }
  vec2 hoverOffset = center - vec2(uHover.x * aspect, uHover.y);
  float hover = exp(-dot(hoverOffset, hoverOffset) * 34.0) * uHover.z;
  energy += hover * .32;
  push += hoverOffset * hover * 1.4;

  float level = density + energy * .7;
  float threshold = bayer8(cellId) * .96 + .02;
  float lit = smoothstep(threshold, threshold + .06, level);
  float tone = mix(.62, 1.0, smoothstep(0.0, .35, level - threshold));
  float spark = clamp(energy, 0.0, 1.0);

  vec2 shift = push * .16;
  float shiftLength = length(shift);
  if (shiftLength > .12) shift *= .12 / shiftLength;
  float size = (floor(.34 * uCell + .5) + floor(min(energy, 1.0) * .06 * uCell)) / uCell;
  float edge = shapeDistance(local - shift, size) * uCell;
  float cover = clamp(.5 - edge, 0.0, 1.0) * lit;

  vec3 paper = uPaper;
  paper = mix(paper, uInk, .33 * glow(uv, vec2(.75, .7), vec2(1.06, .99), .65));
  paper = mix(paper, uInk, .2 * glow(uv, vec2(.2, .2), vec2(1.13, 1.13), .6));
  vec3 ink = mix(uInk, uGlow, spark);
  float alpha = min(1.0, tone * uInkStrength + spark * .3);
  vec3 color = mix(paper, ink, cover * alpha);
  // Half-step noise keeps the soft background gradients free of 8-bit banding.
  float grain = fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453) - .5;
  gl_FragColor = vec4(color * uBrightness + grain / 255.0, 1.0);
}
`;

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** Pointer coordinates (-1..1, y up) to shader UV (0..1, y down), written into `out`. */
function toUv(pointer: Pointer, out: { x: number; y: number }) {
  out.x = (pointer.x + 1) * 0.5;
  out.y = 1 - (pointer.y + 1) * 0.5;
}

export const createDriver: DriverFactory = (host, { theme, variant }) => {
  const canvas = document.createElement('canvas');
  const options: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  };
  const gl = canvas.getContext('webgl2', options) ?? canvas.getContext('webgl', options);
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
    linked = linkProgram(gl, VERTEX, FRAGMENT);
    const { program } = linked;
    gl.useProgram(program);
    buffer = bindFullscreenTriangle(gl, program, 'position');
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const resolution = uniform('uResolution');
    const time = uniform('uTime');
    const cell = uniform('uCell');
    const hover = uniform('uHover');
    const ripples = uniform('uRipples');

    const preset = getEffect('pixel-blast');
    gl.uniform3fv(uniform('uPaper'), rgb(preset.base[theme]));
    /* Ripples push lit cells towards a lighter tint at night and a deeper one by day. */
    const ink = rgb(preset[theme][0]);
    gl.uniform3fv(uniform('uInk'), ink);
    gl.uniform3fv(
      uniform('uGlow'),
      ink.map(channel => (theme === 'day' ? channel * 0.7 : channel + (1 - channel) * 0.45)),
    );
    gl.uniform1f(uniform('uInkStrength'), theme === 'day' ? 0.82 : 0.78);
    gl.uniform1f(uniform('uBrightness'), THEME_BRIGHTNESS[theme]);
    gl.uniform1f(uniform('uShape'), SHAPES[variant] ?? 0);

    /* Ripple ring buffer, uploaded as-is; ages advance with real frame time. */
    const rippleData = new Float32Array(RIPPLES * 4);
    let nextRipple = 0;
    let ripplesLive = false;
    let clock = 0;
    let lastTrail = -Infinity;
    const trailFrom = { x: 0, y: 0 };
    const cursor = { x: 0.5, y: 0.5 };
    const tap = { x: 0.5, y: 0.5 };
    const smoothed = { x: 0.5, y: 0.5 };
    let lastMove = -Infinity;
    let hoverStrength = 0;

    const emit = (x: number, y: number, strength: number) => {
      const offset = nextRipple * 4;
      rippleData[offset] = x;
      rippleData[offset + 1] = y;
      rippleData[offset + 2] = 0;
      rippleData[offset + 3] = strength;
      nextRipple = (nextRipple + 1) % RIPPLES;
      ripplesLive = true;
    };

    host.append(canvas);
    return {
      canvas,
      engine: 'shader-tab-webgl',
      resize(width, height, density) {
        const pitch = Math.max(4, 2 * Math.round((CELL_CSS * density) / 2));
        canvas.width = Math.max(1, Math.round(width * density));
        canvas.height = Math.max(1, Math.round(height * density));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(cell, pitch);
      },
      move(pointer) {
        toUv(pointer, cursor);
        if (lastMove === -Infinity) {
          smoothed.x = cursor.x;
          smoothed.y = cursor.y;
        }
        lastMove = clock;
        const aspect = canvas.width / canvas.height;
        const travelled = Math.hypot((cursor.x - trailFrom.x) * aspect, cursor.y - trailFrom.y);
        if (travelled > TRAIL_DISTANCE && clock - lastTrail > TRAIL_INTERVAL) {
          emit(cursor.x, cursor.y, TRAIL_STRENGTH);
          trailFrom.x = cursor.x;
          trailFrom.y = cursor.y;
          lastTrail = clock;
        }
      },
      click(pointer) {
        toUv(pointer, tap);
        emit(tap.x, tap.y, CLICK_STRENGTH);
      },
      render(seconds, delta) {
        clock += delta;
        const follow = 1 - Math.exp(-delta * 8);
        smoothed.x += (cursor.x - smoothed.x) * follow;
        smoothed.y += (cursor.y - smoothed.y) * follow;
        const targetHover = clock - lastMove < 1.2 ? 1 : 0;
        hoverStrength +=
          (targetHover - hoverStrength) * (1 - Math.exp(-delta * (targetHover ? 4 : 1.5)));
        gl.uniform3f(hover, smoothed.x, smoothed.y, hoverStrength);
        if (ripplesLive) {
          ripplesLive = false;
          for (let index = 2; index < rippleData.length; index += 4) {
            if (rippleData[index + 1]! <= 0) continue;
            rippleData[index] = rippleData[index]! + delta;
            if (rippleData[index]! > RIPPLE_LIFE) rippleData[index + 1] = 0;
            else ripplesLive = true;
          }
          gl.uniform4fv(ripples, rippleData);
        }
        gl.uniform1f(time, seconds);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
};
