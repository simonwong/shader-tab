import type { EffectId, ShaderGradientType, Theme } from '../presets';
export interface Pointer { x: number; y: number }
export interface EffectDriver {
  canvas: HTMLCanvasElement;
  engine: string;
  resize: (width: number, height: number, density: number) => void;
  render: (seconds: number, delta: number, pointer: Pointer) => void;
  move?: (pointer: Pointer) => void;
  click?: (pointer: Pointer) => void;
  dispose: () => void;
}
export type DriverFactory = (host: HTMLElement, effect: EffectId, theme: Theme, shaderGradientType?: ShaderGradientType, variant?: string) => EffectDriver | Promise<EffectDriver>;
export function pixelDensity(width: number, height: number): number {
  return Math.min(devicePixelRatio || 1, 2, 2560 / Math.max(width, height), Math.sqrt(3_996_000 / (width * height)));
}
