const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const AI_KEY = process.env.AI_API_KEY;
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

function makeLink(url, label) {
  return LT + 'a href="' + url + '"' + GT + label + LT + '/a' + GT;
}

const SITE_URL = 'https://' + 'primdozor.ru';
const ADMIN_URL = 'https://' + 't.me' + '/prim_dozor?direct';
const TG_URL = 'https://' + 't.me' + '/prim_dozor';
const MAX_URL = 'https://' + 'max.ru' + '/join/RyxItD9MEitACdZjmI88YZkBI2ps78Qq3iMW0sBJcoE';

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

const FEEDS = [
  { url: 'https://' + 'www.dv.kp.ru' + '/rss/allsections.xml', regional: true },
  { url: 'https://' + 'vl.aif.ru' + '/rss/all.php', regional: true },
  { url: 'https://' + 'deita.ru' + '/rss.xml', regional: true },
  { url: 'https://' + 'primorye24.ru' + '/rss', regional: true },
  { url: 'https://' + 'ria.ru' + '/export/rss2/archive/index.xml', regional: false },
  { url: 'https://' + 'tass.ru' + '/rss/v2.xml', regional: false }
];

const PRIM_KEYWORDS = [
  'примор', 'владивосток', 'уссурийск', 'находк', 'артём', 'артем',
  'большой камен', 'большом камн', 'дальневосточ', 'дфо', 'кожемяко',
  'тихоокеан', 'чуркин', 'океанск', 'русский мост', 'золотой мост',
  'хасан', 'спасск', 'лесозаводск', 'дальнегорск', 'фокино', 'партизанск', 'арсеньев'
];

const UKRAINE_KEYWORDS = ['украин', 'киев', 'зеленск', 'всу', 'донбасс', 'харьков', 'одесс', 'сво'];

function stripTags(str) {
  return (str || '').replace(new RegExp(LT + '[^' + GT + ']+' + GT, 'g'), '');
}

function normalizeRussianText(str) {
  if (!str) return '';
  return str
    .replace(/\bв Украине\b/g, 'на Украине')
    .replace(/\bВ Украине\b/g, 'На Украине')
    .replace(/\bв украине\b/g, 'на Украине');
}

