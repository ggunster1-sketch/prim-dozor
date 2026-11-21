const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { runWidgets } = require('./widgets');
const { collectAllNews } = require('./scraper');
const { editArticle } = require('./editor');
const { buildSite } = require('./sitegen');

const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim();
const TG_BOT_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const TG_CHAT_ID = (process.env.TG_CHAT_ID || '').trim();
const MAX_BOT_TOKEN = (process.env.MAX_BOT_TOKEN || '').trim();
const MAX_CHAT_ID = (process.env.MAX_CHAT_ID || '').trim();

const SITE_HOST = 'primdozor.ru';
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);

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
    const g = ctx.createLinearGradient(0, h - 270, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,12,16,0.96)');
    ctx.fillStyle = g; ctx.fillRect(0, h - 270, w, 270);
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
  let line = '', y = hasPhoto ? h - 125 : 230;
  for (const word of words) {
    if (ctx.measureText(line + ' ' + word).width > 1100) {
      ctx.fillText(line, 40, y); line = word; y += hasPhoto ? 40 : 54;
    } else { line = line ? line + ' ' + word : word; }
  }
  if (line && y < h - 45) ctx.fillText(line, 40, y);

  ctx.fillStyle = accent; ctx.fillRect(0, h - 8, w, 8);
  ctx.fillStyle = '#cbd5e1'; ctx.font = 'bold 17px sans-serif';
  ctx.fillText('PRIMDOZOR.RU  •  ОПЕРАТИВНАЯ ЛЕНТА ПРИМОРЬЯ 24/7', 40, h - 22);
  ctx.fillStyle = '#fca5a5'; ctx.textAlign = 'right';
  ctx.fillText(post.age || '18+', w - 40, h - 22);

  const file = 'covers/cover_' + post.id + '.jpg';
  fs.writeFileSync(file, canvas.toBuffer('image/jpeg', { quality: 0.84 }));
  return file;
}

async function publishToSocials(post) {
  const articleUrl = 'https://' + SITE_HOST + '/?news=' + post.id;
  const caption = `⚡ ${post.title} (${post.age})\n\n${post.tldr || ''}\n\n📍 ${post.city} | ${post.catLabel}\n👉 Подробности: ${articleUrl}`;

  if (TG_BOT_TOKEN && TG_CHAT_ID) {
    try {
      const form = new FormData();
      form.append('chat_id', TG_CHAT_ID);
      form.append('caption', caption.slice(0, 1020));
      form.append('photo', new Blob([fs.readFileSync(post.cover)], { type: 'image/jpeg' }), 'cover.jpg');
      await fetch(`https://telegram.org{TG_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form });
    } catch (e) {}
  }

  if (MAX_BOT_TOKEN && MAX_CHAT_ID) {
    try {
      await fetch(`https://max.ru{MAX_BOT_TOKEN}&chat_id=${MAX_CHAT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: caption })
      });
    } catch (e) {}
  }
}

function cleanupOldCovers(activePosts) {
  if (!fs.existsSync('covers')) return;
  const activeFiles = new Set(activePosts.map(p => path.basename(p.cover || '')));
  for (const file of fs.readdirSync('covers')) {
    if (!activeFiles.has(file)) {
      try { fs.unlinkSync(path.join('covers', file)); } catch (e) {}
    }
  }
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
  const addedUrls = ['https://' + SITE_HOST + '/'];
  let added = 0;

  for (const item of candidates) {
    if (added >= 4) break;
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
      src: (item.official && item.sourceName) ? 'По официальным данным: ' + item.sourceName : ''
    };

    post.cover = await makeCover(post, item.img);
    if (ai.isOutage && ai.outageDistrict && ai.outageStatus) {
      newOutages.push({ district: ai.outageDistrict, status: ai.outageStatus });
    }

    existing.unshift(post);
    blocked.push(post.cat);
    if (post.cat === 'svo' || isUkr) allowSvo = false;
    addedUrls.push('https://' + SITE_HOST + '/news/' + post.id + '.html');
    await publishToSocials(post);
    added++;
  }

  const trimmed = existing.slice(0, 80);
  fs.writeFileSync('news.json', JSON.stringify(trimmed, null, 2), 'utf8');
  cleanupOldCovers(trimmed);

  if (newOutages.length > 0) {
    let out = [];
    if (fs.existsSync('outages.json')) { try { out = JSON.parse(fs.readFileSync('outages.json', 'utf8')); } catch (e) {} }
    fs.writeFileSync('outages.json', JSON.stringify(newOutages.concat(out).slice(0, 6), null, 2), 'utf8');
  }

  await buildSite();

  if (added > 0 && INDEXNOW_KEY) {
    try {
      await fetch('https://yandex.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: SITE_HOST,
          key: INDEXNOW_KEY,
          keyLocation: 'https://' + SITE_HOST + '/' + INDEXNOW_KEY + '.txt',
          urlList: addedUrls
        })
      });
    } catch (e) {}
  }
  console.log('Готово. На сайт добавлено полных статей: ' + added);
}

run();
