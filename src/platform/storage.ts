import { flattenBookmarks, type BookmarkNode } from '../features/bookmarks/model';
import {
  FAVORITES_KEY,
  changeFavorites,
  isFavoriteKey,
  legacyFavoriteKeys,
  readFavorites,
  type FavoriteRef,
} from '../features/favorites/model';
import {
  PREFERENCE_PREFIX,
  preferenceEntries,
  readPreferences,
  resolvePreferenceUpdate,
} from '../features/preferences/model';
import {
  drawVariant,
  settleVariant,
  variantShuffleKey,
} from '../features/preferences/variant-shuffle';
import type { Listener, Platform, Unsubscribe } from './types';

/** Key-value storage holding JSON values, shaped like `chrome.storage.local`. */
export interface Store {
  /** Reads `keys`, or every entry when `keys` is null. Missing keys are left out. */
  get: (keys: string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string[]) => Promise<void>;
  /** Calls `listener` when a key that `matches` changes, in this tab or another one. */
  watch: (matches: (key: string) => boolean, listener: Listener) => Unsubscribe;
}

export interface StorageOptions {
  store: Store;
  getTree: () => Promise<BookmarkNode[]>;
  /** Prefix of the Web Locks names. Tabs that share `store` must share it. */
  lockPrefix: string;
  /** Favorites shown until any are saved. */
  sampleFavorites?: FavoriteRef[];
  random?: () => number;
}

export type StoragePlatform = Pick<
  Platform,
  | 'getFavorites'
  | 'updateFavorites'
  | 'nextEffectVariant'
  | 'getPreferences'
  | 'updatePreferences'
  | 'watchFavorites'
  | 'watchPreferences'
>;

/**
 * Favorites, shuffle bags and preferences on top of a `Store`: storage formats,
 * migrations and the locks that keep tabs from overwriting each other.
 */
export function createStorage({
  store,
  getTree,
  lockPrefix,
  sampleFavorites,
  random = Math.random,
}: StorageOptions): StoragePlatform {
  const lock = (name: string, task: () => Promise<void>) =>
    navigator.locks.request(lockPrefix + name, task);

  // The favorites and preferences queries at startup share one full read. Later
  // refreshes read on their own, so a refresh triggered by a write never joins a
  // read that started before it.
  let startupRead: Promise<Record<string, unknown>> | undefined;
  let startupReadDone = false;
  const readAll = () => {
    if (startupReadDone) return store.get(null);
    startupRead ??= store.get(null).finally(() => {
      startupReadDone = true;
      startupRead = undefined;
    });
    return startupRead;
  };
  const favoritesIn = (items: Record<string, unknown>) =>
    readFavorites(
      sampleFavorites && items[FAVORITES_KEY] === undefined
        ? { ...items, [FAVORITES_KEY]: sampleFavorites }
        : items,
    );

  return {
    getFavorites: async () => favoritesIn(await readAll()),
    updateFavorites: action =>
      lock('favorites', async () => {
        const [items, tree] = await Promise.all([store.get(null), getTree()]);
        await store.set({
          [FAVORITES_KEY]: changeFavorites(favoritesIn(items), action, flattenBookmarks(tree)),
        });
        const legacy = legacyFavoriteKeys(items);
        if (legacy.length) await store.remove(legacy);
      }),
    nextEffectVariant: async (effect, hidden) => {
      const key = variantShuffleKey(effect);
      const { variant } = drawVariant(effect, (await store.get([key]))[key], random, hidden);
      const saved = lock(`variant:${effect}`, async () => {
        const stored = (await store.get([key]))[key];
        await store.set({ [key]: settleVariant(effect, stored, variant, random, hidden) });
      });
      return { variant, saved };
    },
    getPreferences: async () => readPreferences(await readAll()),
    updatePreferences: update =>
      lock('preferences', async () => {
        const patch = resolvePreferenceUpdate(readPreferences(await store.get(null)), update);
        if (Object.keys(patch).length) await store.set(preferenceEntries(patch));
      }),
    watchFavorites: listener => store.watch(isFavoriteKey, listener),
    watchPreferences: listener => store.watch(key => key.startsWith(PREFERENCE_PREFIX), listener),
  };
}
