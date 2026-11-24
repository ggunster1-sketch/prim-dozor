const fs = require('fs');
const path = require('path');

const SITE_HOST = 'primdozor.ru';
const YM_URL = ['https:', '', 'mc.yandex.ru', 'metrika', 'tag.js'].join('/');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildArticlePage(post, related) {
  const url = 'https://' + SITE_HOST + '/news/' + post.id + '.html';
  const coverUrl = post.cover ? ('https://' + SITE_HOST + '/' + post.cover) : ('https://' + SITE_HOST + '/icon-512.png');
  const desc = (post.tldr || post.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const paragraphs = (post.fullText || post.text || '').split('\n').map(p => p.trim()).filter(Boolean).map(p => '<p style="margin-bottom:14px; line-height:1.72;">' + esc(p) + '</p>').join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    datePublished: post.isoDate || new Date().toISOString(),
    dateModified: post.isoDate || new Date().toISOString(),
    image: [coverUrl],
    author: { '@type': 'Organization', name: 'Прим_Дозор', url: 'https://' + SITE_HOST + '/' },
    publisher: { '@type': 'Organization', name: 'Прим_Дозор', url: 'https://' + SITE_HOST + '/' },
    description: desc,
    mainEntityOfPage: url
  });

  const relHtml = related.map(r => '<div class="w-row"><a href="/news/' + r.id + '.html" style="font-weight:600;">' + esc(r.title) + '</a><span style="color:var(--muted); font-size:12px;">' + esc(r.city) + '</span></div>').join('');

  return `<!DOCTYPE html>
<html lang="ru" translate="no" class="notranslate">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="yandex-verification" content="0dc10018fffed4cc">
<title>${esc(post.title)} — Прим_Дозор (${esc(post.age || '18+')})</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="stylesheet" href="/style.css?v=3">
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a href="/" class="brand"><span class="brand-mark">ПРИМ_ДОЗОР</span><span class="brand-age">18+</span></a>
    <a href="/" class="soc-pill">← Вся лента</a>
  </div>
</header>
<main class="wrap" style="margin-top:18px; max-width:800px;">
  <article class="widget" style="padding:22px;">
    <div class="news-meta">
      <span class="badge-cat">${esc(post.catLabel)}</span>
      <span>${esc(post.city)}</span>
      <span>• ${esc(post.date)}</span>
      <span class="badge-age">${esc(post.age || '16+')}</span>
    </div>
    <h1 style="font-size:23px; line-height:1.3; margin:10px 0 14px;">${esc(post.title)}</h1>
    ${post.cover ? '<img class="hero-img" src="/' + esc(post.cover) + '" alt="' + esc(post.title) + '" style="border-radius:10px; margin-bottom:14px;">' : ''}
    <div class="tldr"><strong>Главное:</strong><br>${post.tldr || ''}</div>
    <div style="font-size:16px;">${paragraphs}</div>
    ${post.src ? '<p style="font-size:12px; color:var(--muted); margin-top:12px;">' + esc(post.src) + '</p>' : ''}
  </article>
  ${related.length ? '<section class="widget"><div class="widget-title">Читайте также</div>' + relHtml + '</section>' : ''}
</main>
<footer class="site-footer"><div class="wrap">© 2026 Прим_Дозор (18+). Приморский край. <a href="/legal.html" style="text-decoration:underline;">Правовая информация и 152-ФЗ</a></div></footer>
</body>
</html>`;
}

