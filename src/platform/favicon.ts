import { isWebUrl, safeBookmarkUrl } from '../features/bookmarks/model';

/** Chrome's local favicon endpoint for a web page; browser pages and files use the letter mark. */
export function faviconUrl(pageUrl: string): string | undefined {
  const page = safeBookmarkUrl(pageUrl);
  if (!page || !isWebUrl(page) || typeof chrome === 'undefined' || !chrome.runtime?.id)
    return undefined;
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', page);
  url.searchParams.set('size', '32');
  url.searchParams.set('fallbackToHost', '1');
  return url.href;
}
