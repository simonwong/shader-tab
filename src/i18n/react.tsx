import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserLanguages,
  createTranslator,
  resolveLocale,
  loadLocale,
  messages,
  type Locale,
  type Language,
} from './core';
export const I18nContext = createContext({
  locale: resolveLocale('auto', browserLanguages()),
  t: createTranslator(resolveLocale('auto', browserLanguages())),
});
export const useI18n = () => useContext(I18nContext);
export function useLanguage(language: Language) {
  const [languages, setLanguages] = useState(browserLanguages);
  useEffect(() => {
    const update = () => setLanguages(browserLanguages());
    window.addEventListener('languagechange', update);
    return () => window.removeEventListener('languagechange', update);
  }, []);
  const requested = resolveLocale(language, languages);
  const [loaded, setLoaded] = useState<Locale>(() => (messages[requested] ? requested : 'en'));
  useEffect(() => {
    let active = true;
    void loadLocale(requested)
      .then(() => {
        if (active) setLoaded(requested);
      })
      .catch(() => {
        if (active) setLoaded('en');
      });
    return () => {
      active = false;
    };
  }, [requested]);
  const locale = messages[requested] ? requested : loaded;
  return useMemo(() => ({ locale, t: createTranslator(locale) }), [locale]);
}
