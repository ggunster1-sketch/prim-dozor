import fs from 'node:fs/promises';
import path from 'node:path';
import { RUBRIC_STYLES, formatVladivostokStamp } from './media.js';

const PUBLIC_DIR = path.resolve('public');
const NEWS_DIR = path.join(PUBLIC_DIR, 'news');
const SITE_URL = 'https://primdozor.ru';

export const CLEAN_START_UTC = Date.UTC(2026, 10, 24, 21, 0, 0);

export const RUBRICS = [
  'Вся лента 24/7',
  'Молния • Главное',
  'Хроника 112 и ЧП',
  'Коммунальный фронт',
  'Дороги и мосты',
  'Власть, закон и СВО',
  'Экономика и порт',
  'Люди Приморья',
  'Здравоохранение',
  'Спорт и события'
];

export const CITIES = [
  'Весь Приморский край',
  'Владивосток',
  'Уссурийск',
  'Находка',
  'Артём',
  'Большой Камень',
  'Арсеньев',
  'Спасск-Дальний',
  'Партизанск',
  'Дальнегорск'
];

export const LINKS = {
  telegram: 'https://t.me',
  telegramDirect: 'https://t.me',
  max: 'https://max.ru',
  vk: 'https://vk.com',
  dzen: 'https://dzen.ru',
  dzenRss: 'https://primdozor.ru',
  email: 'prim_dozor@internet.ru',
  gibddPhone: '+7 (423) 249-09-21',
  gibddPhoneRaw: '+74232490921'
};

const FORBIDDEN_YEARS_RE = /\b(2018|2019|2020|2021|2022|2023|2024|2025)\b/;

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function isPostEligible(post) {
  if (!post || !post.title || !post.slug) return false;
  const ts = new Date(post.publishedAt).getTime();
  if (Number.isNaN(ts) || ts < CLEAN_START_UTC) return false;
  const combined = post.title + ' ' + (post.summary || '') + ' ' + (post.body || '');
  if (FORBIDDEN_YEARS_RE.test(combined)) return false;
  return true;
}

async function cleanupOldHtmlPages(validSlugs = new Set()) {
  try {
    await fs.mkdir(NEWS_DIR, { recursive: true });
    const files = await fs.readdir(NEWS_DIR);
    for (const file of files) {
      if (!file.endsWith('.html')) continue;
      const slug = file.slice(0, -5);
      if (!validSlugs.has(slug)) {
        await fs.unlink(path.join(NEWS_DIR, file)).catch(() => {});
      }
    }
  } catch {}
}

