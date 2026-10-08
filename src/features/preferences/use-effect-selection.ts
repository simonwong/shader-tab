import { useEffect, useRef, useState } from 'react';
import type { EffectId } from '../../effects/presets';
import type { Platform } from '../../platform/types';
import { chooseEffect, type Preferences } from './model';
import { drawVariant } from './variant-shuffle';

interface Options {
  platform: Platform;
  preferences: Preferences;
  /** False until saved preferences have loaded; no variant is drawn before that. */
  ready: boolean;
  /** Called when the persisted shuffle draw fails (a local pick is used instead). */
  onDrawError: (error: unknown) => void;
}

/**
 * Picks the background for this page: one effect per page load from the
 * user's pool, and one variant per effect drawn from that effect's persisted
 * shuffle bag. A variant stays fixed for the page once drawn.
 */
export function useEffectSelection({ platform, preferences, ready, onDrawError }: Options) {
  const [seed] = useState(Math.random);
  const effect = chooseEffect(preferences, seed);
  const [variants, setVariants] = useState<Partial<Record<EffectId, string>>>({});
  const draws = useRef<Partial<Record<EffectId, Promise<string>>>>({});
  const reportError = useRef(onDrawError);
  reportError.current = onDrawError;

  useEffect(() => {
    if (!ready) return;
    let active = true;
    let draw = draws.current[effect];
    if (!draw) {
      const request: Promise<string> = platform.nextEffectVariant(effect).catch((error: unknown) => {
        // Never keep a rejected draw cached: the next selection of this effect retries,
        // and this page still animates with a local pick that is not persisted.
        if (draws.current[effect] === request) delete draws.current[effect];
        reportError.current(error);
        return drawVariant(effect, undefined).variant;
      });
      draws.current[effect] = draw = request;
    }
    void draw.then(variant => {
      if (active) setVariants(previous => previous[effect] === variant ? previous : { ...previous, [effect]: variant });
    });
    return () => { active = false; };
  }, [effect, ready, platform]);

  return { effect, variant: variants[effect] };
}
