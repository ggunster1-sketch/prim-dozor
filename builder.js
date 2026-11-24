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
