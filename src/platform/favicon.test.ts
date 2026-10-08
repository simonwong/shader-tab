import { afterEach, expect, it, vi } from 'vitest';
import { faviconUrl } from './favicon';

afterEach(() => vi.unstubAllGlobals());

it('keeps bookmark query parameters inside the local Chrome favicon request', () => {
  vi.stubGlobal('chrome', {
    runtime: { id: 'fixture', getURL: (path: string) => `chrome-extension://fixture${path}` },
  });
  const page = 'https://example.com/a?size=999&x=中#part';
  const result = new URL(faviconUrl(page)!);
  expect(result.protocol).toBe('chrome-extension:');
  expect(result.hostname).toBe('fixture');
  expect(result.pathname).toBe('/_favicon/');
  expect(result.searchParams.get('pageUrl')).toBe(new URL(page).href);
  expect(result.searchParams.get('size')).toBe('32');
  expect(result.searchParams.get('fallbackToHost')).toBe('1');
  expect([...result.searchParams.keys()]).toEqual(['pageUrl', 'size', 'fallbackToHost']);
});

it('does not request icons for unsafe URLs or browser previews', () => {
  vi.stubGlobal('chrome', {
    runtime: { id: 'fixture', getURL: vi.fn<(path: string) => string>() },
  });
  for (const page of ['javascript:alert(1)', 'file:///tmp/a', 'chrome://settings', 'invalid'])
    expect(faviconUrl(page)).toBeUndefined();
  expect(chrome.runtime.getURL).not.toHaveBeenCalled();
  vi.stubGlobal('chrome', undefined);
  expect(faviconUrl('https://example.com')).toBeUndefined();
});
