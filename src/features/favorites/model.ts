import { MessageError } from '../../i18n/core';
export const FAVORITE_PREFIX = 'favorite:v1:';
export const FAVORITES_KEY = 'favorites:v2';
export const MAX_FAVORITES = 10;
export type FavoriteAction = { type: 'add'; id: string } | { type: 'remove'; id: string } | { type: 'move'; id: string; toIndex: number };
export function readFavoriteIds(items: Record<string, unknown>): string[] {
  const saved = items[FAVORITES_KEY];
  if (Array.isArray(saved)) return [...new Set(saved.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, MAX_FAVORITES);
  return Object.entries(items)
    .filter(([key, value]) => key.startsWith(FAVORITE_PREFIX) && key.length > FAVORITE_PREFIX.length && value === true)
    .map(([key]) => key.slice(FAVORITE_PREFIX.length)).slice(0, MAX_FAVORITES);
}
export function changeFavorites(current: string[], action: FavoriteAction, available: Set<string>): string[] {
  const next = [...new Set(current)].filter((id) => available.has(id)).slice(0, MAX_FAVORITES);
  if (action.type === 'remove') return next.filter((id) => id !== action.id);
  if (!available.has(action.id)) throw new MessageError('bookmarkDeleted');
  if (action.type === 'add') {
    if (next.includes(action.id)) return next;
    if (next.length >= MAX_FAVORITES) throw new MessageError('favoritesLimit');
    return [...next, action.id];
  }
  const from = next.indexOf(action.id);
  if (from < 0) return next;
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, Math.trunc(action.toIndex))), 0, action.id);
  return next;
}
