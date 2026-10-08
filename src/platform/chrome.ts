import { variantIds } from '../effects/variants';
import {
  drawStoredVariant,
  settleVariant,
  variantStorageKeys,
} from '../features/preferences/variant-shuffle';
import { flattenBookmarks } from '../features/bookmarks/model';
import {
  FAVORITE_PREFIX,
  FAVORITES_KEY,
  changeFavorites,
  legacyFavoriteKeys,
  readFavorites,
} from '../features/favorites/model';
import {
  PREFERENCE_PREFIX,
  preferenceEntries,
  readPreferences,
  resolvePreferenceUpdate,
} from '../features/preferences/model';
import type { Listener, Platform } from './types';

function watchStorage(matches: (key: string) => boolean, listener: Listener) {
  const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && Object.keys(changes).some(matches)) listener();
  };
  chrome.storage.onChanged.addListener(handle);
  return () => chrome.storage.onChanged.removeListener(handle);
}

/**
 * Reads all of local storage. Concurrent callers share one request, so the
 * favorites and preferences queries at startup cost a single read.
 */
let pendingRead: Promise<Record<string, unknown>> | undefined;
function readAll(): Promise<Record<string, unknown>> {
  pendingRead ??= chrome.storage.local.get(null).finally(() => {
    pendingRead = undefined;
  });
  return pendingRead;
}

export const chromePlatform: Platform = {
  mode: 'extension',
  getTree: () => chrome.bookmarks.getTree(),
  getFavorites: async () => readFavorites(await readAll()),
  updateFavorites: action =>
    navigator.locks.request('glass-tab:favorites', async () => {
      const [items, tree] = await Promise.all([
        chrome.storage.local.get(null),
        chrome.bookmarks.getTree(),
      ]);
      await chrome.storage.local.set({
        [FAVORITES_KEY]: changeFavorites(readFavorites(items), action, flattenBookmarks(tree)),
      });
      const legacy = legacyFavoriteKeys(items);
      if (legacy.length) await chrome.storage.local.remove(legacy);
    }),
  nextEffectVariant: async effect => {
    const ids = variantIds(effect);
    // A single-variant effect has nothing to shuffle and never touches storage.
    if (ids.length === 1) return { variant: ids[0]!, saved: Promise.resolve() };
    const keys = variantStorageKeys(effect);
    const { variant } = drawStoredVariant(effect, await chrome.storage.local.get(keys));
    const saved = navigator.locks.request(`glass-tab:variant:${effect}`, async () => {
      const { set, remove } = settleVariant(effect, await chrome.storage.local.get(keys), variant);
      await chrome.storage.local.set(set);
      if (remove.length) await chrome.storage.local.remove(remove);
    });
    return { variant, saved };
  },
  getPreferences: async () => readPreferences(await readAll()),
  updatePreferences: update =>
    navigator.locks.request('glass-tab:preferences', async () => {
      const patch = resolvePreferenceUpdate(
        readPreferences(await chrome.storage.local.get(null)),
        update,
      );
      if (Object.keys(patch).length) await chrome.storage.local.set(preferenceEntries(patch));
    }),
  openUrl: async (url, background) => {
    if (background) {
      await chrome.tabs.create({ url, active: false });
      return;
    }
    const tab = await chrome.tabs.getCurrent();
    await (tab?.id === undefined
      ? chrome.tabs.update({ url })
      : chrome.tabs.update(tab.id, { url }));
  },
  watchBookmarks: listener => {
    // An import fires one onCreated per bookmark; skip those and refresh once when it ends.
    let importing = false;
    const changed = () => {
      if (!importing) listener();
    };
    const began = () => {
      importing = true;
    };
    const ended = () => {
      importing = false;
      listener();
    };
    const events = [
      chrome.bookmarks.onCreated,
      chrome.bookmarks.onRemoved,
      chrome.bookmarks.onChanged,
      chrome.bookmarks.onMoved,
      chrome.bookmarks.onChildrenReordered,
    ];
    events.forEach(event => event.addListener(changed));
    chrome.bookmarks.onImportBegan.addListener(began);
    chrome.bookmarks.onImportEnded.addListener(ended);
    return () => {
      events.forEach(event => event.removeListener(changed));
      chrome.bookmarks.onImportBegan.removeListener(began);
      chrome.bookmarks.onImportEnded.removeListener(ended);
    };
  },
  watchFavorites: listener =>
    watchStorage(key => key === FAVORITES_KEY || key.startsWith(FAVORITE_PREFIX), listener),
  watchPreferences: listener => watchStorage(key => key.startsWith(PREFERENCE_PREFIX), listener),
};
