import type { EffectId } from '../../effects/presets';
import { drawableVariants } from './model';

export const variantShuffleKey = (effect: EffectId) => `effect-variant:shuffle:v1:${effect}`;

export interface ShuffleState {
  remaining: string[];
  last: string;
}

/** The stored bag's variants that can still be drawn, without duplicates or retired ids. */
function remainingIn(saved: unknown, choices: readonly string[]): string[] {
  const remaining =
    saved && typeof saved === 'object' ? (saved as { remaining?: unknown }).remaining : undefined;
  if (!Array.isArray(remaining)) return [];
  return [
    ...new Set(
      remaining.filter(
        (value): value is string => typeof value === 'string' && choices.includes(value),
      ),
    ),
  ];
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
  let remaining = remainingIn(saved, choices);
  if (!remaining.length) {
    const last =
      saved && typeof saved === 'object' ? (saved as { last?: unknown }).last : undefined;
    remaining = [...choices];
    for (let index = remaining.length - 1; index > 0; index--) {
      const next = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
      [remaining[index], remaining[next]] = [remaining[next]!, remaining[index]!];
    }
    if (remaining[0] === last && remaining.length > 1)
      [remaining[0], remaining[1]] = [remaining[1]!, remaining[0]!];
  }
  const variant = remaining.shift()!;
  return { variant, state: { remaining, last: variant } };
}

/**
 * Records that `variant` was shown, given the bag as it is stored now, and
 * returns the bag to store.
 *
 * A page peeks at the bag head and paints right away; this commit runs later,
 * under a lock, against a fresh read. If the bag still holds `variant` it is
 * taken out; if the bag is used up, a new round starts without it; if another
 * tab already took it, the bag is left as is. In every case `last` becomes
 * `variant`, so the next round does not open with it.
 */
export function settleVariant(
  effect: EffectId,
  saved: unknown,
  variant: string,
  random = Math.random,
  hidden: readonly string[] = [],
): ShuffleState {
  let remaining = remainingIn(saved, drawableVariants(effect, hidden));
  if (!remaining.length) {
    const round = drawVariant(effect, undefined, random, hidden);
    remaining = [round.variant, ...round.state.remaining];
  }
  return { remaining: remaining.filter(value => value !== variant), last: variant };
}
