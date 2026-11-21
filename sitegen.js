const fs = require('fs');
const path = require('path');

const SITE_HOST = 'primdozor.ru';
const YM_URL = ['https:', '', 'mc.yandex.ru', 'metrika', 'tag.js'].join('/');

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildArticlePage(post, related) {
  const url = 'https://' + SITE_HOST + '/news/' + post.id + '.html';
  const coverUrl = post.cover ? ('https://' + SITE_HOST + '/' + post.cover) : ('https://' + SITE_HOST + '/icon-512.png');
  const desc = (post.tldr || post.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const paragraphs = (post.fullText || post.text || '')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => '<p style="margin-bottom:14px; line-height:1.7;">' + esc(p) + '</p>')
    .join('\n');

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

  const relHtml = related.map(r =>
    '<div class="row"><a href="/news/' + r.id + '.html" style="font-weight:600;">' + esc(r.title) + '</a><span style="color:var(--muted); white-space:nowrap;">' + esc(r.city) + '</span></div>'
  ).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="yandex-verification" content="0dc10018fffed4cc">
<title>${esc(post.title)} — Прим_Дозор (${esc(post.age || '18+')})</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${coverUrl}">
<meta property="og:url" content="${url}">
<link rel="stylesheet" href="/style.css">
<script type="application/ld+json">${jsonLd}</script>
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t),k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","${YM_URL}","ym");
ym(114370869,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});
</script>
</head>
<body>
<header>
  <div class="container head-flex">
    <a href="/" class="logo">ПРИМ_ДОЗОР <span class="age">18+</span></a>
    <a href="/" class="btn">← В ленту</a>
  </div>
</header>
<main class="container" style="margin-top:16px; max-width:820px;">
  <article class="card">
    <div class="meta">
      <span class="cat-tag">${esc(post.catLabel)}</span>
      <span>${esc(post.city)}</span>
      <span>• ${esc(post.date)}</span>
      <span class="age-badge">${esc(post.age || '16+')}</span>
    </div>
    <h1 style="font-size:22px; line-height:1.3; margin:8px 0 14px;">${esc(post.title)}</h1>
    ${post.cover ? '<img class="card-img" src="/' + esc(post.cover) + '" alt="' + esc(post.title) + '">' : ''}
    <div class="tldr"><strong>Главное:</strong><br>${post.tldr || ''}</div>
    <div style="font-size:16px;">${paragraphs}</div>
    ${post.src ? '<p style="font-size:12px; color:var(--muted); margin-top:12px;">' + esc(post.src) + '</p>' : ''}
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">
      <a href="https://t.me/prim_dozor" target="_blank" rel="noopener" class="btn btn-red">✈ Telegram ЧП</a>
      <a href="https://max.ru" target="_blank" rel="noopener" class="btn">💬 МАКС</a>
      <a href="/" class="btn">🏠 На главную</a>
    </div>
  </article>
  ${related.length ? '<section class="box"><h3>Читайте также</h3>' + relHtml + '</section>' : ''}
</main>
<footer>
  <div class="container">
    <p>© 2026 Прим_Дозор (18+). Приморский край. <a href="/legal.html" style="text-decoration:underline;">Правовая информация и 152-ФЗ</a></p>
  </div>