function renderBaseHead(opts) {
  const safeTitle = escapeHtml(opts.title);
  const safeDesc = escapeHtml(opts.description);
  const safeUrl = escapeHtml(opts.canonicalUrl);
  const safeImg = escapeHtml(opts.ogImage || SITE_URL + '/media/default-cover.jpg');
  const ogType = opts.ogType || 'website';

  const css = [
    ':root{--bg:#070B14;--surface:#0F172A;--surface-2:#162036;--border:#23304A;--text:#F8FAFC;--muted:#94A3B8;--accent:#EF4444;--accent-2:#2563EB;--ok:#10B981}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.55}',
    'a{color:inherit;text-decoration:none}',
    '.container{max-width:1280px;margin:0 auto;padding:0 16px}',
    '.topbar{background:#050810;border-bottom:1px solid var(--border);padding:8px 0;font-size:13px;color:var(--muted)}',
    '.topbar-inner{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}',
    '.social-pills{display:flex;flex-wrap:wrap;gap:8px}',
    '.pill{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;background:var(--surface);border:1px solid var(--border);color:#E2E8F0;font-weight:600;font-size:12px}',
    '.pill:hover{border-color:var(--accent);color:#FFF}',
    '.pill-hot{background:#7F1D1D;border-color:#DC2626;color:#FFF}',
    '.header{background:linear-gradient(180deg,#0D1526 0%,#090E1A 100%);border-bottom:1px solid var(--border);padding:18px 0}',
    '.header-grid{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px}',
    '.brand{display:flex;align-items:center;gap:12px}',
    '.brand-mark{width:10px;height:44px;border-radius:3px;background:var(--accent)}',
    '.brand-title{font-size:26px;font-weight:900}',
    '.brand-sub{font-size:13px;color:var(--muted)}',
    '.header-meta{display:flex;flex-wrap:wrap;align-items:center;gap:14px}',
    '.weather-box,.gibdd-box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 14px;font-size:13px}',
    '.gibdd-box strong{color:#FCA5A5;display:block;font-size:14px}',
    '.rubrics-wrap{padding:16px 0 8px}',
    '.rubrics-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}',
    '@media(max-width:820px){.rubrics-grid{grid-template-columns:repeat(2,1fr)}}',
    '.rubric-btn{background:var(--surface);border:1px solid var(--border);color:#E2E8F0;border-radius:8px;padding:10px;font-size:13px;font-weight:700;text-align:center;cursor:pointer;min-height:44px}',
    '.rubric-btn.active{background:var(--accent);border-color:#F87171;color:#FFF}',
    '.control-bar{margin:12px 0 18px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px}',
    '.cities-list{display:flex;flex-wrap:wrap;gap:6px}',
    '.city-chip{background:var(--surface-2);border:1px solid var(--border);color:var(--muted);padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}',
    '.city-chip.active{background:var(--accent-2);border-color:#60A5FA;color:#FFF}',
    '.outages-badge{display:flex;align-items:center;gap:10px;font-size:13px;background:#0B1221;border:1px solid var(--border);padding:8px 12px;border-radius:8px}',
    '.dot-ok{width:9px;height:9px;border-radius:50%;background:var(--ok);display:inline-block}',
    '.news-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:32px}',
    '@media(max-width:1024px){.news-grid{grid-template-columns:repeat(2,1fr)}}',
    '@media(max-width:640px){.news-grid{grid-template-columns:1fr}}',
    '.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}',
    '.card-cover{width:100%;aspect-ratio:1200/630;object-fit:cover;background:#0B132B;display:block}',
    '.card-body{padding:16px;display:flex;flex-direction:column;flex:1;gap:10px}',
    '.card-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;font-size:12px;color:var(--muted)}',
    '.card-tag{padding:3px 8px;border-radius:5px;font-weight:800;font-size:11px;color:#FFF;text-transform:uppercase}',
    '.card-title{font-size:18px;font-weight:800;line-height:1.35;color:#FFF}',
    '.card-summary{font-size:14px;color:#CBD5E1;flex:1}',
    '.card-footer{padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted)}',
    '.read-link{color:#60A5FA;font-weight:700}',
    '.empty-box{background:var(--surface);border:1px dashed var(--border);border-radius:12px;padding:36px 20px;text-align:center;color:var(--muted);margin-bottom:32px}',
    '.article-wrap{max-width:860px;margin:24px auto 40px;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}',
    '.article-cover{width:100%;aspect-ratio:1200/630;object-fit:cover;display:block}',
    '.article-content{padding:26px}',
    '.article-h1{font-size:28px;font-weight:900;line-height:1.28;margin:12px 0 16px}',
    '.article-text p{font-size:17px;color:#E2E8F0;margin-bottom:16px;line-height:1.68}',
    '.article-share{margin-top:24px;padding-top:18px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}',
    '.footer{background:#050810;border-top:1px solid var(--border);padding:28px 0;font-size:13px;color:var(--muted)}',
    '.footer-grid{display:flex;flex-wrap:wrap;justify-content:space-between;gap:20px}'
  ].join('');

  return [
    '<!DOCTYPE html>',
    '<html lang="ru" translate="no" class="notranslate">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta http-equiv="Content-Language" content="ru" />',
    '<meta name="google" content="notranslate" />',
    '<meta name="yandex" content="notranslate" />',
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    '<title>' + safeTitle + '</title>',
    '<meta name="description" content="' + safeDesc + '" />',
    '<link rel="canonical" href="' + safeUrl + '" />',
    '<link rel="alternate" type="application/rss+xml" title="ИА Прим_Дозор — Дзен RSS" href="' + LINKS.dzenRss + '" />',
    '<meta property="og:locale" content="ru_RU" />',
    '<meta property="og:type" content="' + ogType + '" />',
    '<meta property="og:site_name" content="ИА «Прим_Дозор»" />',
    '<meta property="og:title" content="' + safeTitle + '" />',
    '<meta property="og:description" content="' + safeDesc + '" />',
    '<meta property="og:url" content="' + safeUrl + '" />',
    '<meta property="og:image" content="' + safeImg + '" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<style>' + css + '</style>',
    '</head>'
  ].join('\n');
}
function renderHeader(weatherText = 'Владивосток • Погода онлайн 24/7') {
  return [
    '<body class="notranslate" translate="no">',
    '<div class="topbar">',
    '<div class="container topbar-inner">',
    '<div><strong>18+</strong> • Оперативные новости Владивостока и Приморского края в реальном времени</div>',
    '<div class="social-pills">',
    '<a class="pill pill-hot" href="' + LINKS.telegramDirect + '" target="_blank" rel="noopener noreferrer">Прислать новость / видео</a>',
    '<a class="pill" href="' + LINKS.telegram + '" target="_blank" rel="noopener noreferrer">Телеграм</a>',
    '<a class="pill" href="' + LINKS.max + '" target="_blank" rel="noopener noreferrer">МАКС</a>',
    '<a class="pill" href="' + LINKS.vk + '" target="_blank" rel="noopener noreferrer">ВКонтакте</a>',
    '<a class="pill" href="' + LINKS.dzen + '" target="_blank" rel="noopener noreferrer">Дзен</a>',
    '</div></div></div>',
    '<header class="header">',
    '<div class="container header-grid">',
    '<a href="/" class="brand">',
    '<span class="brand-mark"></span>',
    '<div><div class="brand-title">ИА «Прим_Дозор»</div><div class="brand-sub">Честная хроника Приморья • primdozor.ru</div></div>',
    '</a>',
    '<div class="header-meta">',
    '<div class="weather-box"><strong>Приморский край</strong><div>' + escapeHtml(weatherText) + '</div></div>',
    '<div class="gibdd-box"><span>Дежурная часть ГИБДД Приморья:</span><a href="tel:' + LINKS.gibddPhoneRaw + '"><strong>' + LINKS.gibddPhone + '</strong></a></div>',
    '</div></div></header>'
  ].join('\n');
}

