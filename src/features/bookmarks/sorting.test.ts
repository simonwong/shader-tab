import { expect, it } from 'vitest';
import type { BookmarkNode } from './model';
import { sortBookmarkTree } from './sorting';
import { readPreferences, PREFERENCE_PREFIX } from '../preferences/model';
const tree: BookmarkNode[] = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: '书签栏',
        children: [
          { id: 'z', title: 'Z 2', url: 'https://z.example', dateAdded: 20, dateLastUsed: 40 },
          {
            id: 'folder',
            title: '文件夹',
            children: [
              { id: 'b', title: 'B', url: 'https://b.example', dateAdded: 30 },
              { id: 'a', title: 'A', url: 'https://a.example', dateAdded: 10 },
            ],
          },
          { id: 'a', title: 'A', url: 'https://a.example', dateAdded: 10, dateLastUsed: 50 },
          { id: 'missing', title: 'Z 10', url: 'https://missing.example' },
        ],
      },
      { id: '2', title: '其他书签', children: [] },
    ],
  },
];
const entries = (sorted: BookmarkNode[]) => sorted[0]!.children![0]!.children!;
it('preserves exact Chrome order by default and never changes source nodes', () => {
  const before = structuredClone(tree);
  expect(sortBookmarkTree(tree, 'chrome')).toBe(tree);
  sortBookmarkTree(tree, 'newest');
  expect(tree).toEqual(before);
});
it.each([
  ['name-asc', ['folder', 'a', 'z', 'missing']],
  ['name-desc', ['folder', 'missing', 'z', 'a']],
  ['newest', ['folder', 'z', 'a', 'missing']],
  ['oldest', ['folder', 'a', 'z', 'missing']],
  ['recent', ['folder', 'a', 'z', 'missing']],
] as const)('sorts %s within folders and puts missing dates last', (sort, ids) => {
  const sorted = sortBookmarkTree(tree, sort);
  expect(entries(sorted).map(x => x.id)).toEqual(ids);
  expect(sorted[0]!.children!.map(x => x.id)).toEqual(['1', '2']);
  expect(entries(sorted)[0]!.children).toHaveLength(2);
});
it('sorts nested folders and keeps ties in their original order', () => {
  expect(entries(sortBookmarkTree(tree, 'name-asc'))[0]!.children!.map(x => x.id)).toEqual([
    'a',
    'b',
  ]);
  expect(entries(sortBookmarkTree(tree, 'recent'))[0]!.children!.map(x => x.id)).toEqual([
    'b',
    'a',
  ]);
});
it('defaults legacy preferences and rejects unknown sort keys', () => {
  expect(readPreferences({}).bookmarkSort).toBe('chrome');
  expect(readPreferences({ [PREFERENCE_PREFIX + 'bookmarkSort']: 'invalid' }).bookmarkSort).toBe(
    'chrome',
  );
  expect(readPreferences({ [PREFERENCE_PREFIX + 'bookmarkSort']: 'recent' }).bookmarkSort).toBe(
    'recent',
  );
});
