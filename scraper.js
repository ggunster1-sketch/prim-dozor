const fs = require('fs');

const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);

function stripTags(str) {
  return (str || '').replace(new RegExp(LT + '[^' + GT + ']+' + GT, 'g'), ' ').replace(/\s+/g, ' ').trim();
}

async function fetchTelegram(tgList) {
  const out = [];
  const msgRe = new RegExp('tgme_widget_message_text[^' + GT + ']*' + GT + '([\\s\\S]*?)' + LT + '/div' + GT, 'i');
  for (const src of tgList) {
    try {
      const url = 'https://' + ['t.me', 's', src.id].join('/');
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://' + ['t.me', src.id].join('/')
        }
      });
      if (!res.ok) continue;
      const html = await res.text();
      for (const b of html.split('tgme_widget_message_wrap').slice(-3)) {
        const m = b.match(msgRe);
        if (!m) continue;
        const clean = stripTags(m.at(1));
        if (clean.length < 95 || clean.includes('erid') || clean.includes('#реклама')) continue;
        const imgM = b.match(/background-image:url\('(https?:\/\/[^']+)'\)/i);
        out.push({
          title: clean.split(/[.!\n]/).at(0).trim().slice(0, 110),
          desc: clean.slice(0, 2600),
          link: '',
          img: imgM ? imgM.at(1) : '',
          regional: true,
          official: Boolean(src.official),
          sourceName: src.name
        });
      }
    } catch (e) {}
  }
  console.log('Из пабликов и ведомств Приморья собрано: ' + out.length);
  return out;
}

async function fetchFeeds(rssList) {
  const out = [];
  for (const f of rssList) {
    try {
      const proxy = 'https://' + ['://rss2json.com', 'v1', 'api.json'].join('/') + '?rss_url=' + encodeURIComponent(f.url);
      const res = await fetch(proxy);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.items)) {
        for (const it of data.items.slice(0, 10)) {
          const title = stripTags(it.title || '');
          const desc = stripTags(it.description || it.content || '');
          if (!title || desc.includes('erid')) continue;
          out.push({
            title: title,
            desc: desc.slice(0, 2600),
            link: it.link || '',
            img: (it.enclosure && it.enclosure.link) ? it.enclosure.link : (it.thumbnail || ''),
            regional: Boolean(f.regional),
            official: false,
            sourceName: ''
          });
        }
      }
    } catch (e) {}
  }
  console.log('Из RSS-лент собрано: ' + out.length);
  return out;
}

async function collectAllNews() {
  const cfg = JSON.parse(fs.readFileSync('sources.json', 'utf8'));
  const tgItems = await fetchTelegram(cfg.tg || []);
  const rssItems = await fetchFeeds(cfg.rss || []);
  return tgItems.concat(rssItems);
}

module.exports = { collectAllNews, stripTags };
