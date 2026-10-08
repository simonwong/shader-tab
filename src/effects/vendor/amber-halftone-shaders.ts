// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Modified by Shader Tab: the three.js point cloud (one point sprite per grid
// node) is evaluated as one fullscreen fragment shader. Each pixel finds its
// nearest grid node and applies the original sprite size, round mask, colour
// ramp and alpha, so three.js is no longer needed.
//
// Uniforms: uCanvas (backing store, device px), uAspect (CSS width / height),
// uDensity (device px per CSS px), uTime (seconds), uOffset (pointer drift in
// view units), uColumns (grid half-width in nodes), uColor1/uColor2 (linear RGB,
// as three.js passed them), uBackground (sRGB clear colour), uDim.
export const fragment = `precision highp float;
uniform vec2 uCanvas;
uniform float uAspect;
uniform float uDensity;
uniform float uTime;
uniform vec2 uOffset;
uniform float uColumns;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uBackground;
uniform float uDim;
const float SPACING = 0.085;
const float ROWS = 13.0;

void main() {
  // The original orthographic camera spans [-aspect, aspect] x [-1, 1].
  vec2 view = (gl_FragCoord.xy / uCanvas * 2.0 - 1.0) * vec2(uAspect, 1.0);
  vec2 local = view - uOffset;
  vec2 node = clamp(floor(local / SPACING + 0.5), vec2(-uColumns, -ROWS), vec2(uColumns, ROWS)) * SPACING;
  float scale = sin(length(node) * 6.0 - uTime * 2.5) * 0.5 + 0.5;
  // Point sprites never rasterise smaller than one pixel.
  float size = max(scale * 9.0 * uDensity, 1.0);
  vec2 center = ((node + uOffset) / vec2(uAspect, 1.0) * 0.5 + 0.5) * uCanvas;
  vec3 color = uBackground;
  if (length(gl_FragCoord.xy - center) <= size * 0.5) {
    color = mix(color, mix(uColor2, uColor1, (node.y + 1.0) * 0.5), scale * 0.9);
  }
  gl_FragColor = vec4(color * uDim, 1.0);
}
`;
