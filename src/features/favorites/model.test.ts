import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../bookmarks/model';
import {
  FAVORITES_KEY,
  changeFavorites,
  legacyFavoriteKeys,
  readFavorites,
  resolveFavorites,
} from './model';

const bookmark = (id: string, url = `https://${id}.example/`): Bookmark => ({
  id,
  title: id,
  url,
  folder: [],
});
const ids = (refs: { id: string }[]) => refs.map(ref => ref.id);

describe('ordered favorites', () => {
  it('migrates valid legacy favorites while ignoring unrelated or corrupt values', () => {
    expect(
      readFavorites({
        'favorite:v1:42': true,
        'favorite:v1:43': false,
        'favorite:v1:44': 'true',
        'favorite:v1:': true,
        theme: 'dark',
      }),
    ).toEqual([{ id: '42' }]);
  });
  it('prefers saved order including an explicitly empty list over legacy keys', () => {
    expect(readFavorites({ [FAVORITES_KEY]: [], 'favorite:v1:42': true })).toEqual([]);
    expect(ids(readFavorites({ [FAVORITES_KEY]: ['b', 'a', 'b', null, 3, ''] }))).toEqual([
      'b',
      'a',
    ]);
  });
  it('reads id strings and { id, url } entries in the same list', () => {
    expect(
      readFavorites({
        [FAVORITES_KEY]: [
          'a',
          { id: 'b', url: 'https://b.example/' },
          { id: 'c', url: 7 },
          { url: 'https://x' },
          { id: 'a' },
        ],
      }),
    ).toEqual([{ id: 'a' }, { id: 'b', url: 'https://b.example/' }, { id: 'c' }]);
  });
  it('lists legacy keys so the first ordered write can remove them', () => {
    expect(
      legacyFavoriteKeys({
        'favorite:v1:1': true,
        'favorite:v1:2': false,
        [FAVORITES_KEY]: [],
        other: 1,
      }),
    ).toEqual(['favorite:v1:1', 'favorite:v1:2']);
  });
  it('enforces the 10 item limit without replacing existing favorites', () => {
    const all = Array.from({ length: 11 }, (_, index) => bookmark(String(index)));
    const existing = all.slice(0, 10).map(item => ({ id: item.id }));
    expect(() => changeFavorites(existing, { type: 'add', id: '10' }, all)).toThrow(
      'favoritesLimit',
    );
    expect(existing).toHaveLength(10);
  });
  it('frees slots for deleted source bookmarks and rejects nonexistent additions', () => {
    expect(
      ids(
        changeFavorites([{ id: 'a' }, { id: 'deleted' }], { type: 'add', id: 'b' }, [
          bookmark('a'),
          bookmark('b'),
        ]),
      ),
    ).toEqual(['a', 'b']);
    expect(() => changeFavorites([], { type: 'add', id: 'missing' }, [])).toThrow(
      'bookmarkDeleted',
    );
  });
  it('supports stable reorder, duplicate adds and idempotent removals', () => {
    const all = [bookmark('a'), bookmark('b'), bookmark('c')];
    const refs = all.map(item => ({ id: item.id }));
    expect(ids(changeFavorites(refs, { type: 'move', id: 'c', toIndex: 0 }, all))).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(ids(changeFavorites(refs, { type: 'move', id: 'a', toIndex: 2 }, all))).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(ids(changeFavorites(refs, { type: 'add', id: 'b' }, all))).toEqual(['a', 'b', 'c']);
    expect(ids(changeFavorites(refs, { type: 'remove', id: 'x' }, all))).toEqual(['a', 'b', 'c']);
  });
  it('stores the URL next to each id on write', () => {
    expect(
      changeFavorites([{ id: 'a' }], { type: 'add', id: 'b' }, [bookmark('a'), bookmark('b')]),
    ).toEqual([
      { id: 'a', url: 'https://a.example/' },
      { id: 'b', url: 'https://b.example/' },
    ]);
  });
});

describe('re-matching favorites after Chrome changes bookmark ids', () => {
  it('falls back to the saved URL when the id no longer exists', () => {
    const current = [bookmark('new-a', 'https://a.example/'), bookmark('b')];
    expect(
      ids(resolveFavorites([{ id: 'old-a', url: 'https://a.example/' }, { id: 'b' }], current)),
    ).toEqual(['new-a', 'b']);
  });
  it('never shows the same bookmark twice and prefers an exact id match', () => {
    const current = [
      bookmark('1', 'https://same.example/'),
      bookmark('2', 'https://same.example/'),
    ];
    expect(
      ids(
        resolveFavorites(
          [
            { id: 'gone', url: 'https://same.example/' },
            { id: '1', url: 'https://same.example/' },
          ],
          current,
        ),
      ),
    ).toEqual(['2', '1']);
    expect(
      ids(
        resolveFavorites(
          [
            { id: 'x', url: 'https://same.example/' },
            { id: 'y', url: 'https://same.example/' },
            { id: 'z', url: 'https://same.example/' },
          ],
          current,
        ),
      ),
    ).toEqual(['1', '2']);
  });
  it('drops favorites that match neither id nor URL and rewrites re-matched ids', () => {
    const current = [bookmark('new-a', 'https://a.example/')];
    expect(
      resolveFavorites([{ id: 'lost' }, { id: 'lost-2', url: 'https://gone.example/' }], current),
    ).toEqual([]);
    expect(
      changeFavorites(
        [{ id: 'old-a', url: 'https://a.example/' }],
        { type: 'remove', id: 'none' },
        current,
      ),
    ).toEqual([{ id: 'new-a', url: 'https://a.example/' }]);
  });
});
