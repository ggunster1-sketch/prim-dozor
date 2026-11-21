const fs = require('fs');

const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);

function stripTags(str) {
  return String(str || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(new RegExp(LT + '[^' + GT + ']+' + GT, 'g'), ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAdOrSpam(text) {
  const low = text.toLowerCase();
  return (
    low.includes('erid') ||
    low.includes('#реклама') ||
    low.includes('реклама.') ||
    low.includes('розыгрыш') ||
    low.includes('промокод') ||
    low.includes('подписывайся на наш')
  );
}

async function fetchTelegram(tgList) {
  const out = [];
  let state = {};
  if (fs.existsSync('tg_state.json')) {
    try { state = JSON.parse(fs.readFileSync('tg_state.json', 'utf8')); } catch (e) {}
  }

  let okPages = 0;
  for (const src of tgList) {
    try {
      const url = 'https://t.me' + src.id;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes('tgme_widget_message_wrap')) okPages++;

      const blocks = html.split('tgme_widget_message_wrap').slice(-6);
      let maxPostNum = state[src.id] || 0;

      for (const b of blocks) {
        const postM = b.match(/data-post="[^/]+\/(\d+)"/i);
        const postNum = postM ? Number(postM.at(1)) : 0;
        if (postNum && state[src.id] && postNum <= state[src.id]) continue;
        if (postNum > maxPostNum) maxPostNum = postNum;

        const txtIdx = b.indexOf('tgme_widget_message_text');
        if (txtIdx === -1) continue;
        const startContent = b.indexOf(GT, txtIdx);
        const endContent = b.indexOf(LT + '/div' + GT, startContent);
        if (startContent === -1 || endContent === -1) continue;

        const clean = stripTags(b.slice(startContent + 1, endContent));
        if (clean.length < 70 || isAdOrSpam(clean)) continue;

        const imgM = b.match(/background-image:url\('(https?:\/\/[^']+)'\)/i);
        const firstSentence = clean.split(/[.!\n]/).at(0) || clean;
        out.push({
          title: firstSentence.trim().slice(0, 115),
          desc: clean.slice(0, 2600),
          link: postNum ? `https://t.me{src.id}/${postNum}` : '',
          img: (imgM && imgM.at(1)) ? imgM.at(1) : '',
          regional: true,
          official: Boolean(src.official),
          sourceName: src.name
        });
      }
      if (maxPostNum > 0) state[src.id] = maxPostNum;
    } catch (e) {}
  }

  fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
  console.log('Telegram каналов доступно: ' + okPages + ', постов собрано: ' + out.length);
  return out;
}

async function fetchFeeds(rssList) {
  const out = [];
  for (const f of rssList) {
    try {
      const res = await fetch(f.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) {
        console.log('RSS недоступен (' + res.status + '): ' + f.name);
        continue;
      }
      const xml = await res.text();
      const items = xml.split(/<item[\s>]/i).slice(1, 12);

      for (const rawItem of items) {
        const titleM = rawItem.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const descM = rawItem.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        const linkM = rawItem.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const encM = rawItem.match(/<enclosure[^>]+url=["']([^"']+)["']/i);

        const title = stripTags(titleM ? titleM.at(1) : '');
        const desc = stripTags(descM ? descM.at(1) : '') || title;
        if (!title || title.length < 25 || isAdOrSpam(title + ' ' + desc)) continue;

        out.push({
          title: title,
          desc: (title + '. ' + desc).slice(0, 2600),
          link: linkM ? stripTags(linkM.at(1)) : '',
          img: encM ? encM.at(1) : '',
          regional: Boolean(f.regional),
          official: Boolean(f.official),
          sourceName: f.name || ''
        });
      }
    } catch (e) {
      console.log('RSS ошибка (' + f.name + '): ' + e.message);
    }
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
