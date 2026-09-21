import { useEffect, useRef, useState } from 'react';
import type { Bookmark } from '../features/bookmarks/model';
import { faviconUrl } from '../platform/favicon';
const brands: Record<string, [string, string]> = {
  'github.com': ['G', '#24292f'], 'mail.google.com': ['M', '#c5221f'], 'youtube.com': ['Y', '#b3000c'],
  'zhihu.com': ['知', '#0b5fd6'], 'bilibili.com': ['B', '#c2447f'], 'notion.so': ['N', '#2e2e2e'],
  'figma.com': ['F', '#5b3fd6'], 'claude.ai': ['C', '#a6532d'], 'linear.app': ['L', '#4b4fd6'],
  'calendar.google.com': ['C', '#1a63c9'], 'vercel.com': ['V', '#1c1c1c'], 'app.slack.com': ['S', '#4a154b'],
};
export function SiteMark({ bookmark, size = 'large' }: { bookmark: Bookmark; size?: 'large' | 'small' | 'menu' }) {
  const source = faviconUrl(bookmark.url);
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (source && image.current?.complete && image.current.naturalWidth > 0) setLoaded(source);
  }, [source]);
  const hostname = new URL(bookmark.url).hostname.replace(/^www\./, '');
  const hash = Array.from(hostname).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  const [letter, color] = brands[hostname] ?? [Array.from(bookmark.title)[0]?.toUpperCase() || '↗', `hsl(${hash % 360} 28% 35%)`];
  const ready = Boolean(source && loaded === source && failed !== source);
  return <span className={`site-mark site-mark--${size}`} data-favicon={ready} style={{ background: ready ? undefined : color }} aria-hidden="true">
    {!ready && letter}
    {source && failed !== source && <img ref={image} key={source} src={source} alt="" loading="eager" decoding="async" width={size === 'large' ? 24 : 16} height={size === 'large' ? 24 : 16} draggable={false} onLoad={() => setLoaded(source)} onError={() => setFailed(source)} />}
  </span>;
}
