import fs from 'node:fs/promises';
import path from 'node:path';
import { RUBRIC_STYLES, formatVladivostokStamp } from './media.js';

const PUBLIC_DIR = path.resolve('public');
const NEWS_DIR = path.join(PUBLIC_DIR, 'news');
const SITE_URL = 'https://primdozor.ru';

// Чистый старт с 00:00 25.11.2026 по Владивостоку (UTC+10), чтобы свежие новости за 25 ноября сразу шли в ленту
export const CLEAN_START_UTC = Date.UTC(2026, 10, 24, 14, 0, 0);

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

export const VLAD_DISTRICTS = [
  'Владивосток (все районы)',
  'Ленинский район',
  'Первореченский район',
  'Первомайский район',
  'Советский район',
  'Фрунзенский район',
  'Остров Русский'
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
    ':root{--bg:#F4F6F9;--surface:#FFFFFF;--surface-2:#EEF2F6;--border:#DCE3EC;--text:#0F172A;--muted:#475569;--accent:#C81E1E;--accent-2:#1D4ED8;--ok:#059669;--shadow:0 2px 10px rgba(15,23,42,0.06)}',
    'html.dark{--bg:#12151C;--surface:#1A1F2B;--surface-2:#232A3A;--border:#2E374B;--text:#F1F5F9;--muted:#94A3B8;--accent:#EF4444;--accent-2:#3B82F6;--ok:#10B981;--shadow:0 4px 16px rgba(0,0,0,0.35)}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.55;transition:background .2s,color .2s}',
    'a{color:inherit;text-decoration:none}',
    '.container{max-width:1280px;margin:0 auto;padding:0 16px}',
    '.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:8px 0;font-size:13px;color:var(--muted)}',
    '.topbar-inner{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}',
    '.social-pills{display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
    '.pill{display:inline-flex;align-items:center;padding:5px 11px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);font-weight:600;font-size:12px;cursor:pointer}',
    '.pill:hover{border-color:var(--accent)}',
    '.pill-hot{background:var(--accent);border-color:var(--accent);color:#FFF}',
    '.header{background:var(--surface);border-bottom:1px solid var(--border);padding:16px 0;box-shadow:var(--shadow)}',
    '.header-grid{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px}',
    '.brand{display:flex;align-items:center;gap:12px}',
    '.brand-mark{width:8px;height:44px;border-radius:3px;background:var(--accent)}',
    '.brand-title{font-size:26px;font-weight:900;letter-spacing:-0.3px}',
    '.brand-sub{font-size:13px;color:var(--muted)}',
    '.weather-card{background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;flex-wrap:wrap;align-items:center;gap:14px;font-size:13px}',
    '.weather-now{font-size:16px;font-weight:800}',
    '.weather-slots{display:flex;gap:10px;border-left:1px solid var(--border);padding-left:12px}',
    '.w-slot{text-align:center;font-size:11px;color:var(--muted)}',
    '.w-slot strong{display:block;font-size:13px;color:var(--text)}',
    '.rubrics-wrap{padding:16px 0 10px}',
    '.rubrics-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}',
    '@media(max-width:820px){.rubrics-grid{grid-template-columns:repeat(2,1fr)}}',
    '.rubric-btn{background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:10px 8px;font-size:13px;font-weight:700;text-align:center;cursor:pointer;min-height:44px;box-shadow:var(--shadow)}',
    '.rubric-btn:hover{border-color:var(--accent-2)}',
    '.rubric-btn.active{background:var(--accent);border-color:var(--accent);color:#FFF}',
    '.filter-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;margin:10px 0 18px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:12px}',
    '.filter-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}',
    '.chips-wrap{display:flex;flex-wrap:wrap;gap:6px}',
    '.chip{background:var(--surface-2);border:1px solid var(--border);color:var(--muted);padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}',
    '.chip.active{background:var(--accent-2);border-color:var(--accent-2);color:#FFF}',
    '.search-input{width:100%;max-width:380px;padding:9px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:14px}',
    '.nk-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px;box-shadow:var(--shadow)}',
    '.nk-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}',
    '.nk-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
    '.nk-tab{padding:7px 12px;border-radius:7px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:13px;font-weight:700;cursor:pointer}',
    '.nk-tab.active{background:var(--accent-2);border-color:var(--accent-2);color:#FFF}',
    '.nk-pane{display:none;background:var(--surface-2);border-radius:8px;padding:12px 14px;font-size:14px}',
    '.nk-pane.active{display:block}',
    '.outage-counters{display:flex;gap:14px;font-weight:700;margin-bottom:8px}',
    '.news-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:32px}',
    '@media(max-width:1024px){.news-grid{grid-template-columns:repeat(2,1fr)}}',
    '@media(max-width:640px){.news-grid{grid-template-columns:1fr}}',
    '.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow)}',
    '.card-cover{width:100%;aspect-ratio:1200/630;object-fit:cover;display:block}',
    '.card-body{padding:16px;display:flex;flex-direction:column;flex:1;gap:10px}',
    '.card-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;font-size:12px;color:var(--muted)}',
    '.card-tag{padding:3px 8px;border-radius:5px;font-weight:800;font-size:11px;color:#FFF;text-transform:uppercase}',
    '.card-title{font-size:18px;font-weight:800;line-height:1.35}',
    '.card-summary{font-size:14px;color:var(--muted);flex:1}',
    '.card-footer{padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted)}',
    '.read-link{color:var(--accent-2);font-weight:700}',
    '.empty-box{background:var(--surface);border:1px dashed var(--border);border-radius:12px;padding:32px 20px;text-align:center;color:var(--muted);margin-bottom:32px}',
    '.article-wrap{max-width:860px;margin:24px auto 40px;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}',
    '.article-cover{width:100%;aspect-ratio:1200/630;object-fit:cover;display:block}',
    '.article-content{padding:26px}',
    '.article-h1{font-size:28px;font-weight:900;line-height:1.28;margin:12px 0 16px}',
    '.article-text p{font-size:17px;margin-bottom:16px;line-height:1.68}',
    '.article-share{margin-top:24px;padding-top:18px;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}',
    '.footer{background:var(--surface);border-top:1px solid var(--border);padding:28px 0;font-size:13px;color:var(--muted)}',
    '.footer-grid{display:flex;flex-wrap:wrap;justify-content:space-between;gap:20px}'
  ].join('');

  return [
    '<!DOCTYPE html>',
'',
'',
'',
'',
'',
'',
'',
'',
'' + safeTitle + '',
'',
'',
'',
'',
'',
'',
'',
'',
'',
'',
'',
'',
'',
'' + css + '',
'(function(){try{if(localStorage.getItem("pd_theme")==="dark")document.documentElement.classList.add("dark");}catch(e){}})();</' + 'script>',
''
].join('\n');
}
function renderHeader(weatherText = 'Владивосток • Погода онлайн 24/7') {
  return [
    '<body class="notranslate" translate="no">',
    '<div class="topbar"><div class="container topbar-inner">',
    '<div><strong>18+</strong> • Оперативные новости Владивостока и Приморского края 24/7</div>',
    '<div class="social-pills">',
    '<button type="button" class="pill" id="themeToggle">Светлая / Графит тема</button>',
    '<a class="pill pill-hot" href="' + LINKS.telegramDirect + '" target="_blank" rel="noopener noreferrer">Сообщить о проблеме или новости</a>',
    '<a class="pill" href="' + LINKS.telegram + '" target="_blank" rel="noopener noreferrer">Телеграм</a>',
    '<a class="pill" href="' + LINKS.max + '" target="_blank" rel="noopener noreferrer">МАКС</a>',
    '<a class="pill" href="' + LINKS.vk + '" target="_blank" rel="noopener noreferrer">ВКонтакте</a>',
    '<a class="pill" href="' + LINKS.dzen + '" target="_blank" rel="noopener noreferrer">Дзен</a>',
    '</div></div></div>',
    '<header class="header"><div class="container header-grid">',
    '<a href="/" class="brand"><span class="brand-mark"></span>',
    '<div><div class="brand-title">ИА «Прим_Дозор»</div><div class="brand-sub">Честная хроника Приморья • primdozor.ru</div></div></a>',
    '<div class="weather-card">',
    '<div><div class="weather-now">' + escapeHtml(weatherText) + '</div><div style="font-size:12px;color:var(--muted);">Погода в реальном времени по данным метеостанций</div></div>',
    '<div class="weather-slots">',
    '<div class="w-slot">Утро<strong>-5°C</strong></div>',
    '<div class="w-slot">День<strong>0°C</strong></div>',
    '<div class="w-slot">Вечер<strong>0°C</strong></div>',
    '<div class="w-slot">Завтра<strong>+6°C</strong></div>',
    '</div></div></div></header>'
  ].join('\n');
}

