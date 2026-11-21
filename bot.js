const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { runWidgets } = require('./widgets');
const { collectAllNews, stripTags } = require('./scraper');
const { editArticle, normalizeText } = require('./editor');

const TG_TOKEN = (process.env.TG_BOT_TOKEN || '').trim().replace(/^bot/i, '');
const TG_CHAT = (process.env.TG_CHAT_ID || '@prim_dozor').trim();
const MAX_TOKEN = (process.env.MAX_BOT_TOKEN || '').trim();
const MAX_CHAT_ID = (process.env.MAX_CHAT_ID || '').trim();
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim();
const SITE_HOST = 'primdozor.ru';

const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const BR_TAG = LT + 'br' + GT;
const B_OPEN = LT + 'b' + GT;
const B_CLOSE = LT + '/b' + GT;

function buildUrl(parts) { return 'https://' + parts.join('/'); }
function makeLink(url, label) { return LT + 'a href="' + url + '"' + GT + label + LT + '/a' + GT; }

const SITE_URL = buildUrl(['primdozor.ru']);
const ADMIN_URL = buildUrl(['t.me', 'prim_dozor?direct']);
const TG_URL = buildUrl(['t.me', 'prim_dozor']);
const MAX_URL = buildUrl(['max.ru', 'join', 'RyxItD9MEitACdZjmI88YZkBI2ps78Qq3iMW0sBJcoE']);

const TG_FOOTER_HTML =
  '\n\n🌐 Читайте новости на нашем ' + makeLink(SITE_URL, 'сайте') +
  '\n\n🔎 Прим_Дозор — жестко фиксируем то, что другие пытаются скрыть.' +
  '\n\n📲 Вопросы : ' + makeLink(ADMIN_URL, 'связь с админом') +
  '\n\n🤝 Сотрудничество: prim_dozor@internet.ru' +
  '\n\n👉 ' + makeLink(TG_URL, 'telegram прим_дозор') +
  '\n\n👉 ' + makeLink(MAX_URL, 'прим_дозор в Max');

const MAX_FOOTER_MD =
  '\n\n🌐 Читайте новости на нашем [сайте](' + SITE_URL + ')' +
  '\n\n🔎 Прим_Дозор — жестко фиксируем то, что другие пытаются скрыть.' +
  '\n\n📲 Вопросы : [связь с админом](' + ADMIN_URL + ')' +
  '\n\n🤝 Сотрудничество: prim_dozor@internet.ru' +
  '\n\n👉 [telegram прим_дозор](' + TG_URL + ')' +
  '\n\n👉 [прим_дозор в Max](' + MAX_URL + ')';

const PRIM_KEYS = ['примор', 'владивосток', 'уссурийск', 'находк', 'артём', 'артем', 'большой камен', 'большом камн', 'дальневосточ', 'дфо', 'кожемяко', 'шестаков', 'чуркин', 'русский мост', 'золотой мост', 'хасан', 'спасск', 'лесозаводск', 'дальнегорск', 'фокино', 'партизанск', 'арсеньев'];
const UKR_KEYS = ['украин', 'киев', 'зеленск', 'всу', 'донбасс', 'харьков', 'одесс', 'сво'];

