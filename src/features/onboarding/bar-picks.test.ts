import { describe, expect, it } from 'vitest';
import type { BookmarkNode } from '../bookmarks/model';
import { MAX_FAVORITES } from '../favorites/model';
import { bookmarkBarPicks } from './bar-picks';

const ids = (items: { id: string }[]) => items.map(item => item.id);

const link = (id: string, url = `https://${id}.example/`): BookmarkNode => ({ id, title: id, url });
const chromeTree = (bar: BookmarkNode[]): BookmarkNode[] => [
  {
    id: '0',
    title: '',
    children: [
      { id: '1', title: 'Bookmarks bar', children: bar },
      { id: '2', title: 'Other bookmarks', children: [link('other')] },
    ],
  },
];

describe('first favorites from the bookmarks bar', () => {
  it('takes links on the bar before links in its folders, skipping other roots', () => {
    const tree = chromeTree([
      {
        id: 'f',
        title: 'Work',
        children: [link('w1'), { id: 'g', title: 'Deep', children: [link('w2')] }],
      },
      link('a'),
      link('b'),
    ]);
    expect(ids(bookmarkBarPicks(tree))).toEqual(['a', 'b', 'w1', 'w2']);
  });
  it('leaves out browser pages, files and repeated URLs', () => {
    const tree = chromeTree([
      link('settings', 'chrome://settings/'),
      link('file', 'file:///Users/me/notes.txt'),
      link('a'),
      link('a-again', 'https://a.example/'),
      {
        id: 'f',
        title: 'Folder',
        children: [link('a-in-folder', 'https://a.example/'), link('b')],
      },
    ]);
    expect(ids(bookmarkBarPicks(tree))).toEqual(['a', 'b']);
  });
  it('stops at the requested count and never offers more than the favorites limit', () => {
    const tree = chromeTree(Array.from({ length: 14 }, (_, index) => link(`l${index}`)));
    expect(bookmarkBarPicks(tree, 3)).toHaveLength(3);
    expect(bookmarkBarPicks(tree, 40)).toHaveLength(MAX_FAVORITES);
    expect(bookmarkBarPicks(tree, -1)).toEqual([]);
  });
  it('finds the bar by folder type and offers nothing without one', () => {
    expect(
      ids(
        bookmarkBarPicks([
          { id: 'x', title: 'Bar', folderType: 'bookmarks-bar', children: [link('a')] },
        ]),
      ),
    ).toEqual(['a']);
    expect(bookmarkBarPicks([{ id: 'x', title: 'Other', children: [link('a')] }])).toEqual([]);
    expect(bookmarkBarPicks([])).toEqual([]);
  });
});
