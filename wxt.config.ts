import { defineConfig } from 'wxt';
import { bundledLicenses } from './scripts/bundled-licenses';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  imports: false,
  vite: () => ({ plugins: [bundledLicenses()], resolve: { dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'] } }),
  manifestVersion: 3,
  manifest: {
    name: '__MSG_extensionName__',
    default_locale: 'en',
    icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    description: '__MSG_extensionDescription__',
    permissions: ['bookmarks', 'storage', 'favicon'],
    // Build target chrome111; also covers _favicon (104), :has() (105), inert (102) and dvh (108).
    minimum_chrome_version: '111',
    content_security_policy: {
      // connect-src 'self' keeps every renderer offline; the page never fetches from the network.
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self'; img-src 'self' data: blob:",
    },
  },
  dev: { server: { port: 4317 } },
  webExt: { disabled: true },
});
