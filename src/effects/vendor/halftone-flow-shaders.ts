// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
export const vertex = `
attribute vec4 aVertexPosition;
void main() {
    gl_Position = aVertexPosition;
}
`;

export const fragment = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    vec2 flow_uv = p;
    float time = u_time * 0.4;

    for(float i = 1.0; i < 4.0; i++) {
        flow_uv *= rot(time * 0.1);
        flow_uv.x += sin(flow_uv.y * 2.0 * i + time) * 0.5;
        flow_uv.y += cos(flow_uv.x * 1.5 * i - time * 0.8) * 0.5;
    }

    float intensity = sin(flow_uv.x * 2.0 + flow_uv.y * 3.0) * 0.5 + 0.5;

    vec3 col_dark = vec3(0.02, 0.0, 0.0);
    vec3 col_red = vec3(0.8, 0.1, 0.05);
    vec3 col_bright = vec3(1.0, 0.6, 0.2);

    vec3 fluid_color = mix(col_dark, col_red, smoothstep(0.2, 0.6, intensity));
    fluid_color = mix(fluid_color, col_bright, smoothstep(0.7, 1.0, intensity));

    float gridSize = 6.0;
    vec2 grid_uv = gl_FragCoord.xy / gridSize;
    vec2 cell_uv = fract(grid_uv) - 0.5;

    float dist = length(cell_uv);
    float radius = intensity * 0.45;
    float dot_mask = smoothstep(radius, radius - 0.1, dist);

    vec3 final_color = mix(vec3(0.0), fluid_color, dot_mask);
    final_color += fluid_color * 0.15;

    gl_FragColor = vec4(final_color, 1.0);
}
`;
