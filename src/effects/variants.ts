/*
 * Variant registry: the single list of every background variant the app can
 * draw. Shuffle storage, driver dispatch, the source badge, CSS fallbacks and
 * the review scripts (via `variantIdsByEffect`) all read from here.
 */
import { ARC_SURFACE, EFFECT_IDS, effectBackground, getEffect, type EffectId, type Theme } from './presets';
import type { DriverFactory } from './drivers/types';

export type Tone = 'light' | 'dark';

export interface VariantDef {
  effect: EffectId;
  /** Stable id: persisted in shuffle storage and exposed as `data-variant`. */
  id: string;
  /** Human-readable name shown in the source badge. */
  label: string;
  /** Upstream reference page for this variant. */
  source: string;
  /** CSS background painted under the canvas and used while no renderer is live. */
  background: (theme: Theme) => string;
  /** Whether the rendered background reads as light or dark in this theme. */
  tone: (theme: Theme) => Tone;
  /** Optional cap on render pixel density; undefined keeps the global budget. */
  density?: number;
  /** Lazily loads the driver that renders this variant. */
  load: () => Promise<DriverFactory>;
}

type VariantSpec = Partial<Omit<VariantDef, 'effect' | 'id' | 'load'>> & Pick<VariantDef, 'load'>;

const followsTheme = (theme: Theme): Tone => theme === 'day' ? 'light' : 'dark';
const alwaysDark = (): Tone => 'dark';
const alwaysLight = (): Tone => 'light';

export function variantLabel(id: string): string {
  if (id === 'waterPlane') return 'Water';
  return id
    .replace(':', ' · ')
    .replace(/(^|[- ])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix === '-' ? ' ' : prefix}${letter.toUpperCase()}`);
}

function define(effect: EffectId, ids: readonly string[], spec: VariantSpec | ((id: string) => VariantSpec)): VariantDef[] {
  return ids.map(id => {
    const { label, source, background, tone, density, load } = typeof spec === 'function' ? spec(id) : spec;
    return {
      effect,
      id,
      label: label ?? variantLabel(id),
      source: source ?? getEffect(effect).source,
      background: background ?? (theme => effectBackground(effect, theme)),
      tone: tone ?? followsTheme,
      ...(density === undefined ? {} : { density }),
      load,
    };
  });
}

const paper = () => import('./drivers/paper').then(module => module.createDriver);

const DITHERING_SHAPES = ['simplex', 'warp', 'dots', 'wave', 'ripple', 'swirl', 'sphere'];
const DITHERING_TYPES = ['random', '2x2', '4x4', '8x8'];
const RETIRED_DITHERING = new Set(['ripple:4x4']);
const DITHERING_IDS = DITHERING_SHAPES
  .flatMap(shape => DITHERING_TYPES.map(type => `${shape}:${type}`))
  .filter(id => !RETIRED_DITHERING.has(id));

const arcSource = (id: string) => `https://threeui.com/backgrounds/predictive-arc/${id}`;
const arcSurface = (theme: Theme) => ARC_SURFACE[theme];
const ARC_VARIANTS: Record<string, VariantSpec> = {
  'data-pixel': {
    load: () => import('./drivers/arc').then(module => module.createDataPixelDriver),
  },
  predictive: {
    background: arcSurface,
    load: () => import('./drivers/arc').then(module => module.createPredictiveDriver),
  },
  'signal-particles': {
    background: arcSurface,
    load: () => import('./drivers/arc-particles').then(module => module.createSignalParticlesDriver),
  },
  'override-grid': {
    background: arcSurface,
    load: () => import('./drivers/arc-particles').then(module => module.createOverrideGridDriver),
  },
  'ribbon-field': {
    background: theme => theme === 'day'
      ? 'radial-gradient(ellipse at 75% 55%, #d3e5ee, #f0f5f9 70%)'
      : 'radial-gradient(ellipse at 75% 55%, #143a44, #030305 70%)',
    load: () => import('./drivers/arc-fields').then(module => module.createRibbonFieldDriver),
  },
  'void-field': {
    background: () => 'radial-gradient(ellipse, #201033, #030305)',
    tone: alwaysDark,
    load: () => import('./drivers/arc-fields').then(module => module.createVoidFieldDriver),
  },
  'amber-halftone': {
    background: arcSurface,
    load: () => import('./drivers/arc-amber').then(module => module.createDriver),
  },
};

const shaderGradient = () => import('./drivers/shader-gradient').then(module => module.createDriver);
const SHADER_GRADIENT_VARIANTS: Record<string, VariantSpec> = {
  plane: {
    background: () => 'linear-gradient(125deg, #ff5005, #dbba95 65%, #d0bce1)',
    tone: alwaysDark,
    load: shaderGradient,
  },
  sphere: {
    background: () => 'radial-gradient(ellipse at 50% 50%, #af38ff, #809bd6 60%, #dbba95 85%)',
    tone: alwaysDark,
    load: shaderGradient,
  },
  waterPlane: {
    background: () => 'linear-gradient(125deg, #6bf5ff, #94ffd1 55%, #ffffff)',
    tone: alwaysLight,
    load: shaderGradient,
  },
};

export const EFFECT_VARIANTS: Record<EffectId, readonly VariantDef[]> = {
  'grain-gradient': define('grain-gradient', ['wave', 'dots', 'truchet', 'corners', 'ripple', 'blob', 'sphere'], { load: paper }),
  // Ripple fills most of the frame with the front colour, so it reads dark in both themes.
  dithering: define('dithering', DITHERING_IDS, id => ({ load: paper, ...(id.startsWith('ripple:') ? { tone: alwaysDark } : {}) })),
  // Pixel Field: an original shader; the `pixel-blast` id is kept for stored preferences.
  'pixel-blast': define('pixel-blast', ['square', 'circle', 'triangle', 'diamond'], {
    load: () => import('./drivers/pixel-blast').then(module => module.createDriver),
  }),
  'data-pixel-arc': define('data-pixel-arc', Object.keys(ARC_VARIANTS), id => ({ source: arcSource(id), ...ARC_VARIANTS[id]! })),
  'crt-terminal': define('crt-terminal', ['terminal'], {
    tone: alwaysDark,
    load: () => import('./drivers/crt').then(module => module.createDriver),
  }),
  'shader-gradient': define('shader-gradient', Object.keys(SHADER_GRADIENT_VARIANTS), id => SHADER_GRADIENT_VARIANTS[id]!),
};

/** Variant ids of one effect, in registry order. */
export function variantIds(effect: EffectId): string[] {
  return EFFECT_VARIANTS[effect].map(variant => variant.id);
}

/** Plain id lists for every effect; used by the Node review scripts. */
export function variantIdsByEffect(): Record<EffectId, string[]> {
  return Object.fromEntries(EFFECT_IDS.map(effect => [effect, variantIds(effect)])) as Record<EffectId, string[]>;
}

export function getVariant(effect: EffectId, id: string | undefined): VariantDef | undefined {
  return id === undefined ? undefined : EFFECT_VARIANTS[effect].find(variant => variant.id === id);
}

/** The requested variant, or the effect's first variant when the id is missing or unknown. */
export function resolveVariant(effect: EffectId, id: string | undefined): VariantDef {
  return getVariant(effect, id) ?? EFFECT_VARIANTS[effect][0]!;
}
