import type { BookmarkNode } from '../features/bookmarks/model';
import { createStorage, type Store } from './storage';
import type { Platform } from './types';

const link = (id: string, title: string, url: string): BookmarkNode => ({
  id,
  title,
  url: `https://${url}`,
  dateAdded:
    1_700_000_000_000 +
    Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) * 86_400_000,
});
const sites = [
  link('github', 'GitHub', 'github.com'),
  link('gmail', 'Gmail', 'mail.google.com'),
  link('youtube', 'YouTube', 'www.youtube.com'),
  link('zhihu', '知乎', 'www.zhihu.com'),
  link('bilibili', 'Bilibili', 'www.bilibili.com'),
  link('notion', 'Notion', 'www.notion.so'),
  link('figma', 'Figma', 'figma.com'),
  link('claude', 'Claude', 'claude.ai'),
];
const work = [
  link('pr', 'GitHub · Pull requests', 'github.com/pulls'),
  link('linear', 'Linear', 'linear.app'),
  link('notion-work', 'Notion 工作区', 'notion.so'),
  link('calendar', 'Google 日历', 'calendar.google.com'),
  link('figma-team', 'Figma · 团队文件', 'figma.com/files'),
  link('vercel', 'Vercel Dashboard', 'vercel.com'),
  link('slack', 'Slack', 'app.slack.com'),
  link('grafana', 'Grafana · 生产监控', 'grafana.com'),
  link('aws', 'AWS Console', 'console.aws.amazon.com'),
  link('cloudflare', 'Cloudflare', 'dash.cloudflare.com'),
  {
    id: 'team',
    title: '团队文档',
    children: [
      link('confluence', 'Confluence', 'atlassian.com'),
      link('jira', 'Jira · 当前迭代', 'atlassian.com/software/jira'),
    ],
  },
];
const tree: BookmarkNode[] = [
  {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: '书签栏',
        children: [
          { id: 'work', title: '工作', children: work },
          {
            id: 'reading',
            title: '阅读',
            children: [
              link('mdn', 'MDN Web Docs', 'developer.mozilla.org'),
              link('react', 'React', 'react.dev'),
            ],
          },
          {
            id: 'design',
            title: '设计',
            children: [link('ogl', 'OGL', 'oframe.github.io/ogl/examples/')],
          },
          {
            id: 'tools',
            title: '工具',
            children: [
              link('wxt', 'WXT', 'wxt.dev'),
              { id: 'chrome-settings', title: 'Chrome 设置', url: 'chrome://settings/' },
            ],
          },
          ...sites,
        ],
      },
      { id: '2', title: '其他书签', children: [link('other', 'Wikipedia', 'wikipedia.org')] },
      { id: '3', title: '移动设备书签', children: [link('mobile', 'Apple', 'apple.com')] },
    ],
  },
];
const PREFIX = 'glass-tab-preview:';
/** Writes from this tab, with the keys they changed; other tabs get a `storage` event. */
const changed = new EventTarget();
const announce = (keys: string[]) =>
  changed.dispatchEvent(new CustomEvent<string[]>('change', { detail: keys }));
const store: Store = {
  get: async keys => {
    const items: Record<string, unknown> = {};
    for (let index = 0; index < localStorage.length; index++) {
      const stored = localStorage.key(index);
      if (!stored?.startsWith(PREFIX)) continue;
      const key = stored.slice(PREFIX.length);
      if (keys && !keys.includes(key)) continue;
      try {
        items[key] = JSON.parse(localStorage.getItem(stored)!);
      } catch {
        /* Ignore invalid preview data. */
      }
    }
    return items;
  },
  set: async items => {
    for (const [key, value] of Object.entries(items))
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    announce(Object.keys(items));
  },
  remove: async keys => {
    for (const key of keys) localStorage.removeItem(PREFIX + key);
    announce(keys);
  },
  watch: (matches, listener) => {
    const local = (event: Event) => {
      if ((event as CustomEvent<string[]>).detail.some(matches)) listener();
    };
    // Review scripts also dispatch `storage` events after writing preview keys directly.
    const other = (event: StorageEvent) => {
      if (
        event.key === null ||
        (event.key.startsWith(PREFIX) && matches(event.key.slice(PREFIX.length)))
      )
        listener();
    };
    changed.addEventListener('change', local);
    window.addEventListener('storage', other);
    return () => {
      changed.removeEventListener('change', local);
      window.removeEventListener('storage', other);
    };
  },
};
const getTree = async () => structuredClone(tree);

export const previewPlatform: Platform = {
  mode: 'preview',
  getTree,
  ...createStorage({
    store,
    getTree,
    lockPrefix: 'glass-tab:preview-',
    sampleFavorites: sites.slice(0, 6).map(site => ({ id: site.id })),
  }),
  openUrl: async (url, background) => {
    // A dev server page cannot open browser pages or files; log what the extension would do.
    console.info(`[preview] open ${url}${background ? ' in a background tab' : ''}`);
  },
  watchBookmarks: () => () => {},
};
