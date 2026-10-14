/*
 * Shader Gradient: a plain WebGL port of the ShaderGradient "defaults" plane
 * and waterPlane materials (MIT, ruucm and stone-skipper), without three.js.
 *
 * The original renders a subdivided plane whose vertices are pushed along the
 * normal by 3D Perlin noise, viewed through a perspective camera. Its "3d"
 * light type is a single ambient light of intensity brightness·π on a
 * MeshPhysicalMaterial with metalness 0.2 and no environment map, so the lit
 * colour is exactly the base colour × 0.8 × brightness: no directional
 * shading, which is why the whole look can be reproduced here. Colours are
 * used as raw 0–1 sRGB values with no tone mapping, as in the original.
 *
 * The presets are calm looks designed from ShaderGradient's customiser: muted
 * palettes and a slow noise clock. A static per-pixel dither hides the 8-bit
 * banding that low-contrast gradients otherwise show.
 */
import { THEME_BRIGHTNESS, type Theme } from '../presets';
import { hexColor, mountShader } from './webgl';
import type { DriverFactory } from './types';

const VERTEX = `
attribute vec3 position;
uniform mat4 uMatrix;
uniform float uTime;
uniform float uNoiseDensity;
uniform float uNoiseStrength;
varying vec3 vPos;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

// Classic 3D Perlin noise (glsl-noise, Stefan Gustavson), scaled by 2.2 as in ShaderGradient.
float cnoise(vec3 P) {
  vec3 Pi0 = mod289(floor(P));
  vec3 Pi1 = mod289(floor(P) + vec3(1.0));
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + Pi0.zzzz);
  vec4 ixy1 = permute(ixy + Pi1.zzzz);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
}

void main() {
  // The plane's normal is +z, so the displacement only moves z.
  float distortion = 0.75 * cnoise(0.43 * position * uNoiseDensity + uTime);
  vPos = position + vec3(0.0, 0.0, distortion * uNoiseStrength);
  gl_Position = uMatrix * vec4(vPos, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uLight;
varying vec3 vPos;

void main() {
  // ShaderGradient's base colour; vPos.z is the noise displacement and may fall outside 0–1.
  vec3 color = mix(mix(uColor1, uColor2, smoothstep(-3.0, 3.0, vPos.x)), uColor3, vPos.z) * uLight;
  // Static dither of ±0.5/255 against banding (interleaved gradient noise of the pixel position, so it never moves).
  float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  gl_FragColor = vec4(color + (noise - 0.5) / 255.0, 1.0);
}
`;

type Vec3 = readonly [number, number, number];

interface GradientLook {
  type: 'plane' | 'waterPlane';
  colors: Record<Theme, readonly [string, string, string]>;
  brightness: Record<Theme, number>;
  /** Noise clock per breathing second (the breathing clock runs at about 0.12x real time). */
  speed: number;
  /**
   * Starting noise time. Whole numbers put every vertex on a lattice plane of
   * the noise, where the folds are flattest, so the looks start between them.
   */
  time: number;
  density: number;
  strength: number;
  /** Mesh position and rotation in degrees (XYZ order). */
  position: Vec3;
  rotation: Vec3;
  /** Camera on a sphere around the origin: azimuth and polar angle in degrees. */
  azimuth: number;
  polar: number;
  distance: number;
  /**
   * Largest half-diagonal, in units of the half-height, that the mesh covers
   * throughout its motion. Wider screens zoom in further so the corners stay
   * covered.
   */
  cover: number;
}

/*
 * Dusk follows the default Halo framing, Ocean the "Nighty night" low camera
 * over slow dunes, Sage a mirrored Halo diagonal. Dusk and Sage move about
 * 0.05 noise units per real second, Ocean 0.02 (Halo uses 0.4).
 */
