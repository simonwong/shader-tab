import { MessageError } from '../i18n/core';
import { chromePlatform } from './chrome';
import type { Platform } from './types';
export async function createPlatform(): Promise<Platform> {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) return chromePlatform;
  if (import.meta.env.DEV) return (await import('./preview')).previewPlatform;
  const unavailable = async (): Promise<never> => { throw new MessageError('extensionRequired'); };
  return {
    mode: 'unavailable', getTree: unavailable, getFavorites: unavailable, updateFavorites: unavailable,
    nextEffectVariant: unavailable, nextShaderGradientType: unavailable, getPreferences: unavailable, updatePreferences: unavailable,
    watchBookmarks: () => () => {}, watchFavorites: () => () => {}, watchPreferences: () => () => {},
  };
}
