const fs = require('fs');

const HOST = 'primdozor.ru';
const SLASH = String.fromCharCode(47);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const NL = String.fromCharCode(10);
const SQ = String.fromCharCode(39);

const SOC_URLS = {
  tg: 'https://t.me',
  direct: 'https://t.me',
  vk: 'https://vk.com',
  max: 'https://max.ru',
  dzen: 'https://dzen.ru'
};

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

function linkifyPhonesHtml(escapedText) {
  return String(escapedText || '').replace(/(?:(?:\+7|8)[\s\-]?\(?\d{3,5}\)?[\s\-]?\d{1,3}[\s\-]?\d{2}[\s\-]?\d{2}|\b\d{3}[\s\-]\d{2}[\s\-]\d{2}\b|\b112\b)/g, match => {
    const digits = match.replace(/[^\d+]/g, '');
    if (digits.length < 3) return match;
    return tag('a', 'href="' + telHref(match) + '" style="color:var(--accent);font-weight:700;text-decoration:underline"', match);
  });
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
    name: 'Владивосток', now: '0°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C'
  };

  let dir = { outages: [], phones: {}, afisha: [], poll: null };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }

  let traffic = [];
  let trafficTime = '';
  if (fs.existsSync('data/traffic.json')) {
    try {
      const pt = JSON.parse(fs.readFileSync('data/traffic.json', 'utf8'));
      if (Array.isArray(pt) && pt.length > 0) {
        traffic = pt;
        trafficTime = pt.at(0).updated || '';
      }
    } catch (e) {}
  }

  const trafficGrid = traffic.length
    ? tag('div', 'class="radar-grid"',
        traffic.map((t, idx) => {
          const dc = t.level === 'danger' ? '#ef4444' : t.level === 'warn' ? '#f59e0b' : '#10b981';
          const bg = t.level === 'danger' ? 'rgba(239,68,68,0.1)' : t.level === 'warn' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)';
          return tag('button', 'type="button" class="radar-cell" style="background:' + bg + '" onclick="openTraffic(' + idx + ')"',
            tag('div', 'style="font-size:11.5px;font-weight:700;display:flex;align-items:center;gap:6px"',
              tag('span', 'style="width:8px;height:8px;border-radius:50%;background:' + dc + ';flex-shrink:0"', '') +
              tag('span', 'style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"', esc(t.name))
            ) +
            tag('div', 'style="font-size:11px;color:var(--muted);margin-top:3px;text-align:left"', esc(t.status) + ' →')
          );
        }).join('')
      )
    : '';

  const allOut = dir.outages || [];
  const cntLight = allOut.filter(o => /(свет|электрич|лэп|подстанц)/i.test(o.type + ' ' + o.status)).length;
  const cntWater = allOut.filter(o => /(вод|водоснабж|труб)/i.test(o.type + ' ' + o.status)).length;
  const cntHeat = allOut.filter(o => /(тепл|отоплен|гвс|горяч)/i.test(o.type + ' ' + o.status)).length;
  const jkhCounters = tag('div', 'style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;text-align:center"',
    tag('button', 'type="button" class="soc-pill jkh-type-btn" data-jtype="Свет" style="justify-content:center;font-size:12px;padding:6px 4px;cursor:pointer" onclick="filterJkhType(' + SQ + 'Свет' + SQ + ',this)"', 'Свет: ' + tag('strong', 'style="margin-left:4px"', String(cntLight))) +
    tag('button', 'type="button" class="soc-pill jkh-type-btn" data-jtype="Вода" style="justify-content:center;font-size:12px;padding:6px 4px;cursor:pointer" onclick="filterJkhType(' + SQ + 'Вода' + SQ + ',this)"', 'Вода: ' + tag('strong', 'style="margin-left:4px"', String(cntWater))) +
    tag('button', 'type="button" class="soc-pill jkh-type-btn" data-jtype="Тепло" style="justify-content:center;font-size:12px;padding:6px 4px;cursor:pointer" onclick="filterJkhType(' + SQ + 'Тепло' + SQ + ',this)"', 'Тепло: ' + tag('strong', 'style="margin-left:4px"', String(cntHeat)))
  );

  const jkhMapBtn = tag('button', 'type="button" class="soc-pill" style="width:100%;justify-content:center;margin-bottom:8px;font-weight:700;color:var(--accent);cursor:pointer" onclick="openJkhMap()"', 'Карта отключений и аварийных служб Приморья');

  const jkhListHtml = allOut.length
    ? allOut.map((o, idx) =>
        tag('div', 'class="w-row jkh-row" style="cursor:pointer" onclick="openJkh(' + idx + ')"',
          tag('div', 'style="flex:1;padding-right:8px"',
            tag('div', 'style="font-size:11px;color:var(--accent);font-weight:700"', esc(o.city) + ' • ' + esc(o.type || 'ЖКХ 24/7')) +
            tag('div', 'style="font-size:13px;line-height:1.35;margin-top:2px"', esc(o.status)) +
            tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:600;margin-top:4px"', 'Все адреса и детали →')
          ) +
          tag('a', 'href="' + telHref(o.phone) + '" class="tel-pill" onclick="event.stopPropagation()"', 'Позвонить')
        )
      ).join('')
    : tag('div', 'class="w-row jkh-row" style="color:var(--muted);font-size:13px"', 'По оперативным данным диспетчерских служб Приморья 24/7, актуальных аварийных отключений по адресам сейчас нет.');

  const jkhHtml = jkhCounters + jkhMapBtn + tag('input', 'type="search" id="jkh-search" class="input" style="margin-bottom:8px;padding:7px 10px;font-size:13px;width:100%" placeholder="Поиск отключения по улице или городу..." oninput="filterJkh(this.value)"') + jkhListHtml;
  const freeAfisha = (dir.afisha || []).filter(a => !/руб|₽|билет от/i.test(String(a.price || '')));
  const afishaHtml = freeAfisha.length
    ? freeAfisha.map((a, idx) =>
        tag('div', 'class="w-row afisha-item" style="cursor:pointer" onclick="openAfisha(' + idx + ')"',
          tag('div', 'style="flex:1"',
            tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:700"', esc(a.date) + ' • ' + esc(a.city)) +
            tag('div', 'style="font-weight:700;font-size:13.5px;margin:3px 0"', esc(a.title)) +
            tag('div', 'style="font-size:12px;opacity:0.85"', 'Адрес: ' + esc(a.place || a.city)) +
            tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:600;margin-top:4px"', 'Вход свободный • Программа, контакты и карта →')
          )
        )
      ).join('')
    : tag('div', 'class="w-row" style="color:var(--muted);font-size:13px"', 'Подборка бесплатных городских и спортивных событий края на ближайшие 7 дней обновляется.');

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
      author: { '@type': 'Organization', name: 'ИА «Прим_Дозор»', url: 'https://' + HOST },
      publisher: { '@type': 'Organization', name: 'ИА «Прим_Дозор» — Приморский край 24/7' }
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

    const mediaBlock = (p.video && fs.existsSync(p.video))
      ? tag('video', 'controls playsinline preload="metadata" poster="/' + esc(p.cover) + '" style="width:100%;border-radius:10px;margin-bottom:14px;background:#000"',
          tag('source', 'src="/' + esc(p.video) + '" type="video/mp4"')
        )
      : tag('img', 'class="hero-img" src="/' + esc(p.cover) + '" alt="" style="border-radius:10px;margin-bottom:14px"');
    const body = crumbs + tag('article', 'class="widget" style="padding:24px"',
      tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(p.catLabel)) + tag('span', '', esc(p.city)) + tag('span', '', '• ' + esc(p.date))) +
      tag('h1', 'style="font-size:24px;line-height:1.3;margin:10px 0 14px"', esc(p.title)) +
      mediaBlock +
      tag('div', 'class="tldr"', linkifyPhonesHtml(esc(p.tldr)).split(NL).join(tag('br'))) +
      tag('div', 'style="font-size:16px;white-space:pre-line;line-height:1.75"', linkifyPhonesHtml(esc(p.text))) +
      (p.src ? tag('div', 'style="margin-top:14px;font-size:13px;color:var(--muted);font-style:italic"', esc(p.src)) : '') +
      reactBar +
      tag('div', 'style="margin-top:20px;padding:14px;background:var(--bg);border-radius:10px;font-size:13px;color:var(--muted)"',
        tag('div', 'style="margin-bottom:10px;font-weight:700"', 'Официальный материал редакции ИА «Прим_Дозор» (primdozor.ru). При цитировании активная гиперссылка обязательна.') +
        tag('div', 'style="display:flex;gap:8px;flex-wrap:wrap"',
          tag('button', 'type="button" class="btn-cta" data-cite="' + esc(citeText) + '" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.dataset.cite);this.textContent=' + SQ + 'Скопировано' + SQ + '"', 'Скопировать цитату') +
          tag('a', 'href="' + SOC_URLS.tg + '" target="_blank" rel="noopener noreferrer" class="soc-pill"', 'Читайте нас в Telegram') +
          tag('a', 'href="' + SOC_URLS.max + '" target="_blank" rel="noopener noreferrer" class="soc-pill"', 'Читайте нас в MAX') +
          tag('a', 'href="' + SOC_URLS.vk + '" target="_blank" rel="noopener noreferrer" class="soc-pill"', 'Читайте нас в ВК') +
          tag('a', 'href="' + SOC_URLS.dzen + '" target="_blank" rel="noopener noreferrer" class="soc-pill"', 'Читайте нас в Дзен')
        )
      )
    ) +
    (list.filter(x => x.id !== p.id).length ? tag('section', 'class="widget" style="padding:20px;margin-top:16px"',
      tag('h2', 'style="font-size:18px;margin:0 0 12px"', 'Читайте также в Приморском крае') +
      list.filter(x => x.id !== p.id).slice(0, 3).map(rel =>
        tag('div', 'class="w-row" style="padding:10px 0"',
          tag('a', 'href="/news/' + esc(rel.id) + '.html" style="text-decoration:none;color:inherit;font-weight:700;font-size:15px"',
            tag('span', 'style="color:var(--accent);font-size:12px;margin-right:6px"', esc(rel.city || 'Приморье') + ' •') + esc(rel.title)
          )
        )
      ).join('')
    ) : '');

    const artHtml = LT + '!DOCTYPE html' + GT + tag('html', 'lang="ru"',
      tag('head', '',
        tag('meta', 'charset="UTF-8"') +
        tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
        tag('title', '', esc(p.title) + ' — ИА «Прим_Дозор»') +
        tag('meta', 'name="description" content="' + descText + '"') +
        tag('meta', 'property="og:type" content="article"') +
        tag('meta', 'property="og:title" content="' + esc(p.title) + '"') +
        tag('meta', 'property="og:description" content="' + descText + '"') +
        tag('meta', 'property="og:image" content="' + imgUrl + '"') +
        tag('link', 'rel="canonical" href="' + artUrl + '"') +
        tag('link', 'rel="stylesheet" href="/style.css?v=200"') +
        tag('script', 'type="application/ld+json"', ldJson)
      ) +
      tag('body', '',
        tag('header', 'class="site-header"', tag('div', 'class="wrap header-inner"', tag('a', 'href="/" class="brand"', tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР')) + tag('a', 'href="/" class="soc-pill"', '← Все новости'))) +
        tag('main', 'class="wrap" style="max-width:800px;margin-top:20px"', body) +
        tag('footer', 'class="site-footer"', tag('div', 'class="wrap"', '© 2026 ИА «Прим_Дозор» (18+). Приморский край. Портал: primdozor.ru'))
      )
    );
    fs.writeFileSync('news/' + p.id + '.html', artHtml, 'utf8');
  }
  const topList = list.filter(x => x.urgent).slice(0, 3);
  const topBlock = topList.length
    ? tag('section', 'class="widget" style="padding:14px 18px;margin-bottom:14px;border-left:4px solid var(--accent)"',
        tag('div', 'style="font-size:12px;font-weight:800;text-transform:uppercase;color:var(--accent);letter-spacing:0.5px;margin-bottom:8px"', 'Главное в Приморском крае') +
        topList.map(t =>
          tag('div', 'class="w-row" style="padding:6px 0;cursor:pointer" onclick="openArt(' + SQ + esc(t.id) + SQ + ')"',
            tag('span', 'style="font-weight:700;font-size:14.5px"', esc(t.title)) +
            tag('span', 'style="font-size:12px;color:var(--muted);white-space:nowrap;margin-left:8px"', esc(t.city))
          )
        ).join('')
      )
    : '';

  const cards = list.length ? topBlock + list.map((n, i) => {
    const lead = String(n.text || '').replace(/\s+/g, ' ').slice(0, 155);
    const loc = esc(n.city) + (n.district ? ' • ' + esc(n.district) : '');
    const meta = tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(n.catLabel)) + tag('span', '', loc) + tag('span', '', '• ' + esc(n.date)) + tag('span', 'class="badge-age"', esc(n.age || '18+')) + (n.video ? tag('span', 'class="badge-cat" style="background:#0369a1"', 'ВИДЕО') : ''));
    const reactMini = tag('div', 'class="react-bar" data-react-id="' + esc(n.id) + '" style="display:flex;gap:6px;margin-top:8px"',
      ['🔥', '😡', '👍'].map(emo =>
        tag('button', 'type="button" class="soc-pill react-btn" style="padding:3px 8px;font-size:12px" data-emo="' + emo + '" onclick="event.stopPropagation();if(window.toggleReact)toggleReact(' + SQ + esc(n.id) + SQ + ',' + SQ + emo + SQ + ',this)"', emo + ' ' + tag('span', 'class="r-cnt"', '0'))
      ).join('')
    );
    const attr = 'data-id="' + esc(n.id) + '" onclick="openArt(this.dataset.id)"';
    return i === 0
      ? tag('article', 'class="hero-card" ' + attr, tag('img', 'class="hero-img" decoding="async" src="./' + esc(n.cover) + '" alt=""') + tag('div', 'class="hero-body"', meta + tag('h2', 'class="hero-title"', esc(n.title)) + tag('p', 'class="hero-lead"', esc(lead) + '...') + reactMini))
      : tag('article', 'class="news-card" ' + attr, tag('img', 'class="news-thumb" loading="lazy" decoding="async" src="./' + esc(n.cover) + '" alt=""') + tag('div', 'class="news-body"', meta + tag('h3', 'class="news-title"', esc(n.title)) + reactMini));
  }).join('') : tag('div', 'class="widget" style="padding:24px;text-align:center;color:var(--muted)"', 'Лента новостей ИА «Прим_Дозор» обновляется в реальном времени.');

  const r = rates || { usd: '82,1911', eur: '90,3445', cny: '12,3150' };
  const cities = ['Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Большой Камень', 'Арсеньев', 'Спасск-Дальний', 'Партизанск', 'Дальнегорск'];
  const cityOpts = cities.map(c => tag('option', 'value="' + esc(c) + '"', esc(c))).join('');
  const wOpts = (weather || []).map((w, idx) => tag('option', 'value="' + idx + '"', esc(w.name))).join('');

  const catList = [
    { id: 'all', label: 'Вся лента 24/7', col: '#0f172a' },
    { id: 'urgent', label: 'Молния • Главное', col: '#b91c1c' },
    { id: 'chp', label: 'Хроника 112 и ЧП', col: '#991b1b' },
    { id: 'city', label: 'Коммунальный фронт', col: '#0f766e' },
    { id: 'auto', label: 'Дороги и мосты', col: '#1e3a8a' },
    { id: 'law', label: 'Власть, закон и СВО', col: '#1d4ed8' },
    { id: 'econ', label: 'Экономика и порт', col: '#b45309' },
    { id: 'family', label: 'Люди Приморья', col: '#0284c7' },
    { id: 'med', label: 'Здравоохранение', col: '#0369a1' },
    { id: 'sport', label: 'Спорт и события', col: '#6d28d9' }
  ];
  const catTabs = catList.map((c, idx) =>
    tag('button', 'type="button" class="tab' + (idx === 0 ? ' active' : '') + '" data-catcol="' + c.col + '" style="border-left:3px solid ' + c.col + '" onclick="filterCat(' + SQ + c.id + SQ + ',this)"', c.label)
  ).join('');
  // Список локаций Приморского края и генерация выпадающего списка
  const locList = [
    { val: 'all', label: 'Весь Приморский край' },
    { val: 'Владивосток', label: 'Владивосток (все районы)' },
    { val: 'Ленинский', label: '— Ленинский район' },
    { val: 'Первомайский', label: '— Первомайский район' },
    { val: 'Первореченский', label: '— Первореченский район' },
    { val: 'Советский', label: '— Советский район' },
    { val: 'Фрунзенский', label: '— Фрунзенский район' },
    { val: 'Русский', label: '— остров Русский' },
    { val: 'Уссурийск', label: 'Уссурийск' },
    { val: 'Находка', label: 'Находка' },
    { val: 'Артём', label: 'Артём' },
    { val: 'Большой Камень', label: 'Большой Камень' },
    { val: 'Арсеньев', label: 'Арсеньев' },
    { val: 'Спасск-Дальний', label: 'Спасск-Дальний' },
    { val: 'Партизанск', label: 'Партизанск' },
    { val: 'Дальнегорск', label: 'Дальнегорск' }
  ];
  const distOpts = locList.map(d => tag('option', 'value="' + esc(d.val) + '"', esc(d.label))).join('');

  // SEO-разметка Schema.org для СМИ
  const orgJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'ИА «Прим_Дозор»',
    url: 'https://' + HOST + '/',
    sameAs: [SOC_URLS.tg, SOC_URLS.vk, SOC_URLS.max, SOC_URLS.dzen],
    areaServed: 'Приморский край',
    email: 'prim_dozor@internet.ru'
  }).replace(/</g, '\\u003c');

  // Формирование секции <head> с мета-тегами, стилями и глобальными переменными
  const headHtml = tag('head', '',
    tag('meta', 'charset="UTF-8"') +
    tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
    tag('title', '', 'ИА «Прим_Дозор» — Главные новости Владивостока и Приморского края 24/7 (18+)') +
    tag('meta', 'name="description" content="Информационное агентство Приморского края Прим_Дозор. Оперативные новости Владивостока, Уссурийска, Находки, Артёма, Большого Камня и края 24/7. Отключения ЖКХ, погода, транспорт, экстренные службы, аптеки и травмпункты 24/7."') +
    tag('link', 'rel="canonical" href="https://' + HOST + '/"') +
    tag('link', 'rel="stylesheet" href="./style.css?v=200"') +
    tag('script', 'type="application/ld+json"', orgJson) +
    tag('script', '', 'window.NEWS=' + safeJson(list) + ';window.WEATHER=' + safeJson(weather) + ';window.DIRECTORIES=' + safeJson(dir) + ';window.TRAFFIC=' + safeJson(traffic) + ';')
  );

  // Верхний баннер и шапка сайта (логотип, время, погода, курсы валют, переключатели темы)
  const topBannerHtml = tag('div', 'class="wrap" style="padding-top:10px"',
    tag('div', 'id="season-banner" style="width:100%"', '')
  );

  const headerHtml = tag('header', 'class="site-header" style="margin-top:8px"',
    tag('div', 'class="wrap header-inner" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"',
      tag('div', 'style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"',
        tag('a', 'href="./" class="brand"', tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР')) +
        tag('span', 'id="clock" class="soc-pill" style="font-size:12px"', 'Приморье 24/7') +
        tag('span', 'id="w-top" class="soc-pill"', esc(w0.now))
      ) +
      tag('div', 'style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"',
        tag('span', 'id="cbr-rates" class="soc-pill" title="Официальный курс ЦБ РФ"', 'ЦБ РФ: $' + esc(r.usd) + ' | €' + esc(r.eur) + ' | ¥' + esc(r.cny)) +
        tag('button', 'type="button" class="soc-pill" onclick="toggleFontSize()"', 'А+') +
        tag('button', 'type="button" class="soc-pill" onclick="document.body.classList.toggle(' + SQ + 'dark' + SQ + ');document.documentElement.classList.toggle(' + SQ + 'dark' + SQ + ')"', 'Тема')
      )
    )
  );

  // Блоки ссылок на соцсети и сервисные функции (ЖКХ, транспорт, службы 112)
  const socialBar = tag('div', 'class="soc-grid" style="margin:10px 0 8px"',
    tag('a', 'href="' + SOC_URLS.tg + '" target="_blank" rel="noopener noreferrer" class="tile-btn" style="background:#0284c7;color:#fff"', 'Читайте нас in Telegram') +
    tag('a', 'href="' + SOC_URLS.max + '" target="_blank" rel="noopener noreferrer" class="tile-btn" style="background:#4f46e5;color:#fff"', 'Читайте нас в MAX') +
    tag('a', 'href="' + SOC_URLS.vk + '" target="_blank" rel="noopener noreferrer" class="tile-btn" style="background:#1d4ed8;color:#fff"', 'Читайте нас в ВК') +
    tag('a', 'href="' + SOC_URLS.dzen + '" target="_blank" rel="noopener noreferrer" class="tile-btn" style="background:#18181b;color:#fbbf24;border:1px solid #3f3f46"', 'Читайте нас в Дзен')
  );

  const servicesBar = tag('div', 'class="svc-grid" style="margin:0 0 8px"',
    tag('button', 'type="button" class="tile-btn" style="background:#0f766e;color:#fff" onclick="openServiceModal(' + SQ + 'meters' + SQ + ')"', 'Показания счётчиков ЖКХ') +
    tag('button', 'type="button" class="tile-btn" style="background:#0369a1;color:#fff" onclick="openServiceModal(' + SQ + 'transport' + SQ + ')"', 'Транспорт 24/7') +
    tag('button', 'type="button" class="tile-btn" style="background:#b45309;color:#fff" onclick="focusDirTab(' + SQ + 'dir-jkh' + SQ + ')"', 'Отключения ЖКХ') +
    tag('button', 'type="button" class="tile-btn" style="background:#b91c1c;color:#fff" onclick="focusDirTab(' + SQ + 'dir-phones' + SQ + ')"', 'Службы 112 и ЕДДС') +
    tag('button', 'type="button" class="tile-btn" style="background:#6d28d9;color:#fff" onclick="focusDirTab(' + SQ + 'dir-afisha' + SQ + ')"', 'Афиша края (бесплатно)')
  );

  // Виджет дорожного радара
  const radarBox = trafficGrid
    ? tag('section', 'class="widget" style="padding:10px 12px;margin:0 0 10px"',
        tag('div', 'style="font-size:11.5px;font-weight:800;text-transform:uppercase;color:var(--muted);margin-bottom:6px;display:flex;justify-content:space-between"',
          tag('span', '', 'Дорожный радар Приморья') +
          tag('span', '', 'Обновлено: ' + esc(trafficTime))
        ) +
        trafficGrid
      )
    : '';
  const weatherWidget = tag('div', 'class="widget" style="padding:16px;margin-bottom:14px"',
    tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"',
      tag('strong', 'id="w-name"', esc(w0.name)) +
      tag('select', 'id="w-sel" class="soc-pill" onchange="setWeather(this.value)"', wOpts)
    ) +
    tag('div', 'style="font-size:21px;font-weight:800;margin-bottom:4px" id="w-now"', esc(w0.now)) +
    tag('div', 'style="font-size:12px;color:var(--muted);margin-bottom:10px" id="w-feel"', 'Погода в реальном времени по данным метеостанций') +
    tag('div', 'style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:12px;text-align:center"',
      tag('div', '', 'Утро' + tag('br') + tag('strong', 'id="w-m"', esc(w0.morning))) +
      tag('div', '', 'День' + tag('br') + tag('strong', 'id="w-d"', esc(w0.day))) +
      tag('div', '', 'Вечер' + tag('br') + tag('strong', 'id="w-e"', esc(w0.evening))) +
      tag('div', '', 'Завтра' + tag('br') + tag('strong', 'id="w-t"', esc(w0.tomorrow)))
    )
  );

  const pollWidget = tag('div', 'id="poll-widget" class="widget" style="padding:16px;margin-bottom:14px"', '');
  const svcCityOpts = ['Все города'].concat(cities).map(c => tag('option', 'value="' + esc(c) + '"', esc(c))).join('');
  const dirTabs = tag('div', 'style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap"',
    tag('button', 'id="tab-dir-jkh" type="button" class="mini-tab active" onclick="switchDirTab(' + SQ + 'dir-jkh' + SQ + ',this)"', 'ЖКХ 24/7') +
    tag('button', 'id="tab-dir-phones" type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-phones' + SQ + ',this)"', 'Экстренные службы') +
    tag('button', 'id="tab-dir-apteki" type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-apteki' + SQ + ',this)"', 'Аптеки 24/7') +
    tag('button', 'id="tab-dir-travma" type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-travma' + SQ + ',this)"', 'Травмпункты') +
    tag('button', 'id="tab-dir-afisha" type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-afisha' + SQ + ',this)"', 'Афиша')
  );

  const dirWidget = tag('div', 'id="dir-box" class="widget" style="padding:16px;margin-bottom:14px"',
    dirTabs +
    tag('div', 'id="dir-jkh"', jkhHtml) +
    tag('div', 'id="dir-phones" style="display:none"',
      tag('select', 'class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" onchange="renderCityPhones(this.value)"', svcCityOpts) +
      tag('div', 'id="phones-list"', '')
    ) +
    tag('div', 'id="dir-apteki" style="display:none"',
      tag('input', 'type="search" class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" placeholder="Поиск аптеки 24/7 по городу или улице..." oninput="renderAp(this.value)"') +
      tag('div', 'id="apteki-items"', '')
    ) +
    tag('div', 'id="dir-travma" style="display:none"',
      tag('input', 'type="search" class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" placeholder="Поиск травмпункта по городу или улице..." oninput="renderTr(this.value)"') +
      tag('div', 'id="travma-items"', '')
    ) +
    tag('div', 'id="dir-afisha" style="display:none"', afishaHtml)
  );
  // Создание модальных окон (статьи и народная приёмная)
  const modalsHtml = /* модальное окно статьи и форма обратной связи ИА «Прим_Дозор» */;

  // Стили сеток и адаптивности
  const designGridCss = /* CSS-правила для soc-grid, svc-grid, radar-grid и мобильных экранов */;

  // Основной контент страницы
  const mainHtml = designGridCss + tag('main', 'class="wrap"', ...);

  // Подвал сайта
  const footerHtml = tag('footer', 'class="site-footer"', ...);

  // Генерация index.html
  const docType = LT + '!DOCTYPE html' + GT;
  fs.writeFileSync('index.html', docType + tag('html', 'lang="ru"', headHtml + tag('body', '', topBannerHtml + headerHtml + mainHtml + footerHtml)), 'utf8');

  // Генерация sitemap.xml и robots.txt
  const todayIso = new Date().toISOString().slice(0, 10);
  // Запись sitemap.xml и robots.txt через fs.writeFileSync...

  // Генерация RSS-фида для Дзен (dzen.xml)
  // Обработка последних 30 материалов с тегами, изображениями и ссылками
  fs.writeFileSync('dzen.xml', dzenRss, 'utf8');
}

module.exports = { buildHtml };