async function makeCover(post, imgUrl) {
  if (!fs.existsSync('covers')) fs.mkdirSync('covers', { recursive: true });
  const w = 1200, h = 675;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const colors = { chp: '#dc2626', svo: '#16a34a', law: '#2563eb', city: '#d97706', family: '#0891b2', sport: '#4f46e5' };
  const accent = colors[post.cat] || '#d97706';

  let hasPhoto = false;
  if (imgUrl && imgUrl.startsWith('http')) {
    try {
      const r = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.ok) {
        const img = await loadImage(Buffer.from(await r.arrayBuffer()));
        const sc = Math.max(w / img.width, h / img.height);
        ctx.drawImage(img, (w - img.width * sc) / 2, (h - img.height * sc) / 2, img.width * sc, img.height * sc);
        hasPhoto = true;
      }
    } catch (e) {}
  }

  if (!hasPhoto) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1e2430'); g.addColorStop(1, '#11141a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, h - 250, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,12,16,0.95)');
    ctx.fillStyle = g; ctx.fillRect(0, h - 250, w, 250);
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-22 * Math.PI / 180);
  ctx.font = 'bold 38px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.textAlign = 'center';
  for (let row = -340; row <= 340; row += 170) {
    for (let col = -600; col <= 600; col += 480) ctx.fillText('ПРИМ_ДОЗОР', col, row);
  }
  ctx.restore();

  ctx.fillStyle = accent; ctx.fillRect(36, 30, 235, 44);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('ПРИМ_ДОЗОР', 56, 60);

  ctx.fillStyle = 'rgba(15,18,24,0.88)'; ctx.fillRect(271, 30, 520, 44);
  ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText((post.city || 'ПРИМОРЬЕ').toUpperCase() + '  •  ОПЕРАТИВНАЯ СВОДКА', 289, 59);

  ctx.fillStyle = '#ffffff';
  ctx.font = hasPhoto ? 'bold 30px sans-serif' : 'bold 40px sans-serif';
  const words = (post.title || '').split(' ');
  let line = '', y = hasPhoto ? h - 120 : 230;
  for (const word of words) {
    if (ctx.measureText(line + ' ' + word).width > 1100) {
      ctx.fillText(line, 40, y); line = word; y += hasPhoto ? 40 : 54;
    } else { line = line ? line + ' ' + word : word; }
  }
  if (line && y < h - 45) ctx.fillText(line, 40, y);

  ctx.fillStyle = accent; ctx.fillRect(0, h - 8, w, 8);
  ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 17px sans-serif';
  ctx.fillText('PRIMDOZOR.RU  •  НЕЗАВИСИМЫЙ НАДЗОР ПРИМОРЬЯ 24/7', 40, h - 22);
  ctx.fillStyle = '#fca5a5'; ctx.textAlign = 'right';
  ctx.fillText(post.age || '18+', w - 40, h - 22);

  const file = 'covers/cover_' + post.id + '.png';
  fs.writeFileSync(file, canvas.toBuffer('image/png'));
  return file;
}

