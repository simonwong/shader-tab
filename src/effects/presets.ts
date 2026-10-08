export type Theme = 'day' | 'night';
export const EFFECT_IDS = [
  'grain-gradient',
  'dithering',
  'pixel-blast',
  'data-pixel-arc',
  'crt-terminal',
  'shader-gradient',
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
    id: 'dithering',
    sourceName: 'Paper Shaders',
    source: 'https://shaders.paper.design/dithering',
    name: 'Dithering',
    base: { day: '#eee9df', night: '#121313' },
    day: ['#423e3c', '#423e3c', '#eee9df'],
    night: ['#cbcec2', '#cbcec2', '#121313'],
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
  {
    id: 'crt-terminal',
    sourceName: 'ThreeUI',
    source: 'https://threeui.com/backgrounds/crt/terminal',
    name: 'CRT',
    base: { day: '#120d05', night: '#03100a' },
    day: ['#e5bc71', '#e5bc71', '#120d05'],
    night: ['#8df0b4', '#8df0b4', '#03100a'],
  },
  {
    id: 'shader-gradient',
    sourceName: 'Shader Gradient',
    source: 'https://shadergradient.co/customize',
    name: 'Shader Gradient',
    base: { day: '#dbba95', night: '#dbba95' },
    day: ['#ff5005', '#dbba95', '#d0bce1'],
    night: ['#ff5005', '#dbba95', '#d0bce1'],
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
  if (id === 'crt-terminal') return preset.base[theme];
  return `radial-gradient(ellipse at 75% 30%, ${preset[theme][0]}55, transparent 65%), radial-gradient(ellipse at 20% 80%, ${preset[theme][1]}33, transparent 60%), ${preset.base[theme]}`;
}

/** Solid surface behind the ThreeUI Arc collection renderers (canvas clear colour and CSS fallback). */
export const ARC_SURFACE: Record<Theme, string> = { day: '#eef1f6', night: '#0a0a0a' };

/**
 * Output brightness per theme. Every renderer multiplies its final colour by
 * this factor (it replaces a CSS `filter: brightness()` on the animated layer,
 * which cost an extra full-screen compositing pass per frame).
 */
export const THEME_BRIGHTNESS: Record<Theme, number> = { day: 0.94, night: 0.8 };