function renderFooter() {
  return [
    '<footer class="footer">',
    '<div class="container footer-grid">',
    '<div>',
    '<div style="color:#FFF;font-weight:800;margin-bottom:6px;">© 2026 ИА «Прим_Дозор» (18+)</div>',
    '<div>Оперативные новости Владивостока и Приморского края 24/7.</div>',
    '<div>Редакция и администрация портала: Козин А.И. • Почта: <a href="mailto:' + LINKS.email + '" style="color:#93C5FD;">' + LINKS.email + '</a></div>',
    '<div style="margin-top:6px;">Дежурная часть ГИБДД Приморского края: <a href="tel:' + LINKS.gibddPhoneRaw + '" style="color:#FCA5A5;font-weight:700;">' + LINKS.gibddPhone + '</a></div>',
    '</div>',
    '<div style="display:flex;flex-direction:column;gap:8px;">',
    '<div style="color:#FFF;font-weight:700;">Читайте нас в соцсетях и мессенджерах:</div>',
    '<div class="social-pills">',
    '<a class="pill" href="' + LINKS.telegram + '" target="_blank" rel="noopener noreferrer">Телеграм</a>',
    '<a class="pill" href="' + LINKS.max + '" target="_blank" rel="noopener noreferrer">МАКС</a>',
    '<a class="pill" href="' + LINKS.vk + '" target="_blank" rel="noopener noreferrer">ВКонтакте</a>',
    '<a class="pill" href="' + LINKS.dzen + '" target="_blank" rel="noopener noreferrer">Дзен</a>',
    '<a class="pill" href="' + LINKS.dzenRss + '" target="_blank" rel="noopener noreferrer">РСС Дзен</a>',
    '</div></div></div></footer></body></html>'
  ].join('\n');
}

async function buildArticlePage(post, weatherText) {
  const articleUrl = SITE_URL + '/news/' + post.slug + '.html';
  const style = RUBRIC_STYLES[post.rubric] || RUBRIC_STYLES['Вся лента 24/7'];
  const stamp = formatVladivostokStamp(post.publishedAt);

  const paragraphs = String(post.body || post.summary || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => '<p>' + escapeHtml(p) + '</p>')
    .join('\n');

  const html = [
    renderBaseHead({
      title: post.title + ' — ИА «Прим_Дозор»',
      description: post.summary || post.title,
      canonicalUrl: articleUrl,
      ogImage: post.coverUrl,
      ogType: 'article'
    }),
    renderHeader(weatherText),
    '<main class="container">',
    '<div style="margin-top:16px;"><a href="/" class="pill">← Вернуться в общую ленту 24/7</a></div>',
    '<article class="article-wrap">',
    '<img class="article-cover" src="' + escapeHtml(post.coverRelative || post.coverUrl) + '" alt="' + escapeHtml(post.title) + '" width="1200" height="630" />',
    '<div class="article-content">',
    '<div class="card-meta"><span class="card-tag" style="background:' + style.badge + ';">' + escapeHtml(post.rubric) + '</span><span>' + escapeHtml(post.city || 'Приморский край') + ' • ' + escapeHtml(stamp) + '</span></div>',
    '<h1 class="article-h1">' + escapeHtml(post.title) + '</h1>',
    '<div class="article-text">' + paragraphs + '</div>',
    '<div class="article-share">',
    '<span style="font-size:13px;color:var(--muted);">Источник: редакция ИА «Прим_Дозор» • 18+</span>',
    '<div class="social-pills">',
    '<a class="pill" href="' + LINKS.telegram + '" target="_blank" rel="noopener noreferrer">Обсудить в Телеграм</a>',
    '<a class="pill" href="' + LINKS.max + '" target="_blank" rel="noopener noreferrer">Канал в МАКС</a>',
    '<a class="pill" href="' + LINKS.vk + '" target="_blank" rel="noopener noreferrer">ВКонтакте</a>',
    '<a class="pill" href="' + LINKS.dzen + '" target="_blank" rel="noopener noreferrer">Дзен</a>',
    '</div></div></div></article></main>',
    renderFooter()
  ].join('\n');

  await fs.writeFile(path.join(NEWS_DIR, post.slug + '.html'), html, 'utf-8');
}

