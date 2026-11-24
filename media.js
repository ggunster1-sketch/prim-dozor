/**
 * ИА «Прим_Дозор» (primdozor.ru)
 * Модуль builder.js (Блок 2) — Сборка статического сайта (index.html),
 * страниц статей (/news/<slug>.html), Дзен RSS (dzen.xml) и sitemap.xml.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { RUBRIC_STYLES, formatVladivostokStamp } from './media.js';

const PUBLIC_DIR = path.resolve('public');
const NEWS_DIR = path.join(PUBLIC_DIR, 'news');
const SITE_URL = 'https://primdozor.ru';

// Точка синхронного чистого старта: 07:00 25.11.2026 по Владивостоку (UTC+10)
export const CLEAN_START_UTC = Date.UTC(2026, 10, 24, 21, 0, 0);

// 10 фирменных рубрик (ровная сетка 5x2 на ПК и 2x5 на смартфоне)
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

// Города Приморского края
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

// Официальные ссылки и контакты редакции
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

/**
 * Проверяет, проходит ли публикация фильтр чистого старта (с 07:00 25.11.2026 ВЛД)
 * и не содержит ли упоминаний запрещённых прошлых лет (2018-2025).
 */
export function isPostEligible(post) {
  if (!post || !post.title || !post.slug) return false;
  const ts = new Date(post.publishedAt).getTime();
  if (Number.isNaN(ts) || ts < CLEAN_START_UTC) return false;

  const combined = `${post.title} ${post.summary || ''} ${post.body || ''}`;
  if (FORBIDDEN_YEARS_RE.test(combined)) return false;

  return true;
}

/**
 * Удаляет устаревшие HTML-файлы статей, не вошедшие в актуальный список после чистого старта
 */
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
  } catch {
    // Директория будет создана при первом запуске
  }
}

/**
 * Единые стили и шапка сайта с жёсткой защитой от автоперевода (lang="ru" translate="no")
 */
