import { safeBookmarkUrl } from '../features/bookmarks/model';

export function faviconUrl(pageUrl: string): string | undefined {
  const page = safeBookmarkUrl(pageUrl);
  if (!page || typeof chrome === 'undefined' || !chrome.runtime?.id) return undefined;
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', page);
  url.searchParams.set('size', '32');
  url.searchParams.set('fallbackToHost', '1');
  return url.href;
}
