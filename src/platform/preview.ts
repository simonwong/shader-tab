import { drawStoredVariant } from '../features/preferences/variant-shuffle';
import { flattenBookmarks, type BookmarkNode } from '../features/bookmarks/model';
import { FAVORITES_KEY, changeFavorites, readFavoriteIds } from '../features/favorites/model';
import { PREFERENCE_PREFIX, readPreferences } from '../features/preferences/model';
import type { Listener, Platform } from './types';

const link = (id: string, title: string, url: string): BookmarkNode => ({ id, title, url: `https://${url}`, dateAdded: 1_700_000_000_000 + Array.from(id).reduce((sum,char)=>sum+char.charCodeAt(0),0) * 86_400_000 });
const sites = [
  link('github', 'GitHub', 'github.com'), link('gmail', 'Gmail', 'mail.google.com'),
  link('youtube', 'YouTube', 'www.youtube.com'), link('zhihu', '知乎', 'www.zhihu.com'),
  link('bilibili', 'Bilibili', 'www.bilibili.com'), link('notion', 'Notion', 'www.notion.so'),
  link('figma', 'Figma', 'figma.com'), link('claude', 'Claude', 'claude.ai'),
];
const work = [link('pr', 'GitHub · Pull requests', 'github.com/pulls'), link('linear', 'Linear', 'linear.app'),
  link('notion-work', 'Notion 工作区', 'notion.so'), link('calendar', 'Google 日历', 'calendar.google.com'),
  link('figma-team', 'Figma · 团队文件', 'figma.com/files'), link('vercel', 'Vercel Dashboard', 'vercel.com'),
  link('slack', 'Slack', 'app.slack.com'), link('grafana', 'Grafana · 生产监控', 'grafana.com'),
  link('aws', 'AWS Console', 'console.aws.amazon.com'), link('cloudflare', 'Cloudflare', 'dash.cloudflare.com'),
  { id: 'team', title: '团队文档', children: [link('confluence', 'Confluence', 'atlassian.com'), link('jira', 'Jira · 当前迭代', 'atlassian.com/software/jira')] },
];
const tree: BookmarkNode[] = [{ id: '0', title: '', children: [
  { id: '1', title: '书签栏', children: [
    { id: 'work', title: '工作', children: work },
    { id: 'reading', title: '阅读', children: [link('mdn', 'MDN Web Docs', 'developer.mozilla.org'), link('react', 'React', 'react.dev')] },
    { id: 'design', title: '设计', children: [link('ogl', 'OGL', 'oframe.github.io/ogl/examples/')] },
    { id: 'tools', title: '工具', children: [link('wxt', 'WXT', 'wxt.dev')] },
    ...sites,
  ] },
  { id: '2', title: '其他书签', children: [link('other', 'Wikipedia', 'wikipedia.org')] },
  { id: '3', title: '移动设备书签', children: [link('mobile', 'Apple', 'apple.com')] },
] }];
const PREFIX = 'glass-tab-preview:';
const changed = new EventTarget();
function getItems(): Record<string, unknown> {
  const items: Record<string, unknown> = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(PREFIX)) continue;
    try { items[key.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(key)!); } catch { /* Ignore invalid preview data. */ }
  }
  if (items[FAVORITES_KEY] === undefined) items[FAVORITES_KEY] = sites.slice(0, 6).map((site) => site.id);
  return items;
}
function watch(listener: Listener) {
  const handle = (event: StorageEvent) => { if (event.key === null || event.key.startsWith(PREFIX)) listener(); };
  changed.addEventListener('change', listener);
  window.addEventListener('storage', handle);
  return () => { changed.removeEventListener('change', listener); window.removeEventListener('storage', handle); };
}
export const previewPlatform: Platform = {
  mode: 'preview', getTree: async () => structuredClone(tree),
  getFavorites: async () => readFavoriteIds(getItems()),
  updateFavorites: (action) => navigator.locks.request('glass-tab:preview-favorites', async () => {
    const next = changeFavorites(readFavoriteIds(getItems()), action, new Set(flattenBookmarks(tree).map((bookmark) => bookmark.id)));
    localStorage.setItem(PREFIX + FAVORITES_KEY, JSON.stringify(next));
    changed.dispatchEvent(new Event('change'));
  }),
  nextEffectVariant: (effect) => navigator.locks.request(`glass-tab:preview-variant:${effect}`, async () => {
    const { variant, set, remove } = drawStoredVariant(effect, getItems());
    for (const [key, state] of Object.entries(set)) localStorage.setItem(PREFIX + key, JSON.stringify(state));
    for (const key of remove) localStorage.removeItem(PREFIX + key);
    return variant;
  }),
  getPreferences: async () => readPreferences(getItems()),
  updatePreferences: async (patch) => {
    for (const [key, value] of Object.entries(patch)) localStorage.setItem(PREFIX + PREFERENCE_PREFIX + key, JSON.stringify(value));
    changed.dispatchEvent(new Event('change'));
  },
  watchBookmarks: () => () => {}, watchFavorites: watch, watchPreferences: watch,
};