async function buildIndexPage(posts, meta = {}) {
  const weatherText = meta.weatherText || 'Владивосток: 0°C • Переменная облачность';
  const outagesText = meta.outagesText || 'Свет: 0 • Вода: 0 • Тепло: 0 (аварийных отключений нет)';
  const firstPost = posts.at(0);
  const latestCover = firstPost && firstPost.coverUrl ? firstPost.coverUrl : SITE_URL + '/media/default-cover.jpg';

  const rubricButtonsHtml = RUBRICS.map((rubric, idx) => {
    const activeClass = idx === 0 ? ' active' : '';
    return '<button type="button" class="rubric-btn' + activeClass + '" data-rubric="' + escapeHtml(rubric) + '">' + escapeHtml(rubric) + '</button>';
  }).join('\n');

  const cityChipsHtml = CITIES.map((city, idx) => {
    const activeClass = idx === 0 ? ' active' : '';
    return '<button type="button" class="city-chip' + activeClass + '" data-city="' + escapeHtml(city) + '">' + escapeHtml(city) + '</button>';
  }).join('\n');

  const cardsHtml = posts.length
    ? posts.map((post) => {
        const style = RUBRIC_STYLES[post.rubric] || RUBRIC_STYLES['Вся лента 24/7'];
        const stamp = formatVladivostokStamp(post.publishedAt);
        const href = '/news/' + encodeURIComponent(post.slug) + '.html';
        return [
          '<article class="card" data-rubric="' + escapeHtml(post.rubric) + '" data-city="' + escapeHtml(post.city || 'Владивосток') + '">',
          '<a href="' + href + '"><img class="card-cover" src="' + escapeHtml(post.coverRelative || post.coverUrl) + '" alt="' + escapeHtml(post.title) + '" loading="lazy" width="1200" height="630" /></a>',
          '<div class="card-body">',
          '<div class="card-meta"><span class="card-tag" style="background:' + style.badge + ';">' + escapeHtml(post.rubric) + '</span><span>' + escapeHtml(post.city || 'Приморский край') + '</span></div>',
          '<h2 class="card-title"><a href="' + href + '">' + escapeHtml(post.title) + '</a></h2>',
          '<p class="card-summary">' + escapeHtml(post.summary || '') + '</p>',
          '<div class="card-footer"><span>' + escapeHtml(stamp) + '</span><a class="read-link" href="' + href + '">Читать полностью →</a></div>',
          '</div></article>'
        ].join('\n');
      }).join('\n')
    : '<div class="empty-box" style="grid-column:1/-1;"><h2 style="color:#FFF;margin-bottom:8px;">Лента ИА «Прим_Дозор» запущена с чистого листа</h2><p>Оперативные сводки Владивостока и Приморского края обновляются каждые 15 минут.</p></div>';

  const filterScript = [
    '<script>',
    '(function(){',
    'var activeRubric="Вся лента 24/7",activeCity="Весь Приморский край";',
    'var rubricBtns=document.querySelectorAll(".rubric-btn"),cityChips=document.querySelectorAll(".city-chip"),cards=document.querySelectorAll("#newsGrid .card");',
    'function applyFilters(){cards.forEach(function(c){var r=c.getAttribute("data-rubric")||"",ct=c.getAttribute("data-city")||"";c.style.display=((activeRubric==="Вся лента 24/7"||r===activeRubric)&&(activeCity==="Весь Приморский край"||ct===activeCity))?"flex":"none";});}',
    'rubricBtns.forEach(function(b){b.addEventListener("click",function(){rubricBtns.forEach(function(x){x.classList.remove("active");});b.classList.add("active");activeRubric=b.getAttribute("data-rubric");applyFilters();});});',
    'cityChips.forEach(function(c){c.addEventListener("click",function(){cityChips.forEach(function(x){x.classList.remove("active");});c.classList.add("active");activeCity=c.getAttribute("data-city");applyFilters();});});',
    '})();',
    '</' + 'script>'
  ].join('\n');

  const html = [
    renderBaseHead({
      title: 'ИА «Прим_Дозор» — Новости Владивостока и Приморского края 24/7',
      description: 'Оперативная лента новостей Владивостока, Уссурийска, Находки, Артёма и всего Приморского края 24/7.',
      canonicalUrl: SITE_URL + '/',
      ogImage: latestCover,
      ogType: 'website'
    }),
    renderHeader(weatherText),
    '<main class="container">',
    '<section class="rubrics-wrap"><div class="rubrics-grid" id="rubricsGrid">' + rubricButtonsHtml + '</div></section>',
    '<section class="control-bar"><div class="cities-list" id="citiesList">' + cityChipsHtml + '</div><div class="outages-badge"><span class="dot-ok"></span><span><strong>Народный контроль 24/7:</strong> ' + escapeHtml(outagesText) + '</span></div></section>',
    '<section class="news-grid" id="newsGrid">' + cardsHtml + '</section>',
    '</main>',
    filterScript,
    renderFooter()
  ].join('\n');

  await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), html, 'utf-8');
}

