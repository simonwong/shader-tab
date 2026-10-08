// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Modified by Shader Tab: adapted to the shared animation clock and pixel budget,
// and ported from a per-cell Canvas 2D loop to one fragment shader (same cell
// grid, arc curve, wave terms, colours and alpha, evaluated per pixel).
export type DataPixelArcMode = "dark" | "light";

export type DataPixelArcOptions = {
  mode: DataPixelArcMode;
  speed: number;
  pixelSize: number;
  arcCenter: number;
  arcDrop: number;
  thickness: number;
  brightness: number;
};

export const DATA_PIXEL_ARC_DEFAULTS: DataPixelArcOptions = {
  mode: "dark",
  speed: 1,
  pixelSize: 8,
  arcCenter: 0.4,
  arcDrop: 0.9,
  thickness: 0.35,
  brightness: 1,
};

/*
 * Uniforms: uCanvas (backing store, device px), uDensity (device px per CSS px),
 * uSize (CSS px), uTime (seconds * 1.2 * speed), uArc (arcCenter, arcDrop,
 * thickness), uCell (pixelSize), uGain (options.brightness), uLight (0/1).
 * Each CSS-space cell takes the colour the original computed from its top-left
 * corner and is blended over the background with the original alpha, leaving
 * the 1 px gap the original left between cells.
 */
export const DATA_PIXEL_ARC_FRAGMENT = `precision highp float;
uniform vec2 uCanvas;
uniform float uDensity;
uniform vec2 uSize;
uniform float uTime;
uniform vec3 uArc;
uniform float uCell;
uniform float uGain;
uniform float uLight;
uniform float uDim;

vec3 lightBackground(float y) {
  vec3 top = vec3(248.0, 250.0, 246.0) / 255.0;
  vec3 middle = vec3(243.0, 246.0, 241.0) / 255.0;
  vec3 bottom = vec3(237.0, 241.0, 236.0) / 255.0;
  return y < 0.58 ? mix(top, middle, y / 0.58) : mix(middle, bottom, (y - 0.58) / 0.42);
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y) / uDensity;
  bool light = uLight > 0.5;
  vec3 background = light ? lightBackground(css.y / uSize.y) : vec3(3.0, 3.0, 8.0) / 255.0;
  vec3 color = background;
  vec2 cell = floor(css / uCell) * uCell;
  vec2 local = css - cell;
  if (local.x < uCell - 1.0 && local.y < uCell - 1.0) {
    float nx = cell.x / uSize.x * 2.0 - 1.0;
    float curveY = uSize.y * uArc.x + pow(abs(nx), 1.8) * uSize.y * uArc.y;
    float intensity = max(0.0, 1.0 - abs(cell.y - curveY) / (uSize.y * uArc.z));
    if (intensity > 0.01) {
      float wave1 = sin(nx * 4.0 - uTime * 1.5) * 0.1;
      float wave2 = cos(cell.y * 0.01 + uTime) * 0.1;
      intensity = clamp(intensity + wave1 + wave2, 0.0, 1.0);
      intensity *= max(0.0, 1.0 - pow(abs(nx), 2.5));
      if (intensity > 0.02) {
        float core = intensity * intensity * intensity;
        vec3 ink;
        float alpha;
        if (light) {
          // Sage edge pixels hold their shape on paper while the emerald core stays vivid.
          float pigment = pow(intensity, 0.78);
          float strength = clamp(uGain, 0.45, 1.35);
          vec3 paper = vec3(238.0, 242.0, 237.0);
          vec3 tint = vec3(
            192.0 - 172.0 * pigment - 10.0 * core,
            204.0 - 88.0 * pigment + 18.0 * core,
            193.0 - 132.0 * pigment + 4.0 * core);
          ink = floor(clamp(paper + (tint - paper) * strength, 0.0, 255.0) + 0.5) / 255.0;
          alpha = min(1.0, 0.22 + pow(intensity, 0.68) * 0.78);
        } else {
          float middle = pow(intensity, 1.5);
          ink = floor(vec3(
            30.0 * intensity + 100.0 * core,
            220.0 * middle + 40.0 * core,
            80.0 * intensity + 50.0 * core) * uGain) / 255.0;
          alpha = intensity;
        }
        color = mix(background, ink, alpha);
      }
    }
  }
  gl_FragColor = vec4(color * uDim, 1.0);
}
`;