function generateCoverImage(post) {
  if (!fs.existsSync('covers')) {
    fs.mkdirSync('covers', { recursive: true });
  }
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#12151a');
  grad.addColorStop(0.5, '#1b2028');
  grad.addColorStop(1, '#101318');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-22 * Math.PI / 180);
  ctx.font = 'bold 46px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.textAlign = 'center';
  for (let row = -360; row <= 360; row += 140) {
    for (let col = -650; col <= 650; col += 430) {
      ctx.fillText('ПРИМ_ДОЗОР • 24/7', col, row);
    }
  }
  ctx.restore();

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 18, height);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(64, 52, 240, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ПРИМ_ДОЗОР', 84, 83);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px sans-serif';
  const cleanCat = (post.catLabel || '').replace(/[^\p{L}\p{N}\s_.-]/gu, '').trim();
  ctx.fillText((post.city || 'Приморье').toUpperCase() + '  •  ' + cleanCat.toUpperCase(), 328, 83);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 46px sans-serif';
  const words = (post.title || '').split(' ');
  const lines = [];
  let currentLine = '';
  const maxWidth = 1060;

  for (const w of words) {
    const testLine = currentLine ? currentLine + ' ' + w : w;
    if (ctx.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = w;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const displayLines = lines.slice(0, 5);
  let startY = 195;
  for (const line of displayLines) {
    ctx.fillText(line, 64, startY);
    startY += 64;
  }

  ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, height - 102, 1072, 54);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRIMDOZOR.RU  —  ОПЕРАТИВНЫЙ НАДЗОР ПРИМОРЬЯ', 86, height - 68);

  ctx.fillStyle = '#fca5a5';
  ctx.textAlign = 'right';
  ctx.fillText(post.age || '18+', 1114, height - 68);

  const fileName = 'cover_' + post.id + '.png';
  const filePath = 'covers/' + fileName;
  fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
  return filePath;
}

async function callAI(prompt) {
  if (!AI_KEY) return null;
  const endpoints = [
    { url: 'https://' + 'polza.ai' + '/api/v1/chat/completions', model: 'openai/gpt-oss-20b' },
    { url: 'https://' + 'api.polza.ai' + '/api/v1/chat/completions', model: 'openai/gpt-oss-20b' },
    { url: 'https://' + 'polza.ai' + '/api/v1/chat/completions', model: 'openai/gpt-4o-mini' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + AI_KEY
        },
        body: JSON.stringify({
          model: ep.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const firstChoice = Array.isArray(data.choices) ? data.choices.at(0) : null;
      const content = firstChoice && firstChoice.message ? firstChoice.message.content.trim() : '';
      if (content) return content;
    } catch (e) {}
  }
  return null;
}

async function fetchRSS(feedObj) {
  try {
    const res = await fetch(feedObj.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [];
    const itemRegex = new RegExp(LT + 'item' + GT + '([\\s\\S]*?)' + LT + '/item' + GT, 'g');
    const titleCdata = new RegExp(LT + 'title' + GT + LT + '!\\[CDATA\\[([\\s\\S]*?)\\]\\]' + GT + LT + '/title' + GT);
    const titlePlain = new RegExp(LT + 'title' + GT + '([\\s\\S]*?)' + LT + '/title' + GT);
    const descCdata = new RegExp(LT + 'description' + GT + LT + '!\\[CDATA\\[([\\s\\S]*?)\\]\\]' + GT + LT + '/description' + GT);
    const descPlain = new RegExp(LT + 'description' + GT + '([\\s\\S]*?)' + LT + '/description' + GT);

    const matches = xml.matchAll(itemRegex);
    for (const m of matches) {
      const block = m.at(1) || '';
      const titleMatch = block.match(titleCdata) || block.match(titlePlain);
      const descMatch = block.match(descCdata) || block.match(descPlain);
      const title = titleMatch ? titleMatch.at(1) : '';
      const desc = descMatch ? descMatch.at(1) : '';
      if (title) {
        items.push({
          title: stripTags(title).trim(),
          desc: stripTags(desc).trim(),
          regional: feedObj.regional
        });
      }
    }
    console.log('RSS получено (' + items.length + '): ' + feedObj.url);
    return items.slice(0, 12);
  } catch (e) {
    return [];
  }
}

async function rewriteWithAI(rawItem, blockedCats, allowSvo) {
  const svoRule = allowSvo
    ? 'Если новость касается СВО или политики — подавай строго в поддержку России и ВС РФ, пиши строго «на Украине».'
    : 'ВАЖНОЕ ОГРАНИЧЕНИЕ: Новость про СВО/Украину уже выходила недавно! Если эта новость касается Украины, СВО, Зеленского или переговоров по Украине — верни строго слово SKIP. Нам сейчас нужны новости Приморского края, ЖКХ, ЧП, медицины, дорог и законов для граждан.';

  const blockedNote = (blockedCats && blockedCats.length > 0)
    ? '\nТакже избегай рубрик [' + blockedCats.join(', ') + '], если это не срочное ЧП в Приморье.'
    : '';

  const prompt = [
    'Ты главный редактор регионального информационного портала «Прим_Дозор» (Владивосток, Приморский край).',
    'ГЛАВНЫЙ ПРИОРИТЕТ: 80% контента портала — это жизнь Владивостока и Приморского края (происшествия 112, отключения ЖКХ, дороги, погода, криминал, суды, соцвыплаты, медицина, спорт). Общероссийские новости берём только если они напрямую касаются кошелька, прав или безопасности жителей Приморья.',
    svoRule + blockedNote,
    'ПРАВИЛА: Пиши строго «на Украине». Не выдумывай цифры и факты. Соблюдай УК, КоАП, ГК, 436-ФЗ. Светскую хронику и шоу-бизнес отклоняй словом SKIP.',
    'Верни ответ СТРОГО в формате JSON без markdown:',
    '{',
    '  "title": "Точный информативный SEO-заголовок (до 85 символов)",',
