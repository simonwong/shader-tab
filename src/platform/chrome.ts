import { drawVariant, variantShuffleKey } from '../features/preferences/variant-shuffle';
import { drawShaderShape, SHADER_SHUFFLE_KEY } from '../features/preferences/shader-shuffle';
import { flattenBookmarks } from '../features/bookmarks/model';
import { FAVORITE_PREFIX, FAVORITES_KEY, changeFavorites, readFavoriteIds } from '../features/favorites/model';
import { PREFERENCE_PREFIX, readPreferences } from '../features/preferences/model';
import type { Listener, Platform } from './types';

function watchStorage(matches: (key: string) => boolean, listener: Listener) {
  const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && Object.keys(changes).some(matches)) listener();
  };
  chrome.storage.onChanged.addListener(handle);
  return () => chrome.storage.onChanged.removeListener(handle);
}
export const chromePlatform: Platform = {
  mode: 'extension',
  getTree: () => chrome.bookmarks.getTree(),
  getFavorites: async () => readFavoriteIds(await chrome.storage.local.get(null)),
  updateFavorites: (action) => navigator.locks.request('glass-tab:favorites', async () => {
    const [items, tree] = await Promise.all([chrome.storage.local.get(null), chrome.bookmarks.getTree()]);
    const available = new Set(flattenBookmarks(tree).map((bookmark) => bookmark.id));
    await chrome.storage.local.set({ [FAVORITES_KEY]: changeFavorites(readFavoriteIds(items), action, available) });
  }),
  nextEffectVariant: (effect) => navigator.locks.request(`glass-tab:variant:${effect}`, async () => {
    const key = variantShuffleKey(effect);
    const saved = await chrome.storage.local.get(key);
    const { variant, state } = drawVariant(effect, saved[key]);
    await chrome.storage.local.set({ [key]: state });
    return variant;
  }),
  nextShaderGradientType: () => navigator.locks.request('glass-tab:shader-shuffle', async () => {
    const saved = await chrome.storage.local.get(SHADER_SHUFFLE_KEY);
    const { shape, state } = drawShaderShape(saved[SHADER_SHUFFLE_KEY]);
    await chrome.storage.local.set({ [SHADER_SHUFFLE_KEY]: state });
    return shape;
  }),
  getPreferences: async () => readPreferences(await chrome.storage.local.get(null)),
  updatePreferences: async (patch) => {
    await chrome.storage.local.set(Object.fromEntries(Object.entries(patch).map(([key, value]) => [PREFERENCE_PREFIX + key, value])));
  },
  watchBookmarks: (listener) => {
    const events = [chrome.bookmarks.onCreated, chrome.bookmarks.onRemoved,
      chrome.bookmarks.onChanged, chrome.bookmarks.onMoved,
      chrome.bookmarks.onChildrenReordered, chrome.bookmarks.onImportEnded];
    events.forEach((event) => event.addListener(listener));
    window.addEventListener('focus', listener);
    return () => { events.forEach((event) => event.removeListener(listener)); window.removeEventListener('focus', listener); };
  },
  watchFavorites: (listener) => watchStorage((key) => key === FAVORITES_KEY || key.startsWith(FAVORITE_PREFIX), listener),
  watchPreferences: (listener) => watchStorage((key) => key.startsWith(PREFERENCE_PREFIX), listener),
};
