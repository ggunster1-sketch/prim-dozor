const fs = require('fs');
const { execFileSync } = require('child_process');
const { createCanvas, loadImage } = require('canvas');

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
  const s = String(text || '').slice(0, 180).toLowerCase();
  if (/владивосток/i.test(s)) return { city: 'Владивосток', phone: '+7 (423) 222-23-33' };
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
function isOutdatedJkh(text) {
  const s = String(text || '').toLowerCase();
  if (/\b20(1[0-9]|2[0-5])\b/.test(s)) return true;
  const vl = new Date(Date.now() + 10 * 3600000);
  const curDay = vl.getUTCDate();
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const curMonth = months.at(vl.getUTCMonth()) || '';
  const m = s.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/);
  if (!m) return false;
  const msgDay = Number(m.at(1));
  const msgMonth = m.at(2);
  if (msgMonth !== curMonth && !(curDay <= 2 && msgDay >= 28)) return true;
  if (msgMonth === curMonth && msgDay < curDay) return true;
  return false;
}

function updateLiveOutages(rawItems) {
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  let dir = { outages: [], phones: {}, afisha: [], poll: null };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }
  const outageKeywords = /(отключен|без воды|без света|без электричеств|нет электричеств|отключили отоплен|нет отоплен|порыв на сетях|прорыв труб|ремонт теплотрасс|водоснабжен|электроснабжен|авария на сетях|авария на лэп|авария на подстанц|плановые работы.*ул\.|ограничение.*водоснабж|ограничение.*электроснабж)/i;
  const excludeNonJkh = /(дтп|столкновени|перевернул|наезд|автомобил|машин|трасс|дорог|гибдд|парковк|тротуар|прокуратур|суд|уголовн|полиц)/i;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const fresh = [];

  for (const it of items) {
    if (it.ts && (Date.now() - Number(it.ts)) > 12 * 3600000) continue;
    const rawStr = String((it.title || '') + ' ' + (it.text || it.raw || ''))
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (rawStr.length < 25 || !outageKeywords.test(rawStr) || excludeNonJkh.test(rawStr) || isOutdatedJkh(rawStr)) continue;
    const resType = detectJkhResource(rawStr);
    const loc = detectJkhCity(rawStr);
    const preview = rawStr.slice(0, 145) + (rawStr.length > 145 ? '...' : '');
    if (!fresh.some(x => x.status.slice(0, 45) === preview.slice(0, 45))) {
      fresh.push({
        city: loc.city,
        type: resType,
        status: preview,
        fullText: rawStr,
        phone: loc.phone
      });
    }
    if (fresh.length >= 25) break;
  }

  dir.outages = fresh;
  fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
}

