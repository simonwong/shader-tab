import { bindings, defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'shader-tab-site',
    compatibilityDate: '2026-09-21',
    entrypoint: './worker.js',
    workersDev: true,
    previewUrls: false,
    observability: { enabled: false },
    assets: {
      htmlHandling: 'auto-trailing-slash',
      notFoundHandling: '404-page',
      // The worker must see every request so it can redirect the legacy host.
      runWorkerFirst: true,
    },
    // shadertab.simonwong.cn is the legacy domain, kept only to 301 to the new one.
    domains: ['shadertab.moonunder.app', 'shadertab.simonwong.cn'],
    env: { ASSETS: bindings.assets() },
  },
});
