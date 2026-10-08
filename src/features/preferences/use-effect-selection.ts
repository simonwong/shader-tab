import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [round, setRound] = useState(0);
  const effect = chooseEffect(preferences, seed);
  const [selection, setSelection] = useState<Selection>();
  const draws = useRef<Partial<Record<EffectId, Promise<string>>>>({});
  const reportError = useRef(onDrawError);
  reportError.current = onDrawError;

  useEffect(() => {
    if (!ready) return;
    let active = true;
    let draw = draws.current[effect];
    if (!draw) {
      const request: Promise<string> = platform.nextEffectVariant(effect).then(({ variant, saved }) => {
        saved.catch((error: unknown) => reportError.current(error));
        return variant;
      }, (error: unknown) => {
        // Never keep a rejected draw cached: the next selection of this effect retries,
        // and this page still animates with a local pick that is not persisted.
        if (draws.current[effect] === request) delete draws.current[effect];
        reportError.current(error);
        return drawVariant(effect, undefined).variant;
      });
      draws.current[effect] = draw = request;
    }
    void draw.then(variant => {
      if (active) setSelection(previous => previous?.effect === effect && previous.variant === variant ? previous : { effect, variant });
    });
    return () => { active = false; };
  }, [effect, ready, platform, round]);

  const pool = preferences.shuffle ? preferences.effects : [preferences.activeEffect];
  const canReshuffle = pool.length > 1 || variantIds(effect).length > 1;

  /** Shows the next background: another effect from the pool when shuffling, then its next variant. */
  const reshuffle = useCallback(() => {
    let next = effect;
    if (pool.length > 1) {
      const others = pool.filter(id => id !== effect);
      next = others[Math.floor(Math.random() * others.length)] ?? effect;
      setSeed((pool.indexOf(next) + .5) / pool.length);
    }
    delete draws.current[next];
    setRound(value => value + 1);
  }, [effect, pool]);

  return { effect, selection, reshuffle, canReshuffle };
}
