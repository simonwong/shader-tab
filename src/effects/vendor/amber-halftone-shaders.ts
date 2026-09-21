// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
export const vertex = `
attribute float scale;
varying vec2 vUv;
varying float vScale;
uniform float time;
uniform float pixelRatio;

void main() {
    vUv = position.xy;
    float dist = length(position.xy);
    float animatedScale = scale * (sin(dist * 6.0 - time * 2.5) * 0.5 + 0.5);
    vScale = animatedScale;

    gl_PointSize = animatedScale * 9.0 * pixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragment = `
uniform vec3 color1;
uniform vec3 color2;
varying vec2 vUv;
varying float vScale;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;

    vec3 finalColor = mix(color2, color1, (vUv.y + 1.0) * 0.5);
    gl_FragColor = vec4(finalColor, vScale * 0.9);
}
`;
