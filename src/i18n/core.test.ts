import { beforeAll, expect, it } from 'vitest';
import { asError, createTranslator, errorMessage, isLanguage, legalPath, loadLocale, LOCALES, matchLocale, MessageError, messages, resolveLocale } from './core';
import { en, type MessageKey } from './en';
beforeAll(async () => { await Promise.all(LOCALES.map(loadLocale)); });
it.each([
  ['en-GB', 'en'], ['ja-JP', 'ja'], ['ko-KR', 'ko'], ['fr-CA', 'fr'], ['de-AT', 'de'], ['es-419', 'es'],
  ['zh', 'zh-CN'], ['zh-SG', 'zh-CN'], ['zh_CN', 'zh-CN'], ['zh-HK', 'zh-TW'], ['zh-MO', 'zh-TW'], ['zh-TW', 'zh-TW'], ['zh-Hans-HK', 'zh-CN'], ['zh-Hant-CN', 'zh-TW'],
  ['pt-BR', undefined], ['constructor', undefined], ['', undefined],
])('matches browser tag %s to %s', (tag, locale) => { expect(matchLocale(tag)).toBe(locale); });
it('honors a manual language and browser preference order, with English fallback', () => {
  expect(resolveLocale('de', ['zh-CN', 'en'])).toBe('de');
  expect(resolveLocale('auto', ['pt-BR', 'fr-CA', 'de'])).toBe('fr');
  expect(resolveLocale('auto', ['ru'])).toBe('en');
  expect(resolveLocale('auto', [])).toBe('en');
  for (const value of [null, 1, 'constructor', 'zh-HK', 'EN']) expect(isLanguage(value)).toBe(false);
  expect(isLanguage('auto')).toBe(true);
});
it('has complete nonempty catalogs with matching interpolation fields for every language', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const locale of LOCALES) {
    const dictionary = messages[locale]!;
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(dictionary[key].trim()).not.toBe('');
      expect(placeholders(dictionary[key])).toEqual(placeholders(en[key]));
      expect(createTranslator(locale)(key, { count: 10, position: 2, title: 'Site', total: 6 })).not.toMatch(/\{\w+\}/);
    }
  }
});
it('inserts user titles literally and translates stable error codes after a language change', () => {
  expect(createTranslator('en')('removeLabel', { title: '{count} 中文' })).toBe('Remove {count} 中文');
  const error = new MessageError('bookmarkDeleted');
  expect(errorMessage(error, createTranslator('zh-CN'))).toBe('这条书签已被删除，请选择其他书签。');
  expect(errorMessage(error, createTranslator('en'))).toBe('This bookmark was deleted. Choose another bookmark.');
  const original = new Error('Chrome error');
  expect(asError(original, 'saveFailed')).toBe(original);
  expect(asError(null, 'saveFailed')).toBeInstanceOf(MessageError);
});
it('opens legal pages in the chosen language while preserving existing Chinese URLs', () => {
  expect(legalPath('privacy', 'zh-CN')).toBe('/privacy.html');
  expect(legalPath('licenses', 'ja')).toBe('/locales/ja/licenses.html');
});
