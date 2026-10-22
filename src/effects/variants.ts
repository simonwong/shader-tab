/*
 * Variant registry: the single list of every background variant the app can
 * draw. Shuffle storage, driver dispatch, the source badge, CSS fallbacks and
 * the review scripts (via `variantIdsByEffect`) all read from here.
 */
import {
  ARC_SURFACE,
  DITHERING_ORB,
  EFFECT_IDS,
  effectBackground,
  getEffect,
  PAPER_PALETTES,
  paletteBackground,
  type EffectId,
  type Theme,
} from './presets';
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

const followsTheme = (theme: Theme): Tone => (theme === 'day' ? 'light' : 'dark');
const alwaysDark = (): Tone => 'dark';

export function variantLabel(id: string): string {
  return id
    .replace(':', ' · ')
    .replace(
      /(^|[- ])([a-z])/g,
      (_match, prefix: string, letter: string) =>
        `${prefix === '-' ? ' ' : prefix}${letter.toUpperCase()}`,
    );
}

function define(
  effect: EffectId,
  ids: readonly string[],
  spec: VariantSpec | ((id: string) => VariantSpec),
): VariantDef[] {
  return ids.map(id => {
    const { label, source, background, tone, density, load } =
      typeof spec === 'function' ? spec(id) : spec;
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

/*
 * Render density caps (device pixels per CSS pixel). Grain gradients are soft
 * colour fields: at 1.25 the backing store has about half the pixels of the
 * global budget (~2 MP instead of ~4 MP at 1440x900@2x). Their grain is drawn
 * per render pixel, so 1.0 or lower visibly coarsens it. Shader Gradient has
 * no grain and renders at 1. Dither, pixel, dot
 * grid (including the ribbon and void fields) and particle variants keep the
 * global budget.
 */
const GRAIN_DENSITY = 1.25;

/*
 * Dithering keeps the 8x8 Bayer matrix: it gives the finest, calmest pattern.
 * Random noise shimmers as the field drifts and the 2x2 and 4x4 matrices read
 * as coarse. The one exception is `sphere:4x4`, Paper's own Default preset
 * ("Orb": smaller sphere, finer pixels, blue). The `shape:type` id format is
 * kept for stored shuffle bags.
 */
const DITHERING_SHAPES = ['simplex', 'warp', 'wave', 'ripple', 'swirl', 'sphere'];
const DITHERING_IDS = [...DITHERING_SHAPES.map(shape => `${shape}:8x8`), 'sphere:4x4'];

/*
 * Paper families with their own palette per variant (`PAPER_PALETTES`): the
 * static background is drawn from that palette, so the first frame and a
 * fallback match the variant rather than the family. Mesh gradients and Perlin
 * fog are soft fields with no fine detail, so they render at density 1 like
 * Shader Gradient.
 */
function paperPalette(effect: EffectId, density?: number): VariantDef[] {
  const palettes = PAPER_PALETTES[effect]!;
  return define(effect, Object.keys(palettes), id => ({
    background: theme => paletteBackground(palettes[id]![theme]),
    ...(density === undefined ? {} : { density }),
    load: paper,
  }));
}

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
    load: () =>
      import('./drivers/arc-particles').then(module => module.createSignalParticlesDriver),
  },
  'override-grid': {
    background: arcSurface,
    load: () => import('./drivers/arc-particles').then(module => module.createOverrideGridDriver),
  },
  'ribbon-field': {
    background: theme =>
      theme === 'day'
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

export const EFFECT_VARIANTS: Record<EffectId, readonly VariantDef[]> = {
  'grain-gradient': define('grain-gradient', ['corners', 'ripple', 'blob', 'sphere'], {
    density: GRAIN_DENSITY,
    load: paper,
  }),
  // Calm looks designed from ShaderGradient's customiser; soft gradients, so density 1 is enough.
  'shader-gradient': define('shader-gradient', ['dusk', 'ocean', 'sage'], {
    density: 1,
    load: () => import('./drivers/shader-gradient').then(module => module.createDriver),
  }),
  // Ripple fills most of the frame with the front colour, so it reads dark in both themes.
  dithering: define('dithering', DITHERING_IDS, id => ({
    label: id === 'sphere:4x4' ? 'Orb' : variantLabel(id.split(':')[0]!),
    load: paper,
    ...(id.startsWith('ripple:') ? { tone: alwaysDark } : {}),
    ...(id === 'sphere:4x4'
      ? {
          background: (theme: Theme) =>
            `radial-gradient(circle at 50% 50%, ${DITHERING_ORB.front[theme]}55, ${DITHERING_ORB.back[theme]} 35%)`,
        }
      : {}),
  })),
  'fluted-glass': define('fluted-glass', ['default', 'abstract', 'waves'], {
    load: () => import('./drivers/fluted-glass').then(module => module.createDriver),
  }),
  // Pixel Field: an original shader; the `pixel-blast` id is kept for stored preferences.
  'pixel-blast': define('pixel-blast', ['square', 'circle', 'triangle', 'diamond'], {
    load: () => import('./drivers/pixel-blast').then(module => module.createDriver),
  }),
  'data-pixel-arc': define('data-pixel-arc', Object.keys(ARC_VARIANTS), id => ({
    source: arcSource(id),
    ...ARC_VARIANTS[id]!,
  })),
  'mesh-gradient': paperPalette('mesh-gradient', 1),
  warp: paperPalette('warp'),
  'simplex-noise': paperPalette('simplex-noise'),
  'perlin-noise': paperPalette('perlin-noise', 1),
  'neuro-noise': paperPalette('neuro-noise'),
  'dot-orbit': paperPalette('dot-orbit'),
  'smoke-ring': paperPalette('smoke-ring'),
  'god-rays': paperPalette('god-rays'),
  water: paperPalette('water'),
};

/** Variant ids of one effect, in registry order. */
export function variantIds(effect: EffectId): string[] {
  return EFFECT_VARIANTS[effect].map(variant => variant.id);
}

/** Plain id lists for every effect; used by the Node review scripts. */
export function variantIdsByEffect(): Record<EffectId, string[]> {
  return Object.fromEntries(EFFECT_IDS.map(effect => [effect, variantIds(effect)])) as Record<
    EffectId,
    string[]
  >;
}

export function getVariant(effect: EffectId, id: string | undefined): VariantDef | undefined {
  return id === undefined ? undefined : EFFECT_VARIANTS[effect].find(variant => variant.id === id);
}

/** The requested variant, or the effect's first variant when the id is missing or unknown. */
export function resolveVariant(effect: EffectId, id: string | undefined): VariantDef {
  return getVariant(effect, id) ?? EFFECT_VARIANTS[effect][0]!;
}
