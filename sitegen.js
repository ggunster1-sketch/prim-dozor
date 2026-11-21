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
  const url = `https://${SITE_HOST}/news/${post.id}.html`;
  const coverUrl = post.cover ? `https://${SITE_HOST}/${post.cover}` : `https://${SITE_HOST}/icon-512.png`;
  const desc = (post.tldr || post.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const paragraphs = (post.fullText || post.text || '')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin-bottom:14px; line-height:1.75;">${esc(p)}</p>`)
    .join('\n');

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    datePublished: post.isoDate || new Date().toISOString(),
    dateModified: post.isoDate || new Date().toISOString(),
    image: [coverUrl],
    author: { '@type': 'Organization', name: 'Прим_Дозор', url: `https://${SITE_HOST}/` },
    publisher: { '@type': 'Organization', name: 'Прим_Дозор', url: `https://${SITE_HOST}/` },
    description: desc,
    mainEntityOfPage: url
  });

  const relHtml = related.map(r =>
    `<div class="row"><a href="/news/${r.id}.html" style="font-weight:600;">${esc(r.title)}</a><span style="color:var(--muted); white-space:nowrap;">${esc(r.city)}</span></div>`
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
    <a href="/" class="btn">← Все новости Приморья</a>
  </div>
</header>
<main class="container" style="margin-top:20px; max-width:860px;">
  <article class="card">
    <div class="meta">
      <span class="cat-tag">${esc(post.catLabel)}</span>
      <span>📍 ${esc(post.city)}</span>
      <span>🕒 ${esc(post.date)}</span>
      <span class="age-badge">${esc(post.age || '16+')}</span>
    </div>
    <h1 style="font-size:26px; line-height:1.3; margin:12px 0 16px;">${esc(post.title)}</h1>
    ${post.cover ? `<img src="/${esc(post.cover)}" alt="${esc(post.title)}" style="width:100%; border-radius:8px; margin-bottom:16px; border:1px solid var(--border);">` : ''}
    <div class="tldr"><strong>Главное за 10 секунд:</strong><br>${post.tldr || ''}</div>
    <div style="font-size:17px;">${paragraphs}</div>
    ${post.src ? `<p style="font-size:13px; color:var(--muted); margin-top:14px;">${esc(post.src)}</p>` : ''}
    <div class="article-socials">
      <p style="font-weight:700; color:var(--text); margin-bottom:10px;">📲 Оперативные сводки Приморья 24/7:</p>
      <div style="display:flex; flex-wrap:wrap; gap:10px;">
        <a href="https://t.me/prim_dozor" target="_blank" rel="noopener" class="btn btn-red">✈ Telegram ЧП</a>
        <a href="https://max.ru" target="_blank" rel="noopener" class="btn">💬 Канал в МАКС</a>
        <a href="/" class="btn">🏠 На главную ленту</a>
      </div>
    </div>
  </article>
  ${related.length ? `<section class="box"><h3>Читайте также по Приморью</h3>${relHtml}</section>` : ''}
</main>
<footer>
  <div class="container">
    <p>© 2026 Прим_Дозор (18+). Региональный информационный портал Приморского края. <a href="/legal.html" style="text-decoration:underline;">Правовая информация и 152-ФЗ</a></p>
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
    const related = news.filter((x, idx) => idx !== i && (x.cat === post.cat || x.city === post.city)).slice(0, 5);
    fs.writeFileSync(`news/${post.id}.html`, buildArticlePage(post, related), 'utf8');
  }

  const seoList = news.slice(0, 25).map(n =>
    `<li><a href="/news/${n.id}.html">${esc(n.title)}</a> — ${esc(n.city)} (${esc(n.age || '16+')})</li>`
  ).join('');

  const indexHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="yandex-verification" content="0dc10018fffed4cc">
<title>Прим_Дозор — Главные новости Владивостока, Приморья и России 24/7 (18+)</title>
<meta name="description" content="Оперативные новости Владивостока, Уссурийска, Находки, Артёма, Большого Камня и Приморского края 24/7: ЧП, криминал, ЖКХ, отключения, погода, дороги, законы РФ.">
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
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <span class="live-pill">● ВЛАДИВОСТОК <span id="clock">--:--</span></span>
      <select id="city-sel" onchange="selectWeatherCity(this.value)" aria-label="Город погоды">
        <option value="0">Владивосток</option>
        <option value="1">Большой Камень</option>
        <option value="2">Артём</option>
        <option value="3">Уссурийск</option>
        <option value="4">Находка</option>
      </select>
      <span id="w-top-now" style="font-weight:700; color:#fff;">🌤 --°C</span>
    </div>
    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
      <span id="rates-top">💵 -- ₽ | 🇨🇳 -- ₽</span>
      <button onclick="toggleBigFont()" style="color:#fff; font-weight:700; border:1px solid #475569; padding:1px 7px; border-radius:4px;">А+</button>
      <button onclick="toggleTheme()" id="theme-btn" style="color:#fff;">🌙 Ночь</button>
    </div>
  </div>