async function sendTelegram(post, imgPath) {
  if (!TG_TOKEN) return;
  const raw = stripTags((post.tgText || post.text || '').replace(new RegExp(BR_TAG, 'gi'), '\n'));
  const head = post.catLabel + ' | ' + post.city + ' (' + post.age + ')\n\n' + B_OPEN + post.title + B_CLOSE + '\n\n';
  const limit = 1015 - head.length - TG_FOOTER_HTML.length;
  let body = raw;
  if (body.length > limit) {
    const cut = body.slice(0, limit);
    const dot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
    body = dot > 140 ? cut.slice(0, dot + 1) : cut.trim() + '...';
  }
  const caption = head + body + TG_FOOTER_HTML;

  try {
    if (imgPath && fs.existsSync(imgPath)) {
      const form = new FormData();
      form.append('chat_id', TG_CHAT);
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
      form.append('photo', new Blob([fs.readFileSync(imgPath)], { type: 'image/png' }), 'cover.png');
      const r = await fetch(buildUrl(['api.telegram.org', 'bot' + TG_TOKEN, 'sendPhoto']), { method: 'POST', body: form });
      const d = await r.json();
      if (d.ok) { console.log('В Telegram отправлен 1 единый пост: ' + post.title); return; }
    }
    await fetch(buildUrl(['api.telegram.org', 'bot' + TG_TOKEN, 'sendMessage']), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: caption, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (e) {}
}

async function sendMax(post) {
  if (!MAX_TOKEN || !MAX_CHAT_ID) return;
  const clean = stripTags((post.fullText || post.text || '').replace(new RegExp(BR_TAG, 'gi'), '\n'));
  const text = post.catLabel + ' | ' + post.city + ' (' + post.age + ')\n\n**' + post.title + '**\n\n' + clean + MAX_FOOTER_MD;
  try {
    await fetch(buildUrl(['platform-api.max.ru', 'messages']) + '?chat_id=' + encodeURIComponent(MAX_CHAT_ID), {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': MAX_TOKEN },
      body: JSON.stringify({ text: text, format: 'markdown' })
    });
  } catch (e) {}
}

async function run() {
  await runWidgets();
  let existing = [];
  if (fs.existsSync('news.json')) {
    try { existing = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
  }

  const candidates = await collectAllNews();
  candidates.sort((a, b) => {
    const at = (a.title + ' ' + a.desc).toLowerCase(), bt = (b.title + ' ' + b.desc).toLowerCase();
    const as = (PRIM_KEYS.some(k => at.includes(k)) ? 15 : 0) + (a.regional ? 8 : 0) + (a.official ? 4 : 0);
    const bs = (PRIM_KEYS.some(k => bt.includes(k)) ? 15 : 0) + (b.regional ? 8 : 0) + (b.official ? 4 : 0);
    return bs - as;
  });

  let allowSvo = !existing.slice(0, 4).some(p => p.cat === 'svo' || UKR_KEYS.some(k => ((p.title || '') + (p.text || '')).toLowerCase().includes(k)));
  const blocked = [...new Set(existing.slice(0, 2).map(e => e.cat).filter(Boolean))];
  const newOutages = [];
  let added = 0;

  for (const item of candidates) {
    if (added >= 2) break;
    if (existing.some(e => e.rawTitle === item.title)) continue;
    const isUkr = UKR_KEYS.some(k => (item.title + ' ' + item.desc).toLowerCase().includes(k));
    if (isUkr && !allowSvo) continue;

    const ai = await editArticle(item, blocked, allowSvo);
    if (!ai) continue;

    const vl = new Date(Date.now() + 10 * 3600000);
    const timeStr = 'Сегодня, ' + String(vl.getUTCHours()).padStart(2, '0') + ':' + String(vl.getUTCMinutes()).padStart(2, '0');
    const post = {
      id: Date.now() + added,
      isoDate: new Date().toISOString(),
      rawTitle: item.title,
      cat: ai.cat || 'city',
      catLabel: ai.catLabel || '🏙 Город и ЖКХ',
      city: ai.city || 'Приморье',
      age: ai.age || '16+',
      date: timeStr,
      title: ai.title,
      tldr: ai.tldr,
      text: ai.fullText,
      fullText: ai.fullText,
      tgText: ai.tgText,
      src: (item.official && item.sourceName) ? 'По официальным данным: ' + item.sourceName : ''
    };

    post.cover = await makeCover(post, item.img);
    if (ai.isOutage && ai.outageDistrict && ai.outageStatus) newOutages.push({ district: ai.outageDistrict, status: ai.outageStatus });

    existing.unshift(post);
    blocked.push(post.cat);
    if (post.cat === 'svo' || isUkr) allowSvo = false;

    await sendTelegram(post, post.cover);
    await sendMax(post);
    added++;
  }

  fs.writeFileSync('news.json', JSON.stringify(existing.slice(0, 60), null, 2), 'utf8');
  if (newOutages.length > 0) {
    let out = [];
if (fs.existsSync('outages.json')) { try { out = JSON.parse(fs.readFileSync('outages.json', 'utf8')); } catch (e) {} }
fs.writeFileSync('outages.json', JSON.stringify(newOutages.concat(out).slice(0, 6), null, 2), 'utf8');
}
const xml = LT + '?xml version="1.0" encoding="UTF-8"?' + GT + '\n' + LT + 'urlset xmlns="sitemaps.org"' + GT + '\n  ' + LT + 'url' + GT + LT + 'loc' + GT + 'https://' + SITE_HOST + '/' + LT + '/loc' + GT + LT + 'lastmod' + GT + new Date().toISOString() + LT + '/lastmod' + GT + LT + '/url' + GT + '\n' + LT + '/urlset' + GT;
fs.writeFileSync('sitemap.xml', xml, 'utf8');
if (added > 0 && INDEXNOW_KEY) {
try {
await fetch(buildUrl(['yandex.com', 'indexnow']), {
method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ host: SITE_HOST, key: INDEXNOW_KEY, keyLocation: 'https://' + SITE_HOST + '/' + INDEXNOW_KEY + '.txt', urlList: ['https://' + SITE_HOST + '/'] })
});
} catch (e) {}
}
console.log('Готово. Опубликовано новых материалов: ' + added);
}
run();
