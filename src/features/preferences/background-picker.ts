import type { EffectId } from '../../effects/presets';
import type { Unsubscribe, VariantDraw } from '../../platform/types';
import {
  canHideVariant,
  chooseEffect,
  chooseOtherEffect,
  drawableVariants,
  effectPool,
  parseVariantKey,
  variantKey,
  type PreferenceUpdate,
  type Preferences,
} from './model';
import { drawVariant } from './variant-shuffle';

export interface Selection {
  effect: EffectId;
  variant: string;
}

export interface BackgroundView {
  /** The page's effect, known before its variant is. */
  effect: EffectId;
  /** The background to paint; undefined until the first variant is known. */
  selection?: Selection;
  /** Whether `selection` is the pinned variant. */
  pinned: boolean;
  canReshuffle: boolean;
  canHide: boolean;
}

export interface PickerOptions {
  /** Draws the next variant of `effect` from its persisted shuffle bag. */
  draw: (effect: EffectId, hidden: readonly string[]) => Promise<VariantDraw>;
  random?: () => number;
}

export interface BackgroundPicker {
  /** Applies the latest preferences. Nothing is drawn until `ready`. */
  update: (preferences: Preferences, ready: boolean) => void;
  view: () => BackgroundView;
  subscribe: (listener: () => void) => Unsubscribe;
  /** Calls `listener` when a draw or its save fails; a draw that fails shows a local pick instead. */
  watchErrors: (listener: (error: unknown) => void) => Unsubscribe;
  /**
   * Shows the next background: another effect from the pool when shuffling
   * (weighted like page openings), then its next variant.
   */
  reshuffle: () => void;
  /**
   * Leaves the variant on screen out of the next draws and moves on to the next
   * background. Returns the preference change to save, if hiding was allowed.
   */
  hide: () => PreferenceUpdate | undefined;
  /** The preference change that pins the variant on screen to every page, or unpins it. */
  pin: (pinned: boolean) => PreferenceUpdate | undefined;
}

/**
 * Picks the background for this page: one effect per page load from the
 * user's pool (weighted, see `effectWeights`), and one variant per effect
 * drawn from that effect's persisted shuffle bag, skipping hidden variants.
 *
 * The page keeps its effect while that effect stays in the pool, so editing
 * hidden variants never moves it elsewhere, and keeps each effect's variant
 * until `reshuffle`. A pinned variant replaces both draws; unpinning keeps it
 * on this page, and the next page draws as usual. The selection only changes
 * once the new variant is known, so the page never paints a placeholder.
 */
export function createBackgroundPicker(
  initial: Preferences,
  { draw, random = Math.random }: PickerOptions,
): BackgroundPicker {
  const seed = random();
  let preferences = initial;
  let ready = false;
  /** The page's effect once drawn. */
  let chosen: EffectId | undefined;
  /** Bumped by `reshuffle` for the effect whose cached draw it replaces. */
  const generations: Partial<Record<EffectId, number>> = {};
  const draws: Partial<Record<EffectId, { generation: number; variant: Promise<string> }>> = {};
  let drawn: Selection | undefined;
  /** The draw the page waits for; a draw that resolves after the page moved on is ignored. */
  let target: { effect: EffectId; generation: number } | undefined;
  const listeners = new Set<() => void>();
  const errorListeners = new Set<(error: unknown) => void>();
  const onError = (error: unknown) => errorListeners.forEach(listener => listener(error));

  // Parsed once per key, so a pinned selection keeps its identity across updates.
  let pin: { key: string | null; value?: Selection } = { key: null };
  const pinnedNow = () => {
    if (pin.key !== preferences.pinnedVariant)
      pin = { key: preferences.pinnedVariant, value: parseVariantKey(preferences.pinnedVariant) };
    return pin.value;
  };
  const currentEffect = () =>
    pinnedNow()?.effect ??
    (chosen && effectPool(preferences).includes(chosen) ? chosen : chooseEffect(preferences, seed));

  function requestDraw(effect: EffectId, generation: number) {
    const hidden = preferences.hiddenVariants;
    const request = {
      generation,
      variant: draw(effect, hidden).then(
        ({ variant, saved }) => {
          saved.catch(onError);
          return variant;
        },
        (error: unknown) => {
          // A rejected draw is never kept: the next selection of this effect retries,
          // and this page still animates with a local pick that is not persisted.
          if (draws[effect] === request) delete draws[effect];
          onError(error);
          return drawVariant(effect, undefined, random, hidden).variant;
        },
      ),
    };
    return (draws[effect] = request);
  }

  function refresh() {
    const pinned = pinnedNow();
    const effect = currentEffect();
    if (ready && !pinned) {
      chosen = effect;
      const generation = generations[effect] ?? 0;
      if (target?.effect !== effect || target.generation !== generation) {
        const wanted = (target = { effect, generation });
        const cached = draws[effect];
        const request =
          cached?.generation === generation ? cached : requestDraw(effect, generation);
        void request.variant.then(variant => {
          if (target !== wanted || (drawn?.effect === effect && drawn.variant === variant)) return;
          drawn = { effect, variant };
          publish();
        });
      }
    } else {
      target = undefined;
    }
    publish();
  }

  function compute(): BackgroundView {
    const pinned = pinnedNow();
    const effect = currentEffect();
    const selection = pinned ?? drawn;
    const shown = selection && variantKey(selection.effect, selection.variant);
    return {
      effect,
      selection,
      pinned: pinned !== undefined,
      canReshuffle:
        !pinned &&
        (effectPool(preferences).length > 1 ||
          drawableVariants(effect, preferences.hiddenVariants).length > 1),
      canHide: !pinned && shown !== undefined && canHideVariant(preferences, shown),
    };
  }

  let snapshot = compute();
  function publish() {
    const next = compute();
    if ((Object.keys(next) as (keyof BackgroundView)[]).every(key => next[key] === snapshot[key]))
      return;
    snapshot = next;
    listeners.forEach(listener => listener());
  }

  function reshuffle() {
    if (!ready || pinnedNow()) return;
    const effect = currentEffect();
    const next = chooseOtherEffect(preferences, effect, random()) ?? effect;
    chosen = next;
    generations[next] = (generations[next] ?? 0) + 1;
    refresh();
  }

  return {
    update: (next, nextReady) => {
      const unpinned = parseVariantKey(preferences.pinnedVariant);
      preferences = next;
      ready = nextReady;
      if (unpinned && !pinnedNow()) {
        // Keep the unpinned background on screen, in place of any cached draw.
        chosen = unpinned.effect;
        const generation = generations[unpinned.effect] ?? 0;
        draws[unpinned.effect] = { generation, variant: Promise.resolve(unpinned.variant) };
        drawn = unpinned;
        target = { effect: unpinned.effect, generation };
      }
      refresh();
    },
    view: () => snapshot,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    watchErrors: listener => {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    reshuffle,
    hide: () => {
      const selection = snapshot.selection;
      if (!snapshot.canHide || !selection) return undefined;
      const key = variantKey(selection.effect, selection.variant);
      const hide = (hidden: string[]) => (hidden.includes(key) ? hidden : [...hidden, key]);
      // The next pick and draw already leave the variant out; the saved preferences follow.
      preferences = { ...preferences, hiddenVariants: hide(preferences.hiddenVariants) };
      reshuffle();
      return current => ({ hiddenVariants: hide(current.hiddenVariants) });
    },
    pin: pinned => {
      const selection = snapshot.selection;
      if (!selection) return undefined;
      return { pinnedVariant: pinned ? variantKey(selection.effect, selection.variant) : null };
    },
  };
}