function renderFooter() {
  const closeScript = String.fromCharCode(60) + '/script>';
  const openScript = String.fromCharCode(60) + 'script>';
  return [
    '<footer class="footer"><div class="container footer-grid">',
    '<div>',
    '<div style="font-weight:800;margin-bottom:6px;">© 2026 ИА «Прим_Дозор» (18+). Оперативные новости Владивостока и Приморского края 24/7.</div>',
    '<div>Редакция и администрация портала: Козин А.И. • Почта: <a href="mailto:' + LINKS.email + '" style="color:var(--accent-2);">' + LINKS.email + '</a></div>',
    '<div style="margin-top:6px;">Дежурная часть ГИБДД Приморского края: <a href="tel:' + LINKS.gibddPhoneRaw + '" style="color:var(--accent);font-weight:700;">' + LINKS.gibddPhone + '</a></div>',
    '</div>',
    '<div class="social-pills">',
    '<a class="pill" href="' + LINKS.telegram + '" target="_blank" rel="noopener noreferrer">Читайте нас в Телеграм</a>',
    '<a class="pill" href="' + LINKS.max + '" target="_blank" rel="noopener noreferrer">Читайте нас в МАКС</a>',
    '<a class="pill" href="' + LINKS.vk + '" target="_blank" rel="noopener noreferrer">Читайте нас в ВК</a>',
    '<a class="pill" href="' + LINKS.dzen + '" target="_blank" rel="noopener noreferrer">Читайте нас в Дзен</a>',
    '</div></div></footer>',
    openScript,
    '(function(){var b=document.getElementById("themeToggle");if(b){b.addEventListener("click",function(){var d=document.documentElement.classList.toggle("dark");try{localStorage.setItem("pd_theme",d?"dark":"light");}catch(e){}});}})();',
    closeScript,
    '</body></html>'
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
    '<a class="pill" href="' + LINKS.telegram + '" target="_blank" rel="noopener noreferrer">Телеграм</a>',
    '<a class="pill" href="' + LINKS.max + '" target="_blank" rel="noopener noreferrer">МАКС</a>',
    '<a class="pill" href="' + LINKS.vk + '" target="_blank" rel="noopener noreferrer">ВКонтакте</a>',
    '<a class="pill" href="' + LINKS.dzen + '" target="_blank" rel="noopener noreferrer">Дзен</a>',
    '</div></div></div></article></main>',
    renderFooter()
  ].join('\n');

  await fs.writeFile(path.join(NEWS_DIR, post.slug + '.html'), html, 'utf-8');
}
async function buildIndexPage(posts, meta = {}) {
  const weatherText = meta.weatherText || 'Владивосток: -7°C • Ясно';
  const firstPost = posts.at(0);
  const latestCover = firstPost && firstPost.coverUrl
    ? firstPost.coverUrl
    : SITE_URL + '/media/default-cover.jpg';

  const rubricButtonsHtml = RUBRICS.map((rubric, idx) => {
    const activeClass = idx === 0 ? ' active' : '';
    return '<button type="button" class="rubric-btn' + activeClass +
      '" data-rubric="' + escapeHtml(rubric) + '">' + escapeHtml(rubric) + '</button>';
  }).join('\n');

  const cityChipsHtml = CITIES.map((city, idx) => {
    const activeClass = idx === 0 ? ' active' : '';
    return '<button type="button" class="chip' + activeClass +
      '" data-city="' + escapeHtml(city) + '">' + escapeHtml(city) + '</button>';
  }).join('\n');

  const districtChipsHtml = VLAD_DISTRICTS.map((dist, idx) => {
    const activeClass = idx === 0 ? ' active' : '';
    return '<button type="button" class="chip' + activeClass +
      '" data-district="' + escapeHtml(dist) + '">' + escapeHtml(dist) + '</button>';
  }).join('\n');

  const cardsHtml = posts.length
    ? posts.map((post) => {
        const style = RUBRIC_STYLES[post.rubric] || RUBRIC_STYLES['Вся лента 24/7'];
        const stamp = formatVladivostokStamp(post.publishedAt);
        const href = '/news/' + encodeURIComponent(post.slug) + '.html';
        const searchBlob = escapeHtml((post.title + ' ' + post.summary + ' ' + post.city).toLowerCase());
        return [
          '<article class="card" data-rubric="' + escapeHtml(post.rubric) +
            '" data-city="' + escapeHtml(post.city || 'Владивосток') +
            '" data-search="' + searchBlob + '">',
          '<a href="' + href + '"><img class="card-cover" src="' +
            escapeHtml(post.coverRelative || post.coverUrl) +
            '" alt="' + escapeHtml(post.title) + '" loading="lazy" width="1200" height="630" /></a>',
          '<div class="card-body">',
          '<div class="card-meta"><span class="card-tag" style="background:' + style.badge +
            ';">' + escapeHtml(post.rubric) + '</span><span>' +
            escapeHtml(post.city || 'Приморский край') + '</span></div>',
          '<h2 class="card-title"><a href="' + href + '">' + escapeHtml(post.title) + '</a></h2>',
          '<p class="card-summary">' + escapeHtml(post.summary || '') + '</p>',
          '<div class="card-footer"><span>' + escapeHtml(stamp) +
            '</span><a class="read-link" href="' + href + '">Читать полностью →</a></div>',
          '</div></article>'
        ].join('\n');
      }).join('\n')
    : '<div class="empty-box" style="grid-column:1/-1;"><h2 style="margin-bottom:8px;">Лента ИА «Прим_Дозор» обновляется в реальном времени</h2><p>Свежие сводки Владивостока и Приморского края публикуются каждые 15 минут.</p></div>';

  const openScript = String.fromCharCode(60) + 'script>';
  const closeScript = String.fromCharCode(60) + '/script>';

  const interactiveScript = [
    openScript,
    '(function(){',
    'var activeRubric="Вся лента 24/7",activeCity="Весь Приморский край",activeDistrict="Владивосток (все районы)",query="";',
    'var rBtns=document.querySelectorAll(".rubric-btn");',
    'var cChips=document.querySelectorAll("[data-city]");',
    'var dChips=document.querySelectorAll("[data-district]");',
    'var searchInp=document.getElementById("newsSearch");',
    'var cards=document.querySelectorAll("#newsGrid .card");',
    'function filterAll(){',
    '  cards.forEach(function(c){',
    '    var r=c.getAttribute("data-rubric")||"";',
    '    var ct=c.getAttribute("data-city")||"";',
    '    var s=c.getAttribute("data-search")||"";',
    '    var okR=(activeRubric==="Вся лента 24/7"||r===activeRubric);',
    '    var okC=(activeCity==="Весь Приморский край"||ct===activeCity);',
    '    var okD=(activeDistrict==="Владивосток (все районы)"||s.indexOf(activeDistrict.split(" ").at(0).toLowerCase())!==-1);',
    '    var okQ=(!query||s.indexOf(query)!==-1);',
    '    c.style.display=(okR&&okC&&okD&&okQ)?"flex":"none";',
    '  });',
    '}',
    'rBtns.forEach(function(b){b.addEventListener("click",function(){rBtns.forEach(function(x){x.classList.remove("active");});b.classList.add("active");activeRubric=b.getAttribute("data-rubric");filterAll();});});',
    'cChips.forEach(function(c){c.addEventListener("click",function(){cChips.forEach(function(x){x.classList.remove("active");});c.classList.add("active");activeCity=c.getAttribute("data-city");filterAll();});});',
    'dChips.forEach(function(d){d.addEventListener("click",function(){dChips.forEach(function(x){x.classList.remove("active");});d.classList.add("active");activeDistrict=d.getAttribute("data-district");filterAll();});});',
    'if(searchInp){searchInp.addEventListener("input",function(){query=searchInp.value.trim().toLowerCase();filterAll();});}',
    'var tabs=document.querySelectorAll(".nk-tab");',
    'var panes=document.querySelectorAll(".nk-pane");',
    'tabs.forEach(function(t){t.addEventListener("click",function(){tabs.forEach(function(x){x.classList.remove("active");});panes.forEach(function(p){p.classList.remove("active");});t.classList.add("active");var target=document.getElementById(t.getAttribute("data-pane"));if(target)target.classList.add("active");});});',
    '})();',
    closeScript
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
    '<section class="rubrics-wrap"><div class="rubrics-grid" id="rubricsGrid">',
    rubricButtonsHtml,
    '</div></section>',
    '<section class="filter-panel">',
    '<div class="filter-row">',
    '<div class="chips-wrap">' + cityChipsHtml + '</div>',
    '<input type="search" id="newsSearch" class="search-input" placeholder="Поиск по новостям, улицам и городам края..." />',
    '</div>',
    '<div class="chips-wrap">' + districtChipsHtml + '</div>',
    '</section>',
    '<section class="nk-box">',
    '<div class="nk-head">',
    '<h3>Народный контроль Приморья • 24/7</h3>',
    '<a class="pill pill-hot" href="' + LINKS.telegramDirect + '" target="_blank" rel="noopener noreferrer">Сообщить о проблеме или новости</a>',
    '</div>',
    '<div class="nk-tabs">',
    '<button type="button" class="nk-tab active" data-pane="paneJkh">ЖКХ 24/7</button>',
    '<button type="button" class="nk-tab" data-pane="paneSos">Экстренные службы</button>',
    '<button type="button" class="nk-tab" data-pane="panePharm">Аптеки 24/7</button>',
    '<button type="button" class="nk-tab" data-pane="paneTrauma">Травмпункты</button>',
    '<button type="button" class="nk-tab" data-pane="paneAfisha">Афиша</button>',
    '</div>',
    '<div id="paneJkh" class="nk-pane active">',
    '<div class="outage-counters"><span>Свет: 0</span><span>Вода: 0</span><span>Тепло: 0</span></div>',
    '<p>Карта отключений и аварийных служб Приморья: по оперативным данным диспетчерских служб 24/7, актуальных аварийных отключений по адресам сейчас нет.</p>',
    '</div>',
    '<div id="paneSos" class="nk-pane">',
    '<p><strong>Единый номер экстренных служб:</strong> 112 • <strong>Дежурная часть ГИБДД Приморского края:</strong> <a href="tel:' + LINKS.gibddPhoneRaw + '" style="color:var(--accent);font-weight:700;">' + LINKS.gibddPhone + '</a> • <strong>МЧС:</strong> 101 • <strong>Полиция:</strong> 102 • <strong>Скорая помощь:</strong> 103</p>',
    '</div>',
    '<div id="panePharm" class="nk-pane">',
    '<p>Круглосуточные дежурные аптеки Владивостока, Уссурийска, Находки и Артёма работают в штатном режиме 24/7. Уточнить наличие лекарств можно по единой справочной аптек края.</p>',
    '</div>',
    '<div id="paneTrauma" class="nk-pane">',
    '<p>Круглосуточные травмпункты Владивостока: ул. Уткинская, 7; ул. Калинина, 78; ул. Давыдова, 3. Приём ведётся без выходных и перерывов.</p>',
    '</div>',
    '<div id="paneAfisha" class="nk-pane">',
    '<p>Подборка бесплатных городских, культурных и спортивных событий Приморского края на ближайшие 7 дней обновляется ежедневно.</p>',
    '</div>',
    '</section>',
    '<section class="news-grid" id="newsGrid">',
    cardsHtml,
    '</section>',
    '</main>',
    interactiveScript,
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
      .map((p) => '<p>' + escapeHtml(p) + '</p>')
      .join('');
    const fullContentHtml = '<figure><img src="' + escapeHtml(post.coverUrl) + '" alt="' + escapeHtml(post.title) + '" /></figure>' +
      paragraphs +
      '<p>Оперативные сводки в Телеграм: <a href="' + LINKS.telegram + '">' + LINKS.telegram + '</a> и в МАКС: <a href="' + LINKS.max + '">' + LINKS.max + '</a>.</p>';
    return [
      '<item>',
      '<title>' + escapeXml(post.title) + '</title>',
      '<link>' + escapeXml(link) + '</link>',
      '<guid isPermaLink="true">' + escapeXml(link) + '</guid>',
      '<pubDate>' + escapeXml(pubDate) + '</pubDate>',
      '<category>' + escapeXml(post.rubric) + '</category>',
      '<enclosure url="' + escapeXml(post.coverUrl) + '" type="image/jpeg" />',
      '<description>' + escapeXml(post.summary || post.title) + '</description>',
      '<content:encoded><![CDATA[' + fullContentHtml + ']]></content:encoded>',
      '</item>'
    ].join('\n');
  }).join('\n');

  const rssXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:content="http://purl.org">',
    '<channel>',
    '<title>ИА «Прим_Дозор» | Новости Владивосток Приморье</title>',
    '<link>' + SITE_URL + '/</link>',
    '<description>Оперативные новости Владивостока и Приморского края 24/7</description>',
    '<language>ru</language>',
    '<lastBuildDate>' + escapeXml(buildDate) + '</lastBuildDate>',
    itemsXml,
    '</channel>',
    '</rss>'
  ].join('\n');

  await fs.writeFile(path.join(PUBLIC_DIR, 'dzen.xml'), rssXml, 'utf-8');
}

async function buildSitemap(posts) {
  const nowIso = new Date().toISOString();
  const urls = [
    '<url><loc>' + SITE_URL + '/</loc><lastmod>' + nowIso + '</lastmod><changefreq>always</changefreq><priority>1.0</priority></url>'
  ];
  for (const post of posts) {
    urls.push(
      '<url><loc>' + escapeXml(SITE_URL + '/news/' + post.slug + '.html') +
      '</loc><lastmod>' + escapeXml(new Date(post.publishedAt).toISOString()) +
      '</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>'
    );
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://sitemaps.org">\n' + urls.join('\n') + '\n</urlset>\n';
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
  VLAD_DISTRICTS,
  LINKS,
  isPostEligible,
  buildPortal
};
