import { describe, expect, it } from 'vitest';
import { createLiquidMaps, edgeBend, roundedRectField } from './liquid-glass-maps';

const capsule = { width: 120, height: 44, radius: 22, density: 1, bevel: 16 };
const pixel =
  (maps: ReturnType<typeof createLiquidMaps>, plane: 'displacement' | 'light' | 'shade') =>
  (x: number, y: number) =>
    Array.from(maps[plane].slice((y * maps.width + x) * 4, (y * maps.width + x) * 4 + 4));

describe('liquid glass maps', () => {
  it('measures distance and outward normals on sides and corners', () => {
    expect(roundedRectField(60, 22, 120, 44, 22)).toEqual({ distance: -22, nx: 0, ny: 1 });
    const left = roundedRectField(2, 22, 120, 44, 22),
      right = roundedRectField(118, 22, 120, 44, 22);
    expect(left.distance).toBeCloseTo(right.distance);
    expect(left.nx).toBeCloseTo(-1);
    expect(right.nx).toBeCloseTo(1);
    const corner = roundedRectField(10, 10, 120, 44, 22);
    expect(Math.hypot(corner.nx, corner.ny)).toBeCloseTo(1);
    expect(corner.nx).toBeLessThan(0);
    expect(corner.ny).toBeLessThan(0);
  });

  it('bends fully at the outline and not past the bevel', () => {
    expect(edgeBend(0, 16)).toBe(1);
    expect(edgeBend(-16, 16)).toBe(0);
    expect(edgeBend(-30, 16)).toBe(0);
    let previous = 1;
    for (let distance = -0.5; distance > -16; distance -= 0.5) {
      const bend = edgeBend(distance, 16);
      expect(bend).toBeLessThanOrEqual(previous);
      previous = bend;
    }
  });

  it('shifts the backdrop inward at opposite rims and leaves the center neutral', () => {
    const at = pixel(createLiquidMaps(capsule), 'displacement');
    expect(at(60, 22)).toEqual([128, 128, 128, 255]);
    // feDisplacementMap samples at x + scale * (R - 0.5): the left rim reads from the right.
    expect(at(1, 22)[0]).toBeGreaterThan(200);
    expect(at(118, 22)[0]).toBeLessThan(55);
    expect(at(1, 22)[0]! + at(118, 22)[0]!).toBeCloseTo(255, -1);
    expect(at(60, 0)[1]).toBeGreaterThan(200);
    expect(at(60, 43)[1]).toBeLessThan(55);
  });

  it('lights the top and bottom rims and shades the sides', () => {
    const maps = createLiquidMaps(capsule);
    const light = pixel(maps, 'light'),
      shade = pixel(maps, 'shade');
    expect(light(60, 0)[3]).toBeGreaterThan(100);
    expect(light(60, 22)[3]).toBe(0);
    expect(light(0, 22)[3]).toBeLessThan(light(60, 0)[3]!);
    expect(shade(0, 22)[3]).toBeGreaterThan(0);
    expect(shade(60, 0)[3]).toBe(0);
    expect(shade(60, 22)[3]).toBe(0);
  });

  it('scales with density, bounds allocation and handles invalid geometry', () => {
    const dense = createLiquidMaps({ ...capsule, density: 2 });
    expect([dense.width, dense.height]).toEqual([240, 88]);
    for (const [width, height, radius, density] of [
      [8000, 900, 999, 2],
      [1, 1, 999, 1],
      [0, -1, 0, 0],
      [NaN, Infinity, NaN, NaN],
    ]) {
      const maps = createLiquidMaps({
        width: width!,
        height: height!,
        radius: radius!,
        density: density!,
        bevel: 16,
      });
      expect(Math.max(maps.width, maps.height)).toBeLessThanOrEqual(1024);
      expect(maps.displacement.length).toBe(maps.width * maps.height * 4);
      expect(maps.light.length).toBe(maps.displacement.length);
      expect(maps.shade.length).toBe(maps.displacement.length);
    }
  });
});
