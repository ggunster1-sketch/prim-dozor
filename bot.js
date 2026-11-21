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

const SITE_URL = 'https://' + 'primdozor.ru';
const ADMIN_URL = 'https://' + 't.me' + '/prim_dozor?direct';
const TG_URL = 'https://' + 't.me' + '/prim_dozor';
const MAX_URL = 'https://' + 'max.ru' + '/join/RyxItD9MEitACdZjmI88YZkBI2ps78Qq3iMW0sBJcoE';

const TG_FOOTER_HTML =
  '\n\n🌐 Читайте новости на нашем <a href="' + SITE_URL + '">сайте</a>' +
  '\n\n🔎 Прим_Дозор — жестко фиксируем то, что другие пытаются скрыть.' +
  '\n\n📲 Вопросы : <a href="' + ADMIN_URL + '">связь с админом</a>' +
  '\n\n🤝 Сотрудничество: prim_dozor@internet.ru' +
  '\n\n👉 <a href="' + TG_URL + '">telegram прим_дозор</a>' +
  '\n\n👉 <a href="' + MAX_URL + '">прим_дозор в Max</a>';

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
  const filePath = path.join('covers', fileName);
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
    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of matches) {
      const block = m.at(1) || '';
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/);
      const title = titleMatch ? titleMatch.at(1) : '';
      const desc = descMatch ? descMatch.at(1) : '';
      if (title) {
        items.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          desc: desc.replace(/<[^>]+>/g, '').trim(),
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
    '  "cat": "одно из: chp, svo, law, city, family, sport",',
    '  "catLabel": "одно из: 🚨 ЧП и 112, 🇷🇺 СВО и Защитники, 🏛 Законы и Политика, 🏙 Город и ЖКХ, 👨‍👩‍👧 Семья и Медицина, 🏆 Спорт",',
    '  "city": "город Приморья (Владивосток, Большой Камень, Артём, Уссурийск, Находка, Приморье) или Россия",',
    '  "age": "возрастная маркировка по 436-ФЗ: 0+, 6+, 12+, 16+ или 18+",',
    '  "tldr": "• Краткий факт 1\\n• Краткий факт 2",',
    '  "text": "Полный уникальный текст статьи в спокойном редакционном стиле (2-3 коротких абзаца с уместными эмодзи)",',
    '  "needSource": true или false (true ТОЛЬКО если это официальная сводка МВД/СК/МЧС/Минобороны РФ/Прокуратуры/Правительства ПК или прямая цитата; иначе false)',
    '}',

    'Исходник: ' + rawItem.title + '. ' + rawItem.desc
].join('\n');
const content = await callAI(prompt);
if (!content || content.includes('SKIP')) return null;
try {
const cleanJson = content.replace(/^json|$/g, '').trim();
const parsed = JSON.parse(cleanJson);
parsed.title = normalizeRussianText(parsed.title);
parsed.tldr = normalizeRussianText(parsed.tldr).replace(/\n/g, '
');
parsed.text = normalizeRussianText(parsed.text);
return parsed;
} catch (e) {
return null;
}
}
async function sendToTelegram(news, imagePath) {
if (!TG_TOKEN) return;
const cleanText = (news.text || '').replace(/<br\s*/?>/gi, '\n');
const fullCaption = news.catLabel + ' | ' + news.city + ' (' + news.age + ')\n\n' + news.title + '\n\n' + cleanText + TG_FOOTER_HTML;
try {
if (imagePath && fs.existsSync(imagePath) && fullCaption.length <= 1020) {
const form = new FormData();
form.append('chat_id', TG_CHAT);
form.append('caption', fullCaption);
form.append('parse_mode', 'HTML');
const imgBuffer = fs.readFileSync(imagePath);
form.append('photo', new Blob([imgBuffer], { type: 'image/png' }), 'cover.png');
const res = await fetch('https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/sendPhoto', {
method: 'POST',
body: form
});
const tgData = await res.json();
if (tgData.ok) {
console.log('Отправлено в Telegram с обложкой: ' + news.title);
return;
}
console.log('Telegram sendPhoto ошибка:', tgData.description);
}
const res = await fetch('https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/sendMessage', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
chat_id: TG_CHAT,
text: fullCaption,
parse_mode: 'HTML',
disable_web_page_preview: true
})
});
const tgData = await res.json();
if (tgData.ok) {
console.log('Отправлено в Telegram (текст): ' + news.title);
} else {
console.log('Telegram ошибка:', tgData.description);
}
} catch (e) {
console.log('Telegram сбой:', e.message);
}
}
async function sendToMax(news) {
if (!MAX_TOKEN || !MAX_CHAT_ID) return;
const maxApiUrl = 'https://' + 'platform-api.max.ru' + '/messages?chat_id=' + encodeURIComponent(MAX_CHAT_ID);
const cleanText = (news.text || '').replace(/<br\s*/?>/gi, '\n');
const bodyText = news.catLabel + ' | ' + news.city + ' (' + news.age + ')\n\n**' + news.title + '**\n\n' + cleanText + MAX_FOOTER_MD;
try {
const res = await fetch(maxApiUrl, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': MAX_TOKEN
},
body: JSON.stringify({
text: bodyText,
format: 'markdown'
})
});
if (res.ok) console.log('Отправлено в Макс: ' + news.title);
} catch (e) {}
}
async function syncManualTelegramPosts(existing) {
if (!TG_TOKEN) return 0;
let state = { lastUpdateId: 0 };
if (fs.existsSync('tg_state.json')) {
try { state = JSON.parse(fs.readFileSync('tg_state.json', 'utf8')); } catch (e) {}
}
const url = 'https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/getUpdates?allowed_updates=["channel_post"]&offset=' + (state.lastUpdateId + 1);
let synced = 0;
try {
const res = await fetch(url);
if (!res.ok) return 0;
const data = await res.json();
if (!data.ok || !Array.isArray(data.result)) return 0;
for (const upd of data.result) {
if (upd.update_id > state.lastUpdateId) state.lastUpdateId = upd.update_id;
const postObj = upd.channel_post;
if (!postObj) continue;
const rawText = (postObj.text || postObj.caption || '').trim();
if (!rawText) continue;
if (rawText.includes('жестко фиксируем то, что другие пытаются скрыть') || (postObj.from && postObj.from.is_bot)) continue;
const cleanBody = rawText.split('🌐 Читайте новости на нашем').at(0).trim();
if (!cleanBody || existing.some(e => e.tgMsgId === postObj.message_id)) continue;
const lines = cleanBody.split('\n').map(l => l.trim()).filter(Boolean);
const rawTitle = lines.at(0) ? lines.at(0).slice(0, 95) : 'Новость редакции Прим_Дозор';
const bodyWithoutTitle = lines.length > 1 ? lines.slice(1).join('\n\n') : cleanBody;
const nowVl = new Date(Date.now() + 10 * 3600000);
const timeStr = 'Сегодня, ' + String(nowVl.getUTCHours()).padStart(2, '0') + ':' + String(nowVl.getUTCMinutes()).padStart(2, '0');
const manualPost = {
id: Date.now() + synced,
tgMsgId: postObj.message_id,
isoDate: new Date().toISOString(),
rawTitle: rawTitle,
cat: 'city',
catLabel: '🔥 Редакция Прим_Дозор',
city: 'Приморье',
age: '18+',
date: timeStr,
title: normalizeRussianText(rawTitle),
tldr: '• Оперативное сообщение редакции «Прим_Дозор».',
text: normalizeRussianText(bodyWithoutTitle),
src: 'Редакция «Прим_Дозор»'
};
const coverPath = generateCoverImage(manualPost);
manualPost.cover = coverPath.replace(/\/g, '/');
existing.unshift(manualPost);
await sendToMax(manualPost);
synced++;
console.log('Ручной пост из ТГ перенесен на сайт: ' + manualPost.title);
}
fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
} catch (e) {}
return synced;
}
function updateSitemap() {
const nowIso = new Date().toISOString();
const xml = [
'',
'',
'  ',
'    https://' + SITE_HOST + '/',
'    ' + nowIso + '',
'    hourly',
'    1.0',
'  ',
'  ',
'    https://' + SITE_HOST + '/legal.html',
'    ' + nowIso + '',
'    monthly',
'    0.5',
'  ',
''
].join('\n');
fs.writeFileSync('sitemap.xml', xml, 'utf8');
}
async function pingIndexNow() {
if (!INDEXNOW_KEY) return;
try {
await fetch('https://' + 'yandex.com' + '/indexnow', {
method: 'POST',
headers: { 'Content-Type': 'application/json; charset=utf-8' },
body: JSON.stringify({
host: SITE_HOST,
key: INDEXNOW_KEY,
keyLocation: 'https://' + SITE_HOST + '/' + INDEXNOW_KEY + '.txt',
urlList: ['https://' + SITE_HOST + '/']
})
});
} catch (e) {}
}
async function run() {
let existing = [];
if (fs.existsSync('news.json')) {
try { existing = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
}
const manualSynced = await syncManualTelegramPosts(existing);
let candidates = [];
for (const f of FEEDS) {
const items = await fetchRSS(f);
candidates = candidates.concat(items);
}
candidates.sort((a, b) => {
const aText = (a.title + ' ' + a.desc).toLowerCase();
const bText = (b.title + ' ' + b.desc).toLowerCase();
const aScore = (PRIM_KEYWORDS.some(k => aText.includes(k)) ? 10 : 0) + (a.regional ? 3 : 0);
const bScore = (PRIM_KEYWORDS.some(k => bText.includes(k)) ? 10 : 0) + (b.regional ? 3 : 0);
return bScore - aScore;
});
console.log('Всего кандидатов из RSS: ' + candidates.length);
const lastFour = existing.slice(0, 4);
let allowSvo = !lastFour.some(p => {
const t = ((p.title || '') + ' ' + (p.text || '')).toLowerCase();
return p.cat === 'svo' || UKRAINE_KEYWORDS.some(k => t.includes(k));
});
const recentCats = existing.slice(0, 2).map(e => e.cat).filter(Boolean);
const blockedCats = [...new Set(recentCats)];
let added = 0;
for (const item of candidates) {
if (added >= 2) break;
if (existing.some(e => e.rawTitle === item.title)) continue;
const lowerRaw = (item.title + ' ' + item.desc).toLowerCase();
const isUkraineTopic = UKRAINE_KEYWORDS.some(k => lowerRaw.includes(k));
if (isUkraineTopic && !allowSvo) continue;
const ai = await rewriteWithAI(item, blockedCats, allowSvo);
if (!ai) continue;
const nowVl = new Date(Date.now() + 10 * 3600000);
const timeStr = 'Сегодня, ' + String(nowVl.getUTCHours()).padStart(2, '0') + ':' + String(nowVl.getUTCMinutes()).padStart(2, '0');
const post = {
id: Date.now() + added + manualSynced,
isoDate: new Date().toISOString(),
rawTitle: item.title,
cat: ai.cat || 'city',
catLabel: ai.catLabel || '🏙 Город и ЖКХ',
city: ai.city || 'Приморье',
age: ai.age || '16+',
date: timeStr,
title: ai.title,
tldr: ai.tldr,
text: ai.text,
src: ai.needSource ? 'По официальной информации ведомств' : ''
};
const coverPath = generateCoverImage(post);
post.cover = coverPath.replace(/\/g, '/');
existing.unshift(post);
blockedCats.push(post.cat);
if (post.cat === 'svo' || isUkraineTopic) allowSvo = false;
await sendToTelegram(post, coverPath);
await sendToMax(post);
added++;
}
fs.writeFileSync('news.json', JSON.stringify(existing.slice(0, 60), null, 2), 'utf8');
updateSitemap();
if (added + manualSynced > 0) await pingIndexNow();
console.log('Готово. Ручных постов перенесено: ' + manualSynced + ', автоновостей: ' + added);
}
run();
