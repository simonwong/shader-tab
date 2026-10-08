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
