import type { DriverFactory } from './types';
export const createDriver: DriverFactory = async (host, _effect, theme, _shape, variant) => {
  const shaders = variant === 'void-field' ? await import('../vendor/void-field-shaders')
    : variant === 'halftone-flow' ? await import('../vendor/halftone-flow-shaders') : await import('../vendor/ribbon-field-shaders');
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL is unavailable');
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message ?? 'Shader compilation failed'); }
    return shader;
  };
  let vertex: WebGLShader | undefined, fragment: WebGLShader | undefined, program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
  const dispose = () => { gl.deleteBuffer(buffer); gl.deleteProgram(program); if (vertex) gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment); gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove(); };
  try {
    vertex = compile(gl.VERTEX_SHADER, shaders.vertex); fragment = compile(gl.FRAGMENT_SHADER, shaders.fragment);
    program = gl.createProgram()!; gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link failed');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, variant === 'halftone-flow' ? 'aVertexPosition' : 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const names = variant === 'void-field' ? ['iResolution', 'iTime', 'uMouse'] : variant === 'halftone-flow' ? ['u_resolution', 'u_time', ''] : ['resolution', 'time', 'pointer'];
    const [resolution, time, pointer] = names.map(name => gl.getUniformLocation(program!, name));
    gl.uniform1f(gl.getUniformLocation(program, 'lightMode'), theme === 'day' ? 1 : 0);
    host.append(canvas);
    return {
      canvas, engine: 'threeui-webgl',
      resize(width, height, density) { canvas.width = Math.max(1, Math.round(width * density)); canvas.height = Math.max(1, Math.round(height * density)); gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(resolution ?? null, canvas.width, canvas.height); },
      render(seconds, _delta, mouse) { gl.uniform1f(time ?? null, seconds); gl.uniform2f(pointer ?? null, .5 + mouse.x * .15, .5 - mouse.y * .15); gl.drawArrays(gl.TRIANGLES, 0, 3); },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
};
