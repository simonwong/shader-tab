import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { legalCopy } from './localization/legal-copy.mjs';
const publicDir = new URL('../public/', import.meta.url);
const names = { en: 'English', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español' };
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const p = text => `<p>${escape(text)}</p>`;
const list = items => `<ul>${items.map(text => `<li>${escape(text)}</li>`).join('')}</ul>`;
function languageNav(locale, page) {
  return `<nav class="legal-languages" aria-label="${({ en: 'Language', 'zh-CN': '语言', 'zh-TW': '語言', ja: '言語', ko: '언어', fr: 'Langue', de: 'Sprache', es: 'Idioma' })[locale]}">${Object.entries(names).map(([id, name]) => {
    const href = id === 'zh-CN' ? `${locale === 'zh-CN' ? '' : '../../'}${page}.html` : `${locale === 'zh-CN' ? '' : '../../'}locales/${id}/${page}.html`;
    return `<a href="${href}" lang="${id}" hreflang="${id}"${id === locale ? ' aria-current="page"' : ''}>${name}</a>`;
  }).join(' ')}</nav>`;
}
function document(locale, page, copy, body) {
  return `<!doctype html>\n<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(copy[page])} · Shader Tab</title><link rel="stylesheet" href="../../legal.css"><link rel="icon" type="image/png" sizes="16x16" href="../../icon/16.png"><link rel="icon" type="image/png" sizes="32x32" href="../../icon/32.png"></head>\n<body><header><p class="legal-brand">Shader Tab</p>${languageNav(locale, page)}<h1>${escape(copy[page])}</h1>${page === 'privacy' ? `<p class="muted">${escape(copy.date)}</p>${p(copy.intro)}` : p(copy.licenseIntro)}</header><main>${body}</main><footer><a href="${page === 'privacy' ? 'licenses' : 'privacy'}.html">${escape(copy[page === 'privacy' ? 'licenses' : 'privacy'])}</a></footer></body></html>\n`;
}
const licenseItems = [
  ['Paper Shaders', 'paper-shaders.txt', 'Apache-2.0'], ['Shader Gradient', 'shader-gradient.txt', 'MIT'], ['ThreeUI', 'threeui.txt', 'MIT'], ['React Bits / Pixel Blast', 'react-bits.txt', null], ['Three.js', 'three.txt', 'MIT'], ['React Three Fiber', 'react-three-fiber.txt', 'MIT'], ['camera-controls', 'camera-controls.txt', 'MIT'], ['postprocessing', 'postprocessing.txt', 'Zlib'], ['GLSL noise / Ashima Arts / Stefan Gustavson', 'glsl-noise.txt', 'MIT'], ['Space Grotesk', 'space-grotesk.txt', 'SIL Open Font License 1.1'],
];
for (const [locale, copy] of Object.entries(legalCopy)) {
  const folder = new URL(`locales/${locale}/`, publicDir);
  await mkdir(folder, { recursive: true });
  const section = (heading, body) => `<h2>${escape(heading)}</h2>${body}`;
  const privacy = section(copy.dataHeading, list(copy.data) + p(copy.excluded))
    + section(copy.permissionsHeading, `<ul>${copy.permissions.map((text, i) => `<li><strong>${['bookmarks', 'storage', 'favicon'][i]}:</strong> ${escape(text)}</li>`).join('')}</ul>`)
    + section(copy.storageHeading, copy.storage.map(p).join('')) + section(copy.externalHeading, copy.external.map(p).join(''))
    + section(copy.choicesHeading, p(copy.choices)) + section(copy.updatesHeading, p(copy.updates))
    + section(copy.contactHeading, `<p>${escape(copy.contact)} <a href="mailto:support@simonwong.cn">support@simonwong.cn</a></p><p><a href="https://developer.chrome.com/docs/webstore/program-policies/user-data">${escape(copy.compliance)}</a></p>`);
  const licenses = section(copy.dependencies, `<p><a href="../../licenses/dependencies.txt">${escape(copy.notices)}</a> · <a href="../../licenses/dependencies.json">${escape(copy.versions)}</a></p>${p(copy.inventory)}<p><a href="../../licenses/embedded-dependencies.txt">${escape(copy.embedded)}</a>: ${escape(copy.embeddedNote)}</p>`)
    + section(copy.backgrounds, `<ul>${licenseItems.map(([name, file, label]) => `<li>${name} — <a href="../../licenses/${file}">${escape(label ?? copy.clause)}</a>${name === 'Paper Shaders' ? ' · <a href="../../licenses/paper-shaders-NOTICE.txt">NOTICE</a>' : ''}</li>`).join('')}</ul>${p(copy.adaptations)}`);
  await writeFile(new URL('privacy.html', folder), document(locale, 'privacy', copy, privacy));
  await writeFile(new URL('licenses.html', folder), document(locale, 'licenses', copy, licenses));
}
for (const page of ['privacy', 'licenses']) {
  const file = new URL(`${page}.html`, publicDir);
  const source = (await readFile(file, 'utf8')).replace(/<nav class="legal-languages"[\s\S]*?<\/nav>/, '').replace('<p class="legal-brand">Shader Tab</p>', `<p class="legal-brand">Shader Tab</p>${languageNav('zh-CN', page)}`).replace(/(?:语言、)*主题、背景类别、随机队列/, '语言、主题、背景类别、随机队列');
  await writeFile(file, source);
}
for (const locale of Object.keys(names)) {
  const folder = new URL(`_locales/${locale.replace('-', '_')}/`, publicDir);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL('messages.json', folder), JSON.stringify({ extensionName: { message: 'Shader Tab' }, extensionDescription: { message: locale === 'zh-CN' ? '用动态玻璃背景、Chrome 书签与个人收藏，打造安静的新标签页。' : legalCopy[locale].description } }, null, 2) + '\n');
}
console.log('Generated 8 Chrome locale catalogs and localized legal pages.');
