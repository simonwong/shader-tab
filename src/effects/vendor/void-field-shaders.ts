// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
export const vertex = `
attribute vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const fragment = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 uMouse;

vec2 barrel(vec2 uv, float amt) {
    vec2 cc = uv - 0.5;
    float r = dot(cc, cc);
    return uv + cc * r * amt;
}

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec2 mouseOffset = (uMouse - 0.5) * 0.05;
    uv += mouseOffset;

    uv = barrel(uv, 0.2);

    if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec2 gridCount = vec2(100.0, 100.0 * (iResolution.y / iResolution.x));
    vec2 gridUv = fract(uv * gridCount);
    vec2 id = floor(uv * gridCount);

    vec2 cc = id / gridCount - 0.5;
    float dist = length(cc);

    float pulse = sin(iTime * 1.5 - dist * 10.0) * 0.5 + 0.5;

    float dotSize = 0.35 * pulse;
    float d = length(gridUv - 0.5);
    float circle = smoothstep(dotSize, dotSize - 0.05, d);

    float scanline = sin(uv.y * 800.0) * 0.03;

    float flicker = rand(vec2(iTime, id.y)) > 0.98 ? 0.4 : 1.0;

    vec3 col = vec3(circle * pulse * flicker);
    col -= scanline;
    col *= vec3(0.7, 0.3, 1.0); // Purple tint

    col *= smoothstep(0.8, 0.2, dist);

    gl_FragColor = vec4(col, 1.0);
}
`;
