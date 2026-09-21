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
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
  dev: { server: { port: 4317 } },
  webExt: { disabled: true },
});
