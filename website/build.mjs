import { build } from 'vite';
import { mkdir, writeFile, readFile, cp, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { copy } from './copy.mjs';
import { page } from './page.mjs';
import { SITE_ORIGIN, STORE_URL } from './config.mjs';
const root = resolve(import.meta.dirname, '..');
const siteRoot = resolve(root, 'website');
const out = resolve(root, '.output/site');
const extension = resolve(root, '.output/chrome-mv3');
if (
  STORE_URL &&
  !/^https:\/\/chromewebstore\.google\.com\/detail\/[^\s]+\/[a-p]{32}$/.test(STORE_URL)
)
  throw new Error('STORE_URL must be a real Chrome Web Store item URL.');
await mkdir(resolve(siteRoot, 'en'), { recursive: true });
await writeFile(resolve(siteRoot, 'index.html'), page(copy['zh-CN'], 'zh-CN'));
await writeFile(resolve(siteRoot, 'en/index.html'), page(copy.en, 'en'));
await build({
  root: siteRoot,
  configFile: false,
  publicDir: false,
  resolve: { dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'] },
  build: {
    outDir: out,
    emptyOutDir: true,
    rolldownOptions: {
      input: { home: resolve(siteRoot, 'index.html'), en: resolve(siteRoot, 'en/index.html') },
    },
  },
});
for (const path of ['privacy.html', 'licenses.html', 'legal.css', 'locales', 'licenses', 'icon'])
  await cp(resolve(extension, path), resolve(out, path), { recursive: true });
await mkdir(resolve(out, 'images'), { recursive: true });
await cp(resolve(root, 'website/assets/promo.png'), resolve(out, 'images/promo.png'));
const websitePrivacy = {
  'zh-CN': [
    '本网站',
    '本网站由 Cloudflare 托管。为提供页面并保护服务安全，托管服务会处理 IP 地址、请求网址、浏览器信息等必要请求数据。本站不主动加入广告、分析统计或追踪脚本，也不能读取你的 Chrome 书签。上述扩展本地数据说明与网站访问数据应分别理解。',
  ],
  en: [
    'This website',
    'This website is hosted by Cloudflare. To deliver pages and protect the service, the hosting provider processes necessary request data such as IP addresses, requested URLs, and browser information. This site does not add advertising, analytics, or tracking scripts, and cannot read your Chrome bookmarks. The extension’s local data handling described above is separate from website request data.',
  ],
  'zh-TW': [
    '本網站',
    '本網站由 Cloudflare 託管。為提供頁面與保護服務安全，託管服務會處理 IP 位址、請求網址與瀏覽器資訊等必要資料。本站不主動加入廣告、分析或追蹤腳本，也無法讀取你的 Chrome 書籤。上述擴充功能本機資料與網站存取資料是不同範圍。',
  ],
  ja: [
    'このウェブサイト',
    'このサイトは Cloudflare でホストされています。ページ配信とセキュリティのため、ホスティング事業者は IP アドレス、要求 URL、ブラウザ情報などの必要なリクエストデータを処理します。当サイトは広告、分析、追跡スクリプトを追加せず、Chrome ブックマークを読み取れません。拡張機能のローカルデータ処理とサイトへのアクセスデータは別のものです。',
  ],
  ko: [
    '이 웹사이트',
    '이 사이트는 Cloudflare에서 호스팅합니다. 페이지 제공과 보안을 위해 호스팅 업체는 IP 주소, 요청 URL, 브라우저 정보 등 필요한 요청 데이터를 처리합니다. 이 사이트는 광고, 분석 또는 추적 스크립트를 추가하지 않으며 Chrome 북마크를 읽을 수 없습니다. 확장 프로그램의 로컬 데이터 처리와 웹사이트 요청 데이터는 별개입니다.',
  ],
  fr: [
    'Ce site web',
    'Ce site est hébergé par Cloudflare. Pour servir les pages et protéger le service, l’hébergeur traite les données nécessaires aux requêtes, notamment l’adresse IP, l’URL demandée et les informations du navigateur. Le site n’ajoute ni publicité, ni analyse, ni script de suivi et ne peut pas lire vos favoris Chrome. Les données locales de l’extension sont distinctes des données de visite du site.',
  ],
  de: [
    'Diese Website',
    'Diese Website wird von Cloudflare gehostet. Zur Bereitstellung und Absicherung verarbeitet der Hostinganbieter notwendige Anfragedaten wie IP-Adressen, angeforderte URLs und Browserinformationen. Die Website fügt keine Werbung, Analyse- oder Tracking-Skripte hinzu und kann keine Chrome-Lesezeichen lesen. Lokale Erweiterungsdaten und Website-Anfragedaten sind getrennte Bereiche.',
  ],
  es: [
    'Este sitio web',
    'Este sitio está alojado en Cloudflare. Para servir páginas y proteger el servicio, el proveedor procesa datos necesarios de las solicitudes, como direcciones IP, URL e información del navegador. El sitio no añade anuncios, analítica ni scripts de seguimiento y no puede leer tus marcadores de Chrome. Los datos locales de la extensión son distintos de los datos de acceso al sitio.',
  ],
};
const homeLabels = {
  'zh-CN': '返回首页',
  en: 'Home',
  'zh-TW': '返回首頁',
  ja: 'ホーム',
  ko: '홈',
  fr: 'Accueil',
  de: 'Startseite',
  es: 'Inicio',
};
for (const [locale, [heading, text]] of Object.entries(websitePrivacy))
  for (const name of ['privacy', 'licenses']) {
    const path = resolve(
      out,
      locale === 'zh-CN' ? `${name}.html` : `locales/${locale}/${name}.html`,
    );
    let html = await readFile(path, 'utf8');
    const home = locale === 'zh-CN' ? '/' : '/en/';
    html = html
      .replace(
        '<p class="legal-brand">Shader Tab</p>',
        `<a class="legal-brand" href="${home}"><img src="/icon/32.png" width="28" height="28" alt="">Shader Tab</a>`,
      )
      .replace('<footer>', `<footer><a href="${home}">${homeLabels[locale]}</a> · `);
    if (name === 'privacy')
      html = html.replace(
        '</main>',
        `<h2>${heading}</h2><p>${text}</p><p><a href="https://www.cloudflare.com/privacypolicy/">Cloudflare Privacy Policy</a></p></main>`,
      );
    html = html.replace(
      '</head>',
      `<link rel="canonical" href="${SITE_ORIGIN}/${relative(out, path).replaceAll('\\', '/')}"></head>`,
    );
    await writeFile(path, html);
  }
await writeFile(
  resolve(out, 'legal.css'),
  (await readFile(resolve(out, 'legal.css'), 'utf8')) +
    '\n.legal-brand{display:inline-flex;align-items:center;gap:9px;color:inherit;text-decoration:none}.legal-brand img{display:block}footer{border-top:1px solid #d8d6d0;margin-top:40px;padding-top:20px;font-size:13px}\n',
);
await writeFile(
  resolve(out, '404.html'),
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · Shader Tab</title><link rel="stylesheet" href="/legal.css"><body><header><a class="legal-brand" href="/">Shader Tab</a></header><main><h1>This page wandered off.</h1><p>页面不存在。</p><p><a href="/">返回首页 / Back to home</a></p></main></body></html>',
);
await writeFile(
  resolve(out, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
);
const urls = [
  '/',
  '/en/',
  '/privacy.html',
  '/licenses.html',
  ...Object.keys(websitePrivacy)
    .filter(x => x !== 'zh-CN')
    .flatMap(locale => [`/locales/${locale}/privacy.html`, `/locales/${locale}/licenses.html`]),
];
await writeFile(
  resolve(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${SITE_ORIGIN}${path}</loc></url>`).join('')}</urlset>\n`,
);
await writeFile(
  resolve(out, '_headers'),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'\n`,
);
const files = await readdir(out, { recursive: true });
if (
  files.some(path => path.endsWith('.zip') || path.includes('newtab') || path.includes('_locales'))
)
  throw new Error('Website must not expose extension installation files.');
console.log('Website ready: Chinese/English homepage, 16 legal pages, no ZIP downloads.');
