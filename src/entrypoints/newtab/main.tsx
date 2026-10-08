import { browserLanguages, createTranslator, resolveLocale, loadLocale } from '../../i18n/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlatform } from '../../platform';
import { RootBoundary } from '../../components/RootBoundary';
import { App } from './App';
import { applyBoot, readBoot } from './boot';
/* oxlint-disable import/no-unassigned-import -- font faces and global styles are side-effect imports */
import '@fontsource-variable/space-grotesk';
import '../../styles/tokens.css';
import '../../styles/global.css';
/* oxlint-enable import/no-unassigned-import */

// Runs before anything awaits, so the first paint already has the saved theme, language and background.
const boot = readBoot();
const bootLocale = boot.locale ?? resolveLocale(boot.language ?? 'auto', browserLanguages());
applyBoot(boot, bootLocale);

async function main() {
  // Load the language pack the page will actually use, not just the browser's.
  const [platform] = await Promise.all([createPlatform(), loadLocale(bootLocale).catch(() => {})]);
  const t = createTranslator(bootLocale);
  createRoot(document.getElementById('root')!, {
    onUncaughtError: (error, info) => console.error('Shader Tab crashed.', error, info.componentStack),
    onCaughtError: (error, info) => console.error('Shader Tab recovered from an error.', error, info.componentStack),
  }).render(<StrictMode>
    <RootBoundary t={t}>
      <App platform={platform} boot={boot} />
    </RootBoundary>
  </StrictMode>);
}

void main().catch((error: unknown) => {
  console.error('Shader Tab could not start.', error);
  document.getElementById('root')!.textContent = createTranslator(bootLocale)('startupFailed');
});
