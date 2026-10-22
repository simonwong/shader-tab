import { isLanguage, type Language } from '../../i18n/core';
import { isBookmarkSort, type BookmarkSort } from '../bookmarks/sorting';
import { EFFECT_IDS, isEffect, migrateEffect, type EffectId } from '../../effects/presets';
import { isMotion, type Motion } from '../../effects/motion';
import { getVariant, variantIds } from '../../effects/variants';
import { isFavoriteKey } from '../favorites/model';
export const PREFERENCE_PREFIX = 'preference:v1:';
export interface Preferences {
  language: Language;
  appearance: 'system' | 'day' | 'night';
  effects: EffectId[];
  activeEffect: EffectId;
  shuffle: boolean;
  bookmarkSort: BookmarkSort;
  showFavorites: boolean;
  showBookmarks: boolean;
  /** Favorites as icons in the dock itself, or in a tray behind the star. */
  favoritesLayout: FavoritesLayout;
  idleDelay: 1000 | 2000 | 5000;
  motion: Motion;
  /** Variants left out of every draw, as `variantKey`s. */
  hiddenVariants: string[];
  /** A variant shown on every page instead of drawing one, as a `variantKey`. */
  pinnedVariant: string | null;
  /** Whether first-run onboarding is still pending. Only a fresh install starts with it. */
  onboarding: boolean;
}
export type FavoritesLayout = 'tray' | 'dock';
export const DEFAULT_PREFERENCES: Preferences = {
  language: 'auto',
  appearance: 'system',
  effects: [...EFFECT_IDS],
  activeEffect: 'grain-gradient',
  shuffle: true,
  bookmarkSort: 'chrome',
  showFavorites: true,
  showBookmarks: true,
  favoritesLayout: 'tray',
  idleDelay: 2000,
  motion: 'soft',
  hiddenVariants: [],
  pinnedVariant: null,
  onboarding: false,
};
/** A preference update: a patch, or a function of the latest stored preferences. */
export type PreferenceUpdate =
  | Partial<Preferences>
  | ((current: Preferences) => Partial<Preferences>);

export function readPreferences(data: Record<string, unknown>): Preferences {
  const get = (key: keyof Preferences) => data[PREFERENCE_PREFIX + key];
  const appearance = get('appearance');
  const effects = get('effects');
  const ids = Array.isArray(effects)
    ? [...new Set(effects.map(migrateEffect).filter((id): id is EffectId => id !== undefined))]
    : [];
  const activeEffect = get('activeEffect');
  const delay = get('idleDelay');
  const onboarding = get('onboarding');
  const hidden = get('hiddenVariants');
  const pinned = get('pinnedVariant');
  return {
    language: isLanguage(get('language')) ? (get('language') as Language) : 'auto',
    appearance: appearance === 'day' || appearance === 'night' ? appearance : 'system',
    effects: ids.length ? ids : [...DEFAULT_PREFERENCES.effects],
    activeEffect: migrateEffect(activeEffect) ?? 'grain-gradient',
    shuffle: typeof get('shuffle') === 'boolean' ? (get('shuffle') as boolean) : true,
    bookmarkSort: isBookmarkSort(get('bookmarkSort'))
      ? (get('bookmarkSort') as BookmarkSort)
      : 'chrome',
    showFavorites: get('showFavorites') !== false,
    showBookmarks: get('showBookmarks') !== false,
    // Installs from before the dock layout keep the tray; onboarding asks new users.
    favoritesLayout: get('favoritesLayout') === 'dock' ? 'dock' : 'tray',
    idleDelay: delay === 1000 || delay === 5000 ? delay : 2000,
    motion: isMotion(get('motion')) ? (get('motion') as Motion) : 'soft',
    // Keys of retired variants drop out, so they never hide or pin a variant that no longer exists.
    hiddenVariants: Array.isArray(hidden)
      ? [...new Set(hidden.filter(key => parseVariantKey(key) !== undefined) as string[])]
      : [],
    pinnedVariant: parseVariantKey(pinned) ? (pinned as string) : null,
    // Fresh install: no saved preference or favorite yet. Shuffle-bag keys written on the first page don't count.
    onboarding:
      typeof onboarding === 'boolean'
        ? onboarding
        : Object.keys(data).every(key => !key.startsWith(PREFERENCE_PREFIX) && !isFavoriteKey(key)),
  };
}
/** Storage entries for a resolved preference patch. */
export function preferenceEntries(patch: Partial<Preferences>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [PREFERENCE_PREFIX + key, value]),
  );
}
/** Resolves an update against `current`, dropping fields that would not change. */
export function resolvePreferenceUpdate(
  current: Preferences,
  update: PreferenceUpdate,
): Partial<Preferences> {
  const patch = typeof update === 'function' ? update(current) : update;
  return Object.fromEntries(
    Object.entries(patch).filter(
      ([key, value]) => JSON.stringify(current[key as keyof Preferences]) !== JSON.stringify(value),
    ),
  ) as Partial<Preferences>;
}
/** How hidden and pinned variants are stored: `effect/variant` (variant ids never contain "/"). */
export const variantKey = (effect: EffectId, variant: string) => `${effect}/${variant}`;

