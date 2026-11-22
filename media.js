const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const TOPIC_IMAGES = {
  chp: 'https://unsplash.com',
  city: 'https://unsplash.com',
  law: 'https://unsplash.com',
  svo: 'https://unsplash.com',
  family: 'https://unsplash.com',
  sport: 'https://unsplash.com'
};

function isAdOrSpam(text) {
  const s = String(text || '').toLowerCase();
  const bad = [
    'erid', '#реклама', 'реклама.', 'промокод', 'розыгрыш', 'конкурс', 'скидк',
    'акция в ', 'распродаж', 'дарим ', 'бесплатный массаж', 'омоложен', 'клиника ',
    'салон ', 'записаться по ссылке', 'подписывайся на', 'переходи в канал', 'казино', 'ставк'
  ];
  return bad.some(w => s.includes(w));
}

function updateLiveOutages(posts) {
  if (!fs.existsSync('data/directories.json')) return;
  try {
    const dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8'));
    const outageKeywords = /(отключен|авари|без воды|без света|нет электричеств|отключили отоплен|порыв на сетях|ремонт теплотрасс|водоснабжен|электроснабжен)/i;
    const found = posts.filter(p => outageKeywords.test(p.title + ' ' + p.text)).slice(0, 6);
    if (found.length > 0) {
      dir.outages = found.map(p => ({
        city: p.city || 'Приморье',
        type: p.date,
        status: p.title,
        phone: p.city === 'Уссурийск' ? '32-11-78' : p.city === 'Находка' ? '65-68-01' : p.city === 'Артём' ? '4-25-32' : '222-23-33'
      }));
      fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
    }
  } catch (e) {}
}

async function drawThemedCover(post, imgUrl) {
  if (!fs.existsSync('covers')) fs.mkdirSync('covers', { recursive: true });
  const w = 1200, h = 675;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const srcUrl = (imgUrl && imgUrl.startsWith('http')) ? imgUrl : (TOPIC_IMAGES[post.cat] || TOPIC_IMAGES.city);

  let okImg = false;
  try {
    const r = await fetch(srcUrl);
    if (r.ok) {
      const img = await loadImage(Buffer.from(await r.arrayBuffer()));
      const sc = Math.max(w / img.width, h / img.height);
      ctx.drawImage(img, (w - img.width * sc) / 2, (h - img.height * sc) / 2, img.width * sc, img.height * sc);
      okImg = true;
    }
  } catch (e) {}

  if (!okImg) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(1, '#1e293b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  const grad = ctx.createLinearGradient(0, h - 320, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(9,13,22,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - 320, w, 320);

  ctx.fillStyle = '#c81e1e';
  ctx.fillRect(40, 32, 220, 42);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('ПРИМ_ДОЗОР', 56, 60);

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PRIMDOZOR.RU', w - 245, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  const words = String(post.title || '').split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (ctx.measureText(line + ' ' + word).width > 1100) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);

  let y = h - 65 - (lines.slice(0, 3).length - 1) * 44;
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, 40, y);
    y += 44;
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PRIMDOZOR.RU  •  ' + String(post.city || 'Приморье').toUpperCase() + '  •  ' + (post.age || '16+'), 40, h - 22);

  const file = 'covers/c_' + post.id + '.jpg';
  fs.writeFileSync(file, canvas.toBuffer('image/jpeg', { quality: 0.85 }));
  return file;
}

module.exports = { isAdOrSpam, updateLiveOutages, drawThemedCover };
