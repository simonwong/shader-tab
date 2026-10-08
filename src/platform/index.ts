import { MessageError } from '../i18n/core';
import { chromePlatform } from './chrome';
import type { Platform } from './types';
const unavailable = async (): Promise<never> => { throw new MessageError('extensionRequired'); };
export async function createPlatform(): Promise<Platform> {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) return chromePlatform;
  if (import.meta.env.DEV) return (await import('./preview')).previewPlatform;
  return {
    mode: 'unavailable', getTree: unavailable, getFavorites: unavailable, updateFavorites: unavailable,
    nextEffectVariant: unavailable, getPreferences: unavailable, updatePreferences: unavailable, openUrl: unavailable,
    watchBookmarks: () => () => {}, watchFavorites: () => () => {}, watchPreferences: () => () => {},
  };
}