export function parseVariantKey(key: unknown): { effect: EffectId; variant: string } | undefined {
  if (typeof key !== 'string') return undefined;
  const slash = key.indexOf('/');
  const effect = key.slice(0, slash);
  const variant = key.slice(slash + 1);
  return slash > 0 && isEffect(effect) && getVariant(effect, variant)
    ? { effect, variant }
    : undefined;
}

const visibleVariants = (effect: EffectId, hidden: readonly string[]) =>
  variantIds(effect).filter(variant => !hidden.includes(variantKey(effect, variant)));

/** Variants of `effect` a draw may pick: all but the hidden ones, or all if every one is hidden. */
export function drawableVariants(effect: EffectId, hidden: readonly string[]): string[] {
  const visible = visibleVariants(effect, hidden);
  return visible.length ? visible : variantIds(effect);
}

/** Effects a page may show: the shuffle pool, or the one selected effect. */
export const effectPool = (preferences: Preferences): readonly EffectId[] =>
  preferences.shuffle ? preferences.effects : [preferences.activeEffect];

/** Whether hiding `key` still leaves a visible variant somewhere in the pool. */
export function canHideVariant(preferences: Preferences, key: string): boolean {
  const hidden = [...preferences.hiddenVariants, key];
  return effectPool(preferences).some(effect => visibleVariants(effect, hidden).length > 0);
}

/**
 * Share of page openings for each effect in the pool: the square root of its
 * visible variant count. A family with more variants shows a little more
 * often, so each variant is not seen far less than one of a small family, but
 * the large families (7 variants) do not crowd out the small ones (3). A
 * family whose variants are all hidden drops out; if that empties the pool,
 * hidden variants are ignored.
 */
export function effectWeights(preferences: Preferences): { effect: EffectId; weight: number }[] {
  const pool = effectPool(preferences);
  const weights = pool.map(effect => ({
    effect,
    weight: Math.sqrt(visibleVariants(effect, preferences.hiddenVariants).length),
  }));
  return weights.some(entry => entry.weight > 0)
    ? weights
    : pool.map(effect => ({ effect, weight: 1 }));
}

function pickWeighted(
  weights: readonly { effect: EffectId; weight: number }[],
  random: number,
): EffectId | undefined {
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let at = Math.min(Math.max(random, 0), 1) * total;
  for (const entry of weights) {
    if (entry.weight > 0 && at < entry.weight) return entry.effect;
    at -= entry.weight;
  }
  return weights.findLast(entry => entry.weight > 0)?.effect;
}

/** The effect for a page, from a random number in [0, 1). */
export function chooseEffect(preferences: Preferences, random: number): EffectId {
  return pickWeighted(effectWeights(preferences), random) ?? 'grain-gradient';
}

/** Another effect from the pool than `current`, weighted like `chooseEffect`; none if it is alone. */
export function chooseOtherEffect(
  preferences: Preferences,
  current: EffectId,
  random: number,
): EffectId | undefined {
  return pickWeighted(
    effectWeights(preferences).filter(entry => entry.effect !== current),
    random,
  );
}

/** Toggles `id` in the shuffle pool; the last remaining effect stays selected. */
export function toggleEffect(effects: readonly EffectId[], id: EffectId): EffectId[] {
  if (!effects.includes(id)) return [...effects, id];
  return effects.length === 1 ? [...effects] : effects.filter(effect => effect !== id);
}
