export type Theme = 'day' | 'night';
export const EFFECT_IDS = [
  'grain-gradient',
  'shader-gradient',
  'dithering',
  'fluted-glass',
  'pixel-blast',
  'data-pixel-arc',
] as const;
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
  return `radial-gradient(ellipse at 75% 30%, ${preset[theme][0]}55, transparent 65%), radial-gradient(ellipse at 20% 80%, ${preset[theme][1]}33, transparent 60%), ${preset.base[theme]}`;
}

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