</footer>
</body>
</html>`;
}

function buildSite() {
  let news = [];
  if (fs.existsSync('news.json')) {
    try { news = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
  }

  if (!fs.existsSync('news')) fs.mkdirSync('news', { recursive: true });
  const activeIds = new Set(news.map(n => String(n.id) + '.html'));
  for (const f of fs.readdirSync('news')) {
    if (!activeIds.has(f)) {
      try { fs.unlinkSync(path.join('news', f)); } catch (e) {}
    }
  }

  for (let i = 0; i < news.length; i++) {
    const post = news[i];
    const related = news.filter((x, idx) => idx !== i && (x.cat === post.cat || x.city === post.city)).slice(0, 4);
    fs.writeFileSync('news/' + post.id + '.html', buildArticlePage(post, related), 'utf8');
  }

  const seoList = news.slice(0, 20).map(n =>
    '<li><a href="/news/' + n.id + '.html">' + esc(n.title) + '</a> — ' + esc(n.city) + '</li>'
  ).join('');

  const indexHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="yandex-verification" content="0dc10018fffed4cc">
<title>Прим_Дозор — Новости Владивостока и Приморского края 24/7 (18+)</title>
<meta name="description" content="Главные новости Владивостока, Уссурийска, Находки, Артёма и Приморского края 24/7: ЧП, ЖКХ, дороги, погода, законы РФ.">
<link rel="canonical" href="https://${SITE_HOST}/">
<link rel="manifest" href="/manifest.json">
<link rel="stylesheet" href="/style.css">
<script src="/config.js"></script>
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t),k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","${YM_URL}","ym");
ym(114370869,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});
</script>
</head>
<body>

<div class="top-bar">
  <div class="container top-flex">
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="live-pill">● <span id="clock">--:--</span></span>
      <select id="city-sel" onchange="selectWeatherCity(this.value)" aria-label="Город погоды">
        <option value="0">Владивосток</option>
        <option value="1">Б. Камень</option>
        <option value="2">Артём</option>
        <option value="3">Уссурийск</option>
        <option value="4">Находка</option>
      </select>
      <span id="w-top-now" style="font-weight:700; color:#fff;">--°C</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <span id="rates-top" class="hide-mob">$-- | ¥--</span>
      <button onclick="toggleBigFont()" style="color:#fff; font-weight:700; border:1px solid #4b5563; padding:1px 6px; border-radius:4px;">А+</button>
      <button onclick="toggleTheme()" id="theme-btn" style="color:#fff;">🌙</button>
    </div>
  </div>
</div>

<header>
  <div class="container head-flex">
    <a href="/" class="logo">ПРИМ_ДОЗОР <span class="age">18+</span></a>
    <div class="head-controls">
      <select onchange="setCity(this.value)" aria-label="Город" style="background:var(--bg); color:var(--text); border:1px solid var(--border); padding:6px 8px;">
        <option value="all">Весь край</option>
        <option value="Владивосток">Владивосток</option>
        <option value="Уссурийск">Уссурийск</option>
        <option value="Находка">Находка</option>
        <option value="Артём">Артём</option>
        <option value="Большой Камень">Б. Камень</option>
      </select>
      <button class="btn btn-red" onclick="openReport()">+ ЧП</button>
    </div>
  </div>
</header>

<div class="search-bar">
  <div class="container">
    <input id="search-input" class="input" type="search" placeholder="Поиск по новостям Приморья..." oninput="setSearch(this.value)">
  </div>
</div>

<div class="container">
  <div class="soc-strip">
    <a href="https://t.me/prim_dozor" target="_blank" rel="noopener" class="soc-chip">✈ Telegram</a>
    <a href="https://max.ru" target="_blank" rel="noopener" class="soc-chip">💬 МАКС</a>
    <a href="https://dzen.ru" target="_blank" rel="noopener" class="soc-chip">🔥 Дзен</a>
    <a href="https://vk.com" target="_blank" rel="noopener" class="soc-chip">🌐 ВК</a>
  </div>

  <nav class="tabs">
    <button class="tab active" onclick="setCat('all', this)">Главное</button>
    <button class="tab" onclick="setCat('chp', this)">🚨 ЧП</button>
    <button class="tab" onclick="setCat('city', this)">🏙 Город и ЖКХ</button>
    <button class="tab" onclick="setCat('law', this)">🏛 Власть</button>
    <button class="tab" onclick="setCat('svo', this)">🇷🇺 СВО</button>
    <button class="tab" onclick="setCat('family', this)">👨‍👩‍👧 Общество</button>
    <button class="tab" onclick="setCat('sport', this)">🏆 Спорт</button>
  </nav>

  <div class="grid">
    <aside class="side-left">
      <div class="box">
        <h3>Погода: <span id="w-city-name">Владивосток</span></h3>
        <div class="row"><span>Сейчас</span><strong id="w-now">--°C</strong></div>
        <div class="row"><span>Утром</span><strong id="w-morning">--°C</strong></div>
        <div class="row"><span>Днём</span><strong id="w-day">--°C</strong></div>
        <div class="row"><span>Вечером</span><strong id="w-evening">--°C</strong></div>
        <div class="row"><span>Завтра</span><strong id="w-tomorrow">--°C</strong></div>
Отключения ЖКХ

Сети краяШтатно


Загрузка ленты...
Курсы ЦБ РФ
USD-- ₽
EUR-- ₽
CNY-- ₽
100 JPY-- ₽
Экстренные службы
Служба спасения112
ГИБДД Приморья231-09-08
ЕДДС Владивостока222-23-33
Примводоканал200-5-777
О портале (18+)

Возрастная маркировка 18+ (436-ФЗ). Информационный портал Приморского края.

Политика 152-ФЗ и правила →




ПРИМ_ДОЗОР • 18+
✕ Закрыть



🍪 Мы используем cookie и Яндекс.Метрику (152-ФЗ). Подробнее
ОК
© 2026 Прим_Дозор (18+). Приморский край. Правовая информация и 152-ФЗ

${seoList}


`;
fs.writeFileSync('index.html', indexHtml, 'utf8');
const nowIso = new Date().toISOString();
const urls = [
'  https://' + SITE_HOST + '/' + nowIso + 'always1.0',
'  https://' + SITE_HOST + '/legal.html' + nowIso + 'monthly0.3'
];
for (const n of news) {
urls.push('  https://' + SITE_HOST + '/news/' + n.id + '.html' + (n.isoDate || nowIso) + 'daily0.8');
}
const sitemap = '\n\n' + urls.join('\n') + '\n';
fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
}
module.exports = { buildSite };
