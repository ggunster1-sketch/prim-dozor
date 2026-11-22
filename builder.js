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

  const jkhHtml = tag('input', 'type="search" class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" placeholder="Поиск отключения по улице..." oninput="filterJkh(this.value)"') +
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
      image: new Array(imgUrl),
      datePublished: new Date().toISOString(),
      author: { '@type': 'Organization', name: 'Прим_Дозор', url: 'https://' + HOST },
      publisher: { '@type': 'Organization', name: 'Прим_Дозор — Приморский край 24/7' },
      spatialCoverage: { '@type': 'Place', name: (p.city || 'Владивосток') + ', Приморский край' }
    }).replace(/</g, '\\u003c');

    const body = tag('article', 'class="widget" style="padding:24px"',
      tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(p.catLabel)) + tag('span', '', esc(p.city) + (p.district ? ' • ' + esc(p.district) : '')) + tag('span', '', '• ' + esc(p.date))) +
      tag('h1', 'style="font-size:24px;line-height:1.3;margin:10px 0 14px"', esc(p.title)) +
      tag('img', 'class="hero-img" src="/' + esc(p.cover) + '" alt="' + esc(p.title) + '" style="border-radius:10px;margin-bottom:14px"') +
      tag('div', 'class="tldr"', esc(p.tldr).split(NL).join(tag('br'))) +
      tag('div', 'style="font-size:16px;white-space:pre-line;line-height:1.75"', esc(p.text)) +
      tag('div', 'style="margin-top:20px;padding:14px;background:var(--bg);border-radius:10px;font-size:13px;color:var(--muted)"',
        tag('div', 'style="margin-bottom:8px;font-weight:700"', 'При цитировании и репосте ссылка на «Прим_Дозор» (primdozor.ru) обязательна.') +
        tag('button', 'type="button" class="btn-cta" data-cite="' + esc(citeText) + '" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.dataset.cite);this.textContent=' + SQ + '✓ Цитата со ссылкой скопирована' + SQ + '"', '📋 Скопировать цитату для канала')
      )
    );

    const artHtml = '<!DOCTYPE html>' + tag('html', 'lang="ru"',
      tag('head', '',
        tag('meta', 'charset="UTF-8"') +
        tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
        tag('title', '', esc(p.title) + ' — Прим_Дозор') +
        tag('meta', 'name="description" content="' + descText + '"') +
        tag('meta', 'property="og:type" content="article"') +
        tag('meta', 'property="og:site_name" content="Прим_Дозор — Приморский край 24/7"') +
        tag('meta', 'property="og:title" content="' + esc(p.title) + '"') +
        tag('meta', 'property="og:description" content="' + descText + '"') +
        tag('meta', 'property="og:image" content="' + imgUrl + '"') +
        tag('meta', 'property="og:url" content="' + artUrl + '"') +
        tag('link', 'rel="canonical" href="' + artUrl + '"') +
        tag('link', 'rel="stylesheet" href="/style.css?v=150"') +
        tag('script', 'type="application/ld+json"', ldJson)
      ) +
      tag('body', '',
        tag('header', 'class="site-header"', tag('div', 'class="wrap header-inner"', tag('a', 'href="/" class="brand"', tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР')) + tag('a', 'href="/" class="soc-pill"', '← Все новости Приморья'))) +
        tag('main', 'class="wrap" style="max-width:800px;margin-top:20px"', body) +
        tag('footer', 'class="site-footer"', tag('div', 'class="wrap"', '© 2026 Прим_Дозор (18+). Приморский край.'))
      )
    );
    fs.writeFileSync('news/' + p.id + '.html', artHtml, 'utf8');
    const cards = list.length ? list.map((n, i) => {
    const lead = String(n.text || '').replace(/\s+/g, ' ').slice(0, 155);
    const loc = esc(n.city) + (n.district ? ' • ' + esc(n.district) : '');
    const meta = tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(n.catLabel)) + tag('span', '', loc) + tag('span', '', '• ' + esc(n.date)) + tag('span', 'class="badge-age"', esc(n.age)));
    const attr = 'data-id="' + esc(n.id) + '" onclick="openArt(this.dataset.id)"';
    return i === 0
      ? tag('article', 'class="hero-card" ' + attr, tag('img', 'class="hero-img" src="./' + esc(n.cover) + '" alt=""') + tag('div', 'class="hero-body"', meta + tag('h2', 'class="hero-title"', esc(n.title)) + tag('p', 'class="hero-lead"', esc(lead) + '...')))
      : tag('article', 'class="news-card" ' + attr, tag('img', 'class="news-thumb" src="./' + esc(n.cover) + '" alt="" loading="lazy"') + tag('div', '', meta + tag('h3', 'class="news-title"', esc(n.title)) + tag('p', 'class="news-excerpt"', esc(lead) + '...')));
  }).join('') : tag('div', 'class="widget"', tag('p', 'style="color:var(--muted)"', 'Лента новостей обновляется. Первые сводки появятся в 07:00 по Владивостоку.'));

  const wCities = ['Владивосток','Уссурийск','Находка','Артём','Большой Камень','Арсеньев','Спасск-Дальний','Партизанск','Дальнегорск'].map((c, i) => tag('option', 'value="' + i + '"', c)).join('');
  const fCities = [
    ['all','Весь край'], ['Владивосток','Владивосток (весь)'], ['Первомайский','↳ Первомайский (Чуркин)'],
    ['Ленинский','↳ Ленинский р-н'], ['Первореченский','↳ Первореченский р-н'], ['Советский','↳ Советский р-н'],
    ['Фрунзенский','↳ Фрунзенский (Центр)'], ['Русский','↳ о. Русский'], ['Уссурийск','Уссурийск'],
    ['Находка','Находка'], ['Артём','Артём'], ['Большой Камень','Большой Камень']
  ].map(c => tag('option', 'value="' + c.at(0) + '"', c.at(1))).join('');

  const tabsHtml = [
    ['all','Главное',1], ['chp','ЧП и 112',0], ['city','Город и ЖКХ',0],
    ['law','Законы и Власть',0], ['svo','СВО и Защита',0], ['family','Общество',0], ['sport','Спорт и Афиша',0]
  ].map(t => tag('button', 'type="button" class="tab' + (t.at(2) ? ' active' : '') + '" onclick="filterCat(' + SQ + t.at(0) + SQ + ',this)"', t.at(1))).join('');

  const socLinks = [
    [['https:', '', 't.me'].join(SLASH), '✈ Telegram'],
    [['https:', '', 'max.ru'].join(SLASH), '💬 МАКС'],
    [['https:', '', 'vk.ru'].join(SLASH), '🌐 ВК'],
    [['https:', '', 'dzen.ru'].join(SLASH), '🔥 Дзен']
  ].map(s => tag('a', 'href="' + s.at(0) + '" target="_blank" rel="noopener" class="soc-pill"', s.at(1))).join('');

  const pCities = ['Все города','Владивосток','Уссурийск','Находка','Артём','Большой Камень'].map(c => tag('option', 'value="' + c + '"', c === 'Все города' ? 'Экстренные службы края' : c)).join('');
  const repCities = ['Владивосток','Уссурийск','Находка','Артём','Большой Камень','Другой город Приморья'].map(c => tag('option', '', c)).join('');

  const headHtml = tag('head', '',
    tag('meta', 'charset="UTF-8"') +
    tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
    tag('meta', 'name="yandex-verification" content="0dc10018fffed4cc"') +
    tag('title', '', 'Прим_Дозор — Главные новости Владивостока и Приморского края 24/7 (18+)') +
    tag('link', 'rel="canonical" href="https://primdozor.ru"') +
    tag('link', 'rel="stylesheet" href="/style.css?v=150"')
  );

  const infobarHtml = tag('div', 'class="infobar"',
    tag('div', 'class="wrap infobar-inner"',
      tag('div', 'class="infobar-left"',
        tag('span', 'class="live-dot"', '') +
        tag('strong', 'id="clock"', 'Владивосток') +
        tag('select', 'class="pill-btn" id="w-sel" onchange="setWeather(this.value)"', wCities) +
        tag('strong', 'id="w-top"', esc(w0.now))
      ) +
      tag('div', 'class="infobar-right"',
        tag('span', 'class="hide-mob"', '$' + esc(rates.usd) + ' | €' + esc(rates.eur) + ' | ¥' + esc(rates.cny)) +
        tag('button', 'type="button" class="pill-btn" onclick="document.body.classList.toggle(' + SQ + 'big-font' + SQ + ')"', 'А+') +
        tag('button', 'type="button" class="pill-btn" onclick="document.body.classList.toggle(' + SQ + 'dark' + SQ + ')"', '🌙')
      )
    )
  );

  const headerHtml = tag('header', 'class="site-header"',
    tag('div', 'class="wrap header-inner"',
      tag('a', 'href="/" class="brand"',
        tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР') +
        tag('span', 'class="brand-sub"', 'Приморский край 24/7') +
        tag('span', 'class="brand-age"', '18+')
      ) +
      tag('div', 'class="header-actions"',
        tag('select', 'class="filter-city" onchange="filterCity(this.value)"', fCities) +
        tag('button', 'type="button" class="btn-cta" onclick="openReport()"', '+ Прислать новость')
      )
    )
  );

  const navHtml = tag('div', 'class="nav-strip"', tag('div', 'class="wrap"', tag('nav', 'class="tabs"', tabsHtml)));
  const guideHtml = tag('input', 'type="search" class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" placeholder="Травмпункт, аптека, паром..." oninput="renderGuide(this.value)"') + tag('div', 'id="guide-items"', '');

  const asideHtml = tag('aside', '',
    tag('div', 'class="widget"',
      tag('div', 'class="widget-title"', 'Отключения и службы 24/7') +
      tag('div', 'class="mini-tabs"',
        tag('button', 'type="button" class="mini-tab active" onclick="switchDirTab(' + SQ + 'dir-jkh' + SQ + ',this)"', 'ЖКХ и свет') +
        tag('button', 'type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-phones' + SQ + ',this)"', 'Телефоны') +
        tag('button', 'type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-afisha' + SQ + ',this)"', 'Афиша') +
        tag('button', 'type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-guide' + SQ + ',this)"', '24/7')
      ) +
      tag('div', 'id="dir-jkh"', jkhHtml) +
      tag('div', 'id="dir-phones" style="display:none"', tag('select', 'class="input" style="margin-bottom:8px;padding:6px 8px;font-size:13px" onchange="renderCityPhones(this.value)"', pCities) + tag('div', 'id="phones-list"', '')) +
      tag('div', 'id="dir-afisha" style="display:none"', afishaHtml) +
      tag('div', 'id="dir-guide" style="display:none"', guideHtml)
    ) +
    tag('div', 'class="widget"',
      tag('div', 'class="widget-title"', 'Погода: ' + tag('span', 'id="w-name"', esc(w0.name))) +
      tag('div', 'class="w-row"', tag('span', '', 'Сейчас') + tag('strong', 'id="w-now"', esc(w0.now))) +
      tag('div', 'class="w-row"', tag('span', '', 'Утром') + tag('strong', 'id="w-m"', esc(w0.morning))) +
      tag('div', 'class="w-row"', tag('span', '', 'Днём') + tag('strong', 'id="w-d"', esc(w0.day))) +
      tag('div', 'class="w-row"', tag('span', '', 'Вечером') + tag('strong', 'id="w-e"', esc(w0.evening))) +
      tag('div', 'class="w-row"', tag('span', '', 'Завтра') + tag('strong', 'id="w-t"', esc(w0.tomorrow)))
    ) +
    tag('div', 'class="widget"',
      tag('div', 'class="widget-title"', 'Курсы ЦБ РФ') +
      tag('div', 'class="w-row"', tag('span', '', 'Доллар (USD)') + tag('strong', '', esc(rates.usd) + ' ₽')) +
      tag('div', 'class="w-row"', tag('span', '', 'Евро (EUR)') + tag('strong', '', esc(rates.eur) + ' ₽')) +
      tag('div', 'class="w-row"', tag('span', '', 'Юань (CNY)') + tag('strong', '', esc(rates.cny) + ' ₽')) +
      tag('div', 'class="w-row"', tag('span', '', '100 Иен (JPY)') + tag('strong', '', esc(rates.jpy) + ' ₽'))
    ) +
    tag('div', 'class="widget"',
      tag('div', 'class="widget-title"', 'Редакция и СМИ') +
      tag('a', 'href="mailto:prim_dozor@internet.ru" class="w-row"', tag('span', '', 'Почта редакции') + tag('strong', '', 'prim_dozor@internet.ru')) +
      tag('a', 'href="/legal.html" class="w-row"', tag('span', '', '⚖ Правовая информация (152-ФЗ)') + tag('strong', '', '→'))
    )
  );
  // Редакционный блок, основной контейнер и модальные окна (сообщить о проблеме, куки, футер)
    const editorialSlotHtml =
    tag('div', 'class="ad-tag"', tag('span', '', 'Народный контроль Приморья • 24/7') + ' ' + tag('span', '', 'Бесплатно для жителей края')) +
    tag('div', 'style="font-weight:800;font-size:15px;margin-bottom:6px"', 'Сообщите о проблеме ЖКХ, ДТП или перекрытии дороги') +
    tag('div', 'style="font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.45"', 'Оперативно публикуем сигналы жителей Владивостока, Уссурийска, Находки, Артёма и других городов Приморского края.') +
    tag('div', 'style="display:flex;flex-wrap:wrap;gap:8px"',
      tag('button', 'type="button" class="btn-cta" onclick="openReport()"', '📢 Сообщить в редакцию') +
      tag('a', 'href="mailto:prim_dozor@internet.ru?subject=%D0%A0%D0%B5%D0%BA%D0%BB%D0%B0%D0%BC%D0%B0%20%D0%BD%D0%B0%20PrimDozor.ru" class="soc-pill"', '💼 Разместить рекламу (38-ФЗ)')
    );

  const mainWrapHtml = tag('div', 'class="wrap"',
    tag('div', 'id="season-banner" class="season-banner"', '') +
    tag('div', 'class="soc-pills" style="margin-top:10px"', trafficHtml) +
    tag('div', 'class="sub-tools"',
      tag('input', 'type="search" class="search-input" placeholder="Поиск по новостям и районам Приморья..." oninput="setSearch(this.value)"') +
      tag('div', 'class="soc-pills"', socLinks)
    ) +
    tag('div', 'class="layout"',
      tag('div', '', tag('main', 'id="feed"', cards) + tag('div', 'id="ad-slot" class="ad-box"', editorialSlotHtml)) +
      asideHtml
    )
  );
  const modalsHtml =
    tag('div', 'id="modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
      tag('div', 'class="modal-sheet"',
        tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
          tag('strong', 'style="color:var(--accent)"', 'ПРИМ_ДОЗОР • 18+') +
          tag('button', 'type="button" class="soc-pill" onclick="document.getElementById(' + SQ + 'modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕ Закрыть')
        ) +
        tag('div', 'id="m-body"', '')
      )
    ) +
    tag('div', 'id="report-modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
      tag('div', 'class="modal-sheet" style="max-width:480px"',
        tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
          tag('strong', '', 'Народный контроль Приморья') +
          tag('button', 'type="button" class="soc-pill" onclick="document.getElementById(' + SQ + 'report-modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕')
        ) +
        tag('form', 'onsubmit="sendReport(event)"',
          tag('select', 'id="rep-city" class="input"', repCities) +
          tag('textarea', 'id="rep-text" class="input" rows="4" placeholder="Опишите событие..." required', '') +
          tag('button', 'type="submit" class="btn-cta" style="width:100%;padding:10px"', 'Отправить в редакцию (Telegram)')
        )
      )
    ) +
        tag('div', 'style="font-weight:800;font-size:15px;margin-bottom:6px"', 'Сообщите о проблеме ЖКХ, ДТП или перекрытии дороги') +
    tag('div', 'style="font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.45"', 'Оперативно публикуем сигналы жителей Владивостока, Уссурийска, Находки, Артёма и других городов Приморского края.') +
    tag('div', 'style="display:flex;flex-wrap:wrap;gap:8px"',
      tag('button', 'type="button" class="btn-cta" onclick="openReport()"', '📢 Сообщить в редакцию') +
      tag('a', 'href="mailto:prim_dozor@internet.ru?subject=%D0%A0%D0%B5%D0%BA%D0%BB%D0%B0%D0%BC%D0%B0%20%D0%BD%D0%B0%20PrimDozor.ru" class="soc-pill"', '💼 Разместить рекламу (38-ФЗ)')
    );

  const mainWrapHtml = tag('div', 'class="wrap"',
    tag('div', 'id="season-banner" class="season-banner"', '') +
    tag('div', 'class="soc-pills" style="margin-top:10px"', trafficHtml) +
    tag('div', 'class="sub-tools"',
      tag('input', 'type="search" class="search-input" placeholder="Поиск по новостям и районам Приморья..." oninput="setSearch(this.value)"') +
      tag('div', 'class="soc-pills"', socLinks)
    ) +
    tag('div', 'class="layout"',
      tag('div', '', tag('main', 'id="feed"', cards) + tag('div', 'id="ad-slot" class="ad-box"', editorialSlotHtml)) +
      asideHtml
    )
  );

  const modalsHtml =
    tag('div', 'id="modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
      tag('div', 'class="modal-sheet"',
        tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
          tag('strong', 'style="color:var(--accent)"', 'ПРИМ_ДОЗОР • 18+') +
          tag('button', 'type="button" class="soc-pill" onclick="document.getElementById(' + SQ + 'modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕ Закрыть')
        ) +
        tag('div', 'id="m-body"', '')
      )
    ) +
    tag('div', 'id="report-modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
      tag('div', 'class="modal-sheet" style="max-width:480px"',
        tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
          tag('strong', '', 'Народный контроль Приморья') +
          tag('button', 'type="button" class="soc-pill" onclick="document.getElementById(' + SQ + 'report-modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕')
        ) +
        tag('form', 'onsubmit="sendReport(event)"',
          tag('select', 'id="rep-city" class="input"', repCities) +
          tag('textarea', 'id="rep-text" class="input" rows="4" placeholder="Опишите событие..." required', '') +
          tag('button', 'type="submit" class="btn-cta" style="width:100%;padding:10px"', 'Отправить в редакцию (Telegram)')
        )
      )
    ) +
    tag('div', 'id="ck" class="cookie-bar"',
      tag('span', '', '🍪 Cookie и Яндекс.Метрика (152-ФЗ). ' + tag('a', 'href="/legal.html"', 'Подробнее')) +
      tag('button', 'type="button" class="btn-cta" onclick="try{localStorage.setItem(' + SQ + 'ck' + SQ + ',' + SQ + '1' + SQ + ')}catch(e){};document.getElementById(' + SQ + 'ck' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', 'ОК')
    ) +
    tag('footer', 'class="site-footer"',
      tag('div', 'class="wrap"', '© 2026 Прим_Дозор (18+). Региональный портал Приморского края. Администратор: Козин А.И. • ' + tag('a', 'href="/legal.html"', '152-ФЗ'))
    );

  const dirClean = Object.assign({}, dir, { afisha: freeAfisha });
  const scriptsHtml =
    tag('script', '', NL + 'window.NEWS=' + safeJson(list) + ';window.WEATHER=' + safeJson(weather) + ';window.DIRECTORIES=' + safeJson(dirClean) + ';' + NL) +
    tag('script', 'src="/app.js?v=' + Date.now() + '"', '');

  fs.writeFileSync('index.html', '<!DOCTYPE html>' + tag('html', 'lang="ru"', headHtml + tag('body', '', infobarHtml + headerHtml + navHtml + mainWrapHtml + modalsHtml + scriptsHtml)), 'utf8');

  const urls = [tag('url', '', tag('loc', '', 'https://' + HOST + '/') + tag('priority', '', '1.0'))];
  for (const n of list) urls.push(tag('url', '', tag('loc', '', 'https://' + HOST + '/news/' + n.id + '.html') + tag('priority', '', '0.8')));
  fs.writeFileSync('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>' + NL + tag('urlset', 'xmlns="http://sitemaps.org"', NL + urls.join(NL) + NL), 'utf8');
  fs.writeFileSync('robots.txt', ['User-agent: *', 'Allow: /', 'Disallow: /data/', 'Host: https://' + HOST, 'Sitemap: https://' + HOST + '/sitemap.xml'].join(NL), 'utf8');
}

module.exports = { buildHtml };