function renderBaseHead({ title, description, canonicalUrl, ogImage, ogType = 'website', jsonLd = null }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeImg = escapeHtml(ogImage || `${SITE_URL}/media/default-cover.jpg`);

  return `<!DOCTYPE html>
<html lang="ru" translate="no" class="notranslate">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <meta http-equiv="Content-Language" content="ru" />
  <meta name="google" content="notranslate" />
  <meta name="yandex" content="notranslate" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeUrl}" />
  <link rel="alternate" type="application/rss+xml" title="ИА «Прим_Дозор» — Дзен RSS" href="${LINKS.dzenRss}" />

  <meta property="og:locale" content="ru_RU" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="ИА «Прим_Дозор»" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:image" content="${safeImg}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImg}" />
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}

  <style>
    :root {
      --bg: #070B14;
      --surface: #0F172A;
      --surface-2: #162036;
      --border: #23304A;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --accent: #EF4444;
      --accent-2: #2563EB;
      --ok: #10B981;
      --warn: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 16px; }

    /* Верхняя панель */
    .topbar {
      background: #050810;
      border-bottom: 1px solid var(--border);
      padding: 8px 0;
      font-size: 13px;
      color: var(--muted);
    }
    .topbar-inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .social-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: #E2E8F0;
      font-weight: 600;
      font-size: 12px;
      transition: 0.15s ease;
    }
    .pill:hover { border-color: var(--accent); color: #FFF; }
    .pill-hot { background: #7F1D1D; border-color: #DC2626; color: #FFF; }

    /* Шапка портала */
    .header {
      background: linear-gradient(180deg, #0D1526 0%, #090E1A 100%);
      border-bottom: 1px solid var(--border);
      padding: 18px 0;
    }
    .header-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-mark {
      width: 10px;
      height: 44px;
      border-radius: 3px;
      background: var(--accent);
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.55);
    }
    .brand-title { font-size: 26px; font-weight: 900; letter-spacing: 0.4px; }
    .brand-sub { font-size: 13px; color: var(--muted); }
    .header-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
    }
    .weather-box, .gibdd-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 13px;
    }
    .gibdd-box strong { color: #FCA5A5; display: block; font-size: 14px; }

    /* 10 фирменных рубрик: 5x2 на ПК и 2x5 на смартфоне */
    .rubrics-wrap { padding: 16px 0 8px; }
    .rubrics-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    @media (max-width: 820px) {
      .rubrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .rubric-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      color: #E2E8F0;
      border-radius: 8px;
      padding: 10px 10px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
      transition: 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
    }
    .rubric-btn:hover { border-color: #60A5FA; background: var(--surface-2); }
    .rubric-btn.active {
      background: var(--accent);
      border-color: #F87171;
      color: #FFFFFF;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
    }

    /* Панель городов и Народного контроля */
    .control-bar {
      margin: 12px 0 18px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .cities-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .city-chip {
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .city-chip.active { background: var(--accent-2); border-color: #60A5FA; color: #FFF; }

    .outages-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      background: #0B1221;
      border: 1px solid var(--border);
      padding: 8px 12px;
      border-radius: 8px;
    }
    .dot-ok { width: 9px; height: 9px; border-radius: 50%; background: var(--ok); display: inline-block; }

    /* Сетка новостей */
    .news-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
      margin-bottom: 32px;
    }
@media (max-width: 1024px) { .news-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .news-grid { grid-template-columns: 1fr; } }
.card {
background: var(--surface);
border: 1px solid var(--border);
border-radius: 12px;
overflow: hidden;
display: flex;
flex-direction: column;
transition: transform 0.15s ease, border-color 0.15s ease;
}
.card:hover { transform: translateY(-2px); border-color: #475569; }
.card-cover {
width: 100%;
aspect-ratio: 1200 / 630;
object-fit: cover;
background: #0B132B;
display: block;
}
.card-body { padding: 16px; display: flex; flex-direction: column; flex: 1; gap: 10px; }
.card-meta {
display: flex;
flex-wrap: wrap;
align-items: center;
justify-content: space-between;
gap: 6px;
font-size: 12px;
color: var(--muted);
}
.card-tag {
padding: 3px 8px;
border-radius: 5px;
font-weight: 800;
font-size: 11px;
color: #FFF;
text-transform: uppercase;
}
.card-title { font-size: 18px; font-weight: 800; line-height: 1.35; color: #FFFFFF; }
.card-title a:hover { color: #93C5FD; }
.card-summary { font-size: 14px; color: #CBD5E1; flex: 1; }
.card-footer {
padding-top: 10px;
border-top: 1px solid var(--border);
display: flex;
justify-content: space-between;
align-items: center;
font-size: 12px;
color: var(--muted);
}
.read-link { color: #60A5FA; font-weight: 700; }
/* Пустое состояние */
.empty-box {
background: var(--surface);
border: 1px dashed var(--border);
border-radius: 12px;
padding: 36px 20px;
text-align: center;
color: var(--muted);
margin-bottom: 32px;
}
/* Страница статьи */
.article-wrap {
max-width: 860px;
margin: 24px auto 40px;
background: var(--surface);
border: 1px solid var(--border);
border-radius: 14px;
overflow: hidden;
}
.article-cover { width: 100%; aspect-ratio: 1200 / 630; object-fit: cover; display: block; }
.article-content { padding: 26px; }
.article-h1 { font-size: 28px; font-weight: 900; line-height: 1.28; margin: 12px 0 16px; }
.article-text p { font-size: 17px; color: #E2E8F0; margin-bottom: 16px; line-height: 1.68; }
.article-share {
margin-top: 24px;
padding-top: 18px;
border-top: 1px solid var(--border);
display: flex;
flex-wrap: wrap;
gap: 10px;
align-items: center;
justify-content: space-between;
}
/* Подвал */
.footer {
background: #050810;
border-top: 1px solid var(--border);
padding: 28px 0;
font-size: 13px;
color: var(--muted);
}
.footer-grid {
display: flex;
flex-wrap: wrap;
justify-content: space-between;
gap: 20px;
}

`;
}
/**
• Общая шапка портала для главной и внутренних страниц
*/
function renderHeader(weatherText = 'Владивосток • Погода онлайн 24/7') {
return `



18+ • Оперативные новости Владивостока и Приморского края в реальном времени

Прислать новость / видео
Телеграм
МАКС
ВКонтакте
Дзен


ИА «Прим_Дозор»
Честная хроника Приморья • primdozor.ru

Приморский край
${escapeHtml(weatherText)}


Дежурная часть ГИБДД Приморья:
${LINKS.gibddPhone}



`;
}
/**
• Общий подвал портала
*/
function renderFooter() {
return  <footer class="footer"> <div class="container footer-grid"> <div> <div style="color:#FFF; font-weight:800; margin-bottom:6px;">© 2026 ИА «Прим_Дозор» (18+)</div> <div>Оперативные новости Владивостока и Приморского края 24/7.</div> <div>Редакция и администрация портала: Козин А.И. • Почта: <a href="mailto:${LINKS.email}" style="color:#93C5FD;">${LINKS.email}</a></div> <div style="margin-top:6px;">Дежурная часть ГИБДД Приморского края: <a href="tel:${LINKS.gibddPhoneRaw}" style="color:#FCA5A5; font-weight:700;">${LINKS.gibddPhone}</a></div> </div> <div style="display:flex; flex-direction:column; gap:8px;"> <div style="color:#FFF; font-weight:700;">Читайте нас в соцсетях и мессенджерах:</div> <div class="social-pills"> <a class="pill" href="${LINKS.telegram}" target="_blank" rel="noopener noreferrer">Телеграм</a> <a class="pill" href="${LINKS.max}" target="_blank" rel="noopener noreferrer">МАКС</a> <a class="pill" href="${LINKS.vk}" target="_blank" rel="noopener noreferrer">ВКонтакте</a> <a class="pill" href="${LINKS.dzen}" target="_blank" rel="noopener noreferrer">Дзен</a> <a class="pill" href="${LINKS.dzenRss}" target="_blank" rel="noopener noreferrer">РСС Дзен</a> </div> </div> </div> </footer> </body> </html>;
}
/**
• Собирает отдельную HTML-страницу новости (/news/.html)
*/
async function buildArticlePage(post, weatherText) {
const articleUrl = ${SITE_URL}/news/${post.slug}.html;
const style = RUBRIC_STYLES[post.rubric] || RUBRIC_STYLES['Вся лента 24/7'];
const stamp = formatVladivostokStamp(post.publishedAt);
const paragraphs = String(post.body || post.summary || '')
.split(/\n+/)
.map((p) => p.trim())
.filter(Boolean)
.map((p) => <p>${escapeHtml(p)}</p>)
.join('\n          ');
const jsonLd = {
'@context': 'https://schema.org',
'@type': 'NewsArticle',
headline: post.title,
datePublished: new Date(post.publishedAt).toISOString(),
dateModified: new Date(post.publishedAt).toISOString(),
inLanguage: 'ru-RU',
image: [post.coverUrl],
author: {
'@type': 'Organization',
name: 'ИА «Прим_Дозор»',
url: SITE_URL
},
publisher: {
'@type': 'Organization',
name: 'ИА «Прим_Дозор»',
url: SITE_URL
},
mainEntityOfPage: articleUrl
};
const html = ${renderBaseHead({ title: ${post.title} — ИА «Прим_Дозор»`,
description: post.summary || post.title,
canonicalUrl: articleUrl,
ogImage: post.coverUrl,
ogType: 'article',
jsonLd
})}
${renderHeader(weatherText)}


← Вернуться в общую ленту 24/7
${escapeHtml(post.rubric)}
${escapeHtml(post.city || 'Приморский край')} • ${escapeHtml(stamp)}
${escapeHtml(post.title)}
${paragraphs}
Источник: редакция ИА «Прим_Дозор» • 18+

Обсудить в Телеграм
Канал в МАКС
ВКонтакте
Дзен





${renderFooter()}`;
await fs.writeFile(path.join(NEWS_DIR, ${post.slug}.html), html, 'utf-8');
}
/**
• Собирает главную страницу портала (public/index.html)
*/
async function buildIndexPage(posts, meta = {}) {
const weatherText = meta.weatherText || 'Владивосток: 0°C • Переменная облачность';
const outagesText = meta.outagesText || 'Свет: 0 • Вода: 0 • Тепло: 0 (аварийных отключений нет)';
const latestCover = posts[0]?.coverUrl || ${SITE_URL}/media/default-cover.jpg;
const rubricButtonsHtml = RUBRICS.map((rubric, idx) => {
const activeClass = idx === 0 ? ' active' : '';
return <button type="button" class="rubric-btn${activeClass}" data-rubric="${escapeHtml(rubric)}">${escapeHtml(rubric)}</button>;
}).join('\n        ');
const cityChipsHtml = CITIES.map((city, idx) => {
const activeClass = idx === 0 ? ' active' : '';
return <button type="button" class="city-chip${activeClass}" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>;
}).join('\n          ');
const cardsHtml = posts.length
? posts
.map((post) => {
const style = RUBRIC_STYLES[post.rubric] || RUBRIC_STYLES['Вся лента 24/7'];
const stamp = formatVladivostokStamp(post.publishedAt);
const href = /news/${encodeURIComponent(post.slug)}.html;
return `






${escapeHtml(post.rubric)}
${escapeHtml(post.city || 'Приморский край')}

${escapeHtml(post.title)}
${escapeHtml(post.summary || '')}
${escapeHtml(stamp)}
Читать полностью →


; }) .join('\n') : 

Лента ИА «Прим_Дозор» запущена с чистого листа
Оперативные сводки Владивостока и Приморского края обновляются каждые 15 минут.
`;
const html = ${renderBaseHead({ title: 'ИА «Прим_Дозор» — Новости Владивостока и Приморского края 24/7', description: 'Оперативная лента новостей Владивостока, Уссурийска, Находки, Артёма и всего Приморского края: ЧП 112, ЖКХ, дороги, власть, экономика и спорт.', canonicalUrl: ${SITE_URL}/`,
ogImage: latestCover,
ogType: 'website'
})}
${renderHeader(weatherText)}
${rubricButtonsHtml}
${cityChipsHtml}



Народный контроль 24/7: ${escapeHtml(outagesText)}
${cardsHtml}
(function() {
var activeRubric = 'Вся лента 24/7';
var activeCity = 'Весь Приморский край';
var rubricBtns = document.querySelectorAll('.rubric-btn');
var cityChips = document.querySelectorAll('.city-chip');
var cards = document.querySelectorAll('#newsGrid .card');
function applyFilters() {
cards.forEach(function(card) {
var cardRubric = card.getAttribute('data-rubric') || '';
var cardCity = card.getAttribute('data-city') || '';
var matchRubric = (activeRubric === 'Вся лента 24/7') || (cardRubric === activeRubric);
var matchCity = (activeCity === 'Весь Приморский край') || (cardCity === activeCity);
card.style.display = (matchRubric && matchCity) ? 'flex' : 'none';
});
}
rubricBtns.forEach(function(btn) {
btn.addEventListener('click', function() {
rubricBtns.forEach(function(b) { b.classList.remove('active'); });
btn.classList.add('active');
activeRubric = btn.getAttribute('data-rubric');
applyFilters();
});
});
cityChips.forEach(function(chip) {
chip.addEventListener('click', function() {
cityChips.forEach(function(c) { c.classList.remove('active'); });
chip.classList.add('active');
activeCity = chip.getAttribute('data-city');
applyFilters();
});
});
})();

${renderFooter()}`;
await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), html, 'utf-8');
}
/**
• Генерирует официальный RSS-фид для Яндекс Дзен (public/dzen.xml)
• с полным текстом новостей, enclosure обложками 1200x630 и без старых постов.
*/
async function buildDzenRss(posts) {
const buildDate = new Date().toUTCString();
const itemsXml = posts
.slice(0, 50)
.map((post) => {
const link = ${SITE_URL}/news/${post.slug}.html;
const pubDate = new Date(post.publishedAt).toUTCString();
const paragraphs = String(post.body || post.summary || '')
.split(/\n+/)
.map((p) => p.trim())
.filter(Boolean)
.map((p) => <p>${escapeHtml(p)}</p>)
.join('');
const fullContentHtml = `

${paragraphs}
Рубрика: \({escapeHtml(post.rubric)} • <strong>Город:</strong> \){escapeHtml(post.city || 'Приморский край')}
Оперативные сводки в нашем Телеграм-канале: \({LINKS.telegram}</a> и в МАКС: <a href="\){LINKS.max}">${LINKS.max}.
`.trim();
return `    
${escapeXml(post.title)}
${escapeXml(link)}
${escapeXml(link)}
${escapeXml(pubDate)}
${escapeXml(post.rubric)}

${escapeXml(post.summary || post.title)}
content:encoded</content:encoded>
`;
})
.join('\n');
const rssXml = `


ИА «Прим_Дозор» | Новости Владивосток Приморье
${SITE_URL}/
Оперативные новости Владивостока и Приморского края 24/7
ru
${escapeXml(buildDate)}
${itemsXml}


`;
await fs.writeFile(path.join(PUBLIC_DIR, 'dzen.xml'), rssXml, 'utf-8');
}
/**
• Генерирует актуальную карту сайта (public/sitemap.xml) для поисковиков и IndexNow
*/
async function buildSitemap(posts) {
const nowIso = new Date().toISOString();
const urls = [
  <url> <loc>${SITE_URL}/</loc> <lastmod>${nowIso}</lastmod> <changefreq>always</changefreq> <priority>1.0</priority> </url>
];
for (const post of posts) {
const loc = ${SITE_URL}/news/${post.slug}.html;
const lastmod = new Date(post.publishedAt).toISOString();
urls.push(  <url> <loc>${escapeXml(loc)}</loc> <lastmod>${escapeXml(lastmod)}</lastmod> <changefreq>daily</changefreq> <priority>0.8</priority> </url>);
}
const xml = <?xml version="1.0" encoding="UTF-8"?> <urlset xmlns="http://sitemaps.org"> ${urls.join('\n')} </urlset> ;
await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf-8');
}
/**
• Главная функция полной пересборки портала
*/
export async function buildPortal(allPosts = [], meta = {}) {
await fs.mkdir(PUBLIC_DIR, { recursive: true });
await fs.mkdir(NEWS_DIR, { recursive: true });
// Фильтруем: только посты начиная с 07:00 25.11.2026 ВЛД и без 2018-2025 годов
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
urls: [
${SITE_URL}/,
${SITE_URL}/dzen.xml,
...validPosts.slice(0, 20).map((p) => ${SITE_URL}/news/${p.slug}.html)
]
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
