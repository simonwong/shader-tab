export interface GlassGeometry { width: number; height: number; radius: number; bevel: number }
export const GLASS_DISPLACEMENT_SCALE = 14;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function glassNormal(x: number, y: number, shape: GlassGeometry) {
  const halfWidth = shape.width / 2, halfHeight = shape.height / 2;
  const px = x - halfWidth, py = y - halfHeight;
  const ax = Math.abs(px), ay = Math.abs(py);
  const cornerX = halfWidth - shape.radius, cornerY = halfHeight - shape.radius;
  if (ax > cornerX && ay > cornerY) {
    const dx = ax - cornerX, dy = ay - cornerY;
    const length = Math.hypot(dx, dy);
    return { depth: shape.radius - length, nx: Math.sign(px) * dx / length, ny: Math.sign(py) * dy / length };
  }
  if (halfWidth - ax < halfHeight - ay) return { depth: halfWidth - ax, nx: Math.sign(px), ny: 0 };
  return { depth: halfHeight - ay, nx: 0, ny: Math.sign(py) };
}

export function glassProfile(depth: number, bevel: number) {
  if (depth <= 0 || depth >= bevel) return { shift: 0, slope: 0, fresnel: 0 };
  const phase = depth / bevel * Math.PI / 2;
  const height = 6 * Math.sin(phase);
  const slope = 6 / bevel * Math.PI / 2 * Math.cos(phase);
  const incident = Math.atan(slope);
  const refracted = Math.asin(Math.sin(incident) / 1.46);
  const edge = Math.pow(Math.sin(Math.min(1, depth / 1.5) * Math.PI / 2), 2);
  return {
    shift: (2 + height) * Math.tan(incident - refracted) * edge,
    slope,
    fresnel: .035 + .965 * Math.pow(1 - Math.cos(incident), 5),
  };
}

export function createGlassField(width: number, height: number, radius: number) {
  const w = Math.max(1, Math.round(Number.isFinite(width) ? width : 1));
  const h = Math.max(1, Math.round(Number.isFinite(height) ? height : 1));
  const ratio = Math.min(1, 768 / Math.max(w, h));
  const mapWidth = Math.max(1, Math.round(w * ratio)), mapHeight = Math.max(1, Math.round(h * ratio));
  const r = clamp(Number.isFinite(radius) ? radius : 0, 0, Math.min(w, h) / 2);
  const shape: GlassGeometry = { width: w, height: h, radius: r, bevel: Math.max(1, Math.min(12, r * .65, h / 3)) };
  const displacement = new Uint8ClampedArray(mapWidth * mapHeight * 4);
  const highlight = new Uint8ClampedArray(displacement.length);
  const profile = Array.from({ length: 257 }, (_, index) => glassProfile(index / 256 * shape.bevel, shape.bevel));
  for (let row = 0; row < mapHeight; row++) for (let column = 0; column < mapWidth; column++) {
    const { depth, nx, ny } = glassNormal((column + .5) * w / mapWidth, (row + .5) * h / mapHeight, shape);
    const offset = (row * mapWidth + column) * 4;
    displacement[offset] = 128; displacement[offset + 1] = 128; displacement[offset + 3] = 255;
    if (depth <= 0 || depth >= shape.bevel) continue;
    const { shift, slope, fresnel } = profile[Math.round(depth / shape.bevel * 256)]!;
    displacement[offset] = 127.5 - nx * shift / GLASS_DISPLACEMENT_SCALE * 255;
    displacement[offset + 1] = 127.5 - ny * shift / GLASS_DISPLACEMENT_SCALE * 255;
    const length = Math.hypot(slope, 1);
    const specular = Math.pow(Math.max(0, (-.28 * nx * slope - .4 * ny * slope + .872) / length), 18);
    const rim = Math.exp(-Math.pow((depth - 1.15) / 1.1, 2));
    const alpha = clamp((specular * .65 + fresnel * .16 + .055) * rim, 0, .75);
    highlight[offset] = 255; highlight[offset + 1] = 255; highlight[offset + 2] = 255;
    highlight[offset + 3] = alpha * 255;
  }
  return { width: mapWidth, height: mapHeight, displacement, highlight };
}
