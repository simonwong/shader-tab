import type { MouseEvent } from 'react';
import { isWebUrl } from '../bookmarks/model';

/** Opens a bookmark a plain link cannot (chrome:// and file://), here or in a background tab. */
export type OpenUrl = (url: string, background: boolean) => void;

/**
 * Click handler for bookmark links. Web pages navigate as ordinary links;
 * Chrome refuses links from a page to browser pages and local files, so those
 * go through the tabs API instead.
 */
export function bookmarkClick(url: string, onOpenUrl: OpenUrl) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (isWebUrl(url)) return;
    event.preventDefault();
    onOpenUrl(url, event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1);
  };
}
