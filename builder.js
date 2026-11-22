const fs = require('fs');

const HOST = 'primdozor.ru';
const SLASH = String.fromCharCode(47);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const NL = String.fromCharCode(10);
const SQ = String.fromCharCode(39);

function tag(name, attrs, inner) {
  return LT + name + (attrs ? ' ' + attrs : '') + GT + (inner !== undefined ? inner + LT + SLASH + name + GT : '');
}

function esc(s) {
  return String(s || '')
    .replace(/\+0°C/g, '0°C')
    .replace(/-0°C/g, '0°C')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function telHref(phone) {
  let clean = String(phone || '').replace(/[^\d+]/g, '');
  if (clean.length === 7 && !clean.startsWith('+')) clean = '+7423' + clean;
  if (clean.startsWith('8') && clean.length === 11) clean = '+7' + clean.slice(1);
  return 'tel:' + clean;
}

function safeJson(data) {
  return JSON.stringify(data || [])
    .replace(/\+0°C/g, '0°C')
    .replace(/-0°C/g, '0°C')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function getSeasonArtSvg() {
  const vl = new Date(Date.now() + 10 * 3600000);
  const m = vl.getUTCMonth() + 1;
  const d = vl.getUTCDate();
  const mmdd = String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');

  let theme = 'autumn';
  if (mmdd >= '12-20' || mmdd <= '01-10') theme = 'newyear';
  else if (mmdd >= '02-21' && mmdd <= '02-24') theme = 'feb23';
  else if (mmdd >= '03-06' && mmdd <= '03-09') theme = 'mar8';
  else if (mmdd >= '05-01' && mmdd <= '05-03') theme = 'may1';
  else if (mmdd >= '05-07' && mmdd <= '05-10') theme = 'victory';
  else if (mmdd >= '06-11' && mmdd <= '06-13') theme = 'russia';
  else if (mmdd >= '07-01' && mmdd <= '07-03') theme = 'vladivostok';
  else if (mmdd >= '07-25' && mmdd <= '07-28') theme = 'navy';
  else if (mmdd >= '09-25' && mmdd <= '09-28') theme = 'tiger';
  else if (m === 12 || m <= 2) theme = 'winter';
  else if (m >= 3 && m <= 5) theme = 'spring';
  else if (m >= 6 && m <= 8) theme = 'summer';

  if (theme === 'newyear') {
    return '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#09152b"/><stop offset="55%" stop-color="#173463"/><stop offset="100%" stop-color="#1e4b7a"/></linearGradient></defs><rect width="1200" height="120" fill="url(#g)"/><circle cx="180" cy="28" r="2" fill="#fff" opacity="0.8"/><circle cx="340" cy="48" r="2.5" fill="#fde047" opacity="0.9"/><circle cx="520" cy="22" r="2" fill="#fff" opacity="0.7"/><circle cx="760" cy="36" r="2.5" fill="#fde047" opacity="0.9"/><circle cx="940" cy="24" r="2" fill="#fff" opacity="0.8"/><path d="M0,98 Q300,76 600,94 T1200,86 L1200,120 L0,120 Z" fill="#e2e8f0" opacity="0.18"/><polygon points="240,18 205,72 225,72 195,106 285,106 255,72 275,72" fill="#15803d"/><circle cx="240" cy="18" r="5" fill="#facc15"/><circle cx="230" cy="54" r="3.5" fill="#ef4444"/><circle cx="252" cy="68" r="3.5" fill="#38bdf8"/><polygon points="960,24 930,74 948,74 922,106 998,106 972,74 990,74" fill="#166534"/><circle cx="960" cy="24" r="5" fill="#facc15"/><circle cx="950" cy="60" r="3.5" fill="#f43f5e"/><circle cx="972" cy="84" r="3.5" fill="#fde047"/></svg>';
  }
  if (theme === 'victory' || theme === 'feb23') {
    return '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1c1917"/><stop offset="50%" stop-color="#451a03"/><stop offset="100%" stop-color="#7f1d1d"/></linearGradient></defs><rect width="1200" height="120" fill="url(#g)"/><path d="M-20,88 Q350,30 650,80 T1220,36" stroke="#f97316" stroke-width="16" fill="none" opacity="0.85"/><path d="M-20,88 Q350,30 650,80 T1220,36" stroke="#090d16" stroke-width="5" fill="none" opacity="0.9"/><polygon points="600,14 611,44 643,44 617,62 627,92 600,74 573,92 583,62 557,44 589,44" fill="#facc15" opacity="0.95"/></svg>';
  }
  if (theme === 'mar8' || theme === 'spring' || theme === 'may1') {
    return '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#134e4a"/><stop offset="55%" stop-color="#0f766e"/><stop offset="100%" stop-color="#be185d"/></linearGradient></defs><rect width="1200" height="120" fill="url(#g)"/><circle cx="1020" cy="34" r="26" fill="#fde047" opacity="0.35"/><path d="M0,96 Q280,68 580,92 T1200,78 L1200,120 L0,120 Z" fill="#10b981" opacity="0.25"/><circle cx="210" cy="58" r="14" fill="#f472b6" opacity="0.85"/><circle cx="232" cy="48" r="12" fill="#fbcfe8" opacity="0.9"/><circle cx="880" cy="54" r="15" fill="#f472b6" opacity="0.85"/><circle cx="904" cy="44" r="12" fill="#fde047" opacity="0.85"/></svg>';
  }
  if (theme === 'russia' || theme === 'vladivostok' || theme === 'navy' || theme === 'summer') {
    return '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0c4a6e"/><stop offset="50%" stop-color="#0284c7"/><stop offset="100%" stop-color="#1e3a8a"/></linearGradient></defs><rect width="1200" height="120" fill="url(#g)"/><circle cx="960" cy="32" r="24" fill="#fde047" opacity="0.85"/><path d="M0,82 Q150,66 300,82 T600,82 T900,82 T1200,82 L1200,120 L0,120 Z" fill="#38bdf8" opacity="0.3"/><polygon points="260,76 290,30 295,76" fill="#fff" opacity="0.9"/><polygon points="299,76 299,40 322,76" fill="#bae6fd" opacity="0.85"/><path d="M248,76 L332,76 L320,88 L258,88 Z" fill="#f8fafc"/></svg>';
  }
  if (theme === 'winter') {
    return '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="55%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#0369a1"/></linearGradient></defs><rect width="1200" height="120" fill="url(#g)"/><path d="M0,92 Q320,62 640,88 T1200,72 L1200,120 L0,120 Z" fill="#bae6fd" opacity="0.22"/><circle cx="220" cy="32" r="3" fill="#fff" opacity="0.85"/><circle cx="380" cy="58" r="2.5" fill="#e0f2fe" opacity="0.8"/><circle cx="560" cy="24" r="3.5" fill="#fff" opacity="0.9"/><circle cx="740" cy="48" r="2.5" fill="#bae6fd" opacity="0.8"/><circle cx="910" cy="28" r="3" fill="#fff" opacity="0.85"/></svg>';
  }
  return '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3b1208"/><stop offset="48%" stop-color="#9a3412"/><stop offset="100%" stop-color="#d97706"/></linearGradient><radialGradient id="sun" cx="78%" cy="30%" r="38%"><stop offset="0%" stop-color="#fef08a" stop-opacity="0.8"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="120" fill="url(#g)"/><rect width="1200" height="120" fill="url(#sun)"/><path d="M0,90 Q240,56 520,84 T1040,68 L1200,76 L1200,120 L0,120 Z" fill="#451a03" opacity="0.55"/><path d="M0,102 Q340,78 680,98 T1200,86 L1200,120 L0,120 Z" fill="#1c0a00" opacity="0.68"/><g fill="#f97316" opacity="0.9"><ellipse cx="170" cy="38" rx="14" ry="7" transform="rotate(-28 170 38)"/><ellipse cx="184" cy="46" rx="12" ry="6" transform="rotate(24 184 46)"/><ellipse cx="162" cy="50" rx="12" ry="6" transform="rotate(-65 162 50)"/></g><g fill="#facc15" opacity="0.92"><ellipse cx="430" cy="30" rx="13" ry="6" transform="rotate(20 430 30)"/><ellipse cx="444" cy="38" rx="11" ry="5" transform="rotate(-35 444 38)"/></g><g fill="#ef4444" opacity="0.88"><ellipse cx="760" cy="50" rx="15" ry="7" transform="rotate(-18 760 50)"/><ellipse cx="776" cy="58" rx="12" ry="6" transform="rotate(32 776 58)"/></g><g fill="#fb923c" opacity="0.92"><ellipse cx="1030" cy="36" rx="14" ry="6.5" transform="rotate(25 1030 36)"/><ellipse cx="1016" cy="44" rx="12" ry="6" transform="rotate(-30 1016 44)"/></g><circle cx="290" cy="26" r="2.5" fill="#fde047" opacity="0.75"/><circle cx="620" cy="22" r="3" fill="#fed7aa" opacity="0.8"/><circle cx="890" cy="28" r="2.5" fill="#fde047" opacity="0.75"/></svg>';
}

function buildHtml(news, weather, rates) {
  if (!fs.existsSync('news')) fs.mkdirSync('news', { recursive: true });
  const list = Array.isArray(news) ? news : [];
  const w0 = (Array.isArray(weather) && weather.length > 0 ? weather.at(0) : null) || {
    name: 'Владивосток',
    now: '🌤 0°C',
    morning: '-2°C',
    day: '+2°C',
    evening: '0°C',
    tomorrow: '+3°C'
  };

  let dir = { outages: [], phones: {}, afisha: [] };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }

  const jkhHtml = (dir.outages || []).map(o =>
    tag('div', 'class="w-row"',
      tag('div', 'style="flex:1;padding-right:8px"',
        tag('div', 'style="font-size:11px;color:var(--accent);font-weight:700"', esc(o.city) + ' • ' + esc(o.type || 'Мониторинг 24/7')) +
        tag('div', 'style="font-size:13px;line-height:1.35;margin-top:2px"', esc(o.status))
      ) +
      tag('a', 'href="' + telHref(o.phone) + '" class="tel-pill"', '📞 ' + esc(o.phone))
    )
  ).join('');

  const afishaHtml = (dir.afisha || []).map((a, idx) =>
    tag('div', 'class="w-row afisha-item" onclick="openAfisha(' + idx + ')"',
      tag('div', 'style="flex:1"',
        tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:700"', '📅 ' + esc(a.date) + ' • ' + esc(a.city)) +
        tag('div', 'style="font-weight:700;font-size:13.5px;margin:3px 0"', esc(a.title)) +
tag('div', 'style="font-size:12px;color:var(--text);opacity:0.85"', '📍 ' + esc(a.place || a.city)) +
tag('div', 'style="font-size:11.5px;color:var(--muted);margin-top:3px"', '🎟 ' + esc(a.price || 'Вход свободный (бесплатно)') + ' • Подробнее →')
)
)
).join('');
for (const p of list) {
const shareUrl = encodeURIComponent('https://' + HOST + '/news/' + p.id + '.html');
const shareTitle = encodeURIComponent(p.title);
const tgShare = ['https:', '', 't.me', 'share', 'url?url=' + shareUrl + '&text=' + shareTitle].join(SLASH);
const body = tag('article', 'class="widget" style="padding:24px"',
tag('div', 'class="news-meta"',
tag('span', 'class="badge-cat"', esc(p.catLabel)) +
tag('span', '', esc(p.city)) +
tag('span', '', '• ' + esc(p.date)) +
tag('span', 'class="badge-age"', esc(p.age))
) +
tag('h1', 'style="font-size:24px;line-height:1.3;margin:10px 0 14px"', esc(p.title)) +
tag('img', 'class="hero-img" src="/' + esc(p.cover) + '" alt="' + esc(p.title) + '" style="border-radius:10px;margin-bottom:14px"') +
tag('div', 'class="tldr"', esc(p.tldr).split(NL).join(tag('br'))) +
tag('div', 'style="font-size:16px;white-space:pre-line;line-height:1.75"', esc(p.text)) +
tag('p', 'style="font-size:12px;color:var(--muted);margin-top:16px"', esc(p.src || '')) +
tag('div', 'style="display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;padding-top:14px;border-top:1px solid var(--border)"',
tag('a', 'href="' + tgShare + '" target="_blank" rel="noopener" class="btn-cta"', '✈ Переслать в Telegram') +
tag('button', 'type="button" class="soc-pill" onclick="navigator.clipboard&&navigator.clipboard.writeText(window.location.href);this.textContent=' + SQ + '✓ Ссылка скопирована' + SQ + '"', '🔗 Скопировать ссылку')
)
);
const artHtml = '' + tag('html', 'lang="ru"',
tag('head', '',
tag('meta', 'charset="UTF-8"') +
tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
tag('title', '', esc(p.title) + ' — Прим_Дозор') +
tag('meta', 'name="description" content="' + esc(String(p.text || '').replace(/\s+/g, ' ').slice(0, 160)) + '"') +
tag('link', 'rel="canonical" href="https://' + HOST + '/news/' + p.id + '.html"') +
tag('link', 'rel="stylesheet" href="/style.css?v=90"')
) +
tag('body', '',
tag('header', 'class="site-header"',
tag('div', 'class="wrap header-inner"',
tag('a', 'href="/" class="brand"', tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР') + tag('span', 'class="brand-age"', '18+')) +
tag('a', 'href="/" class="soc-pill"', '← Все новости края')
)
) +
tag('main', 'class="wrap" style="max-width:800px;margin-top:20px"', body) +
tag('footer', 'class="site-footer"', tag('div', 'class="wrap"', '© 2026 Прим_Дозор (18+). Приморский край.'))
)
);
fs.writeFileSync('news/' + p.id + '.html', artHtml, 'utf8');
}
const cards = list.length
? list.map((n, i) => {
const lead = String(n.text || '').replace(/\s+/g, ' ').slice(0, 155);
const meta = tag('div', 'class="news-meta"',
tag('span', 'class="badge-cat"', esc(n.catLabel)) +
tag('span', '', esc(n.city)) +
tag('span', '', '• ' + esc(n.date)) +
tag('span', 'class="badge-age"', esc(n.age))
);
const clickAttr = 'data-id="' + esc(n.id) + '" onclick="openArt(this.dataset.id)"';
if (i === 0) {
return tag('article', 'class="hero-card" ' + clickAttr,
tag('img', 'class="hero-img" src="./' + esc(n.cover) + '" alt="' + esc(n.title) + '"') +
tag('div', 'class="hero-body"', meta + tag('h2', 'class="hero-title"', esc(n.title)) + tag('p', 'class="hero-lead"', esc(lead) + '...'))
);
}
return tag('article', 'class="news-card" ' + clickAttr,
tag('img', 'class="news-thumb" src="./' + esc(n.cover) + '" alt="' + esc(n.title) + '" loading="lazy"') +
tag('div', '', meta + tag('h3', 'class="news-title"', esc(n.title)) + tag('p', 'class="news-excerpt"', esc(lead) + '...'))
);
}).join('')
: tag('div', 'class="widget"', tag('p', 'style="color:var(--muted)"', 'Лента новостей обновляется. Первые сводки появятся в 07:00 по Владивостоку.'));
const wCities = ['Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Большой Камень', 'Арсеньев', 'Спасск-Дальний', 'Партизанск', 'Дальнегорск']
.map((c, idx) => tag('option', 'value="' + idx + '"', c)).join('');