const LOOKS: Record<string, GradientLook> = {
  dusk: {
    type: 'plane',
    colors: { day: ['#bcaad2', '#e8ddd6', '#a9b5d2'], night: ['#4a3f66', '#2c2b45', '#5d4f78'] },
    brightness: { day: 1.1, night: 1.1 },
    speed: 0.42,
    time: 0.5,
    density: 1.1,
    strength: 2.5,
    position: [-1.4, 0, 0],
    rotation: [0, 10, 50],
    azimuth: 180,
    polar: 90,
    distance: 3.6,
    cover: 2.4,
  },
  ocean: {
    type: 'waterPlane',
    colors: { day: ['#a9c3d1', '#c9dae3', '#7fa1b5'], night: ['#24384b', '#34495b', '#18242f'] },
    brightness: { day: 1.1, night: 1.1 },
    // The dune silhouette moves more pixels than the soft plane bands, so Ocean runs slower.
    speed: 0.16,
    time: 0.5,
    density: 1.5,
    strength: 1.5,
    position: [0, 0, 0],
    rotation: [50, 0, -60],
    azimuth: 180,
    polar: 80,
    distance: 2.8,
    cover: 2,
  },
  sage: {
    type: 'plane',
    colors: { day: ['#c8d3c0', '#eef0e8', '#a8b9a4'], night: ['#34433a', '#27322c', '#4a5a4c'] },
    brightness: { day: 1.05, night: 1.1 },
    speed: 0.42,
    time: 0.5,
    density: 1.2,
    strength: 2.5,
    position: [1.2, 0, 0],
    rotation: [0, -10, -40],
    azimuth: 180,
    polar: 90,
    distance: 3.6,
    cover: 2.4,
  },
};

const FOV = 45;
/** ShaderGradient's segment count: a 10×10 plane, 1×192 segments for plane, 192×192 for waterPlane. */
const SEGMENTS = 192;

/** Plane vertices (x, y, 0) and triangle indices, as three.js PlaneGeometry lays them out. */
function planeGeometry(columns: number, rows: number) {
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  for (let row = 0, offset = 0; row <= rows; row++)
    for (let column = 0; column <= columns; column++, offset += 3) {
      positions[offset] = (column / columns - 0.5) * 10;
      positions[offset + 1] = (0.5 - row / rows) * 10;
    }
  const indices = new Uint16Array(columns * rows * 6);
  for (let row = 0, offset = 0; row < rows; row++)
    for (let column = 0; column < columns; column++, offset += 6) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      indices.set([a, b, a + 1, b, b + 1, a + 1], offset);
    }
  return { positions, indices };
}

type Mat4 = number[];
/** Column-major 4×4 product a·b. */
function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = Array.from<number>({ length: 16 });
  for (let column = 0; column < 4; column++)
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row]! * b[column * 4 + k]!;
      out[column * 4 + row] = sum;
    }
  return out;
}
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Model matrix: translation · Rx · Ry · Rz (three.js Euler order XYZ). */
function modelMatrix([x, y, z]: Vec3, rotation: Vec3): Mat4 {
  const [a, b, c] = rotation.map(radians) as [number, number, number];
  const rx = [
    1,
    0,
    0,
    0,
    0,
    Math.cos(a),
    Math.sin(a),
    0,
    0,
    -Math.sin(a),
    Math.cos(a),
    0,
    0,
    0,
    0,
    1,
  ];
  const ry = [
    Math.cos(b),
    0,
    -Math.sin(b),
    0,
    0,
    1,
    0,
    0,
    Math.sin(b),
    0,
    Math.cos(b),
    0,
    0,
    0,
    0,
    1,
  ];
  const rz = [
    Math.cos(c),
    Math.sin(c),
    0,
    0,
    -Math.sin(c),
    Math.cos(c),
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ];
  const translate = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  return multiply(translate, multiply(rx, multiply(ry, rz)));
}

function normalize(v: readonly number[]): [number, number, number] {
  const length = Math.hypot(...v) || 1;
  return v.map(value => value / length) as [number, number, number];
}

