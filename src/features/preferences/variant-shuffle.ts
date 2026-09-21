import { EFFECT_VARIANTS } from '../../effects/variants';
import type { EffectId } from '../../effects/presets';
export const variantShuffleKey = (effect: EffectId) => `effect-variant:shuffle:v1:${effect}`;
export function drawVariant(effect: EffectId, saved: unknown, random = Math.random) {
  const choices = EFFECT_VARIANTS[effect];
  const previous = saved && typeof saved === 'object' ? saved as { remaining?: unknown; last?: unknown } : {};
  let remaining = Array.isArray(previous.remaining) ? [...new Set(previous.remaining.filter((value): value is string => typeof value === 'string' && choices.includes(value)))] : [];
  if (!remaining.length) {
    remaining = [...choices];
    for (let index = remaining.length - 1; index > 0; index--) {
      const next = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
      [remaining[index], remaining[next]] = [remaining[next]!, remaining[index]!];
    }
    if (remaining[0] === previous.last && remaining.length > 1) [remaining[0], remaining[1]] = [remaining[1]!, remaining[0]!];
  }
  const variant = remaining.shift()!;
  return { variant, state: { remaining, last: variant } };
}
