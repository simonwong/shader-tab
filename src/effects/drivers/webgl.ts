import { releaseCanvas } from './surface';
import type { EffectDriver, Pointer } from './types';

type GL = WebGLRenderingContext | WebGL2RenderingContext;

interface LinkedProgram {
  program: WebGLProgram;
  vertex: WebGLShader;
  fragment: WebGLShader;
}

function compileShader(gl: GL, type: number, source: string): WebGLShader {
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
function linkProgram(gl: GL, vertexSource: string, fragmentSource: string): LinkedProgram {
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

function deleteProgram(gl: GL, linked: LinkedProgram | undefined): void {
  if (!linked) return;
  gl.deleteProgram(linked.program);
  gl.deleteShader(linked.vertex);
  gl.deleteShader(linked.fragment);
}

/**
 * Uploads one triangle that covers the viewport and binds it to `attribute`.
 * Returns the buffer so the caller can delete it on dispose.
 */
function bindFullscreenTriangle(
  gl: GL,
  program: WebGLProgram,
  attribute: string,
): WebGLBuffer | null {
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

/** Vertex shader for the fullscreen triangle, with the attribute named `position`. */
const FULLSCREEN_VERTEX =
  'attribute vec2 position;\nvoid main() { gl_Position = vec4(position, 0.0, 1.0); }';

export interface ShaderSurface {
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

/** Helpers for `setup`. Buffers, textures and cleanups made here are released with the driver. */
export interface ShaderResources {
  /** Location of a vertex attribute in the program. */
  attribute: (name: string) => number;
  buffer: () => WebGLBuffer | null;
  texture: () => WebGLTexture | null;
  /** Runs `cleanup` when the driver is disposed. */
  onDispose: (cleanup: () => void) => void;
}

export interface ShaderCallbacks {
  resize?: (surface: ShaderSurface) => void;
  /** Sets the uniforms for a frame; `delta` is the frame time in seconds. */
  frame: (seconds: number, pointer: Pointer, delta: number) => void;
  move?: (pointer: Pointer) => void;
  click?: (pointer: Pointer) => void;
  /** Issues the draw calls; defaults to the fullscreen triangle. */
  draw?: () => void;
}

export interface ShaderSpec {
  engine: string;
  /** Context to create: WebGL 1 (the default), WebGL 2, or WebGL 2 falling back to 1. */
  context?: 'webgl' | 'webgl2' | 'webgl2-or-webgl';
  /** Whether the context gets a depth buffer; off by default. */
  depth?: boolean;
  fragment: string;
  vertex?: string;
  /**
   * Attribute that receives the fullscreen triangle; defaults to `position`.
   * `null` when `setup` binds its own geometry and `draw`s it.
   */
  attribute?: string | null;
  /** Runs once after linking with the program bound, and returns the per-frame callbacks. */
  setup: (gl: GL, uniform: UniformLookup, resources: ShaderResources) => ShaderCallbacks;
}

/**
 * Mounts an opaque WebGL canvas that draws one shader program per frame, by
 * default as a fullscreen triangle. The program writes every pixel, so the
 * context has no alpha, stencil or antialiasing. The module sizes the canvas
 * and viewport, and releases the program, the context and everything made
 * through `ShaderResources` on dispose or when `setup` throws.
 */
export function mountShader(host: HTMLElement, spec: ShaderSpec): EffectDriver {
  const canvas = document.createElement('canvas');
  const attributes: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: spec.depth ?? false,
    stencil: false,
    powerPreference: 'low-power',
  };
  const kind = spec.context ?? 'webgl';
  const gl: GL | null =
    kind === 'webgl'
      ? canvas.getContext('webgl', attributes)
      : (canvas.getContext('webgl2', attributes) ??
        (kind === 'webgl2-or-webgl' ? canvas.getContext('webgl', attributes) : null));
  if (!gl) throw new Error(kind === 'webgl2' ? 'WebGL 2 is unavailable' : 'WebGL is unavailable');
  let linked: LinkedProgram | undefined;
  const buffers: (WebGLBuffer | null)[] = [];
  const textures: (WebGLTexture | null)[] = [];
  const cleanups: (() => void)[] = [];
  const resources: ShaderResources = {
    attribute: name => (linked ? gl.getAttribLocation(linked.program, name) : -1),
    buffer: () => {
      const buffer = gl.createBuffer();
      buffers.push(buffer);
      return buffer;
    },
    texture: () => {
      const texture = gl.createTexture();
      textures.push(texture);
      return texture;
    },
    onDispose: cleanup => cleanups.push(cleanup),
  };
  const dispose = () => {
    textures.forEach(texture => gl.deleteTexture(texture));
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
    deleteProgram(gl, linked);
    loseContext(gl);
    releaseCanvas(canvas);
    cleanups.forEach(cleanup => cleanup());
  };
  try {
    linked = linkProgram(gl, spec.vertex ?? FULLSCREEN_VERTEX, spec.fragment);
    const { program } = linked;
    gl.useProgram(program);
    const attribute = spec.attribute === undefined ? 'position' : spec.attribute;
    if (attribute !== null) buffers.push(bindFullscreenTriangle(gl, program, attribute));
    const callbacks = spec.setup(gl, name => gl.getUniformLocation(program, name), resources);
    const draw = callbacks.draw ?? (() => gl.drawArrays(gl.TRIANGLES, 0, 3));
    host.append(canvas);
    return {
      canvas,
      engine: spec.engine,
      resize(width, height, density) {
        canvas.width = Math.max(1, Math.round(width * density));
        canvas.height = Math.max(1, Math.round(height * density));
        gl.viewport(0, 0, canvas.width, canvas.height);
        callbacks.resize?.({
          pixelWidth: canvas.width,
          pixelHeight: canvas.height,
          width,
          height,
          density,
        });
      },
      render(seconds, delta, pointer) {
        callbacks.frame(seconds, pointer, delta);
        draw();
      },
      move: callbacks.move,
      click: callbacks.click,
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
export function cssSurfaceUniforms(
  gl: GL,
  uniform: UniformLookup,
): (surface: ShaderSurface) => void {
  const canvas = uniform('uCanvas'),
    density = uniform('uDensity'),
    size = uniform('uSize');
  return surface => {
    gl.uniform2f(canvas, surface.pixelWidth, surface.pixelHeight);
    gl.uniform1f(density, surface.density);
    gl.uniform2f(size, surface.width, surface.height);
  };
}

/** `#rrggbb` as a 0–1 RGB triple. */
export function hexColor(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** GLSL `vec3` literal for a `#rrggbb` colour. */
export function glslColor(hex: string): string {
  return `vec3(${hexColor(hex)
    .map(channel => channel.toFixed(6))
    .join(', ')})`;
}