</div>

<header>
  <div class="container head-flex">
    <a href="/" class="logo">ПРИМ_ДОЗОР <span class="age">18+</span></a>
    <input id="search-input" class="input" type="search" placeholder="🔍 Поиск по новостям Приморья..." oninput="setSearch(this.value)" style="max-width:340px; margin-bottom:0;">
    <div style="display:flex; gap:8px; align-items:center;">
      <select onchange="setCity(this.value)" aria-label="Фильтр по городу" style="background:var(--bg); color:var(--text); border:1px solid var(--border); padding:8px 10px;">
        <option value="all">📍 Весь край</option>
        <option value="Владивосток">Владивосток</option>
        <option value="Уссурийск">Уссурийск</option>
        <option value="Находка">Находка</option>
        <option value="Артём">Артём</option>
        <option value="Большой Камень">Большой Камень</option>
        <option value="Арсеньев">Арсеньев</option>
      </select>
      <button class="btn btn-red" onclick="openReport()">🚨 Прислать ЧП</button>
    </div>
  </div>
</header>

<div class="ticker">
  <div class="container">
    <span class="ticker-tag" id="holiday-badge">⚡ МОЛНИЯ 24/7</span>
    <span id="holiday-ticker">Оперативный мониторинг дорог, мостов, ЖКХ и происшествий Приморского края в реальном времени.</span>
  </div>
</div>

<div class="container">
  <div class="socials">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <strong style="font-size:14px;">📲 Читайте «Прим_Дозор» там, где удобно (сводки без задержек):</strong>
      <span style="font-size:12px; color:var(--muted);">18+ • Приморский край</span>
    </div>
    <div class="soc-grid" id="soc-links-grid">
      <a href="https://t.me/prim_dozor" target="_blank" rel="noopener" class="soc-link">✈ Telegram ЧП</a>
      <a href="https://max.ru" target="_blank" rel="noopener" class="soc-link">💬 Канал в МАКС</a>
      <a href="https://dzen.ru" target="_blank" rel="noopener" class="soc-link">🔥 Яндекс Дзен</a>
      <a href="https://vk.com" target="_blank" rel="noopener" class="soc-link">🌐 ВКонтакте</a>
    </div>
  </div>

  <nav class="tabs">
🔥 Главное
🚨 ЧП и 112
🏙 Город и ЖКХ
🏛 Законы и Власть
🇷🇺 СВО и Защитники
👨‍👩‍👧 Семья и Медицина
🏆 Спорт и Афиша
🌤 Погода: Владивосток

Сейчас--°C
Утром--°C
Днём--°C
Вечером--°C
Завтра--°C

⚡ Отключения ЖКХ

Сети краяШтатно

🍂 Сезон в Приморье
Контроль котельных, расчистки дорог и коммунальной обстановки в городах края.

Загрузка оперативной ленты Приморья...
💱 Курсы ЦБ РФ

🇺🇸 Доллар США (USD)-- ₽
🇪🇺 Евро (EUR)-- ₽
🇨🇳 Юань (CNY)-- ₽
🇯🇵 100 Иен (JPY)-- ₽

📞 Экстренные службы
Единый номер спасения112
Дежурная часть ГИБДД231-09-08
ЕДДС Владивостока (ЖКХ)222-23-33
Примводоканал (аварии)200-5-777
⚖ Редакция и Закон

Возрастная категория 18+ (436-ФЗ). Материалы подготовлены на основе открытых источников и официальных сводок ведомств Приморского края.


Политика 152-ФЗ и правила →




ПРИМ_ДОЗОР • 18+
✕ Закрыть



🍪 Мы используем файлы cookie и Яндекс.Метрику для быстрой работы портала (152-ФЗ). Продолжая просмотр, вы соглашаетесь с Политикой конфиденциальности.
Понятно
© 2026 Прим_Дозор (18+). Региональный информационный портал Приморского края. Правовая информация и 152-ФЗ

Прим_Дозор (18+) — Главные новости Владивостока и Приморского края
${seoList}




`;
fs.writeFileSync('index.html', indexHtml, 'utf8');
  const nowIso = new Date().toISOString();
  const urls = [
    '  <url><loc>https://' + SITE_HOST + '/</loc><lastmod>' + nowIso + '</lastmod><changefreq>always</changefreq><priority>1.0</priority></url>',
    '  <url><loc>https://' + SITE_HOST + '/legal.html</loc><lastmod>' + nowIso + '</lastmod><changefreq>monthly</changefreq><priority>0.3</priority></url>'
  ];
  for (const n of news) {
    urls.push('  <url><loc>https://' + SITE_HOST + '/news/' + n.id + '.html</loc><lastmod>' + (n.isoDate || nowIso) + '</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>');
  }

  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://sitemaps.org">\n' + urls.join('\n') + '\n</urlset>';
  fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
}

module.exports = { buildSite };
