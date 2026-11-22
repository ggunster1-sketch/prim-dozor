const fs = require('fs');

const HOST = 'primdozor.ru';
const SLASH = String.fromCharCode(47);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const NL = String.fromCharCode(10);

function tag(name, attrs, inner) {
  return LT + name + (attrs ? ' ' + attrs : '') + GT + (inner !== undefined ? inner + LT + SLASH + name + GT : '');
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(news, weather, rates) {
  if (!fs.existsSync('news')) fs.mkdirSync('news', { recursive: true });
  const w0 = weather.at(0) || { name: 'Владивосток', now: '🌤 +1°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' };

  let dir = { outages: [], phones: {}, afisha: [] };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }

  const jkhHtml = (dir.outages || []).map(o =>
    tag('div', 'class="w-row"',
      tag('div', '', tag('strong', '', esc(o.city)) + ' — ' + esc(o.status)) +
      tag('strong', 'style="white-space:nowrap"', esc(o.phone))
    )
  ).join('');

  const afishaHtml = (dir.afisha || []).map(a =>
    tag('div', 'class="w-row" style="flex-direction:column;align-items:flex-start;gap:2px"',
      tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:700"', esc(a.city) + ' • ' + esc(a.date) + ' • ' + esc(a.tag)) +
      tag('div', 'style="font-weight:600"', esc(a.title))
    )
  ).join('');

  for (const p of news) {
    const body = tag('article', 'class="widget" style="padding:24px"',
      tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(p.catLabel)) + tag('span', '', esc(p.city)) + tag('span', '', '• ' + esc(p.date)) + tag('span', 'class="badge-age"', esc(p.age))) +
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
        tag('meta', 'name="description" content="' + esc(p.text.replace(/\s+/g, ' ').slice(0, 160)) + '"') +
        tag('link', 'rel="stylesheet" href="/style.css?v=10"')
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

  const cards = news.map((n, i) => {
    const lead = n.text.replace(/\s+/g, ' ').slice(0, 155);
    const meta = tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(n.catLabel)) + tag('span', '', esc(n.city)) + tag('span', '', '• ' + esc(n.date)) + tag('span', 'class="badge-age"', esc(n.age)));
    const clickAttr = 'data-id="' + n.id + '" onclick="openArt(this.dataset.id)"';
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
  }).join('');

  const tpl = fs.readFileSync('template.html', 'utf8');
  const html = tpl
    .replace(/\{\{W_NOW\}\}/g, esc(w0.now))
    .replace(/\{\{W_M\}\}/g, esc(w0.morning))
    .replace(/\{\{W_D\}\}/g, esc(w0.day))
    .replace(/\{\{W_E\}\}/g, esc(w0.evening))
    .replace(/\{\{W_T\}\}/g, esc(w0.tomorrow))
    .replace(/\{\{USD\}\}/g, esc(rates.usd))
    .replace(/\{\{EUR\}\}/g, esc(rates.eur))
    .replace(/\{\{CNY\}\}/g, esc(rates.cny))
    .replace(/\{\{JPY\}\}/g, esc(rates.jpy))
    .replace('{{JKH_HTML}}', jkhHtml)
    .replace('{{AFISHA_HTML}}', afishaHtml)
    .replace('{{CARDS}}', cards)
    .replace('{{NEWS_JSON}}', JSON.stringify(news))
    .replace('{{WEATHER_JSON}}', JSON.stringify(weather))
    .replace('{{DIR_JSON}}', JSON.stringify(dir));

  fs.writeFileSync('index.html', html, 'utf8');

  const urls = [tag('url', '', tag('loc', '', 'https://' + HOST + '/') + tag('priority', '', '1.0'))];
  for (const n of news) urls.push(tag('url', '', tag('loc', '', 'https://' + HOST + '/news/' + n.id + '.html') + tag('priority', '', '0.8')));
  fs.writeFileSync('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>' + NL + tag('urlset', 'xmlns="http://sitemaps.org"', NL + urls.join(NL) + NL), 'utf8');
}

module.exports = { buildHtml };
