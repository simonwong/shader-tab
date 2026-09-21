import { getEffect, type EffectId } from './presets';

export const EFFECT_VARIANTS: Record<EffectId, readonly string[]> = {
  'grain-gradient': ['wave', 'dots', 'truchet', 'corners', 'ripple', 'blob', 'sphere'],
  dithering: ['simplex', 'warp', 'dots', 'wave', 'ripple', 'swirl', 'sphere'].flatMap(shape => ['random', '2x2', '4x4', '8x8'].map(type => `${shape}:${type}`)),
  'pixel-blast': ['square', 'circle', 'triangle', 'diamond'],
  'data-pixel-arc': ['data-pixel', 'predictive', 'signal-particles', 'override-grid', 'ribbon-field', 'void-field', 'halftone-flow', 'amber-halftone'],
  'crt-terminal': ['terminal', 'cinematic', 'retro-game'],
  'shader-gradient': ['plane', 'sphere', 'waterPlane'],
};
export function variantLabel(variant: string): string {
  if (variant === 'waterPlane') return 'Water';
  return variant.replace(':', ' · ').replace(/(^|[- ])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix === '-' ? ' ' : prefix}${letter.toUpperCase()}`);
}
export function variantSource(effect: EffectId, variant?: string): string {
  if (effect === 'data-pixel-arc' && variant) return `https://threeui.com/backgrounds/predictive-arc/${variant}`;
  if (effect === 'crt-terminal' && variant) return `https://threeui.com/backgrounds/crt/${variant === 'retro-game' ? 'nintendo' : variant}`;
  return getEffect(effect).source;
}

export function variantBackground(effect: EffectId, variant: string | undefined, theme: 'day' | 'night'): string | undefined {
  if (effect === 'crt-terminal') return variant === 'retro-game' ? '#101020' : variant === 'cinematic' ? '#080b10' : undefined;
  if (effect !== 'data-pixel-arc' || !variant || variant === 'data-pixel') return undefined;
  if (variant === 'void-field') return 'radial-gradient(ellipse, #201033, #030305)';
  if (variant === 'ribbon-field') return 'radial-gradient(ellipse at 75% 55%, #143a44, #030305 70%)';
  if (variant === 'halftone-flow') return 'radial-gradient(ellipse, #51200b, #050000)';
  return theme === 'day' ? '#eef1f6' : '#0a0a0a';
}
