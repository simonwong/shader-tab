/*
 * Material maps for liquid glass over a rounded rectangle, after the WGSL maps
 * in Glass-HQ/liquid-glass (MIT): a circular edge profile bends the backdrop
 * inward at the rim, a thin specular stroke lights the top and bottom, and a
 * soft shade darkens the sides.
 */

export interface LiquidShape {
  /** Border-box size and corner radius in CSS pixels. */
  width: number;
  height: number;
  radius: number;
  /** Map pixels per CSS pixel. */
  density: number;
  /** Depth in CSS pixels over which the rim bends the backdrop. */
  bevel: number;
}

export interface LiquidMaps {
  width: number;
  height: number;
  /** R and G hold the inward shift for feDisplacementMap, 128 is neutral. */
  displacement: Uint8ClampedArray<ArrayBuffer>;
  /** White specular stroke and diffuse rim light. */
  light: Uint8ClampedArray<ArrayBuffer>;
  /** Black shade along the sides. */
  shade: Uint8ClampedArray<ArrayBuffer>;
}

const MAX_MAP_SIDE = 1024;
const sat = (value: number) => Math.min(1, Math.max(0, value));
const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

/** Signed distance to the outline (negative inside) and the outward normal. */
export function roundedRectField(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const px = x - width / 2,
    py = y - height / 2;
  const qx = Math.abs(px) - (width / 2 - radius),
    qy = Math.abs(py) - (height / 2 - radius);
  if (qx > 0 && qy > 0) {
    const length = Math.hypot(qx, qy);
    return {
      distance: length - radius,
      nx: (Math.sign(px) * qx) / length,
      ny: (Math.sign(py) * qy) / length,
    };
  }
  if (qx > qy) return { distance: qx - radius, nx: Math.sign(px) || 1, ny: 0 };
  return { distance: qy - radius, nx: 0, ny: Math.sign(py) || 1 };
}

/** Rim bend from 1 at the outline to 0 at the bevel depth, along a quarter circle. */
export function edgeBend(distance: number, bevel: number) {
  const depth = sat(-distance / bevel);
  return 1 - sat(Math.sqrt((2 - depth) * depth));
}

const SPECULAR_SPREAD = Math.cos(1.08);
const DIFFUSE_SPREAD = Math.cos(1.08 * 0.65);
const SIDE_SPREAD = Math.cos(0.98);
const SHADE_OPACITY = 0.54;
const lobe = (cosine: number, spread: number) => sat((cosine - spread) / (1 - spread));

export function createLiquidMaps(input: LiquidShape): LiquidMaps {
  const w = Math.max(1, finite(input.width, 1)),
    h = Math.max(1, finite(input.height, 1));
  const density = Math.min(Math.max(0.25, finite(input.density, 1)), MAX_MAP_SIDE / Math.max(w, h));
  const radius = Math.min(Math.max(0, finite(input.radius, 0)), w / 2, h / 2);
  const bevel = Math.max(1, finite(input.bevel, 1));
  const mapWidth = Math.max(1, Math.round(w * density)),
    mapHeight = Math.max(1, Math.round(h * density));
  const size = mapWidth * mapHeight * 4;
  const displacement = new Uint8ClampedArray(size),
    light = new Uint8ClampedArray(size),
    shade = new Uint8ClampedArray(size);
  // One map pixel, in CSS pixels: the antialiasing width.
  const aa = w / mapWidth;
  for (let row = 0; row < mapHeight; row++) {
    for (let column = 0; column < mapWidth; column++) {
      const offset = (row * mapWidth + column) * 4;
      const x = ((column + 0.5) * w) / mapWidth,
        y = ((row + 0.5) * h) / mapHeight;
      const { distance: d, nx, ny } = roundedRectField(x, y, w, h, radius);
      const bend = edgeBend(d, bevel);
      displacement[offset] = 127.5 * (1 - nx * bend) + 0.5;
      displacement[offset + 1] = 127.5 * (1 - ny * bend) + 0.5;
      displacement[offset + 2] = 128;
      displacement[offset + 3] = 255;

      const coverage = sat(0.5 - d / aa);
      const stroke = sat((d + 0.9) / aa + 0.5) * coverage;
      let specular = Math.pow(lobe(Math.abs(ny), SPECULAR_SPREAD), 1.25) * stroke;
      specular /= 1 + 0.5 * (1 - specular);
      const diffuse =
        Math.pow(lobe(Math.abs(ny), DIFFUSE_SPREAD), 1.25) *
        0.18 *
        Math.pow(1 - sat(-d / 4.5), 2) *
        coverage;
      light[offset] = light[offset + 1] = light[offset + 2] = 255;
      light[offset + 3] = sat(specular + diffuse) * 255;

      // The reference draws this stroke just outside the outline; this map stops at the border box.
      const rim = d + 0.5;
      const falloff = 1 - sat(-rim / 0.5);
      const ramp = 0.25 * (falloff > 0 ? 1 : 0) + 0.75 * falloff;
      const outline = ramp * sat((rim + 0.5) / aa + 0.5) * sat(-rim / aa + 0.5);
      const side = (n: number) => {
        const weight = lobe(n, SIDE_SPREAD) * outline;
        return weight / (1 + 0.4 * (1 - weight));
      };
      shade[offset + 3] = sat(side(nx) + side(-nx)) * SHADE_OPACITY * 255;
    }
  }
  return { width: mapWidth, height: mapHeight, displacement, light, shade };
}
