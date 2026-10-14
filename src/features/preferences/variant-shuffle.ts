import type { EffectId } from '../../effects/presets';
import { drawableVariants } from './model';

export const variantShuffleKey = (effect: EffectId) => `effect-variant:shuffle:v1:${effect}`;

export interface ShuffleState {
  remaining: string[];
  last: string;
}

/**
 * Takes the next variant from a shuffle bag. Hidden variants (`variantKey`s)
 * are dropped from the bag and left out of new rounds.
 */
export function drawVariant(
  effect: EffectId,
  saved: unknown,
  random = Math.random,
  hidden: readonly string[] = [],
): { variant: string; state: ShuffleState } {
  const choices = drawableVariants(effect, hidden);
  const previous =
    saved && typeof saved === 'object' ? (saved as { remaining?: unknown; last?: unknown }) : {};
  let remaining = Array.isArray(previous.remaining)
    ? [
        ...new Set(
          previous.remaining.filter(
            (value): value is string => typeof value === 'string' && choices.includes(value),
          ),
        ),
      ]
    : [];
  if (!remaining.length) {
    remaining = [...choices];
    for (let index = remaining.length - 1; index > 0; index--) {
      const next = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
      [remaining[index], remaining[next]] = [remaining[next]!, remaining[index]!];
    }
    if (remaining[0] === previous.last && remaining.length > 1)
      [remaining[0], remaining[1]] = [remaining[1]!, remaining[0]!];
  }
  const variant = remaining.shift()!;
  return { variant, state: { remaining, last: variant } };
}

export interface StoredDraw {
  variant: string;
  /** Entries to write back. */
  set: Record<string, ShuffleState>;
}

/** Draws the next variant from the stored shuffle bag. */
export function drawStoredVariant(
  effect: EffectId,
  items: Record<string, unknown>,
  random = Math.random,
  hidden: readonly string[] = [],
): StoredDraw {
  const key = variantShuffleKey(effect);
  const { variant, state } = drawVariant(effect, items[key], random, hidden);
  return { variant, set: { [key]: state } };
}

/**
 * Records that `variant` was shown, given the bag as it is stored now.
 *
 * A page peeks at the bag head and paints right away; this commit runs later,
 * under a lock, against a fresh read. If the bag still holds `variant` it is
 * taken out; if the bag is used up, a new round starts without it; if another
 * tab already took it, the bag is left as is. In every case `last` becomes
 * `variant`, so the next round does not open with it.
 */
export function settleVariant(
  effect: EffectId,
  items: Record<string, unknown>,
  variant: string,
  random = Math.random,
  hidden: readonly string[] = [],
): Omit<StoredDraw, 'variant'> {
  const key = variantShuffleKey(effect);
  const saved = items[key];
  const choices = drawableVariants(effect, hidden);
  const previous = saved && typeof saved === 'object' ? (saved as { remaining?: unknown }) : {};
  let remaining = Array.isArray(previous.remaining)
    ? [
        ...new Set(
          previous.remaining.filter(
            (value): value is string => typeof value === 'string' && choices.includes(value),
          ),
        ),
      ]
    : [];
  if (!remaining.length) {
    const round = drawVariant(effect, undefined, random, hidden);
    remaining = [round.variant, ...round.state.remaining];
  }
  return {
    set: { [key]: { remaining: remaining.filter(value => value !== variant), last: variant } },
  };
}