function buildSite() {
  let news = [];
  if (fs.existsSync('news.json')) { try { news = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {} }
  let weather = [];
  if (fs.existsSync('weather.json')) { try { weather = JSON.parse(fs.readFileSync('weather.json', 'utf8')); } catch (e) {} }
  const w0 = (Array.isArray(weather) && weather) ? weather : { name: 'Владивосток', now: '🌤 +1°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' };

  let rates = { usd: '98.5', eur: '104.2', cny: '13.6', jpy: '64.5' };
  if (fs.existsSync('rates.json')) { try { rates = Object.assign(rates, JSON.parse(fs.readFileSync('rates.json', 'utf8'))); } catch (e) {} }

  if (!fs.existsSync('news')) fs.mkdirSync('news', { recursive: true });
  for (let i = 0; i < news.length; i++) {
    const post = news[i];
    const related = news.filter((x, idx) => idx !== i && (x.cat === post.cat || x.city === post.city)).slice(0, 4);
    fs.writeFileSync('news/' + post.id + '.html', buildArticlePage(post, related), 'utf8');
  }

  const ssrCards = news.slice(0, 25).map((n, idx) => {
    const lead = (n.text || '').replace(/\s+/g, ' ').trim().slice(0, 145);
    if (idx === 0) {
      return '<article class="hero-card" onclick="openArt(\'' + n.id + '\')">' +
        (n.cover ? '<img class="hero-img" src="./' + esc(n.cover) + '" alt="' + esc(n.title) + '">' : '') +
        '<div class="hero-body">' +
          '<div class="news-meta"><span class="badge-cat">' + esc(n.catLabel) + '</span><span>' + esc(n.city) + '</span><span>• ' + esc(n.date) + '</span><span class="badge-age">' + esc(n.age || '16+') + '</span></div>' +
          '<h2 class="hero-title">' + esc(n.title) + '</h2>' +
          '<p class="hero-lead">' + esc(lead) + '...</p>' +
        '</div>' +
      '</article>';
    }
    return '<article class="news-card" onclick="openArt(\'' + n.id + '\')">' +
      (n.cover ? '<img class="news-thumb" src="./' + esc(n.cover) + '" alt="' + esc(n.title) + '" loading="lazy">' : '<div class="news-thumb"></div>') +
      '<div>' +
        '<div class="news-meta"><span class="badge-cat">' + esc(n.catLabel) + '</span><span>' + esc(n.city) + '</span><span>• ' + esc(n.date) + '</span><span class="badge-age">' + esc(n.age || '16+') + '</span></div>' +
        '<h3 class="news-title">' + esc(n.title) + '</h3>' +
        '<p class="news-excerpt">' + esc(lead) + '...</p>' +
      '</div>' +
    '</article>';
  }).join('\n');

  const indexHtml = `<!DOCTYPE html>
<html lang="ru" translate="no" class="notranslate">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="yandex-verification" content="0dc10018fffed4cc">
<title>Прим_Дозор — Главные новости Владивостока и Приморского края 24/7 (18+)</title>
<meta name="description" content="Оперативные новости Владивостока, Уссурийска, Находки, Артёма и Приморского края 24/7: ЧП, ЖКХ, дороги, погода, законы РФ.">
<link rel="canonical" href="https://${SITE_HOST}/">
<link rel="manifest" href="/manifest.json">
<link rel="stylesheet" href="/style.css?v=3">
<script src="/config.js"></script>
<script type="text/javascript">(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t),k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","${YM_URL}","ym");ym(114370869,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>
</head>
<body>

<div class="infobar">
  <div class="wrap infobar-inner">
    <div class="infobar-left">
      <span class="live-dot"></span>
      <strong id="clock">Владивосток</strong>
      <select id="city-sel" class="city-select" onchange="selectWeatherCity(this.value)">
        <option value="0">Владивосток</option>
        <option value="1">Большой Камень</option>
        <option value="2">Артём</option>
        <option value="3">Уссурийск</option>
        <option value="4">Находка</option>
      </select>
      <strong id="w-top-now">${esc(w0.now)}</strong>
    </div>
    <div class="infobar-right">
      <span id="rates-top" class="hide-mob">$${esc(rates.usd)} | ¥${esc(rates.cny)}</span>
      <button class="icon-btn" onclick="toggleBigFont()">А+</button>
      <button class="icon-btn" onclick="toggleTheme()" id="theme-btn">🌙</button>
    </div>
  </div>
</div>

<header class="site-header">
  <div class="wrap header-inner">
    <a href="/" class="brand"><span class="brand-mark">ПРИМ_ДОЗОР</span><span class="brand-age">18+</span></a>
    <div class="header-actions">
      <select class="filter-city" onchange="setCity(this.value)">
        <option value="all">Весь край</option>
        <option value="Владивосток">Владивосток</option>
        <option value="Уссурийск">Уссурийск</option>
        <option value="Находка">Находка</option>
        <option value="Артём">Артём</option>
        <option value="Большой Камень">Б. Камень</option>
      </select>
      <button class="btn-cta" onclick="openReport()">+ Прислать ЧП</button>
    </div>
  </div>
</header>

<div class="nav-strip">
  <div class="wrap">
    <nav class="tabs">
      <button class="tab active" onclick="setCat('all', this)">Главное</button>
      <button class="tab" onclick="setCat('chp', this)">ЧП и 112</button>
      <button class="tab" onclick="setCat('city', this)">Город и ЖКХ</button>
      <button class="tab" onclick="setCat('law', this)">Законы и Власть</button>
      <button class="tab" onclick="setCat('svo', this)">СВО</button>
      <button class="tab" onclick="setCat('family', this)">Общество</button>
      <button class="tab" onclick="setCat('sport', this)">Спорт</button>
    </nav>
  </div>
</div>

<div class="wrap">
  <div class="sub-tools">
    <input id="search-input" class="search-input" type="search" placeholder="Поиск по новостям Приморья..." oninput="setSearch(this.value)">
    <div class="soc-pills">
      <a href="https://t.me" target="_blank" rel="noopener" class="soc-pill">✈ Telegram</a>
      <a href="https://max.ru" target="_blank" rel="noopener" class="soc-pill">💬 МАКС</a>
      <a href="https://dzen.ru" target="_blank" rel="noopener" class="soc-pill">🔥 Дзен</a>
      <a href="https://vk.com" target="_blank" rel="noopener" class="soc-pill">🌐 ВК</a>
    </div>
  </div>

  <div class="layout">
    <main id="feed">${ssrCards}</main>

    <aside>
Погода: ${esc(w0.name)}
Сейчас${esc(w0.now)}
Утром${esc(w0.morning)}
Днём${esc(w0.day)}
Вечером${esc(w0.evening)}
Завтра${esc(w0.tomorrow)}
Курсы ЦБ РФ
Доллар США (USD)${esc(rates.usd)} ₽
Евро (EUR)${esc(rates.eur)} ₽
Юань (CNY)${esc(rates.cny)} ₽
100 Иен (JPY)${esc(rates.jpy)} ₽
Отключения ЖКХ

Сети ПриморьяШтатно

Экстренные службы
Единый номер112
ГИБДД Приморья249-09-21
ЕДДС Владивостока222-23-33
Примводоканал200-5-777



ПРИМ_ДОЗОР • 18+
✕ Закрыть



🍪 Мы используем cookie и Яндекс.Метрику (152-ФЗ). Подробнее
ОК
© 2026 Прим_Дозор (18+). Региональный информационный портал Приморского края. Правовая информация и 152-ФЗ
`;
fs.writeFileSync('index.html', indexHtml, 'utf8');
const urls = [
'  https://' + SITE_HOST + '/1.0',
'  https://' + SITE_HOST + '/legal.html0.3'
];
for (const n of news) urls.push('  https://' + SITE_HOST + '/news/' + n.id + '.html0.8');
fs.writeFileSync('sitemap.xml', '\n\n' + urls.join('\n') + '\n', 'utf8');
}
module.exports = { buildSite };
