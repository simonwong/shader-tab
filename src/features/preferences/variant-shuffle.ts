import { variantIds } from '../../effects/variants';
import type { EffectId } from '../../effects/presets';

export const variantShuffleKey = (effect: EffectId) => `effect-variant:shuffle:v1:${effect}`;

/**
 * Shuffle bags kept under older keys. Shader Gradient used to have its own
 * shape shuffle; its saved state has the same `{ remaining, last }` shape and
 * the same ids, so it is carried over into the regular variant bag.
 */
export const LEGACY_SHUFFLE_KEYS: Partial<Record<EffectId, string>> = {
  'shader-gradient': 'shader-gradient:shuffle:v1',
};

export interface ShuffleState { remaining: string[]; last: string }

export function drawVariant(effect: EffectId, saved: unknown, random = Math.random): { variant: string; state: ShuffleState } {
  const choices = variantIds(effect);
  const previous = saved && typeof saved === 'object' ? saved as { remaining?: unknown; last?: unknown } : {};
  let remaining = Array.isArray(previous.remaining)
    ? [...new Set(previous.remaining.filter((value): value is string => typeof value === 'string' && choices.includes(value)))]
    : [];
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

/** Storage keys to read before drawing a variant for `effect`. */
export function variantStorageKeys(effect: EffectId): string[] {
  const legacy = LEGACY_SHUFFLE_KEYS[effect];
  return legacy ? [variantShuffleKey(effect), legacy] : [variantShuffleKey(effect)];
}

export interface StoredDraw {
  variant: string;
  /** Entries to write back. */
  set: Record<string, ShuffleState>;
  /** Obsolete keys to delete. */
  remove: string[];
}

/**
 * Draws the next variant from stored shuffle state. When only a legacy bag
 * exists it seeds the draw, so the user's queue carries over; the legacy key is
 * always scheduled for removal once seen.
 */
export function drawStoredVariant(effect: EffectId, items: Record<string, unknown>, random = Math.random): StoredDraw {
  const { saved, key, remove } = storedBag(effect, items);
  const { variant, state } = drawVariant(effect, saved, random);
  return { variant, set: { [key]: state }, remove };
}

function storedBag(effect: EffectId, items: Record<string, unknown>) {
  const key = variantShuffleKey(effect);
  const legacy = LEGACY_SHUFFLE_KEYS[effect];
  const legacySaved = legacy === undefined ? undefined : items[legacy];
  const saved = items[key] === undefined ? legacySaved : items[key];
  return { key, saved, remove: legacy !== undefined && legacySaved !== undefined ? [legacy] : [] };
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
export function settleVariant(effect: EffectId, items: Record<string, unknown>, variant: string, random = Math.random): Omit<StoredDraw, 'variant'> {
  const { saved, key, remove } = storedBag(effect, items);
  const choices = variantIds(effect);
  const previous = saved && typeof saved === 'object' ? saved as { remaining?: unknown } : {};
  let remaining = Array.isArray(previous.remaining)
    ? [...new Set(previous.remaining.filter((value): value is string => typeof value === 'string' && choices.includes(value)))]
    : [];
  if (!remaining.length) {
    const round = drawVariant(effect, undefined, random);
    remaining = [round.variant, ...round.state.remaining];
  }
  return { set: { [key]: { remaining: remaining.filter(value => value !== variant), last: variant } }, remove };
}