async function processCleanVideo(videoUrl, postId) {
  if (!videoUrl) return '';
  if (!fs.existsSync('videos')) fs.mkdirSync('videos', { recursive: true });
  const rawPath = 'videos/raw_' + postId + '.mp4';
  const outPath = 'videos/v_' + postId + '.mp4';
  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return '';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 50000 || buf.length > 25 * 1024 * 1024) return '';
    fs.writeFileSync(rawPath, buf);
    execFileSync('ffmpeg', [
      '-y', '-i', rawPath,
      '-vf', "drawtext=text='ИА «ПРИМ_ДОЗОР»':x=w-tw-18:y=h-th-14:fontsize=20:fontcolor=white@0.72:shadowcolor=black@0.65:shadowx=1:shadowy=1",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
      '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
      outPath
    ], { timeout: 25000, stdio: 'ignore' });
    try { fs.unlinkSync(rawPath); } catch (e) {}
    return fs.existsSync(outPath) ? outPath : '';
  } catch (e) {
    try { if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath); } catch (er) {}
    return '';
  }
}
function detectTheme(post) {
  const cat = String(post.cat || '').trim();
  const s = ((post.title || '') + ' ' + (post.text || '')).toLowerCase();
  const isSvo = /(^|[^а-яё])сво([^а-яё]|$)|специальн(ой|ая)\s+военн(ой|ая)\s+операц|тихоокеанск(ий|ого)\s+флот|военнослужащ|участник(ам|ов|и)\s+сво|гуманитарн(ую|ой)\s+помощ/i.test(s);

  if (cat === 'auto') {
    return { c1: '#0f172a', c2: '#1e3a8a', glow: '#60a5fa', tag: 'ДОРОГИ И МОСТЫ', scene: 'Реалистичная документальная фотография автомобильного моста и магистрали через бухту во Владивостоке с городским движением, Приморский край, фотожурналистика, без надписей и вывесок' };
  }
  if (cat === 'city') {
    return { c1: '#042f2e', c2: '#0f766e', glow: '#2dd4bf', tag: 'КОММУНАЛЬНЫЙ ФРОНТ', scene: 'Реалистичная репортажная фотография работы городских коммунальных служб, ремонт теплотрассы и водопровода на улице Владивостока, Приморский край, без надписей и логотипов' };
  }
  if (cat === 'chp') {
    return { c1: '#270909', c2: '#991b1b', glow: '#f87171', tag: 'ХРОНИКА 112 И ЧП', scene: 'Реалистичный новостной репортаж, работа спасателей МЧС и экстренных служб с проблесковыми маячками на городской улице Владивостока в сумерках, без надписей' };
  }
  if (cat === 'law') {
    if (isSvo) {
      return { c1: '#0b192c', c2: '#1e3a5f', glow: '#38bdf8', tag: 'ВЛАСТЬ, ЗАКОН И СВО', scene: 'Реалистичная документальная фотография кораблей Тихоокеанского флота в бухте Владивостока на рассвете, торжественная атмосфера, без надписей и логотипов' };
    }
    return { c1: '#090d16', c2: '#1d4ed8', glow: '#93c5fd', tag: 'ВЛАСТЬ, ЗАКОН И СВО', scene: 'Реалистичная фотография здания администрации Приморского края и центральной площади во Владивостоке днём, официальная пресс-съёмка, без надписей' };
  }
  if (cat === 'econ') {
    return { c1: '#1c1917', c2: '#92400e', glow: '#fbbf24', tag: 'ЭКОНОМИКА И ПОРТ', scene: 'Реалистичная документальная фотография морского торгового порта Владивостока, портальные краны и контейнеровозы у причала бухты Золотой Рог, без надписей' };
  }
  if (cat === 'med') {
    return { c1: '#062038', c2: '#0369a1', glow: '#7dd3fc', tag: 'ЗДРАВООХРАНЕНИЕ', scene: 'Реалистичная фотография современного медицинского центра и автомобиля скорой помощи во Владивостоке, чистая новостная фотосъёмка, без надписей' };
  }
  if (cat === 'sport') {
    return { c1: '#1e1b4b', c2: '#5b21b6', glow: '#c084fc', tag: 'СПОРТ И СОБЫТИЯ', scene: 'Реалистичная фотография спортивного комплекса и городской набережной во Владивостоке во время массового праздника, без надписей' };
  }
  return { c1: '#0f172a', c2: '#1e293b', glow: '#cbd5e1', tag: String(post.catLabel || 'ЛЮДИ ПРИМОРЬЯ').toUpperCase(), scene: 'Реалистичная панорамная фотография Владивостока, сопок и бухты Золотой Рог в Приморском крае, новостной репортаж, без надписей' };
}

