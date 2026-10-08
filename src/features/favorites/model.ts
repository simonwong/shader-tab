import { MessageError } from '../../i18n/core';
import type { Bookmark } from '../bookmarks/model';

/** One boolean key per favorite, written by versions before ordered favorites. */
export const FAVORITE_PREFIX = 'favorite:v1:';
/** Ordered list of favorites: `{ id, url }` entries (older v2 data holds bare id strings). */
export const FAVORITES_KEY = 'favorites:v2';
export const MAX_FAVORITES = 10;

/**
 * A saved favorite. The bookmark id is the primary key; the URL lets a favorite
 * survive Chrome re-creating the bookmark with a new id (sync, import, restore).
 */
export interface FavoriteRef {
  id: string;
  url?: string;
}

export type FavoriteAction =
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'move'; id: string; toIndex: number };

function parseRef(value: unknown): FavoriteRef | undefined {
  if (typeof value === 'string') return value ? { id: value } : undefined;
  if (!value || typeof value !== 'object') return undefined;
  const { id, url } = value as { id?: unknown; url?: unknown };
  if (typeof id !== 'string' || !id) return undefined;
  return typeof url === 'string' && url ? { id, url } : { id };
}

export function readFavorites(items: Record<string, unknown>): FavoriteRef[] {
  const saved = items[FAVORITES_KEY];
  if (Array.isArray(saved)) {
    const seen = new Set<string>();
    return saved.flatMap(value => {
      const ref = parseRef(value);
      if (!ref || seen.has(ref.id)) return [];
      seen.add(ref.id);
      return [ref];
    }).slice(0, MAX_FAVORITES);
  }
  return Object.entries(items)
    .filter(([key, value]) => key.startsWith(FAVORITE_PREFIX) && key.length > FAVORITE_PREFIX.length && value === true)
    .map(([key]) => ({ id: key.slice(FAVORITE_PREFIX.length) }))
    .slice(0, MAX_FAVORITES);
}

/** Keys from the boolean-per-favorite format; removed on the first ordered write. */
export function legacyFavoriteKeys(items: Record<string, unknown>): string[] {
  return Object.keys(items).filter(key => key.startsWith(FAVORITE_PREFIX));
}

/**
 * Maps saved favorites to current bookmarks in saved order. An id match wins;
 * a favorite whose id no longer exists falls back to an unused bookmark with
 * the same URL. Favorites that match nothing are skipped.
 */
export function resolveFavorites(refs: readonly FavoriteRef[], bookmarks: readonly Bookmark[]): Bookmark[] {
  const byId = new Map(bookmarks.map(bookmark => [bookmark.id, bookmark]));
  const byUrl = new Map<string, Bookmark[]>();
  for (const bookmark of bookmarks) byUrl.set(bookmark.url, [...byUrl.get(bookmark.url) ?? [], bookmark]);
  const used = new Set(refs.flatMap(ref => byId.has(ref.id) ? [ref.id] : []));
  const resolved: Bookmark[] = [];
  const placed = new Set<string>();
  for (const ref of refs) {
    let bookmark = byId.get(ref.id);
    if (!bookmark && ref.url) {
      bookmark = byUrl.get(ref.url)?.find(candidate => !used.has(candidate.id));
      if (bookmark) used.add(bookmark.id);
    }
    if (bookmark && !placed.has(bookmark.id)) {
      placed.add(bookmark.id);
      resolved.push(bookmark);
    }
  }
  return resolved.slice(0, MAX_FAVORITES);
}

const toRef = (bookmark: Bookmark): FavoriteRef => ({ id: bookmark.id, url: bookmark.url });

export function changeFavorites(current: readonly FavoriteRef[], action: FavoriteAction, bookmarks: readonly Bookmark[]): FavoriteRef[] {
  const next = resolveFavorites(current, bookmarks).map(toRef);
  if (action.type === 'remove') return next.filter(ref => ref.id !== action.id);
  const target = bookmarks.find(bookmark => bookmark.id === action.id);
  if (!target) throw new MessageError('bookmarkDeleted');
  if (action.type === 'add') {
    if (next.some(ref => ref.id === action.id)) return next;
    if (next.length >= MAX_FAVORITES) throw new MessageError('favoritesLimit');
    return [...next, toRef(target)];
  }
  const from = next.findIndex(ref => ref.id === action.id);
  if (from < 0) return next;
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, Math.trunc(action.toIndex))), 0, moved!);
  return next;
}
