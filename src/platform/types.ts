import type { EffectId } from '../effects/presets';
import type { BookmarkNode } from '../features/bookmarks/model';
import type { FavoriteAction } from '../features/favorites/model';
import type { Preferences } from '../features/preferences/model';
export type Unsubscribe = () => void;
export type Listener = () => void;
export interface Platform {
  mode: 'extension' | 'preview' | 'unavailable';
  getTree: () => Promise<BookmarkNode[]>;
  getFavorites: () => Promise<string[]>;
  updateFavorites: (action: FavoriteAction) => Promise<void>;
  /** Draws the next variant id for `effect` from its persisted shuffle bag. */
  nextEffectVariant: (effect: EffectId) => Promise<string>;
  getPreferences: () => Promise<Preferences>;
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
  watchBookmarks: (listener: Listener) => Unsubscribe;
  watchFavorites: (listener: Listener) => Unsubscribe;
  watchPreferences: (listener: Listener) => Unsubscribe;
}
