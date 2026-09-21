import { browserLanguages, createTranslator, resolveLocale, loadLocale } from '../../i18n/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlatform } from '../../platform';
import { App } from './App';
import '@fontsource-variable/space-grotesk';
import '../../styles/tokens.css';
import '../../styles/global.css';

async function main() {
  const [platform] = await Promise.all([createPlatform(), loadLocale(resolveLocale('auto', browserLanguages())).catch(() => {})]);
  createRoot(document.getElementById('root')!).render(<StrictMode><App platform={platform} /></StrictMode>);
}

void main().catch((error: unknown) => {
  console.error('Shader Tab could not start.', error);
  document.getElementById('root')!.textContent = createTranslator(resolveLocale('auto', browserLanguages()))('startupFailed');
});
