import type { EffectId, Theme } from '../presets';

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

export interface DriverContext {
  effect: EffectId;
  theme: Theme;
  /** Variant id from the registry in `effects/variants.ts`. */
  variant: string;
}

export type DriverFactory = (host: HTMLElement, context: DriverContext) => EffectDriver | Promise<EffectDriver>;
