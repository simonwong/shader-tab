import { effectBackground, type EffectId, type Theme } from '../../effects/presets';
const thumbnails = import.meta.glob<string>('../../assets/effect-thumbnails/*.webp', { eager: true, query: '?url&no-inline', import: 'default' });
export function effectThumbnail(id: EffectId, theme: Theme): string {
  const image = thumbnails[`../../assets/effect-thumbnails/thumb-${id}-${theme}.webp`];
  return image ? `url("${image}") center / cover` : effectBackground(id, theme);
}
