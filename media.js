const fs = require('fs');
const { createCanvas } = require('canvas');

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
    const outageKeywords = /(отключен|без воды|без света|без электричеств|нет электричеств|отключили отоплен|нет отоплен|порыв на сетях|прорыв труб|ремонт теплотрасс|водоснабжен|электроснабжен|авария на сетях|авария на лэп|авария на подстанц)/i;
    const excludeDtp = /(дтп|столкновени|перевернул|наезд|автомобил|машин|трасс|дорог|гибдд|парковк|тротуар)/i;
    const found = posts
      .filter(p => outageKeywords.test(p.title + ' ' + p.text) && !excludeDtp.test(p.title))
      .slice(0, 6);
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
function detectTheme(post) {
  const s = ((post.title || '') + ' ' + (post.text || '')).toLowerCase();
  if (/(дтп|авари|столкновен|наезд|автомобил|машин|трасс|дорог|гибдд|мост)/i.test(s)) return { c1: '#1e1b4b', c2: '#7f1d1d', glow: '#ef4444', tag: 'ДОРОГИ И ДТП' };
  if (/(пожар|возгоран|огонь|мчс|спасател|дым)/i.test(s)) return { c1: '#450a0a', c2: '#9a3412', glow: '#f97316', tag: 'ЭКСТРЕННО • МЧС' };
  if (/(полиц|мвд|суд|прокурат|задержан|уголовн|краж|разб|мошенн|следств|ск )/i.test(s)) return { c1: '#0f172a', c2: '#1e3a8a', glow: '#3b82f6', tag: 'КРИМИНАЛ И ЗАКОН' };
  if (/(жкх|отключен|вод[аыу]|свет|электричеств|отоплен|теплотрасс|ремонт)/i.test(s)) return { c1: '#042f2e', c2: '#115e59', glow: '#14b8a6', tag: 'ГОРОД И ЖКХ' };
  if (/(погод|снег|голол|шторм|ветер|циклон|температур|мороз|дожд)/i.test(s)) return { c1: '#082f49', c2: '#0369a1', glow: '#38bdf8', tag: 'ПОГОДА В ПРИМОРЬЕ' };
  if (post.cat === 'svo') return { c1: '#14532d', c2: '#1f2937', glow: '#22c55e', tag: 'СВО И ЗАЩИТА' };
  if (post.cat === 'sport') return { c1: '#311042', c2: '#4c1d95', glow: '#a855f7', tag: 'СПОРТ И СОБЫТИЯ' };
  return { c1: '#0f172a', c2: '#1e293b', glow: '#eab308', tag: String(post.catLabel || 'НОВОСТИ ПРИМОРЬЯ').toUpperCase() };
}

function drawArtBackdrop(ctx, w, h, th) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, th.c1);
  g.addColorStop(1, th.c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Световое пятно и графическая сетка портала
  const rad = ctx.createRadialGradient(w * 0.78, h * 0.28, 20, w * 0.78, h * 0.28, 460);
  rad.addColorStop(0, th.glow + '55');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Стилизованный силуэт моста / сопок Приморья справа
  ctx.strokeStyle = th.glow + '88';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(680, 420); ctx.lineTo(840, 120); ctx.lineTo(1000, 420);
  ctx.moveTo(760, 270); ctx.lineTo(920, 270);
  ctx.stroke();
}
async function drawThemedCover(post) {
  if (!fs.existsSync('covers')) fs.mkdirSync('covers', { recursive: true });
  const w = 1200, h = 675;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const th = detectTheme(post);

  drawArtBackdrop(ctx, w, h, th);

  // Полупрозрачный диагональный водяной знак по центру
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.22);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.font = 'bold 74px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ПРИМ_ДОЗОР • PRIMDOZOR.RU', 0, 15);
  ctx.restore();

  const grad = ctx.createLinearGradient(0, h - 340, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(9,13,22,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - 340, w, 340);

  ctx.fillStyle = '#c81e1e';
  ctx.fillRect(40, 32, 225, 44);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('ПРИМ_ДОЗОР', 56, 61);

  ctx.fillStyle = th.glow;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(th.tag, 285, 61);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PRIMDOZOR.RU', w - 235, 61);

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

  let y = h - 70 - (lines.slice(0, 3).length - 1) * 44;
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, 40, y);
    y += 44;
  }

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PRIMDOZOR.RU  •  ' + String(post.city || 'Приморский край').toUpperCase() + '  •  ' + (post.age || '18+'), 40, h - 22);

  const file = 'covers/c_' + post.id + '.jpg';
  fs.writeFileSync(file, canvas.toBuffer('image/jpeg', { quality: 0.88 }));
  return file;
}

module.exports = { isAdOrSpam, updateLiveOutages, drawThemedCover };