async function fetchTopicPhoto(scenePrompt, size) {
  const aiKey = (process.env.AI_API_KEY || '').trim();
  if (!aiKey) return null;
  try {
    const cleanPrompt = String(scenePrompt || '') + '. Строго без какого-либо текста, букв, цифр, логотипов и вывесок на изображении.';
    const res = await fetch('https://polza.ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiKey },
      body: JSON.stringify({ model: 'openai/gpt-image-1', prompt: cleanPrompt, size: size || '1536x1024', n: 1 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data && Array.isArray(data.data) ? data.data.at(0) : null;
    if (!item) return null;
    if (item.b64_json) return await loadImage(Buffer.from(item.b64_json, 'base64'));
    if (item.url) return await loadImage(item.url);
  } catch (e) {}
  return null;
}

async function ensureHeroBanner() {
  if (!fs.existsSync('covers')) fs.mkdirSync('covers', { recursive: true });
  const vl = new Date(Date.now() + 10 * 3600000);
  const m = vl.getUTCMonth() + 1;
  const seasonTag = (m === 12 || m <= 2) ? 'winter' : (m >= 3 && m <= 5) ? 'spring' : (m >= 6 && m <= 8) ? 'summer' : 'autumn';
  const bannerFile = 'covers/hero_banner.jpg';
  const metaFile = 'covers/hero_banner.txt';
  if (fs.existsSync(bannerFile) && fs.existsSync(metaFile) && fs.readFileSync(metaFile, 'utf8').trim() === seasonTag) {
    return bannerFile;
  }
  const seasonPrompt = {
    winter: 'Широкоформатная реалистичная панорамная фотография Золотого моста через бухту Золотой Рог во Владивостоке в зимних вечерних сумерках, золотистая подсветка пилонов моста справа, чистое тёмно-синее пространство слева, без текста и логотипов',
    spring: 'Широкоформатная реалистичная панорамная фотография Золотого моста через бухту Золотой Рог во Владивостоке на весеннем закате, мост справа, чистое тёмное небо слева, без текста и логотипов',
    summer: 'Широкоформатная реалистичная панорамная фотография Золотого моста во Владивостоке летним вечером, подсветка вантового моста справа, тёмно-синий градиент слева, без текста и логотипов',
    autumn: 'Широкоформатная реалистичная панорамная фотография Золотого моста через бухту Золотой Рог во Владивостоке золотым осенним вечером, мост справа, чистое тёмно-синее пространство слева, без текста и логотипов'
  };
  const photo = await fetchTopicPhoto(seasonPrompt[seasonTag], '1536x1024');
  if (photo) {
    const w = 1400, h = 220;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const scale = w / photo.width;
    const dh = photo.height * scale;
    ctx.drawImage(photo, 0, -(dh - h) * 0.45, w, dh);
    const fade = ctx.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, 'rgba(9, 13, 22, 0.94)');
    fade.addColorStop(0.55, 'rgba(9, 13, 22, 0.64)');
    fade.addColorStop(1, 'rgba(9, 13, 22, 0.16)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
    fs.writeFileSync(bannerFile, canvas.toBuffer('image/jpeg', { quality: 0.92 }));
    fs.writeFileSync(metaFile, seasonTag, 'utf8');
  }
  return fs.existsSync(bannerFile) ? bannerFile : '';
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

  let photo = null;
  if (post.ownPhotoUrl) {
    try { photo = await loadImage(post.ownPhotoUrl); } catch (e) {}
  }
  if (!photo) {
    photo = await fetchTopicPhoto(post.coverPrompt || th.scene, '1536x1024');
  }

  if (photo) {
    const scale = Math.max(w / photo.width, h / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    ctx.drawImage(photo, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.fillStyle = 'rgba(9, 13, 22, 0.22)';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.2);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.font = 'bold 62px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ИА «ПРИМ_ДОЗОР» • ПРИМОРСКИЙ КРАЙ', 0, 15);
  ctx.restore();

  const topGrad = ctx.createLinearGradient(0, 0, 0, 110);
  topGrad.addColorStop(0, 'rgba(9,13,22,0.88)');
  topGrad.addColorStop(1, 'rgba(9,13,22,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, 110);

  const grad = ctx.createLinearGradient(0, h - 330, 0, h);
  grad.addColorStop(0, 'rgba(9,13,22,0)');
  grad.addColorStop(0.45, 'rgba(9,13,22,0.82)');
  grad.addColorStop(1, 'rgba(9,13,22,0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - 330, w, 330);

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(40, 28, 225, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('ПРИМ_ДОЗОР', 56, 56);

  ctx.fillStyle = th.glow;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(th.tag, 284, 56);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ПРИМОРЬЕ 24/7', w - 210, 56);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  const words = String(post.title || '').split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (ctx.measureText(line + ' ' + word).width > 1110) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);

  let y = h - 72 - (lines.slice(0, 3).length - 1) * 44;
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, 40, y);
    y += 44;
  }

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('ИА «ПРИМ_ДОЗОР»  •  ' + String(post.city || 'Приморский край').toUpperCase() + '  •  ' + (post.age || '18+'), 40, h - 22);

  const file = 'covers/c_' + post.id + '.jpg';
  fs.writeFileSync(file, canvas.toBuffer('image/jpeg', { quality: 0.9 }));
  return file;
}

module.exports = { isAdOrSpam, updateLiveOutages, processCleanVideo, ensureHeroBanner, drawThemedCover };
