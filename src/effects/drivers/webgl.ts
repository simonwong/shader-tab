import { releaseCanvas } from './surface';
import type { EffectDriver, Pointer } from './types';

type GL = WebGLRenderingContext | WebGL2RenderingContext;

export interface LinkedProgram {
  program: WebGLProgram;
  vertex: WebGLShader;
  fragment: WebGLShader;
}

export function compileShader(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || 'Shader compilation failed');
  }
  return shader;
}

/** Compiles and links a program; everything created is released again if any step fails. */
export function linkProgram(gl: GL, vertexSource: string, fragmentSource: string): LinkedProgram {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fragment: WebGLShader | undefined;
  let program: WebGLProgram | null = null;
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('Unable to create shader program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
    }
    return { program, vertex, fragment };
  } catch (error) {
    gl.deleteProgram(program);
    if (fragment) gl.deleteShader(fragment);
    gl.deleteShader(vertex);
    throw error;
  }
}

export function deleteProgram(gl: GL, linked: LinkedProgram | undefined): void {
  if (!linked) return;
  gl.deleteProgram(linked.program);
  gl.deleteShader(linked.vertex);
  gl.deleteShader(linked.fragment);
}

/**
 * Uploads one triangle that covers the viewport and binds it to `attribute`.
 * Returns the buffer so the caller can delete it on dispose.
 */
export function bindFullscreenTriangle(gl: GL, program: WebGLProgram, attribute: string): WebGLBuffer | null {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, attribute);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  return buffer;
}

export function loseContext(gl: GL | null | undefined): void {
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
}

/** Vertex shader for `bindFullscreenTriangle` with the attribute named `position`. */
export const FULLSCREEN_VERTEX = 'attribute vec2 position;\nvoid main() { gl_Position = vec4(position, 0.0, 1.0); }';

export interface FullscreenSurface {
  /** Backing-store size in device pixels. */
  pixelWidth: number;
  pixelHeight: number;
  /** CSS-pixel size of the surface. */
  width: number;
  height: number;
  /** Device pixels per CSS pixel actually used by the backing store. */
  density: number;
}

type UniformLookup = (name: string) => WebGLUniformLocation | null;

export interface FullscreenShaderSpec {
  engine: string;
  fragment: string;
  vertex?: string;
  /** Attribute that receives the fullscreen triangle; defaults to `position`. */
  attribute?: string;
  /** Runs once after linking with the program bound, and returns the per-frame callbacks. */
  setup: (gl: WebGLRenderingContext, uniform: UniformLookup) => {
    resize?: (surface: FullscreenSurface) => void;
    frame: (seconds: number, pointer: Pointer) => void;
  };
}

/**
 * Mounts an opaque WebGL canvas that draws one fullscreen fragment shader per
 * frame. The shader writes every pixel, so the context has no alpha, depth,
 * stencil or antialiasing.
 */
export function mountFullscreenShader(host: HTMLElement, spec: FullscreenShaderSpec): EffectDriver {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
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
    linked = linkProgram(gl, spec.vertex ?? FULLSCREEN_VERTEX, spec.fragment);
    const { program } = linked;
    gl.useProgram(program);
    buffer = bindFullscreenTriangle(gl, program, spec.attribute ?? 'position');
    const callbacks = spec.setup(gl, name => gl.getUniformLocation(program, name));
    host.append(canvas);
    return {
      canvas,
      engine: spec.engine,
      resize(width, height, density) {
        canvas.width = Math.max(1, Math.round(width * density));
        canvas.height = Math.max(1, Math.round(height * density));
        gl.viewport(0, 0, canvas.width, canvas.height);
        callbacks.resize?.({ pixelWidth: canvas.width, pixelHeight: canvas.height, width, height, density });
      },
      render(seconds, _delta, pointer) {
        callbacks.frame(seconds, pointer);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

/**
 * Resize callback for shaders that work in CSS pixels: feeds `uCanvas`
 * (backing store size), `uDensity` and `uSize` (CSS size).
 */
export function cssSurfaceUniforms(gl: WebGLRenderingContext, uniform: UniformLookup): (surface: FullscreenSurface) => void {
  const canvas = uniform('uCanvas'), density = uniform('uDensity'), size = uniform('uSize');
  return surface => {
    gl.uniform2f(canvas, surface.pixelWidth, surface.pixelHeight);
    gl.uniform1f(density, surface.density);
    gl.uniform2f(size, surface.width, surface.height);
  };
}

/** `#rrggbb` as a 0–1 RGB triple. */
export function hexColor(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
}

/** GLSL `vec3` literal for a `#rrggbb` colour. */
export function glslColor(hex: string): string {
  return `vec3(${hexColor(hex).map(channel => channel.toFixed(6)).join(', ')})`;
}
