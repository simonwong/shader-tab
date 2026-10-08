import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../.output/chrome-mv3/', import.meta.url);
// Raw entry size after the Base UI migration was 240 KB; the budget leaves about 10% headroom.
const ENTRY_BUDGET = 265_000;
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.default_locale, 'en');
assert.equal(manifest.name, '__MSG_extensionName__');
assert.equal(manifest.description, '__MSG_extensionDescription__');
const locales = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es'];
for (const locale of locales) {
  const catalog = JSON.parse(await readFile(new URL(`_locales/${locale.replace('-', '_')}/messages.json`, root), 'utf8'));
  assert.equal(catalog.extensionName.message, 'Shader Tab');
  assert.ok(catalog.extensionDescription.message.length > 10 && catalog.extensionDescription.message.length <= 132);
}
for (const size of [16, 32, 48, 128]) {
  assert.equal(manifest.icons?.[size], `icon/${size}.png`);
  const png = await readFile(new URL(manifest.icons[size], root));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), size, 'Icon width must match manifest');
  assert.equal(png.readUInt32BE(20), size, 'Icon height must match manifest');
  assert.equal(png[25], 6, 'Icons must retain RGBA transparency');
}
assert.deepEqual(manifest.permissions.toSorted(), ['bookmarks', 'favicon', 'storage']);
assert.equal(manifest.chrome_url_overrides.newtab, 'newtab.html');
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.background, undefined);
assert.equal(manifest.content_scripts, undefined);
assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self'; connect-src 'self'; img-src 'self' data: blob:");
assert.equal(manifest.minimum_chrome_version, '111');
await access(new URL(manifest.chrome_url_overrides.newtab, root));
const newtabHtml = await readFile(new URL(manifest.chrome_url_overrides.newtab, root), 'utf8');
assert.ok(newtabHtml.includes('sizes="16x16"') && newtabHtml.includes('/icon/16.png'));
assert.ok(newtabHtml.includes('sizes="32x32"') && newtabHtml.includes('/icon/32.png'));
for (const file of await readdir(root, { recursive: true })) {
  if (!file.endsWith('.js')) continue;
  const code = await readFile(new URL(file, root), 'utf8');
  assert.ok(!code.includes('glass-tab-preview:'), 'Production bundle must not contain demo storage');
}
const chunks = await readdir(new URL('chunks/', root));
const entry = chunks.find((file) => file.startsWith('newtab-'));
const settings = chunks.find((file) => file.startsWith('SettingsDialog-'));
const bookmarkMenu = chunks.find((file) => file.startsWith('BookmarkMenu-'));
assert.ok(entry && settings, 'Settings must remain a separate lazy chunk');
assert.ok(bookmarkMenu, 'The bookmark menu must remain a separate lazy chunk');
const entryCode = await readFile(new URL(`chunks/${entry}`, root));
assert.ok(entryCode.byteLength < ENTRY_BUDGET, `New-tab entry exceeds the ${ENTRY_BUDGET / 1000} KB raw JS budget`);
const lazyImport = (chunk) => ['"', "'", '`'].some((quote) => entryCode.toString().includes(`import(${quote}./${chunk}${quote})`));
assert.ok(lazyImport(settings), 'Settings must load through dynamic import');
assert.ok(lazyImport(bookmarkMenu), 'The bookmark menu must load through dynamic import');
console.log('Manifest V3, permissions, new-tab entry and production isolation verified.');

