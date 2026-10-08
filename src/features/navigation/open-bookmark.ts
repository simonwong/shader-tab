import type { MouseEvent } from 'react';
import { isWebUrl } from '../bookmarks/model';

/** Opens a bookmark a plain link cannot (chrome:// and file://), here or in a background tab. */
export type OpenUrl = (url: string, background: boolean) => void;

/**
 * Click handlers for bookmark links, spread onto the anchor. Web pages navigate
 * as ordinary links; Chrome refuses links from a page to browser pages and
 * local files, so those go through the tabs API instead. Chrome reports the
 * middle button only as `auxclick`, so that opens a background tab too.
 */
export function bookmarkClick(url: string, onOpenUrl: OpenUrl) {
  if (isWebUrl(url)) return {};
  return {
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onOpenUrl(url, event.metaKey || event.ctrlKey || event.shiftKey);
    },
    onAuxClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 1) return;
      event.preventDefault();
      onOpenUrl(url, true);
    },
  };
}
