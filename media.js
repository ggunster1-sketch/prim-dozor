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

function detectJkhResource(text) {
  const s = String(text || '').toLowerCase();
  if (/(электроснабж|электричеств|без света|отключен.*свет|подстанц|лэп|впэс|дрск)/i.test(s)) return 'Свет';
  if (/(водоснабж|без воды|холодн.*вод|порыв.*вод|примводоканал|водоканал)/i.test(s)) return 'Вода';
  if (/(отоплен|теплоснабж|горяч.*вод|гвс|теплотрасс|без тепла|дгк)/i.test(s)) return 'Тепло';
  return 'ЖКХ';
}

function detectJkhCity(text) {
  const s = String(text || '').toLowerCase();
  if (/уссурийск/i.test(s)) return { city: 'Уссурийск', phone: '+7 (4234) 32-11-78' };
  if (/находк/i.test(s)) return { city: 'Находка', phone: '+7 (4236) 65-68-01' };
  if (/арт[её]м/i.test(s)) return { city: 'Артём', phone: '+7 (42337) 4-25-32' };
  if (/больш(ой|ом)\s*камн/i.test(s)) return { city: 'Большой Камень', phone: '+7 (42335) 5-11-12' };
  if (/арсеньев/i.test(s)) return { city: 'Арсеньев', phone: '+7 (42361) 4-22-44' };
  if (/спасск/i.test(s)) return { city: 'Спасск-Дальний', phone: '+7 (42352) 2-32-30' };
  if (/партизанск/i.test(s)) return { city: 'Партизанск', phone: '+7 (42363) 6-24-34' };
  if (/дальнегорск/i.test(s)) return { city: 'Дальнегорск', phone: '+7 (42373) 3-21-51' };
  return { city: 'Владивосток', phone: '+7 (423) 222-23-33' };
}
function updateLiveOutages(rawItems) {
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  let dir = { outages: [], phones: {}, afisha: [] };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }
  const outageKeywords = /(отключен|без воды|без света|без электричеств|нет электричеств|отключили отоплен|нет отоплен|порыв на сетях|прорыв труб|ремонт теплотрасс|водоснабжен|электроснабжен|авария на сетях|авария на лэп|авария на подстанц|плановые работы.*ул\.|ограничение.*водоснабж|ограничение.*электроснабж)/i;
  const excludeDtp = /(дтп|столкновени|перевернул|наезд|автомобил|машин|трасс|дорог|гибдд|парковк|тротуар)/i;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const fresh = [];

  for (const it of items) {
    const full = String((it.title || '') + ' ' + (it.text || it.raw || '')).replace(/\s+/g, ' ').trim();
    if (full.length < 25 || !outageKeywords.test(full) || excludeDtp.test(full)) continue;
    const resType = detectJkhResource(full);
    const loc = detectJkhCity(full);
    const preview = full.slice(0, 145) + (full.length > 145 ? '...' : '');
    if (!fresh.some(x => x.status.slice(0, 45) === preview.slice(0, 45))) {
      fresh.push({
        city: loc.city,
        type: resType,
        status: preview,
        fullText: full,
        phone: loc.phone
      });
    }
    if (fresh.length >= 25) break;
  }

  if (fresh.length > 0) {
    dir.outages = fresh;
    fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
  }
}

function detectTheme(post) {
  const s = ((post.title || '') + ' ' + (post.text || '')).toLowerCase();
  if (post.cat === 'auto' || /(дтп|авари|столкновен|наезд|автомобил|машин|трасс|дорог|гибдд|мост)/i.test(s)) return { c1: '#111827', c2: '#7f1d1d', glow: '#ef4444', tag: 'АВТО И ДОРОГИ' };
  if (/(пожар|возгоран|огонь|мчс|спасател|дым)/i.test(s)) return { c1: '#270909', c2: '#9a3412', glow: '#f97316', tag: 'ЭКСТРЕННАЯ СВОДКА • МЧС' };
  if (post.cat === 'law' || /(полиц|мвд|суд|прокурат|задержан|уголовн|краж|разб|мошенн|следств|ск )/i.test(s)) return { c1: '#090d16', c2: '#1e3a8a', glow: '#3b82f6', tag: 'ВЛАСТЬ И ЗАКОН' };
  if (post.cat === 'city' || /(жкх|отключен|вод[аыу]|свет|электричеств|отоплен|теплотрасс|ремонт)/i.test(s)) return { c1: '#042f2e', c2: '#115e59', glow: '#14b8a6', tag: 'ГОРОД И ЖКХ' };
  if (post.cat === 'econ') return { c1: '#0f172a', c2: '#1e293b', glow: '#eab308', tag: 'ЭКОНОМИКА И БИЗНЕС' };
  if (post.cat === 'sport') return { c1: '#1e1b4b', c2: '#4c1d95', glow: '#a855f7', tag: 'СПОРТ И КУЛЬТУРА' };
  return { c1: '#0f172a', c2: '#1e293b', glow: '#cbd5e1', tag: String(post.catLabel || 'НОВОСТИ ПРИМОРЬЯ').toUpperCase() };
}
async function drawThemedCover(post) {
  if (!fs.existsSync('covers')) fs.mkdirSync('covers', { recursive: true });
  const w = 1200, h = 675;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const th = detectTheme(post);

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, th.c1);
  g.addColorStop(1, th.c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const rad = ctx.createRadialGradient(w * 0.8, h * 0.25, 20, w * 0.8, h * 0.25, 480);
  rad.addColorStop(0, th.glow + '44');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  ctx.strokeStyle = th.glow + '77';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(740, 410); ctx.lineTo(880, 130); ctx.lineTo(1020, 410);
  ctx.moveTo(810, 270); ctx.lineTo(950, 270);
  ctx.stroke();

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.22);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = 'bold 68px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ИА «ПРИМ_ДОЗОР» • PRIMDOZOR.RU', 0, 15);
  ctx.restore();

  const grad = ctx.createLinearGradient(0, h - 340, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(9,13,22,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - 340, w, 340);

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(40, 32, 235, 44);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('ПРИМ_ДОЗОР', 58, 61);

  ctx.fillStyle = th.glow;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(th.tag, 295, 61);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('PRIMDOZOR.RU', w - 230, 61);

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
