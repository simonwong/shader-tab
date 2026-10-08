import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { EffectId } from '../../effects/presets';
import { variantIds } from '../../effects/variants';
import type { Platform } from '../../platform/types';
import { chooseEffect, type Preferences } from './model';
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
 * user's pool, and one variant per effect drawn from that effect's persisted
 * shuffle bag. A variant stays fixed for the page once drawn, until
 * `reshuffle` asks for the next one.
 *
 * `selection` only changes once the new variant is known, so the page never
 * paints an effect with a placeholder variant in between.
 */
export function useEffectSelection({ platform, preferences, ready, onDrawError }: Options) {
  const [seed, setSeed] = useState(Math.random);
  // Bumped by `reshuffle` for the effect whose cached draw it replaces.
  const [generations, setGenerations] = useState<Partial<Record<EffectId, number>>>({});
  const effect = chooseEffect(preferences, seed);
  const [selection, setSelection] = useState<Selection>();
  const draws = useRef<Partial<Record<EffectId, { generation: number; variant: Promise<string> }>>>(
    {},
  );
  // Reads the latest handler without making it an effect dependency, so a new handler never redraws.
  const reportError = useEffectEvent((error: unknown) => onDrawError(error));

  const generation = generations[effect] ?? 0;

  useEffect(() => {
    if (!ready) return;
    let active = true;
    let draw = draws.current[effect];
    if (draw?.generation !== generation) {
      const drawn: Promise<string> = platform.nextEffectVariant(effect).then(
        ({ variant, saved }) => {
          saved.catch((error: unknown) => reportError(error));
          return variant;
        },
        (error: unknown) => {
          // Never keep a rejected draw cached: the next selection of this effect retries,
          // and this page still animates with a local pick that is not persisted.
          if (draws.current[effect] === request) delete draws.current[effect];
          reportError(error);
          return drawVariant(effect, undefined).variant;
        },
      );
      const request = { generation, variant: drawn };
      draws.current[effect] = draw = request;
    }
    void draw.variant.then(variant => {
      if (active)
        setSelection(previous =>
          previous?.effect === effect && previous.variant === variant
            ? previous
            : { effect, variant },
        );
    });
    return () => {
      active = false;
    };
  }, [effect, generation, ready, platform]);

  const pool = useMemo(
    () => (preferences.shuffle ? preferences.effects : [preferences.activeEffect]),
    [preferences.shuffle, preferences.effects, preferences.activeEffect],
  );
  const canReshuffle = pool.length > 1 || variantIds(effect).length > 1;

  /** Shows the next background: another effect from the pool when shuffling, then its next variant. */
  const reshuffle = useCallback(() => {
    let next = effect;
    if (pool.length > 1) {
      const others = pool.filter(id => id !== effect);
      next = others[Math.floor(Math.random() * others.length)] ?? effect;
      setSeed((pool.indexOf(next) + 0.5) / pool.length);
    }
    setGenerations(current => ({ ...current, [next]: (current[next] ?? 0) + 1 }));
  }, [effect, pool]);

  return { effect, selection, reshuffle, canReshuffle };
}
