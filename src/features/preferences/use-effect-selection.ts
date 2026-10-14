import { useEffectEvent, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import type { Platform } from '../../platform/types';
import { createBackgroundPicker } from './background-picker';
import type { PreferenceUpdate, Preferences } from './model';

interface Options {
  platform: Platform;
  preferences: Preferences;
  /** False until saved preferences have loaded; nothing is drawn before that. */
  ready: boolean;
  /** Saves a preference change: hiding or pinning the variant on screen. */
  onPreferenceChange: (update: PreferenceUpdate) => void;
  /** Called when the persisted shuffle draw fails (a local pick is used instead). */
  onDrawError: (error: unknown) => void;
}

/** This page's background and its controls; see `createBackgroundPicker`. */
export function useEffectSelection({
  platform,
  preferences,
  ready,
  onPreferenceChange,
  onDrawError,
}: Options) {
  const [picker] = useState(() =>
    createBackgroundPicker(preferences, {
      draw: (effect, hidden) => platform.nextEffectVariant(effect, hidden),
    }),
  );
  const reportError = useEffectEvent((error: unknown) => onDrawError(error));
  // Subscribed before the next layout effect starts the first draw.
  useLayoutEffect(() => picker.watchErrors(error => reportError(error)), [picker]);
  useLayoutEffect(() => picker.update(preferences, ready), [picker, preferences, ready]);
  const view = useSyncExternalStore(picker.subscribe, picker.view);
  const save = (update: PreferenceUpdate | undefined) => {
    if (update) onPreferenceChange(update);
  };
  return {
    ...view,
    reshuffle: picker.reshuffle,
    hide: () => save(picker.hide()),
    pin: (pinned: boolean) => save(picker.pin(pinned)),
  };
}
