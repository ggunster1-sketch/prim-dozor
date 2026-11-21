const fs = require('fs');
const path = require('path');

const SITE_HOST = 'primdozor.ru';

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
    .map(p => `<p>${esc(p)}</p>`)
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
    `<li><a href="/news/${r.id}.html">${esc(r.title)}</a> <span>(${esc(r.city)} • ${esc(r.age || '16+')})</span></li>`
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
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://yandex.ru","ym");
ym(114370869,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});
</script>
</head>
<body>
<header class="top-bar">
  <div class="wrap top-flex">
    <a href="/" class="logo">ПРИМ_ДОЗОР <span class="age-badge">18+</span></a>
    <a href="/" class="btn-back">← Все новости Приморья</a>
  </div>
</header>
<main class="wrap article-page">
  <article class="article-card">
    <div class="article-meta">
      <span class="badge">${esc(post.catLabel)}</span>
      <span>📍 ${esc(post.city)}</span>
      <span>🕒 ${esc(post.date)}</span>
      <span class="age-pill">${esc(post.age || '16+')}</span>
    </div>
    <h1>${esc(post.title)}</h1>
    ${post.cover ? `<img class="article-cover" src="/${esc(post.cover)}" alt="${esc(post.title)}" loading="eager">` : ''}
    <div class="article-body">${paragraphs}</div>
    ${post.src ? `<p class="article-src">${esc(post.src)}</p>` : ''}
    <div class="article-share">
      <a href="https://t.me" target="_blank" rel="noopener">✈ Подписаться на Telegram ЧП</a>
      <a href="/">🏠 На главную ленту</a>
    </div>
  </article>
  ${related.length ? `<section class="related-box"><h3>Читайте также по Приморью</h3><ul>${relHtml}</ul></section>` : ''}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>© 2026 Прим_Дозор (18+). Информационный портал Приморского края. <a href="/legal.html">Правовая информация и 152-ФЗ</a></p>
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
<meta name="description" content="Оперативные новости Владивостока, Уссурийска, Находки, Артёма и Приморского края 24/7: ЧП, криминал, ЖКХ, отключения, погода, дороги, законы РФ.">
<link rel="canonical" href="https://${SITE_HOST}/">
<link rel="manifest" href="/manifest.json">
<link rel="stylesheet" href="/style.css">
<script src="/config.js"></script>
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://yandex.ru","ym");
ym(114370869,"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});
</script>
</head>
<body>
<div id="app"></div>
<noscript>
  <main class="wrap">
    <h1>Прим_Дозор (18+) — Главные новости Владивостока и Приморского края</h1>
    <ul>${seoList}</ul>
  </main>
</noscript>
<script src="/app.js"></script>
</body>
</html>`;
  fs.writeFileSync('index.html', indexHtml, 'utf8');

  const nowIso = new Date().toISOString();
  const urls = [
    `  <url><loc>https://${SITE_HOST}/</loc><lastmod>${nowIso}</lastmod><changefreq>always</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>https://${SITE_HOST}/legal.html</loc><lastmod>${nowIso}</lastmod><changefreq>monthly</changefreq><priority>0.3</priority></url>`
  ];
  for (const n of news) {
    urls.push(`  <url><loc>https://${SITE_HOST}/news/${n.id}.html</loc><lastmod>${n.isoDate || nowIso}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://sitemaps.org">\n${urls.join('\n')}\n</urlset>`;
  fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
}

module.exports = { buildSite };
