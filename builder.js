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

function buildHtml(news, weather, rates) {
  if (!fs.existsSync('news')) fs.mkdirSync('news', { recursive: true });
  const list = Array.isArray(news) ? news : [];
  const w0 = (Array.isArray(weather) && weather.length > 0 ? weather.at(0) : null) || {
    name: 'Владивосток', now: '🌤 0°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C'
  };

  let dir = { outages: [], phones: {}, afisha: [] };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }

  let traffic = [
    { name: 'Золотой мост', level: 'ok', status: 'Свободно' },
    { name: 'Русский мост', level: 'ok', status: 'Свободно' },
    { name: 'Де-Фриз — Седанка', level: 'ok', status: 'Свободно' },
    { name: 'Трасса А-370 (Уссури)', level: 'ok', status: 'Свободно' },
    { name: 'Трасса на Находку', level: 'ok', status: 'Свободно' }
  ];
  if (fs.existsSync('data/traffic.json')) {
    try {
      const parsedT = JSON.parse(fs.readFileSync('data/traffic.json', 'utf8'));
      if (Array.isArray(parsedT) && parsedT.length > 0) traffic = parsedT;
    } catch (e) {}
  }

  const trafficHtml = traffic.map(t => {
    const dotColor = t.level === 'danger' ? '#ef4444' : t.level === 'warn' ? '#f59e0b' : '#10b981';
    const click = t.newsId ? ' onclick="openArt(\'' + esc(t.newsId) + '\')" style="cursor:pointer"' : '';
    return tag('span', 'class="soc-pill"' + click,
      tag('span', 'style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dotColor + ';margin-right:6px"', '') +
      esc(t.name) + ': ' + tag('strong', '', esc(t.status))
    );
  }).join('');

  const freeAfisha = (dir.afisha || []).filter(a => !/руб|₽|билет от/i.test(String(a.price || '')));

  const jkhHtml = (dir.outages || []).map(o =>
    tag('div', 'class="w-row"',
      tag('div', 'style="flex:1;padding-right:8px"',
        tag('div', 'style="font-size:11px;color:var(--accent);font-weight:700"', esc(o.city) + ' • ' + esc(o.type || 'Мониторинг 24/7')) +
        tag('div', 'style="font-size:13px;line-height:1.35;margin-top:2px"', esc(o.status))
      ) +
      tag('a', 'href="' + telHref(o.phone) + '" class="tel-pill"', '📞 ' + esc(o.phone))
    )
  ).join('');

  const afishaHtml = freeAfisha.map((a, idx) =>
    tag('div', 'class="w-row afisha-item" onclick="openAfisha(' + idx + ')"',
      tag('div', 'style="flex:1"',
        tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:700"', '📅 ' + esc(a.date) + ' • ' + esc(a.city)) +
        tag('div', 'style="font-weight:700;font-size:13.5px;margin:3px 0"', esc(a.title)) +
        tag('div', 'style="font-size:12px;opacity:0.85"', '📍 ' + esc(a.place || a.city)) +
        tag('div', 'style="font-size:11.5px;color:var(--muted);margin-top:3px"', '🎟 Вход свободный • Подробнее →')
      )
    )
  ).join('');

  for (const p of list) {
    const shareUrl = encodeURIComponent('https://' + HOST + '/news/' + p.id + '.html');
    const shareTitle = encodeURIComponent(p.title);
    const tgShare = ['https:', '', 't.me', 'share', 'url?url=' + shareUrl + '&text=' + shareTitle].join(SLASH);
    const locLabel = esc(p.city) + (p.district ? ' (' + esc(p.district) + ')' : '');

    const body = tag('article', 'class="widget" style="padding:24px"',
      tag('div', 'class="news-meta"',
        tag('span', 'class="badge-cat"', esc(p.catLabel)) +
        tag('span', '', locLabel) +
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

    const artHtml = '<!DOCTYPE html>' + tag('html', 'lang="ru"',
      tag('head', '',
        tag('meta', 'charset="UTF-8"') +
        tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
        tag('title', '', esc(p.title) + ' — Прим_Дозор') +
        tag('meta', 'name="description" content="' + esc(String(p.text || '').replace(/\s+/g, ' ').slice(0, 160)) + '"') +
        tag('link', 'rel="canonical" href="https://' + HOST + '/news/' + p.id + '.html"') +
        tag('link', 'rel="stylesheet" href="/style.css?v=125"')
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
        // Логика формирования карточек новостей (hero-card и news-card)
        const lead = String(n.text || '').replace(/\s+/g, ' ').slice(0, 155);
        // ... полный код генерации карточек, списков городов (wCities, fCities), меню (tabsHtml),
        // счётчиков Яндекс.Метрики, социальных ссылок, шапки (headHtml, infobarHtml, headerHtml),
        // сайдбара (asideHtml), рекламных и модальных блоков (modalsHtml), 
        // а также генерации index.html, sitemap.xml, robots.txt и rss.xml
      }).join('')
    : tag('div', 'class="widget"', tag('p', 'style="color:var(--muted)"', 'Лента новостей обновляется...'));
  
  // Код генерации index.html, sitemap.xml, robots.txt и rss.xml
  const fullHtml = '<!DOCTYPE html>' + tag('html', 'lang="ru"', headHtml + tag('body', '', infobarHtml + headerHtml + navHtml + mainWrapHtml + modalsHtml + scriptsHtml));
  fs.writeFileSync('index.html', fullHtml, 'utf8');
  // Генерация sitemap.xml, robots.txt и rss.xml...
}

module.exports = { buildHtml };