async function buildDzenRss(posts) {
  const buildDate = new Date().toUTCString();
  const itemsXml = posts.slice(0, 50).map((post) => {
const link = SITE_URL + '/news/' + post.slug + '.html';
const pubDate = new Date(post.publishedAt).toUTCString();
const paragraphs = String(post.body || post.summary || '')
.split(/\n+/)
.map((p) => p.trim())
.filter(Boolean)
.map((p) => '' + escapeHtml(p) + '')
.join('');
const fullContentHtml = '' + paragraphs + 'Оперативные сводки в Телеграм: ' + LINKS.telegram + ' и в МАКС: ' + LINKS.max + '.';
return [
'',
'' + escapeXml(post.title) + '',
'' + escapeXml(link) + '',
'' + escapeXml(link) + '',
'' + escapeXml(pubDate) + '',
'' + escapeXml(post.rubric) + '',
'',
'' + escapeXml(post.summary || post.title) + '',
'content:encoded</content:encoded>',
''
].join('\n');
}).join('\n');
const rssXml = [
'',
'',
'',
'ИА «Прим_Дозор» | Новости Владивосток Приморье',
'' + SITE_URL + '/',
'Оперативные новости Владивостока и Приморского края 24/7',
'ru',
'' + escapeXml(buildDate) + '',
itemsXml,
'',
''
].join('\n');
await fs.writeFile(path.join(PUBLIC_DIR, 'dzen.xml'), rssXml, 'utf-8');
}
async function buildSitemap(posts) {
const nowIso = new Date().toISOString();
const urls = [
'' + SITE_URL + '/' + nowIso + 'always1.0'
];
for (const post of posts) {
urls.push('' + escapeXml(SITE_URL + '/news/' + post.slug + '.html') + '' + escapeXml(new Date(post.publishedAt).toISOString()) + 'daily0.8');
}
const xml = '\n\n' + urls.join('\n') + '\n\n';
await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf-8');
}
export async function buildPortal(allPosts = [], meta = {}) {
await fs.mkdir(PUBLIC_DIR, { recursive: true });
await fs.mkdir(NEWS_DIR, { recursive: true });
const validPosts = allPosts
.filter(isPostEligible)
.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
const validSlugs = new Set(validPosts.map((p) => p.slug));
await cleanupOldHtmlPages(validSlugs);
for (const post of validPosts) {
await buildArticlePage(post, meta.weatherText);
}
await buildIndexPage(validPosts, meta);
await buildDzenRss(validPosts);
await buildSitemap(validPosts);
return {
totalPublished: validPosts.length,
urls: [SITE_URL + '/', SITE_URL + '/dzen.xml', ...validPosts.slice(0, 20).map((p) => SITE_URL + '/news/' + p.slug + '.html')]
};
}
export default {
CLEAN_START_UTC,
RUBRICS,
CITIES,
LINKS,
isPostEligible,
buildPortal
};
