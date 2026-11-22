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
    name: 'Владивосток',
    now: '🌤 0°C',
    morning: '-2°C',
    day: '+2°C',
    evening: '0°C',
    tomorrow: '+3°C'
  };

  let dir = { outages: [], phones: {}, afisha: [] };
  if (fs.existsSync('data/directories.json')) {
    try {
      dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8'));
    } catch (e) {}
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
        tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:700"', esc(a.city) + ' • ' + esc(a.date) + ' • ' + esc(a.tag)) +
        tag('div', 'style="font-weight:700;margin-top:2px"', esc(a.title)) +
        tag('div', 'style="font-size:11.5px;color:var(--muted);margin-top:2px"', 'Нажмите для подробностей (где и во сколько) →')
      )
    )
  ).join('');

  for (const p of list) {
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
      tag('p', 'style="font-size:12px;color:var(--muted);margin-top:16px"', esc(p.src || ''))
    );

    const artHtml = '<!DOCTYPE html>' + tag('html', 'lang="ru"',
      tag('head', '',
        tag('meta', 'charset="UTF-8"') +
        tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
        tag('title', '', esc(p.title) + ' — Прим_Дозор') +
        tag('meta', 'name="description" content="' + esc(String(p.text || '').replace(/\s+/g, ' ').slice(0, 160)) + '"') +
        tag('link', 'rel="stylesheet" href="/style.css?v=50"')
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
    : tag('div', 'class="widget"', tag('p', 'style="color:var(--muted)"', 'Лента новостей обновляется. Зайдите через пару минут.'));

  const wCities = ['Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Большой Камень', 'Арсеньев', 'Спасск-Дальний', 'Партизанск', 'Дальнегорск']
    .map((c, idx) => tag('option', 'value="' + idx + '"', c)).join('');

  const fCities = ['all', 'Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Большой Камень', 'Арсеньев', 'Спасск']
    .map(c => tag('option', 'value="' + c + '"', c === 'all' ? 'Весь край' : c === 'Спасск' ? 'Спасск-Дальний' : c)).join('');

  const tabsHtml = [
    ['all', 'Главное', true],
    ['chp', 'ЧП и 112', false],
    ['city', 'Город и ЖКХ', false],
    ['law', 'Законы и Власть', false],
    ['svo', 'СВО и Защита', false],
    ['family', 'Общество', false],
    ['sport', 'Спорт и Афиша', false]
  ].map(t => tag('button', 'class="tab' + (t.at(2) ? ' active' : '') + '" onclick="filterCat(' + SQ + t.at(0) + SQ + ',this)"', t.at(1))).join('');

  const ymSrc = ['https:', '', 'mc.yandex.ru', 'metrika', 'tag.js'].join(SLASH);
  const ymCode = '(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts.length&&document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t),k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","' + ymSrc + '","ym");ym(114370869,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});';

  const socLinks = [
    [['https:', '', 't.me'].join(SLASH), '✈ Telegram'],
    [['https:', '', 'max.ru'].join(SLASH), '💬 МАКС'],
    [['https:', '', 'vk.ru'].join(SLASH), '🌐 ВК'],
    [['https:', '', 'dzen.ru'].join(SLASH), '🔥 Дзен']
  ].map(s => tag('a', 'href="' + s.at(0) + '" target="_blank" rel="noopener" class="soc-pill"', s.at(1))).join('');

  const pCities = ['Все города', 'Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Большой Камень']
    .map(c => tag('option', 'value="' + c + '"', c === 'Все города' ? 'Экстренные службы края' : c)).join('');

  const repCities = ['Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Большой Камень', 'Другой город Приморья']
    .map(c => tag('option', '', c)).join('');

  const headHtml = tag('head', '',
    tag('meta', 'charset="UTF-8"') +
    tag('meta', 'name="viewport" content="width=device-width, initial-scale=1.0"') +
    tag('meta', 'name="yandex-verification" content="0dc10018fffed4cc"') +
    tag('title', '', 'Прим_Дозор — Главные новости Владивостока и Приморского края 24/7 (18+)') +
    tag('meta', 'name="description" content="Оперативные новости Владивостока, Уссурийска, Находки, Артёма, Большого Камня и Приморского края 24/7: ЧП, ЖКХ, отключения воды и света, погода, курсы валют, законы РФ, афиша."') +
    tag('link', 'rel="canonical" href="https://primdozor.ru"') +
    tag('link', 'rel="manifest" href="/manifest.json"') +
    tag('link', 'rel="stylesheet" href="/style.css?v=50"') +
    tag('script', 'type="text/javascript"', ymCode)
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
        tag('button', 'class="pill-btn" onclick="document.body.classList.toggle(' + SQ + 'big-font' + SQ + ')"', 'А+') +tag('button', 'class="pill-btn" onclick="document.body.classList.toggle(' + SQ + 'dark' + SQ + ')"', '🌙')
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
tag('button', 'class="btn-cta" onclick="openReport()"', '+ Прислать новость')
)
)
);
const navHtml = tag('div', 'class="nav-strip"', tag('div', 'class="wrap"', tag('nav', 'class="tabs"', tabsHtml)));
const asideHtml = tag('aside', '',
tag('div', 'class="widget"',
tag('div', 'class="widget-title"', tag('span', '', 'Отключения и службы 24/7')) +
tag('div', 'class="mini-tabs"',
tag('button', 'class="mini-tab active" onclick="switchDirTab(' + SQ + 'dir-jkh' + SQ + ',this)"', 'ЖКХ и свет') +
tag('button', 'class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-phones' + SQ + ',this)"', 'Телефоны') +
tag('button', 'class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-afisha' + SQ + ',this)"', 'Афиша')
) +
tag('div', 'id="dir-jkh"', jkhHtml) +
tag('div', 'id="dir-phones" style="display:none"',
tag('select', 'class="input" style="margin-bottom:8px;padding:6px 8px;font-size:13px" onchange="renderCityPhones(this.value)"', pCities) +
tag('div', 'id="phones-list"', '')
) +
tag('div', 'id="dir-afisha" style="display:none"', afishaHtml)
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
tag('a', 'href="mailto:prim_dozor@internet.ru" class="w-row" style="cursor:pointer"', tag('span', '', 'Почта редакции') + tag('strong', '', 'prim_dozor@internet.ru')) +
tag('a', 'href="/legal.html" class="w-row" style="cursor:pointer"', tag('span', '', '⚖ Правовая информация (152-ФЗ)') + tag('strong', '', '→'))
)
);
const mainWrapHtml = tag('div', 'class="wrap"',
tag('div', 'id="season-banner" class="season-banner" style="display:none"', '') +
tag('div', 'class="sub-tools"',
tag('input', 'type="search" class="search-input" placeholder="Поиск по новостям Приморья..." oninput="setSearch(this.value)"') +
tag('div', 'class="soc-pills"', socLinks)
) +
tag('div', 'class="layout"',
tag('div', '', tag('main', 'id="feed"', cards) + tag('div', 'id="ad-slot" class="ad-box" style="display:none"', '')) +
asideHtml
)
);
const modalsHtml =
tag('div', 'id="modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
tag('div', 'class="modal-sheet"',
tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
tag('strong', 'style="color:var(--accent)"', 'ПРИМ_ДОЗОР • 18+') +
tag('button', 'class="soc-pill" onclick="document.getElementById(' + SQ + 'modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕ Закрыть')
) +
tag('div', 'id="m-body"', '')
)
) +
tag('div', 'id="report-modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
tag('div', 'class="modal-sheet" style="max-width:480px"',
tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
tag('strong', '', 'Народный контроль Приморья') +
tag('button', 'class="soc-pill" onclick="document.getElementById(' + SQ + 'report-modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕')
) +
tag('form', 'onsubmit="sendReport(event)"',
tag('select', 'id="rep-city" class="input"', repCities) +
tag('textarea', 'id="rep-text" class="input" rows="4" placeholder="Опишите событие, адрес ДТП, отключение воды или света..." required', '') +
tag('p', 'style="font-size:11.5px;color:var(--muted);margin-bottom:10px"', 'Отправляя сообщение, вы соглашаетесь с политикой обработки персональных данных (152-ФЗ).') +
tag('button', 'type="submit" class="btn-cta" style="width:100%;padding:10px"', 'Отправить в редакцию (Telegram)')
)
)
) +
tag('div', 'id="ck" class="cookie-bar"',
tag('span', '', '🍪 Используем cookie и Яндекс.Метрику (152-ФЗ). ' + tag('a', 'href="/legal.html" style="text-decoration:underline"', 'Подробнее')) +
tag('button', 'class="btn-cta" onclick="localStorage.setItem(' + SQ + 'ck' + SQ + ',' + SQ + '1' + SQ + ');document.getElementById(' + SQ + 'ck' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', 'ОК')
) +
tag('footer', 'class="site-footer"',
tag('div', 'class="wrap"', '© 2026 Прим_Дозор (18+). Региональный информационный портал Приморского края. Администратор: Козин А.И. • ' + tag('a', 'href="/legal.html" style="text-decoration:underline;"', 'Правовая информация и 152-ФЗ'))
);
const scriptsHtml =
tag('script', '',
NL + 'window.NEWS=' + safeJson(list) + ';' +
NL + 'window.WEATHER=' + safeJson(weather) + ';' +
NL + 'window.DIRECTORIES=' + safeJson(dir) + ';' + NL
) +
tag('script', 'src="/config.js?v=50"', '') +
tag('script', 'src="/app.js?v=50"', '');
const fullHtml = '' + tag('html', 'lang="ru"', headHtml + tag('body', '', infobarHtml + headerHtml + navHtml + mainWrapHtml + modalsHtml + scriptsHtml));
fs.writeFileSync('index.html', fullHtml, 'utf8');
const urls = [tag('url', '', tag('loc', '', 'https://' + HOST + '/') + tag('priority', '', '1.0'))];
for (const n of list) {
urls.push(tag('url', '', tag('loc', '', 'https://' + HOST + '/news/' + n.id + '.html') + tag('priority', '', '0.8')));
}
fs.writeFileSync(
'sitemap.xml',
'' + NL + tag('urlset', 'xmlns="sitemaps.org"', NL + urls.join(NL) + NL),
'utf8'
);
}
module.exports = { buildHtml };
