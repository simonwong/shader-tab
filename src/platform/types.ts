import type { EffectId } from '../effects/presets';
import type { BookmarkNode } from '../features/bookmarks/model';
import type { FavoriteAction, FavoriteRef } from '../features/favorites/model';
import type { PreferenceUpdate, Preferences } from '../features/preferences/model';
export type Unsubscribe = () => void;
export type Listener = () => void;
export interface VariantDraw {
  /** Variant to show now. */
  variant: string;
  /** Settles once the draw is recorded in the shuffle bag; rejects if that write fails. */
  saved: Promise<void>;
}
export interface Platform {
  mode: 'extension' | 'preview' | 'unavailable';
  getTree: () => Promise<BookmarkNode[]>;
  getFavorites: () => Promise<FavoriteRef[]>;
  updateFavorites: (action: FavoriteAction) => Promise<void>;
  /**
   * Picks the next variant for `effect` from its persisted shuffle bag. Resolves
   * after a single read; recording the draw happens in the background.
   */
  nextEffectVariant: (effect: EffectId) => Promise<VariantDraw>;
  getPreferences: () => Promise<Preferences>;
  /** Read-modify-write under a lock, so concurrent saves never drop each other's fields. */
  updatePreferences: (update: PreferenceUpdate) => Promise<void>;
  /**
   * Opens a URL that a page link cannot (chrome:// pages, file:// URLs) in this
   * tab, or in a background tab when `background` is true.
   */
  openUrl: (url: string, background: boolean) => Promise<void>;
  watchBookmarks: (listener: Listener) => Unsubscribe;
  watchFavorites: (listener: Listener) => Unsubscribe;
  watchPreferences: (listener: Listener) => Unsubscribe;
}
