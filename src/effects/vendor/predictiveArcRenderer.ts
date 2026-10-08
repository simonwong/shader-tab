// ThreeUI, copyright Meng To. MIT; see public/licenses/threeui.txt.
// Modified by Shader Tab: light-mode palette, shared clock and pixel budget, and a
// port from the per-dot Canvas 2D loop to one fragment shader. Each pixel
// evaluates the (up to) four dots whose squares can reach it, in the original
// draw order, with additive blending in dark mode and source-over in light mode.
export type PredictiveArcOptions = {
  speed: number;
  spacing: number;
  dotSize: number;
  archHeight: number;
  thickness: number;
  brightness: number;
};

export const PREDICTIVE_ARC_DEFAULTS: PredictiveArcOptions = {
  speed: 1,
  spacing: 5,
  dotSize: 6,
  archHeight: 0.7,
  thickness: 1,
  brightness: 1,
};

/*
 * Uniforms: uCanvas (backing store, device px), uDensity (device px per CSS px),
 * uSize (CSS px), uTime (seconds * 0.9 * speed), uArch (archHeight),
 * uThickness, uGain (options.brightness), uLight (0/1), uDim (theme brightness).
 * SPACING and DOT_SIZE are the option defaults (5 and 6 CSS px).
 */
export const PREDICTIVE_ARC_FRAGMENT = `precision highp float;
uniform vec2 uCanvas;
uniform float uDensity;
uniform vec2 uSize;
uniform float uTime;
uniform float uArch;
uniform float uThickness;
uniform float uGain;
uniform float uLight;
uniform float uDim;
const float SPACING = 5.0;
const float DOT_SIZE = 6.0;

/* Intensity of the dot whose square starts at CSS position p (its top-left corner). */
float intensityAt(vec2 p) {
  float normX = (p.x - uSize.x * 0.5) / (uSize.x * 0.75);
  float curveY = uSize.y * 0.35 + normX * normX * uSize.y * uArch;
  float thickness = (140.0 + (1.0 - abs(normX)) * 80.0) * uThickness;
  float distanceToCurve = abs(p.y - curveY);
  if (distanceToCurve >= thickness) return 0.0;
  float intensity = 1.0 - distanceToCurve / thickness;
  intensity = intensity * 0.7 + sin(p.x * 0.015 + uTime) * cos(p.y * 0.02 + uTime) * 0.3 * intensity;
  intensity *= max(0.0, 1.0 - pow(abs(normX), 2.5));
  return intensity;
}

vec3 inkFor(float intensity, bool light) {
  vec3 color;
  if (light) {
    // Cool violet ink on pale paper, readable without additive washout.
    color = min(vec3(255.0), vec3(
      48.0 * intensity + 70.0 * pow(intensity, 3.0),
      28.0 * intensity + 45.0 * pow(intensity, 4.0),
      120.0 * intensity + 110.0 * intensity * intensity));
    if (intensity > 0.7) color = min(vec3(255.0), color + vec3(90.0, 70.0, 110.0) * (intensity - 0.7) * 3.3);
  } else {
    color = min(vec3(255.0), vec3(
      60.0 * intensity + 100.0 * pow(intensity, 3.0),
      20.0 * intensity + 60.0 * pow(intensity, 4.0),
      120.0 * intensity + 135.0 * intensity * intensity));
    if (intensity > 0.7) color = min(vec3(255.0), color + vec3(150.0) * (intensity - 0.7) * 3.3);
  }
  return floor(color * uGain) / 255.0;
}

void main() {
  vec2 device = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 css = device / uDensity;
  bool light = uLight > 0.5;
  vec3 color = light ? vec3(238.0, 241.0, 246.0) / 255.0 : vec3(3.0) / 255.0;
  vec2 cell = floor(css / SPACING);
  // A square reaches at most 1 CSS px into the next cell, and a sub-pixel square
  // spreads up to 1 device px back; visit the reachable dots in the original
  // order (columns left to right, each column top to bottom).
  vec2 reach = step(SPACING - 1.0 / uDensity, css - cell * SPACING);
  for (int column = -1; column <= 1; column++) {
    if (column == 1 && reach.x < 0.5) continue;
    for (int row = -1; row <= 1; row++) {
      if (row == 1 && reach.y < 0.5) continue;
      vec2 corner = (cell + vec2(float(column), float(row))) * SPACING;
      if (corner.x < 0.0 || corner.y < 0.0) continue;
      float intensity = intensityAt(corner);
      if (intensity <= 0.02) continue;
      float size = DOT_SIZE * intensity * uDensity;
      vec2 low = corner * uDensity;
      float coverage;
      if (size < 1.0) {
        // Sub-pixel squares: Chrome's canvas spreads them over a 1 px footprint
        // (fitted against Chrome's own rendering of the original).
        vec2 spread = clamp(1.0 - abs(device - low - size * 0.5), 0.0, 1.0);
        coverage = spread.x * spread.y * min(1.0, 1.21 * size);
      } else {
        // Edge antialiasing from the signed distance to the square, as Chrome's canvas does.
        vec2 outside = max(low - device, device - low - size);
        coverage = clamp(0.5 - length(max(outside, 0.0)) - min(max(outside.x, outside.y), 0.0), 0.0, 1.0);
      }
      if (coverage <= 0.0) continue;
      vec3 ink = inkFor(intensity, light);
      color = light ? mix(color, ink, coverage) : min(color + ink * coverage, 1.0);
    }
  }
  gl_FragColor = vec4(color * uDim, 1.0);
}
`;
