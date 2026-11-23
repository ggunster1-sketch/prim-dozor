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
      const pt = JSON.parse(fs.readFileSync('data/traffic.json', 'utf8'));
      if (Array.isArray(pt) && pt.length > 0) traffic = pt;
    } catch (e) {}
  }

  const trafficHtml = traffic.map(t => {
    const dc = t.level === 'danger' ? '#ef4444' : t.level === 'warn' ? '#f59e0b' : '#10b981';
    return tag('span', 'class="soc-pill"', tag('span', 'style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dc + ';margin-right:6px"', '') + esc(t.name) + ': ' + tag('strong', '', esc(t.status)));
  }).join('');

  const freeAfisha = (dir.afisha || []).filter(a => !/руб|₽|билет от/i.test(String(a.price || '')));

    const allOut = dir.outages || [];
  const cntLight = allOut.filter(o => /(свет|электрич|лэп|подстанц)/i.test(o.status)).length;
  const cntWater = allOut.filter(o => /(вод|водоснабж|труб)/i.test(o.status)).length;
  const cntHeat = allOut.filter(o => /(тепл|отоплен|гвс|горяч)/i.test(o.status)).length;
  const jkhCounters = tag('div', 'style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap"',
    tag('span', 'class="soc-pill" style="font-size:12px"', '⚡ Свет: ' + tag('strong', '', String(cntLight))) +
    tag('span', 'class="soc-pill" style="font-size:12px"', '💧 Вода: ' + tag('strong', '', String(cntWater))) +
    tag('span', 'class="soc-pill" style="font-size:12px"', '🔥 Тепло: ' + tag('strong', '', String(cntHeat)))
  );
  const jkhHtml = jkhCounters + tag('input', 'type="search" class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" placeholder="Поиск отключения по улице..." oninput="filterJkh(this.value)"') +
    
    (dir.outages || []).map(o =>
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
    const artUrl = 'https://' + HOST + '/news/' + p.id + '.html';
    const imgUrl = 'https://' + HOST + '/' + esc(p.cover);
    const descText = esc(String(p.text || '').replace(/\s+/g, ' ').slice(0, 160));
    const citeText = 'По данным ИА «Прим_Дозор»: ' + p.title + ' — подробнее: ' + artUrl;
    const ldJson = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: p.title,
      image: [imgUrl],
      datePublished: p.isoDate || new Date().toISOString(),
      author: { '@type': 'Organization', name: 'Прим_Дозор', url: 'https://' + HOST },
      publisher: { '@type': 'Organization', name: 'Прим_Дозор — Приморский край 24/7' }
    }).replace(/</g, '\\u003c');

        const crumbJson = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: 'https://' + HOST + '/' },
        { '@type': 'ListItem', position: 2, name: p.catLabel || 'Новости Приморья', item: 'https://' + HOST + '/' },
        { '@type': 'ListItem', position: 3, name: p.title, item: artUrl }
      ]
    }).replace(/</g, '\\u003c');

    const crumbs = tag('nav', 'aria-label="Хлебные крошки" style="font-size:13px;color:var(--muted);margin-bottom:12px"',
      tag('a', 'href="/" style="color:var(--accent);text-decoration:none;font-weight:600"', 'Главная') +
      ' → ' + esc(p.city || 'Приморский край') + ' → ' + esc(p.catLabel)
    ) + tag('script', 'type="application/ld+json"', crumbJson);

    const reactBar = tag('div', 'class="react-bar" data-react-id="' + esc(p.id) + '" style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"',
      ['🔥', '😡', '👍'].map(emo =>
        tag('button', 'type="button" class="soc-pill react-btn" data-emo="' + emo + '" onclick="event.stopPropagation();if(window.toggleReact)toggleReact(' + SQ + esc(p.id) + SQ + ',' + SQ + emo + SQ + ',this)"', emo + ' ' + tag('span', 'class="r-cnt"', '0'))
      ).join('')
    );

    const body = crumbs + tag('article', 'class="widget" style="padding:24px"',
      tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(p.catLabel)) + tag('span', '', esc(p.city)) + tag('span', '', '• ' + esc(p.date))) +
      tag('h1', 'style="font-size:24px;line-height:1.3;margin:10px 0 14px"', esc(p.title)) +
      tag('img', 'class="hero-img" src="/' + esc(p.cover) + '" alt="" style="border-radius:10px;margin-bottom:14px"') +
      tag('div', 'class="tldr"', esc(p.tldr).split(NL).join(tag('br'))) +
            tag('div', 'style="font-size:16px;white-space:pre-line;line-height:1.75"', esc(p.text)) +
      (p.src ? tag('div', 'style="margin-top:14px;font-size:13px;color:var(--muted);font-style:italic"', esc(p.src)) : '') +
      reactBar +
      tag('div', 'style="margin-top:20px;padding:14px;background:var(--bg);border-radius:10px;font-size:13px;color:var(--muted)"',
        tag('div', 'style="margin-bottom:8px;font-weight:700"', 'При цитировании ссылка на «Прим_Дозор» (primdozor.ru) обязательна.') +
        tag('div', 'style="display:flex;gap:8px;flex-wrap:wrap"',
          tag('button', 'type="button" class="btn-cta" data-cite="' + esc(citeText) + '" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.dataset.cite);this.textContent=' + SQ + '✓ Скопировано' + SQ + '"', '📋 Скопировать цитату') +
          tag('a', 'href="https://t.me" target="_blank" rel="noopener" class="soc-pill"', '📲 Подписаться в Telegram')
        )
      )
    ) +
    (list.filter(x => x.id !== p.id).length ? tag('section', 'class="widget" style="padding:20px;margin-top:16px"',
      tag('h2', 'style="font-size:18px;margin:0 0 12px"', 'Читайте также в Приморье') +
      list.filter(x => x.id !== p.id).slice(0, 3).map(rel =>
        tag('div', 'class="w-row" style="padding:10px 0"',
          tag('a', 'href="/news/' + esc(rel.id) + '.html" style="text-decoration:none;color:inherit;font-weight:700;font-size:15px"',
            tag('span', 'style="color:var(--accent);font-size:12px;margin-right:6px"', esc(rel.city || 'Приморье') + ' •') + esc(rel.title)
          )
        )
      ).join('')
    ) : '');

    const artHtml = '<!DOCTYPE html>' + tag('html', 'lang="ru"',
      tag('head', '',
        tag('meta', 'charset="UTF-8"') +
        tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
        tag('title', '', esc(p.title) + ' — Прим_Дозор') +
        tag('meta', 'name="description" content="' + descText + '"') +
        tag('meta', 'property="og:type" content="article"') +
        tag('meta', 'property="og:title" content="' + esc(p.title) + '"') +
        tag('meta', 'property="og:description" content="' + descText + '"') +
        tag('meta', 'property="og:image" content="' + imgUrl + '"') +
        tag('link', 'rel="canonical" href="' + artUrl + '"') +
        tag('link', 'rel="stylesheet" href="/style.css?v=150"') +
        tag('script', 'type="application/ld+json"', ldJson)
      ) +
      tag('body', '',
        tag('header', 'class="site-header"', tag('div', 'class="wrap header-inner"', tag('a', 'href="/" class="brand"', tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР')) + tag('a', 'href="/" class="soc-pill"', '← Все новости'))) +
        tag('main', 'class="wrap" style="max-width:800px;margin-top:20px"', body) +
        tag('footer', 'class="site-footer"', tag('div', 'class="wrap"', '© 2026 Прим_Дозор (18+). Приморский край. Администратор: Козин А.И.'))
      )
    );
    fs.writeFileSync('news/' + p.id + '.html', artHtml, 'utf8');
  }
  const cards = list.length ? list.map((n, i) => {
    const lead = String(n.text || '').replace(/\s+/g, ' ').slice(0, 155);
    const loc = esc(n.city) + (n.district ? ' • ' + esc(n.district) : '');
    const meta = tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(n.catLabel)) + tag('span', '', loc) + tag('span', '', '• ' + esc(n.date)) + tag('span', 'class="badge-age"', esc(n.age || '18+')));
    const reactMini = tag('div', 'class="react-bar" data-react-id="' + esc(n.id) + '" style="display:flex;gap:6px;margin-top:8px"',
      ['🔥', '😡', '👍'].map(emo =>
        tag('button', 'type="button" class="soc-pill react-btn" style="padding:3px 8px;font-size:12px" data-emo="' + emo + '" onclick="event.stopPropagation();if(window.toggleReact)toggleReact(' + SQ + esc(n.id) + SQ + ',' + SQ + emo + SQ + ',this)"', emo + ' ' + tag('span', 'class="r-cnt"', '0'))
      ).join('')
    );
    const attr = 'data-id="' + esc(n.id) + '" onclick="openArt(this.dataset.id)"';
    return i === 0
      ? tag('article', 'class="hero-card" ' + attr, tag('img', 'class="hero-img" src="./' + esc(n.cover) + '" alt=""') + tag('div', 'class="hero-body"', meta + tag('h2', 'class="hero-title"', esc(n.title)) + tag('p', 'class="hero-lead"', esc(lead) + '...') + reactMini))
      : tag('article', 'class="news-card" ' + attr, tag('img', 'class="news-thumb" src="./' + esc(n.cover) + '" alt=""') + tag('div', 'class="news-body"', meta + tag('h3', 'class="news-title"', esc(n.title)) + reactMini));
  }).join('') : tag('div', 'class="widget" style="padding:24px;text-align:center;color:var(--muted)"', 'Лента новостей обновляется. Первые сводки появятся в 07:00 по Владивостоку.');

  const r = rates || { usd: '82.2', eur: '90.3', cny: '12.3', jpy: '51.5' };
  const cities = ['Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Большой Камень', 'Арсеньев', 'Спасск-Дальний', 'Партизанск', 'Дальнегорск'];
  const cityOpts = cities.map(c => tag('option', 'value="' + esc(c) + '"', esc(c))).join('');
    const orgJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'Прим_Дозор',
    url: 'https://' + HOST + '/',
    email: 'prim_dozor@internet.ru',
    areaServed: 'Приморский край, Россия'
  }).replace(/</g, '\\u003c');

  const headHtml = tag('head', '',
    tag('meta', 'charset="UTF-8"') +
    tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
    tag('title', '', 'Прим_Дозор — Главные новости Владивостока и Приморского края 24/7 (18+)') +
    tag('meta', 'name="description" content="Оперативные новости Владивостока, Уссурийска, Находки, Артёма, Большого Камня и всего Приморского края 24/7. Происшествия, ЖКХ, отключения, погода, курсы валют и трассы."') +
    tag('link', 'rel="canonical" href="https://' + HOST + '/"') +
    tag('meta', 'property="og:type" content="website"') +
    tag('meta', 'property="og:site_name" content="Прим_Дозор"') +
    tag('meta', 'property="og:title" content="Прим_Дозор — Главные новости Приморского края 24/7 (18+)"') +
    tag('meta', 'property="og:description" content="Сводки ЧП, отключения воды и света, обстановка на мостах и трассах, погода в 9 городах Приморья."') +
    tag('meta', 'property="og:url" content="https://' + HOST + '/"') +
    tag('script', 'type="application/ld+json"', orgJson) +
    tag('link', 'rel="stylesheet" href="./style.css?v=150"') +
    tag('script', '', 'window.NEWS_DATA=' + safeJson(list) + ';window.WEATHER_DATA=' + safeJson(weather) + ';window.DIR_DATA=' + safeJson(dir) + ';')
  );

  const headerHtml = tag('header', 'class="site-header"',
    tag('div', 'class="wrap header-inner"',
      tag('div', 'style="display:flex;align-items:center;gap:10px"',
        tag('a', 'href="./" class="brand"', tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР')) +
        tag('select', 'id="city-select" class="soc-pill" onchange="changeCity(this.value)"', cityOpts)
      ) +
      tag('div', 'style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"',
        tag('span', 'id="header-weather" class="soc-pill"', esc(w0.now)) +
        tag('span', 'class="soc-pill"', '$' + esc(r.usd) + ' | €' + esc(r.eur) + ' | ¥' + esc(r.cny)) +
        tag('button', 'type="button" class="soc-pill" onclick="toggleFont()"', 'А+') +
        tag('button', 'type="button" class="soc-pill" onclick="toggleTheme()"', '🌙')
      )
    )
  );

  const mainHtml = tag('main', 'class="wrap"',
    tag('div', 'class="traffic-bar" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"', trafficHtml) +
    tag('div', 'class="grid-layout"',
      tag('section', 'id="news-feed"', cards) +
      tag('aside', 'class="sidebar"',
        tag('div', 'class="widget" style="padding:16px;margin-bottom:14px"',
          tag('h3', 'style="margin:0 0 8px"', 'Народный контроль Приморья • 24/7') +
          tag('button', 'type="button" class="btn-cta" onclick="openSuggest()"', '📢 Сообщить в редакцию')
        ) +
        tag('div', 'class="widget" style="padding:16px"',
          tag('div', 'id="tab-jkh"', jkhHtml) +
          tag('div', 'id="tab-afisha" style="margin-top:14px"', afishaHtml)
        )
      )
    ) +
    tag('script', 'src="./app.js?v=150"', '')
  );

    const footerHtml = tag('footer', 'class="site-footer"',
    tag('div', 'class="wrap" style="line-height:1.6"',
      '© 2026 ИА «Прим_Дозор» (18+). Оперативные новости Владивостока и Приморского края 24/7.' + tag('br') +
      'Администратор и редакция: Козин А.И. • Почта для читателей и рекламы (38-ФЗ): prim_dozor@internet.ru • ' +
      tag('a', 'href="https://t.me" target="_blank" rel="noopener" style="color:var(--accent)"', 'Telegram @prim_dozor')
    )
  );

  fs.writeFileSync('index.html', '<!DOCTYPE html>' + tag('html', 'lang="ru"', headHtml + tag('body', '', headerHtml + mainHtml + footerHtml)), 'utf8');

  const urls = ['https://' + HOST + '/'].concat(list.map(n => 'https://' + HOST + '/news/' + n.id + '.html'));
  const sm = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://sitemaps.org">' +
    urls.map(u => '<url><loc>' + u + '</loc></url>').join('') + '</urlset>';
  fs.writeFileSync('sitemap.xml', sm, 'utf8');
  fs.writeFileSync('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://' + HOST + '/sitemap.xml\n', 'utf8');
}

module.exports = { buildHtml };
