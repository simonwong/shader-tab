import { describe, expect, it } from 'vitest';
import { FAVORITES_KEY, changeFavorites, readFavoriteIds } from './model';

describe('ordered favorites', () => {
  it('migrates valid legacy favorites while ignoring unrelated or corrupt values', () => {
    expect(readFavoriteIds({ 'favorite:v1:42': true, 'favorite:v1:43': false, 'favorite:v1:44': 'true', 'favorite:v1:': true, theme: 'dark' })).toEqual(['42']);
  });
  it('prefers saved order including an explicitly empty list over legacy keys', () => {
    expect(readFavoriteIds({ [FAVORITES_KEY]: [], 'favorite:v1:42': true })).toEqual([]);
    expect(readFavoriteIds({ [FAVORITES_KEY]: ['b', 'a', 'b', null, 3, ''] })).toEqual(['b', 'a']);
  });
  it('enforces the 10 item limit without replacing existing favorites', () => {
    const ids = Array.from({ length: 11 }, (_, index) => String(index));
    const existing = ids.slice(0, 10);
    expect(() => changeFavorites(existing, { type: 'add', id: '10' }, new Set(ids))).toThrow('favoritesLimit');
    expect(existing).toHaveLength(10);
  });
  it('frees slots for deleted source bookmarks and rejects nonexistent additions', () => {
    expect(changeFavorites(['a', 'deleted'], { type: 'add', id: 'b' }, new Set(['a', 'b']))).toEqual(['a', 'b']);
    expect(() => changeFavorites([], { type: 'add', id: 'missing' }, new Set())).toThrow('bookmarkDeleted');
  });
  it('supports stable reorder, duplicate adds and idempotent removals', () => {
    const ids = ['a', 'b', 'c'];
    const available = new Set(ids);
    expect(changeFavorites(ids, { type: 'move', id: 'c', toIndex: 0 }, available)).toEqual(['c', 'a', 'b']);
    expect(changeFavorites(ids, { type: 'move', id: 'a', toIndex: 2 }, available)).toEqual(['b', 'c', 'a']);
    expect(changeFavorites(ids, { type: 'add', id: 'b' }, available)).toEqual(ids);
    expect(changeFavorites(ids, { type: 'remove', id: 'x' }, available)).toEqual(ids);
  });
});