for (const license of ['paper-shaders.txt', 'paper-shaders-NOTICE.txt', 'threeui.txt', 'three.txt', 'shader-gradient.txt', 'react-three-fiber.txt', 'camera-controls.txt', 'glsl-noise.txt']) await access(new URL(`licenses/${license}`, root));
for (const renderer of ['paper-', 'pixel-blast-', 'arc-', 'crt-', 'shader-gradient-']) assert.ok(chunks.some(file => file.startsWith(renderer)), `Missing lazy renderer: ${renderer}`);
for (const locale of locales.filter(locale => locale !== 'en')) assert.ok(chunks.some(file => file.startsWith(`${locale}-`)), `Missing lazy locale: ${locale}`);
const assets = await readdir(new URL('assets/', root));
const styles = await Promise.all(assets.filter(file => file.endsWith('.css')).map(file => readFile(new URL(`assets/${file}`, root), 'utf8')));
const controlRule = styles.join('\n').match(/\.dock\.glass,\.source-glass\{([^}]+)\}/)?.[1];
assert.ok(controlRule && /(?:^|;)backdrop-filter:blur\(var\(--blur-control\)\)/.test(controlRule), 'Production controls must retain the standard backdrop-filter declaration for Chrome');
const images = assets.filter(file => file.endsWith('.webp'));
assert.ok(images.length === 11 || images.length === 12, 'Identical Shader Gradient day/night thumbnails may share one asset');
assert.ok(images.every(file => file.startsWith('thumb-')), 'Only small settings thumbnails may ship');
const imageBytes = await Promise.all(images.map(async file => (await readFile(new URL(`assets/${file}`, root))).byteLength));
assert.ok(imageBytes.reduce((a, b) => a + b, 0) < 100_000, 'Settings thumbnails exceed the 100 KB budget');
assert.ok(!assets.some(file => /^(eclipse|facet|contour|forma)-/.test(file)), 'Retired backgrounds must not ship');
console.log('Six framework effects, small settings thumbnails, lazy drivers and license notices verified.');

const dependencies = JSON.parse(await readFile(new URL('licenses/dependencies.json', root), 'utf8'));
const notices = await readFile(new URL('licenses/dependencies.txt', root), 'utf8');
for (const name of ['react', 'react-dom', '@hugeicons/react', '@hugeicons/core-free-icons', '@base-ui/react', '@dnd-kit/core', '@shadergradient/react']) {
  assert.ok(dependencies.some(item => item.name === name), `Missing license inventory entry: ${name}`);
}
assert.ok(!dependencies.some(item => item.name.includes('lucide')), 'Retired icon package must not ship');
assert.ok(!dependencies.some(item => /^@radix-ui\/|^react-remove-scroll/.test(item.name)), 'Retired Radix packages must not ship');
for (const item of dependencies) {
  const section = notices.split(`${item.name}@${item.version}\nLicense: ${item.license}\n\n`)[1]?.split('\n\n' + '='.repeat(72))[0]?.trimEnd();
  assert.ok(section && createHash('sha256').update(section + '\n').digest('hex') === item.sha256, `License integrity mismatch: ${item.name}`);
}
for (const page of locales.flatMap(locale => ['privacy', 'licenses'].map(name => locale === 'zh-CN' ? `${name}.html` : `locales/${locale}/${name}.html`))) {
  const html = await readFile(new URL(page, root), 'utf8');
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (!/^(https:|mailto:)/.test(href)) await access(new URL(href, new URL(page, root)));
  }
  assert.equal((html.match(/hreflang=/g) ?? []).length, 8);
  assert.ok(!html.includes('<script'));
  if (page.endsWith('privacy.html')) assert.ok(html.includes('support@simonwong.cn'));
}
const crt = await readFile(new URL(`chunks/${chunks.find(file => file.startsWith('crt-'))}`, root), 'utf8');
assert.ok(!/blue-screen|physical memory|STOP:|Windows has been shut/i.test(crt), 'System failure imitation must not ship');
assert.ok(crt.includes('NO COMMANDS ARE EXECUTED'));
console.log(`${dependencies.length} dependency notices, legal page links, Hugeicons and decorative CRT verified.`);

// Shader Gradient's bundle still names an HDR host (ruucm.github.io). It is only fetched for
// environment lighting; the presets used here light with '3d', and CSP connect-src 'self'
// would refuse the request anyway.
assert.match(manifest.content_security_policy.extension_pages, /connect-src 'self'(;|$)/);
const gradientDriver = await readFile(new URL('../src/effects/drivers/shader-gradient.tsx', import.meta.url), 'utf8');
const usedPresets = [...gradientDriver.matchAll(/presets\.(\w+)\.props/g)].map(match => match[1]);
assert.ok(usedPresets.length > 0, 'Shader Gradient presets not found in the driver');
assert.ok(!/lightType|envPreset/.test(gradientDriver), 'The Shader Gradient driver must not override preset lighting');
const { presets } = await import('@shadergradient/react');
for (const name of usedPresets) assert.equal(presets[name]?.props.lightType, '3d', `Shader Gradient preset ${name} would load a remote HDR`);
console.log(`Remote HDR unreachable: CSP connect-src 'self', presets ${usedPresets.join(', ')} use 3D lighting.`);
