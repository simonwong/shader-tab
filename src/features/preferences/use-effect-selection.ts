import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { EffectId } from '../../effects/presets';
import type { Platform } from '../../platform/types';
import {
  chooseEffect,
  drawableVariants,
  effectWeights,
  parseVariantKey,
  type Preferences,
} from './model';
import { drawVariant } from './variant-shuffle';

interface Options {
  platform: Platform;
  preferences: Preferences;
  /** False until saved preferences have loaded; nothing is drawn before that. */
  ready: boolean;
  /** Called when the persisted shuffle draw fails (a local pick is used instead). */
  onDrawError: (error: unknown) => void;
}

export interface Selection {
  effect: EffectId;
  variant: string;
}

/**
 * Picks the background for this page: one effect per page load from the
 * user's pool (weighted, see `effectWeights`), and one variant per effect
 * drawn from that effect's persisted shuffle bag, skipping hidden variants. A
 * variant stays fixed for the page once drawn, until `reshuffle` asks for the
 * next one. A pinned variant replaces both draws.
 *
 * `selection` only changes once the new variant is known, so the page never
 * paints an effect with a placeholder variant in between.
 */
export function useEffectSelection({ platform, preferences, ready, onDrawError }: Options) {
  const [seed] = useState(Math.random);
  /** The page's effect once drawn; it holds while it stays in the pool. */
  const [chosen, setChosen] = useState<EffectId>();
  // Bumped by `reshuffle` for the effect whose cached draw it replaces.
  const [generations, setGenerations] = useState<Partial<Record<EffectId, number>>>({});
  const pinned = useMemo(
    () => parseVariantKey(preferences.pinnedVariant),
    [preferences.pinnedVariant],
  );
  const pool = useMemo(
    () => (preferences.shuffle ? preferences.effects : [preferences.activeEffect]),
    [preferences.shuffle, preferences.effects, preferences.activeEffect],
  );
  const effect =
    pinned?.effect ?? (chosen && pool.includes(chosen) ? chosen : chooseEffect(preferences, seed));
  // Hold the page's effect once preferences load: editing hidden variants changes
  // the weights, and must not move this page to another effect.
  if (ready && !pinned && chosen !== effect) setChosen(effect);
  const generation = generations[effect] ?? 0;

  // Unpinning keeps the pinned background on this page; the next page draws as usual.
  const [lastPin, setLastPin] = useState(pinned);
  const [carry, setCarry] = useState<Selection & { generation: number }>();
  if (lastPin !== pinned) {
    setLastPin(pinned);
    if (lastPin && !pinned) {
      setChosen(lastPin.effect);
      setCarry({ ...lastPin, generation: generations[lastPin.effect] ?? 0 });
    }
  }

  const [drawn, setDrawn] = useState<Selection>();
  const draws = useRef<Partial<Record<EffectId, { generation: number; variant: Promise<string> }>>>(
    {},
  );
  const carried = useRef<typeof carry>(undefined);
  // Read the latest values without making them effect dependencies: hiding a
  // variant must not redraw the background on screen.
  const reportError = useEffectEvent((error: unknown) => onDrawError(error));
  const hiddenNow = useEffectEvent(() => preferences.hiddenVariants);

  useEffect(() => {
    if (!ready || pinned) return;
    let active = true;
    let draw = draws.current[effect];
    if (carry?.effect === effect && carry.generation === generation && carried.current !== carry) {
      // Replaces any cached draw: the unpinned background stays on screen.
      carried.current = carry;
      draws.current[effect] = draw = { generation, variant: Promise.resolve(carry.variant) };
    } else if (draw?.generation !== generation) {
      const hidden = hiddenNow();
      const drawnVariant: Promise<string> = platform.nextEffectVariant(effect, hidden).then(
        ({ variant, saved }) => {
          saved.catch((error: unknown) => reportError(error));
          return variant;
        },
        (error: unknown) => {
          // Never keep a rejected draw cached: the next selection of this effect retries,
          // and this page still animates with a local pick that is not persisted.
          if (draws.current[effect] === request) delete draws.current[effect];
          reportError(error);
          return drawVariant(effect, undefined, Math.random, hidden).variant;
        },
      );
      const request = { generation, variant: drawnVariant };
      draws.current[effect] = draw = request;
    }
    void draw.variant.then(variant => {
      if (active)
        setDrawn(previous =>
          previous?.effect === effect && previous.variant === variant
            ? previous
            : { effect, variant },
        );
    });
    return () => {
      active = false;
    };
  }, [effect, generation, ready, platform, pinned, carry]);

  const selection = pinned ?? drawn;
  const canReshuffle =
    !pinned && (pool.length > 1 || drawableVariants(effect, preferences.hiddenVariants).length > 1);

  /**
   * Shows the next background: another effect from the pool when shuffling
   * (weighted like page openings), then its next variant. Pass the hidden list
   * when it changes in the same step, so the pick already leaves those out.
   */
  const reshuffle = useCallback(
    (hiddenVariants = preferences.hiddenVariants) => {
      const others = effectWeights({ ...preferences, hiddenVariants }).filter(
        entry => entry.effect !== effect && entry.weight > 0,
      );
      let next = effect;
      if (others.length) {
        const total = others.reduce((sum, entry) => sum + entry.weight, 0);
        let at = Math.random() * total;
        next = others.find(entry => (at -= entry.weight) < 0)?.effect ?? others.at(-1)!.effect;
        setChosen(next);
      }
      setGenerations(current => ({ ...current, [next]: (current[next] ?? 0) + 1 }));
    },
    [effect, preferences],
  );

  return { effect, selection, reshuffle, canReshuffle };
}