function cross(p: readonly number[], q: readonly number[]): [number, number, number] {
  return [
    p[1]! * q[2]! - p[2]! * q[1]!,
    p[2]! * q[0]! - p[0]! * q[2]!,
    p[0]! * q[1]! - p[1]! * q[0]!,
  ];
}

/** View matrix of a camera on a sphere (three.js Spherical) looking at the origin, y up. */
function viewMatrix(azimuth: number, polar: number, distance: number): Mat4 {
  const theta = radians(azimuth),
    phi = radians(polar);
  const eye = [
    distance * Math.sin(phi) * Math.sin(theta),
    distance * Math.cos(phi),
    distance * Math.sin(phi) * Math.cos(theta),
  ] as const;
  const forward = normalize(eye);
  const right = normalize(cross([0, 1, 0], forward));
  const up = cross(forward, right);
  const dot = (v: readonly number[]) => v[0]! * eye[0] + v[1]! * eye[1] + v[2]! * eye[2];
  return [
    right[0],
    up[0],
    forward[0],
    0,
    right[1],
    up[1],
    forward[1],
    0,
    right[2],
    up[2],
    forward[2],
    0,
    -dot(right),
    -dot(up),
    -dot(forward),
    1,
  ];
}

/** three.js PerspectiveCamera projection (vertical fov, zoom), near 0.1, far 1000. */
function projectionMatrix(aspect: number, zoom: number): Mat4 {
  const near = 0.1,
    far = 1000;
  const f = zoom / Math.tan(radians(FOV) / 2);
  return [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ];
}

export const createDriver: DriverFactory = (host, { theme, variant }) => {
  const look = LOOKS[variant] ?? LOOKS.dusk!;
  return mountShader(host, {
    engine: 'shader-gradient-webgl',
    depth: true,
    vertex: VERTEX,
    fragment: FRAGMENT,
    attribute: null,
    setup(gl, uniform, resources) {
      const { positions, indices } = planeGeometry(look.type === 'plane' ? 1 : SEGMENTS, SEGMENTS);
      gl.bindBuffer(gl.ARRAY_BUFFER, resources.buffer());
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      const position = resources.attribute('position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resources.buffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      gl.enable(gl.DEPTH_TEST);

      const [color1, color2, color3] = look.colors[theme];
      gl.uniform3fv(uniform('uColor1'), hexColor(color1));
      gl.uniform3fv(uniform('uColor2'), hexColor(color2));
      gl.uniform3fv(uniform('uColor3'), hexColor(color3));
      // Ambient light brightness·π over a Lambert BRDF (1/π) on 1 − metalness (0.2) of the base colour.
      gl.uniform1f(uniform('uLight'), 0.8 * look.brightness[theme] * THEME_BRIGHTNESS[theme]);
      gl.uniform1f(uniform('uNoiseDensity'), look.density);
      gl.uniform1f(uniform('uNoiseStrength'), look.strength);
      const background = hexColor(color2).map(
        value => value * 0.8 * look.brightness[theme] * THEME_BRIGHTNESS[theme],
      );
      gl.clearColor(background[0]!, background[1]!, background[2]!, 1);
      const matrix = uniform('uMatrix'),
        time = uniform('uTime');
      const view = multiply(
        viewMatrix(look.azimuth, look.polar, look.distance),
        modelMatrix(look.position, look.rotation),
      );

      return {
        resize({ width, height }) {
          const aspect = width / height;
          // ShaderGradient ignores cameraZoom for planes (zoom stays 1); only wide screens zoom in.
          const zoom = Math.max(1, Math.hypot(aspect, 1) / look.cover);
          gl.uniformMatrix4fv(matrix, false, multiply(projectionMatrix(aspect, zoom), view));
        },
        frame(seconds) {
          gl.uniform1f(time, look.time + seconds * look.speed);
        },
        draw() {
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        },
      };
    },
  });
};
