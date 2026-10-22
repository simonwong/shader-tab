export type Theme = 'day' | 'night';
export const EFFECT_IDS = [
  'grain-gradient',
  'shader-gradient',
  'dithering',
  'fluted-glass',
  'pixel-blast',
  'data-pixel-arc',
  'mesh-gradient',
  'warp',
  'simplex-noise',
  'perlin-noise',
  'neuro-noise',
  'dot-orbit',
  'smoke-ring',
  'god-rays',
  'water',
] as const;
/** The families of the first releases. Stored shuffle pools without a known-effects list only knew these. */
export const FIRST_EFFECT_IDS: readonly EffectId[] = EFFECT_IDS.slice(0, 6);
export type EffectId = (typeof EFFECT_IDS)[number];
type Palette = readonly [string, string, string];
export interface EffectPreset {
  id: EffectId;
  name: string;
  source: string;
  sourceName: string;
  base: Record<Theme, string>;
  day: Palette;
  night: Palette;
}
/**
 * Colours of the Paper families that draw several shader colours over a ground,
 * per variant and theme. `back` is the ground; `colors` are the shader's colours
 * in its own order. The renderer and the static CSS background both read them.
 */
export interface VariantPalette {
  back: string;
  colors: readonly string[];
}
type ThemedPalette = Record<Theme, VariantPalette>;
const palette = (day: [string, ...string[]], night: [string, ...string[]]): ThemedPalette => ({
  day: { back: day[0], colors: day.slice(1) },
  night: { back: night[0], colors: night.slice(1) },
});
export const PAPER_PALETTES: Partial<Record<EffectId, Record<string, ThemedPalette>>> = {
  // Mesh gradients have no ground: `back` only paints the static background.
  'mesh-gradient': {
    tide: palette(
      ['#d8e2df', '#bfe0dc', '#94b8db', '#efe6d4', '#e4c9bd'],
      ['#0b1724', '#103040', '#1e5260', '#3a2f58', '#0b1724'],
    ),
    orchard: palette(
      ['#eedfc8', '#f4d6a6', '#e7a993', '#c6d6a0', '#f3eee1'],
      ['#16130f', '#3e2b1b', '#5d3425', '#2d3b22', '#16130f'],
    ),
    mist: palette(
      ['#e2e1e9', '#e6e3ee', '#cdd5e5', '#eee6dd', '#d6e1da'],
      ['#2a2f3a', '#2c2e3d', '#39425a', '#433538', '#22322c'],
    ),
  },
  // Warp blends its colours over the whole frame; the last one is the lightest (day) or darkest (night).
  warp: {
    marble: palette(
      ['#f4f1ea', '#e9e4da', '#b8c4c6', '#d8cab6', '#f4f1ea'],
      ['#121317', '#1d1e23', '#36424c', '#2c2824', '#121317'],
    ),
    silk: palette(
      ['#f5ebe1', '#f2d8d2', '#d4a8b4', '#f5ebe1'],
      ['#181114', '#2c1922', '#5a3041', '#181114'],
    ),
    check: palette(
      ['#eee8dc', '#dfe7e1', '#c2d3d8', '#eee8dc'],
      ['#26231e', '#17201e', '#1f3036', '#26231e'],
    ),
  },
  'simplex-noise': {
    contour: palette(
      ['#f3eee4', '#f3eee4', '#dce5d3', '#b5cbbd', '#86a9a0'],
      ['#0f1614', '#0f1614', '#1b2a26', '#2a413c', '#3e5f57'],
    ),
  },
  'perlin-noise': { fog: palette(['#f1f2ef', '#c6d1df'], ['#0e1016', '#38445a']) },
  // Mid colour, then front colour.
  'neuro-noise': {
    filament: palette(['#f1efe9', '#cfc8dd', '#8a7cb3'], ['#0b0d14', '#26365e', '#b6cbf5']),
    nebula: palette(['#eef1f0', '#c9d9d6', '#5f8f8a'], ['#0a1111', '#1d3a38', '#9fd6cc']),
  },
  'dot-orbit': {
    drift: palette(
      ['#f2efe8', '#b9a48f', '#93a5b5', '#b1b894'],
      ['#121417', '#5d5045', '#45576a', '#4d5840'],
    ),
  },
  'smoke-ring': {
    halo: palette(
      ['#f3efe9', '#e7ddd3', '#c6aa9c', '#8f7c9b'],
      ['#0c0b10', '#4a3a52', '#b08a72', '#e6d4be'],
    ),
  },
  // Bloom colour, then the ray colours.
  'god-rays': {
    dawn: palette(
      ['#e7e2d8', '#ffffff', '#fff7e8', '#f8e6d6'],
      ['#0b0c12', '#28304a', '#3c3858', '#5c4a3a'],
    ),
  },
  // Highlight colour of the caustics.
  water: { pool: palette(['#dce8e8', '#ffffff'], ['#0c1a22', '#5a8f9c']) },
};
/** A Paper family whose fallback colours come from its first variant's palette. */
function paperFamily(id: EffectId, name: string): EffectPreset {
  const first = Object.values(PAPER_PALETTES[id]!)[0]!;
  const three = (theme: Theme) => {
    const { back, colors } = first[theme];
    return [colors[0] ?? back, colors[1] ?? colors[0] ?? back, colors[2] ?? back] as const;
  };
  return {
    id,
    sourceName: 'Paper Shaders',
    source: `https://shaders.paper.design/${id}`,
    name,
    base: { day: first.day.back, night: first.night.back },
    day: three('day'),
    night: three('night'),
  };
}
export const EFFECTS: EffectPreset[] = [
  {
    id: 'grain-gradient',
    sourceName: 'Paper Shaders',
    source: 'https://shaders.paper.design/grain-gradient',
    name: 'Grain Gradient',
    base: { day: '#f5ded3', night: '#140c20' },
    day: ['#fc7252', '#a87fea', '#ffd17c'],
    night: ['#753fc0', '#ff6545', '#18172f'],
  },
  {
    id: 'shader-gradient',
    sourceName: 'ShaderGradient',
    source: 'https://shadergradient.co/',
    name: 'Shader Gradient',
    // Dusk palette: lavender, peach, periwinkle by day; indigo at night.
    base: { day: '#d6ccd2', night: '#1d1b2c' },
    day: ['#bcaad2', '#a9b5d2', '#e8ddd6'],
    night: ['#4a3f66', '#5d4f78', '#2c2b45'],
  },
  {
    id: 'dithering',
    sourceName: 'Paper Shaders',
    source: 'https://shaders.paper.design/dithering',
    name: 'Dithering',
    base: { day: '#eee9df', night: '#121313' },
    day: ['#423e3c', '#423e3c', '#eee9df'],
    night: ['#cbcec2', '#cbcec2', '#121313'],
  },
  {
    id: 'fluted-glass',
    sourceName: 'Paper Shaders',
    source: 'https://shaders.paper.design/fluted-glass',
    name: 'Fluted Glass',
    // Paper's sample photo: orange cosmos and green stems against a pale sky.
    base: { day: '#e4ecf2', night: '#2e3340' },
    day: ['#f0a020', '#4f6a3a', '#f4f7fa'],
    night: ['#6a4a1c', '#2c3a24', '#3a3f4e'],
  },
  {
    id: 'pixel-blast',
    sourceName: 'Shader Tab',
    source: 'https://github.com/simonwong/shader-tab',
    name: 'Pixel Field',
    base: { day: '#efe9f6', night: '#100d18' },
    day: ['#8b64b1', '#8b64b1', '#efe9f6'],
    night: ['#b497cf', '#b497cf', '#100d18'],
  },
  {
    id: 'data-pixel-arc',
    sourceName: 'ThreeUI',
    source: 'https://threeui.com/backgrounds/predictive-arc/data-pixel',
    name: 'Predictive Arc',
    base: { day: '#f3f6f1', night: '#030308' },
    day: ['#25945b', '#25945b', '#f3f6f1'],
    night: ['#51e77d', '#51e77d', '#030308'],
  },
  paperFamily('mesh-gradient', 'Mesh Gradient'),
  paperFamily('warp', 'Warp'),
  paperFamily('simplex-noise', 'Simplex Noise'),
  paperFamily('perlin-noise', 'Perlin Noise'),
  paperFamily('neuro-noise', 'Neuro Noise'),
  paperFamily('dot-orbit', 'Dot Orbit'),
  paperFamily('smoke-ring', 'Smoke Ring'),
  paperFamily('god-rays', 'God Rays'),
  paperFamily('water', 'Water'),
];
export function isEffect(value: unknown): value is EffectId {
  return typeof value === 'string' && EFFECT_IDS.includes(value as EffectId);
}
const legacyEffects: Record<string, EffectId> = {
  eclipse: 'grain-gradient',
  facet: 'dithering',
  contour: 'data-pixel-arc',
  forma: 'pixel-blast',
  ribbon: 'dithering',
  caustic: 'pixel-blast',
  paper: 'grain-gradient',
  mist: 'pixel-blast',
  ink: 'data-pixel-arc',
  tide: 'pixel-blast',
  silk: 'dithering',
  glow: 'grain-gradient',
  moss: 'data-pixel-arc',
  ripple: 'pixel-blast',
  // Retired family: CRT moves to the other ThreeUI family.
  'crt-terminal': 'data-pixel-arc',
};
export function migrateEffect(value: unknown): EffectId | undefined {
  return isEffect(value)
    ? value
    : typeof value === 'string' && Object.hasOwn(legacyEffects, value)
      ? legacyEffects[value]
      : undefined;
}
export function getEffect(id: EffectId): EffectPreset {
  return EFFECTS.find(preset => preset.id === id) ?? EFFECTS[0]!;
}
export function effectBackground(id: EffectId, theme: Theme): string {
  const preset = getEffect(id);
  return glowBackground(preset[theme][0], preset[theme][1], preset.base[theme]);
}
/** The static background of a variant with its own palette: its first two colours glowing over the ground. */
export function paletteBackground({ back, colors }: VariantPalette): string {
  return glowBackground(colors[0] ?? back, colors[1] ?? colors[0] ?? back, back);
}
const glowBackground = (first: string, second: string, base: string) =>
  `radial-gradient(ellipse at 75% 30%, ${first}55, transparent 65%), radial-gradient(ellipse at 20% 80%, ${second}33, transparent 60%), ${base}`;

/**
 * Paper's Dithering "Default" preset (a 4x4 dithered sphere, blue on black),
 * the one dithering variant with its own colours. Day swaps in a pale ground.
 */
export const DITHERING_ORB = {
  back: { day: '#e4ebf0', night: '#000000' },
  front: { day: '#0a84c0', night: '#00b2ff' },
} satisfies Record<string, Record<Theme, string>>;

/** Solid surface behind the ThreeUI Arc collection renderers (canvas clear colour and CSS fallback). */
export const ARC_SURFACE: Record<Theme, string> = { day: '#eef1f6', night: '#0a0a0a' };

/**
 * Output brightness per theme. Every renderer multiplies its final colour by
 * this factor (it replaces a CSS `filter: brightness()` on the animated layer,
 * which cost an extra full-screen compositing pass per frame).
 */
export const THEME_BRIGHTNESS: Record<Theme, number> = { day: 0.94, night: 0.8 };
