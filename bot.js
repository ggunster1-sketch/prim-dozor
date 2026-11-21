const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

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

function buildUrl(parts) {
  return 'https://' + parts.join('/');
}

function makeLink(url, label) {
  return LT + 'a href="' + url + '"' + GT + label + LT + '/a' + GT;
}

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

const TG_SOURCES = [
  { channel: 'dpskontrol_125rus', label: 'ДПС Контроль Приморье', official: false },
  { channel: 'dpsvl', label: 'ДПС Владивосток', official: false },
  { channel: 'newsvlc', label: 'Новости Владивостока и Приморья', official: false },
  { channel: 'vladivostok_smi', label: 'Владивосток СМИ', official: false },
  { channel: 'vlnews25', label: 'VL News 25', official: false },
  { channel: 'svodka25', label: 'Сводка 25', official: false },
  { channel: 'novosti_primorye25', label: 'Новости Приморье 25', official: false },
  { channel: 'prim_police', label: 'УМВД России по Приморскому краю', official: true },
  { channel: 'prosecutor_pk', label: 'Прокуратура Приморского края', official: true },
  { channel: 'sledcom25', label: 'СУ СК России по Приморскому краю', official: true },
  { channel: 'mchs_primorye', label: 'ГУ МЧС России по Приморскому краю', official: true },
  { channel: 'primorskyadmin', label: 'Правительство Приморского края', official: true },
  { channel: 'minzdrav_pk', label: 'Минздрав Приморского края', official: true },
  { channel: 'shestakovblog', label: 'Глава Владивостока Константин Шестаков', official: true },
  { channel: 'primamedia', label: 'PrimaMedia', official: false },
  { channel: 'hardkorushka_25', label: 'Хардкорушка 25', official: false },
  { channel: 'otvprimofficial', label: 'ОТВ-Прим', official: false },
  { channel: 'primorye_online', label: 'Приморье Онлайн', official: false },
  { channel: 'pogoda_25_region', label: 'Погода 25 Регион', official: false },
  { channel: 'vpes_vl', label: 'ВПЭС Владивосток', official: true },
  { channel: 'primvodokanal', label: 'Примводоканал', official: true }
];

const FEEDS = [
  { url: buildUrl(['www.dv.kp.ru', 'rss', 'allsections.xml']), regional: true },
  { url: buildUrl(['vl.aif.ru', 'rss', 'all.php']), regional: true },
  { url: buildUrl(['www.kp.ru', 'rss', 'allsections.xml']), regional: false },
  { url: buildUrl(['ria.ru', 'export', 'rss2', 'archive', 'index.xml']), regional: false },
  { url: buildUrl(['tass.ru', 'rss', 'v2.xml']), regional: false },
  { url: buildUrl(['lenta.ru', 'rss', 'news']), regional: false }
];

const PRIM_KEYWORDS = [
  'примор', 'владивосток', 'уссурийск', 'находк', 'артём', 'артем',
  'большой камен', 'большом камн', 'дальневосточ', 'дфо', 'кожемяко', 'шестаков',
  'тихоокеан', 'чуркин', 'океанск', 'русский мост', 'золотой мост', 'низководн',
  'хасан', 'спасск', 'лесозаводск', 'дальнегорск', 'фокино', 'партизанск', 'арсеньев',
  'светланск', 'лугов', 'вторая речка', 'первая речка', 'эгершельд', 'седанка'
];

const UKRAINE_KEYWORDS = ['украин', 'киев', 'зеленск', 'всу', 'донбасс', 'харьков', 'одесс', 'сво'];

function stripTags(str) {
  return (str || '').replace(new RegExp(LT + '[^' + GT + ']+' + GT, 'g'), ' ').replace(/\s+/g, ' ').trim();
}

function normalizeRussianText(str) {
  if (!str) return '';
  return str
    .replace(/\bв Украине\b/g, 'на Украине')
    .replace(/\bВ Украине\b/g, 'На Украине')
    .replace(/\bв украине\b/g, 'на Украине');
}

function cleanInlineEmojis(text) {
  if (!text) return '';
  const emojiRegex = /[\p{Extended_Pictographic}\u2600-\u27BF]/gu;
  return text.split('\n').map(function(line) {
    const trimmed = line.trim();
    if (!trimmed) return '';
    const firstMatch = trimmed.match(/^([\p{Extended_Pictographic}\u2600-\u27BF]+\s*)/u);
    const prefix = firstMatch ? firstMatch.at(1) : '';
    const rest = trimmed.slice(prefix.length).replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trim();
    return prefix + rest;
  }).join('\n');
}

async function updateWeatherFile() {
  const cities = [
    { name: 'Владивосток', lat: 43.1155, lon: 131.8855 },
    { name: 'Большой Камень', lat: 43.1128, lon: 132.3481 },
    { name: 'Артём', lat: 43.3592, lon: 132.1892 },
    { name: 'Уссурийск', lat: 43.7972, lon: 131.9517 },
    { name: 'Находка', lat: 42.8241, lon: 132.8928 }
  ];
  try {
    const lats = cities.map(function(c) { return c.lat; }).join(',');
    const lons = cities.map(function(c) { return c.lon; }).join(',');
    const url = 'https://open-meteo.com' + lats + '&longitude=' + lons + '&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok';
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];

    const fmt = function(v) {
      if (v === undefined || v === null || Number.isNaN(Number(v))) return '--°C';
      return (v > 0 ? '+' : '') + Math.round(v) + '°C';
    };
    const icon = function(code) {
      if (code === 0) return '☀';
      if (code <= 3) return '🌤';
      if (code >= 71 && code <= 77) return '❄';
      if (code >= 51) return '🌧';
      return '☁';
    };

    const out = results.map(function(r, i) {
      const h = (r.hourly && r.hourly.temperature_2m) ? r.hourly.temperature_2m : [];
      const dMax = (r.daily && r.daily.temperature_2m_max) ? r.daily.temperature_2m_max : [];
      const curT = r.current ? Math.round(r.current.temperature_2m) : 0;
      const curI = r.current ? icon(r.current.weather_code) : '🌤';
      const cityObj = cities.at(i);

      return {
        name: cityObj ? cityObj.name : 'Приморье',
        now: fmt(curT) + ' ' + curI,
        morning: h.at(8) !== undefined ? fmt(h.at(8)) : fmt(curT),
        day: h.at(14) !== undefined ? fmt(h.at(14)) : fmt(curT),
        evening: h.at(20) !== undefined ? fmt(h.at(20)) : fmt(curT),
        tomorrow: dMax.at(1) !== undefined ? fmt(dMax.at(1)) : fmt(curT)
      };
    });

    fs.writeFileSync('weather.json', JSON.stringify(out, null, 2), 'utf8');
    console.log('Погода Приморского края обновлена.');
  } catch (e) {}
}

async function enrichArticleFromUrl(articleUrl, fallbackImg) {
  let fullText = '';
  let imageUrl = fallbackImg || '';
  if (!articleUrl) return { fullText, imageUrl };

  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9'
      }
    });
    if (!res.ok) return { fullText, imageUrl };
    const html = await res.text();

    if (!imageUrl) {
      const ogMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogMatch && ogMatch.at(1)) imageUrl = ogMatch.at(1);
    }

    const pRegex = new RegExp(LT + 'p[^' + GT + ']*' + GT + '([\\s\\S]*?)' + LT + '/p' + GT, 'gi');
    const paragraphs = [];
    for (const m of html.matchAll(pRegex)) {
      const txt = stripTags(m.at(1) || '');
      if (txt.length > 55 && !txt.includes('cookie') && !txt.includes('Подписывайтесь') && !txt.includes('Читайте также')) {
        paragraphs.push(txt);
      }
      if (paragraphs.join(' ').length > 3000) break;
    }
    fullText = paragraphs.join('\n\n');
  } catch (e) {}

  return { fullText, imageUrl };
}

function getCategoryPalette(cat) {
  const palettes = {
    chp: { c1: '#2e0b0b', c2: '#12151c', accent: '#dc2626', tag: 'ЭКСТРЕННАЯ СВОДКА 112' },
    svo: { c1: '#122117', c2: '#111419', accent: '#16a34a', tag: 'СВО И ЗАЩИТНИКИ ОТЕЧЕСТВА' },
    law: { c1: '#0e192e', c2: '#12151c', accent: '#2563eb', tag: 'ЗАКОНЫ, СУДЫ И ВЛАСТЬ' },
    city: { c1: '#211b11', c2: '#12151c', accent: '#d97706', tag: 'ГОРОД, ДОРОГИ И ЖКХ' },
    family: { c1: '#0c2429', c2: '#12151c', accent: '#0891b2', tag: 'ОБЩЕСТВО, СЕМЬЯ И МЕДИЦИНА' },
    sport: { c1: '#161a2b', c2: '#101319', accent: '#4f46e5', tag: 'СПОРТ И АФИША ПРИМОРЬЯ' }
  };
  return palettes[cat] || palettes.city;
}

async function createBrandedPhoto(post, sourceImageUrl) {
  if (!fs.existsSync('covers')) {
    fs.mkdirSync('covers', { recursive: true });
  }
  const width = 1200;
  const height = 675;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const pal = getCategoryPalette(post.cat);

  let bgDrawn = false;
if (sourceImageUrl && sourceImageUrl.startsWith('http')) {
try {
const imgRes = await fetch(sourceImageUrl, {
headers: { 'User-Agent': 'Mozilla/5.0' }
});
if (imgRes.ok) {
const arrBuf = await imgRes.arrayBuffer();
const img = await loadImage(Buffer.from(arrBuf));
const scale = Math.max(width / img.width, height / img.height);
const w = img.width * scale;
const h = img.height * scale;
ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
bgDrawn = true;
}
} catch (e) {}
}
if (!bgDrawn) {
const grad = ctx.createLinearGradient(0, 0, width, height);
grad.addColorStop(0, pal.c1);
grad.addColorStop(1, pal.c2);
ctx.fillStyle = grad;
ctx.fillRect(0, 0, width, height);
ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
ctx.lineWidth = 1;
for (let x = 0; x < width; x += 45) {
ctx.beginPath();
ctx.moveTo(x, 0);
ctx.lineTo(x, height);
ctx.stroke();
}
ctx.fillStyle = '#f8fafc';
ctx.font = 'bold 42px sans-serif';
ctx.textAlign = 'left';
const words = (post.title || '').split(' ');
let line = '';
let y = 215;
for (const w of words) {
const test = line ? line + ' ' + w : w;
if (ctx.measureText(test).width > 1060) {
ctx.fillText(line, 64, y);
line = w;
y += 56;
} else {
line = test;
}
}
if (line && y < 500) ctx.fillText(line, 64, y);
} else {
const bottomGrad = ctx.createLinearGradient(0, height - 230, 0, height);
bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
bottomGrad.addColorStop(1, 'rgba(10, 12, 16, 0.94)');
ctx.fillStyle = bottomGrad;
ctx.fillRect(0, height - 230, width, 230);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 29px sans-serif';
ctx.textAlign = 'left';
const words = (post.title || '').split(' ');
let l1 = '';
let l2 = '';
for (const w of words) {
if (ctx.measureText(l1 + ' ' + w).width < 1110 && !l2) {
l1 = l1 ? l1 + ' ' + w : w;
} else if (ctx.measureText(l2 + ' ' + w).width < 1110) {
l2 = l2 ? l2 + ' ' + w : w;
}
}
if (l2) {
ctx.fillText(l1, 36, height - 108);
ctx.fillText(l2, 36, height - 70);
} else {
ctx.fillText(l1, 36, height - 76);
}
}
ctx.save();
ctx.translate(width / 2, height / 2);
ctx.rotate(-22 * Math.PI / 180);
ctx.font = 'bold 38px sans-serif';
ctx.fillStyle = bgDrawn ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.045)';
ctx.textAlign = 'center';
for (let row = -360; row <= 360; row += 170) {
for (let col = -650; col <= 650; col += 480) {
ctx.fillText('ПРИМ_ДОЗОР', col, row);
}
}
ctx.restore();
ctx.fillStyle = pal.accent;
ctx.fillRect(36, 30, 235, 44);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 22px sans-serif';
ctx.textAlign = 'left';
ctx.fillText('ПРИМ_ДОЗОР', 56, 60);
ctx.fillStyle = 'rgba(15, 18, 24, 0.86)';
ctx.fillRect(271, 30, 540, 44);
ctx.fillStyle = '#f1f5f9';
ctx.font = 'bold 18px sans-serif';
ctx.fillText((post.city || 'ПРИМОРЬЕ').toUpperCase() + '  •  ' + pal.tag, 289, 59);
ctx.fillStyle = pal.accent;
ctx.fillRect(0, height - 8, width, 8);
ctx.fillStyle = '#cbd5e1';
ctx.font = 'bold 18px sans-serif';
ctx.fillText('PRIMDOZOR.RU  •  ОПЕРАТИВНЫЙ НАДЗОР ПРИМОРЬЯ 24/7', 36, height - 24);
ctx.fillStyle = '#fca5a5';
ctx.textAlign = 'right';
ctx.fillText(post.age || '18+', width - 36, height - 24);
const filePath = 'covers/cover_' + post.id + '.png';
fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
return filePath;
}
async function callAI(prompt) {
if (!AI_KEY) return null;
const endpoints = [
{ url: buildUrl(['polza.ai', 'api', 'v1', 'chat', 'completions']), model: 'openai/gpt-oss-20b' },
{ url: buildUrl(['api.polza.ai', 'api', 'v1', 'chat', 'completions']), model: 'openai/gpt-oss-20b' },
{ url: buildUrl(['polza.ai', 'api', 'v1', 'chat', 'completions']), model: 'openai/gpt-4o-mini' }
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
temperature: 0.5
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
function parseXmlItems(xml, isRegional) {
const items = [];
const itemRegex = new RegExp(LT + 'item' + GT + '([\s\S]?)' + LT + '/item' + GT, 'g');
const titleCdata = new RegExp(LT + 'title' + GT + LT + '!\[CDATA\[([\s\S]?)\]\]' + GT + LT + '/title' + GT);
const titlePlain = new RegExp(LT + 'title' + GT + '([\s\S]?)' + LT + '/title' + GT);
const descCdata = new RegExp(LT + 'description' + GT + LT + '!\[CDATA\[([\s\S]?)\]\]' + GT + LT + '/description' + GT);
const descPlain = new RegExp(LT + 'description' + GT + '([\s\S]?)' + LT + '/description' + GT);
const linkPlain = new RegExp(LT + 'link' + GT + '([\s\S]?)' + LT + '/link' + GT);
const matches = xml.matchAll(itemRegex);
for (const m of matches) {
const block = m.at(1) || '';
const titleMatch = block.match(titleCdata) || block.match(titlePlain);
const descMatch = block.match(descCdata) || block.match(descPlain);
const linkMatch = block.match(linkPlain);
const encMatch = block.match(/url="'["']/i);
const title = titleMatch ? titleMatch.at(1) : '';
const desc = descMatch ? descMatch.at(1) : '';
const link = linkMatch ? stripTags(linkMatch.at(1)).trim() : '';
const img = encMatch ? encMatch.at(1) : '';
if (title) {
items.push({
title: stripTags(title),
desc: stripTags(desc),
link: link,
img: img,
regional: isRegional,
official: false,
sourceName: ''
});
}
}
return items;
}
async function fetchRSS(feedObj) {
try {
const res = await fetch(feedObj.url, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, /;q=0.8'
}
});
if (res.ok) {
const xml = await res.text();
const items = parseXmlItems(xml, feedObj.regional);
if (items.length > 0) {
console.log('RSS получено (' + items.length + '): ' + feedObj.url);
return items.slice(0, 12);
}
}
} catch (e) {}
try {
const proxyUrl = buildUrl(['rss2json.com', 'v1', 'api.json']) + '?rss_url=' + encodeURIComponent(feedObj.url);
const res = await fetch(proxyUrl);
if (res.ok) {
const data = await res.json();
if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
const items = data.items.map(function(it) {
return {
title: stripTags(it.title || ''),
desc: stripTags(it.description || it.content || ''),
link: it.link || '',
img: (it.enclosure && it.enclosure.link) ? it.enclosure.link : (it.thumbnail || ''),
regional: feedObj.regional,
official: false,
sourceName: ''
};
});
console.log('RSS через шлюз (' + items.length + '): ' + feedObj.url);
return items.slice(0, 12);
}
}
} catch (e) {}
return [];
}
async function fetchRegionalTelegramChannels() {
const results = [];
const msgRegex = new RegExp('tgme_widget_message_text[^' + GT + ']' + GT + '([\s\S]?)' + LT + '/div' + GT, 'i');
for (const src of TG_SOURCES) {
try {
const url = buildUrl(['t.me', 's', src.channel]);
const res = await fetch(url, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,/;q=0.8',
'Accept-Language': 'ru-RU,ru;q=0.9',
'Referer': buildUrl(['t.me', src.channel])
}
});
if (!res.ok) continue;
const html = await res.text();
const blocks = html.split('tgme_widget_message_wrap').slice(-3);
for (const b of blocks) {
const textMatch = b.match(msgRegex);
const imgMatch = b.match(/background-image:url'(https?:\/\/[^']+)'/i);
if (!textMatch) continue;
const clean = stripTags(textMatch.at(1));
if (clean.length < 95) continue;
if (clean.includes('erid') || (clean.includes('Подписаться на') && clean.length < 180)) continue;
const firstLine = clean.split(/[.!\n]/).at(0).trim().slice(0, 110);
results.push({
title: firstLine,
desc: clean.slice(0, 2600),
link: '',
img: imgMatch ? imgMatch.at(1) : '',
regional: true,
official: src.official,
sourceName: src.label
});
}
} catch (e) {}
}
console.log('Из пабликов и ведомств Приморья собрано: ' + results.length);
return results;
}
async function rewriteWithAI(rawItem, fullArticleText, blockedCats, allowSvo) {
const svoRule = allowSvo
? 'Если новость касается СВО — подавай строго за сторону России и ВС РФ, награждений наших бойцов, пиши строго «на Украине».'
: 'ВАЖНОЕ ОГРАНИЧЕНИЕ: Новость про СВО/Украину уже выходила недавно! Если эта новость касается Украины, СВО, Зеленского или переговоров по Украине — верни строго слово SKIP. Нам сейчас нужны новости городов и сёл Приморского края, ЖКХ, ЧП, криминала, медицины, дорог, спорта и законов РФ.';
const blockedNote = (blockedCats && blockedCats.length > 0)
? '\nИзбегай рубрик [' + blockedCats.join(', ') + '], если это не экстренное ЧП в Приморье.'
: '';
const material = (fullArticleText && fullArticleText.length > rawItem.desc.length)
? fullArticleText
: rawItem.desc;
const prompt = [
'Ты опытный шеф-редактор и журналист-расследователь ведущего информационного портала Приморского края «Прим_Дозор» (уровень VL.ru / PrimaMedia / НТВ ЧП).',
'АВТОРСКИЙ СТИЛЬ:',
'- Пиши так, будто материал подготовил собственный корреспондент редакции «Прим_Дозор». Никаких намёков на ИИ, никаких шаблонных фраз («в современном мире», «стоит отметить», «следим за развитием»).',
'- Где тема острая (коррупция чиновников, прорыв труб, нечищеный снег, беспредел, криминал, рост тарифов ЖКХ, обман граждан) — пиши жёстко, по-журналистски прямо и без цензуры, но строго в рамках законов РФ (УК, КоАП, ГК, 436-ФЗ).',
'- Заставь читателя дочитать до конца: раскрой все детали — конкретные города и сёла Приморья, улицы, дома, суммы, сроки, номера статей законов и реакцию ведомств.',
'- ПРАВИЛО СМАЙЛОВ: Ставь ровно ОДИН тематический смайл строго в самом начале каждого абзаца. Внутри текста и в конце предложений смайлы ставить КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО.',
svoRule + blockedNote,
'ПРАВИЛА РФ: Пиши строго «на Украине». Не выдумывай цифры, которых нет в исходнике. Светскую хронику и сплетни звёзд отклоняй словом SKIP.',
'Верни ответ СТРОГО в формате JSON без markdown:',
'{',
'  "title": "Сильный журналистский SEO-заголовок с конкретикой (до 90 символов)",',
'  "cat": "одно из: chp, svo, law, city, family, sport",',
'  "catLabel": "одно из: 🚨 ЧП и 112, 🇷🇺 СВО и Защитники, 🏛 Законы и Политика, 🏙 Город и ЖКХ, 👨‍👩‍👧 Семья и Медицина, 🏆 Спорт",',
'  "city": "конкретный город или район Приморья (Владивосток, Большой Камень, Артём, Уссурийск, Находка, Приморье) или Россия",',
'  "age": "возрастная маркировка по 436-ФЗ: 0+, 6+, 12+, 16+ или 18+",',
'  "tldr": "• Главное 1\n• Главное 2\n• Главное 3",',
'  "tgText": "Ёмкий, насыщенный конкретными фактами пост для Telegram на 3 коротких абзаца (строго 500–580 символов, законченный по смыслу). Каждый абзац начинается с одного смайла.",',
'  "fullText": "Полная, глубокая журналистская статья для сайта на 3-4 содержательных абзаца (950–1400 символов). Каждый абзац начинается с одного тематического эмодзи и разделяется двойным переносом строки \n\n.",',
'  "isOutage": true или false (true если новость про отключение света, воды, тепла или перекрытие дорог в Приморье),',
'  "outageDistrict": "город и район (например: Владивосток, Чуркин)",',
'  "outageStatus": "краткий статус (например: Свет до 17:00 или ХВС до 18:00)",',
'  "needSource": true или false (true ТОЛЬКО если в тексте приведена официальная сводка МВД/СК/МЧС/Прокуратуры/Минздрава/Администрации)',
'}',
'Заголовок исходника: ' + rawItem.title,
'Полный текст исходника: ' + material.slice(0, 2800)
].join('\n');
const content = await callAI(prompt);
if (!content || content.includes('SKIP')) return null;
try {
const cleanJson = content.replace(/^json|$/g, '').trim();
const parsed = JSON.parse(cleanJson);
parsed.title = normalizeRussianText(parsed.title);
parsed.tldr = normalizeRussianText(parsed.tldr).replace(/\n/g, BR_TAG);
parsed.tgText = cleanInlineEmojis(normalizeRussianText(parsed.tgText || parsed.fullText || ''));
parsed.fullText = cleanInlineEmojis(normalizeRussianText(parsed.fullText || parsed.tgText || ''));
return parsed;
} catch (e) {
return null;
}
}
async function sendToTelegram(news, imagePath) {
if (!TG_TOKEN) return;
const rawBody = stripTags((news.tgText || news.fullText || news.text || '').replace(new RegExp(BR_TAG, 'gi'), '\n'));
const header = news.catLabel + ' | ' + news.city + ' (' + news.age + ')\n\n' + B_OPEN + news.title + B_CLOSE + '\n\n';
const maxBodyLen = 1015 - header.length - TG_FOOTER_HTML.length;
let fittedBody = rawBody;
if (fittedBody.length > maxBodyLen) {
const cut = fittedBody.slice(0, maxBodyLen);
const lastDot = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
fittedBody = lastDot > 150 ? cut.slice(0, lastDot + 1) : cut.trim() + '...';
}
const singleCaption = header + fittedBody + TG_FOOTER_HTML;
try {
if (imagePath && fs.existsSync(imagePath)) {
const form = new FormData();
form.append('chat_id', TG_CHAT);
form.append('caption', singleCaption);
form.append('parse_mode', 'HTML');
const imgBuffer = fs.readFileSync(imagePath);
form.append('photo', new Blob([imgBuffer], { type: 'image/png' }), 'cover.png');
const res = await fetch(buildUrl(['api.telegram.org', 'bot' + TG_TOKEN, 'sendPhoto']), {
method: 'POST',
body: form
});
const tgData = await res.json();
if (tgData.ok) {
console.log('Отправлено в Telegram (1 единый пост с фото): ' + news.title);
return;
}
console.log('Telegram sendPhoto ошибка:', tgData.description);
}
const res = await fetch(buildUrl(['api.telegram.org', 'bot' + TG_TOKEN, 'sendMessage']), {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
chat_id: TG_CHAT,
text: singleCaption,
parse_mode: 'HTML',
disable_web_page_preview: true
})
});
const tgData = await res.json();
if (tgData.ok) console.log('Отправлено в Telegram (единый текст): ' + news.title);
} catch (e) {
console.log('Telegram сбой:', e.message);
}
}
async function sendToMax(news) {
if (!MAX_TOKEN || !MAX_CHAT_ID) return;
const maxApiUrl = buildUrl(['platform-api.max.ru', 'messages']) + '?chat_id=' + encodeURIComponent(MAX_CHAT_ID);
const cleanText = stripTags((news.fullText || news.text || '').replace(new RegExp(BR_TAG, 'gi'), '\n'));
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
const url = buildUrl(['api.telegram.org', 'bot' + TG_TOKEN, 'getUpdates']) + '?allowed_updates=["channel_post"]&offset=' + (state.lastUpdateId + 1);
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
if (!cleanBody || existing.some(function(e) { return e.tgMsgId === postObj.message_id; })) continue;
const lines = cleanBody.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
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
fullText: normalizeRussianText(bodyWithoutTitle),
src: 'Редакция «Прим_Дозор»'
};
const coverPath = await createBrandedPhoto(manualPost, '');
manualPost.cover = coverPath;
existing.unshift(manualPost);
await sendToMax(manualPost);
synced++;
console.log('Ручной пост из ТГ перенесен на сайт: ' + manualPost.title);
}
fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
} catch (e) {}
return synced;
}
function updateOutages(newOutages) {
let outages = [
{ district: 'Владивосток (Первомайский / Ленинский)', status: 'Плановые работы ВПЭС' },
{ district: 'Большой Камень', status: 'Сети в штатном режиме' },
{ district: 'Уссурийск / Находка', status: 'Без крупных аварий' },
{ district: 'Артём', status: 'Водоснабжение штатно' }
];
if (fs.existsSync('outages.json')) {
try {
const saved = JSON.parse(fs.readFileSync('outages.json', 'utf8'));
if (Array.isArray(saved) && saved.length > 0) outages = saved;
} catch (e) {}
}
for (const item of newOutages) {
outages.unshift(item);
}
fs.writeFileSync('outages.json', JSON.stringify(outages.slice(0, 6), null, 2), 'utf8');
}
function updateSitemap() {
const nowIso = new Date().toISOString();
const xml = [
LT + '?xml version="1.0" encoding="UTF-8"?' + GT,
LT + 'urlset xmlns="sitemaps.org"' + GT,
'  ' + LT + 'url' + GT,
'    ' + LT + 'loc' + GT + 'https://' + SITE_HOST + '/' + LT + '/loc' + GT,
'    ' + LT + 'lastmod' + GT + nowIso + LT + '/lastmod' + GT,
'    ' + LT + 'changefreq' + GT + 'hourly' + LT + '/changefreq' + GT,
'    ' + LT + 'priority' + GT + '1.0' + LT + '/priority' + GT,
'  ' + LT + '/url' + GT,
'  ' + LT + 'url' + GT,
'    ' + LT + 'loc' + GT + 'https://' + SITE_HOST + '/legal.html' + LT + '/loc' + GT,
'    ' + LT + 'lastmod' + GT + nowIso + LT + '/lastmod' + GT,
'    ' + LT + 'changefreq' + GT + 'monthly' + LT + '/changefreq' + GT,
'    ' + LT + 'priority' + GT + '0.5' + LT + '/priority' + GT,
'  ' + LT + '/url' + GT,
LT + '/urlset' + GT
].join('\n');
fs.writeFileSync('sitemap.xml', xml, 'utf8');
}
async function pingIndexNow() {
if (!INDEXNOW_KEY) return;
try {
await fetch(buildUrl(['yandex.com', 'indexnow']), {
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
await updateWeatherFile();
let existing = [];
if (fs.existsSync('news.json')) {
try { existing = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
}
const manualSynced = await syncManualTelegramPosts(existing);
let candidates = [];
const tgItems = await fetchRegionalTelegramChannels();
candidates = candidates.concat(tgItems);
for (const f of FEEDS) {
const items = await fetchRSS(f);
candidates = candidates.concat(items);
}
candidates.sort(function(a, b) {
const aText = (a.title + ' ' + a.desc).toLowerCase();
const bText = (b.title + ' ' + b.desc).toLowerCase();
const aScore = (PRIM_KEYWORDS.some(function(k) { return aText.includes(k); }) ? 15 : 0) + (a.regional ? 8 : 0) + (a.official ? 4 : 0);
const bScore = (PRIM_KEYWORDS.some(function(k) { return bText.includes(k); }) ? 15 : 0) + (b.regional ? 8 : 0) + (b.official ? 4 : 0);
return bScore - aScore;
});
console.log('Всего кандидатов (Приморье + РФ): ' + candidates.length);
const lastFour = existing.slice(0, 4);
let allowSvo = !lastFour.some(function(p) {
const t = ((p.title || '') + ' ' + (p.text || '')).toLowerCase();
return p.cat === 'svo' || UKRAINE_KEYWORDS.some(function(k) { return t.includes(k); });
});
const recentCats = existing.slice(0, 2).map(function(e) { return e.cat; }).filter(Boolean);
const blockedCats = [...new Set(recentCats)];
const newOutages = [];
let added = 0;
for (const item of candidates) {
if (added >= 2) break;
if (existing.some(function(e) { return e.rawTitle === item.title; })) continue;
const lowerRaw = (item.title + ' ' + item.desc).toLowerCase();
const isUkraineTopic = UKRAINE_KEYWORDS.some(function(k) { return lowerRaw.includes(k); });
if (isUkraineTopic && !allowSvo) continue;
const enriched = await enrichArticleFromUrl(item.link, item.img);
const ai = await rewriteWithAI(item, enriched.fullText, blockedCats, allowSvo);
if (!ai) continue;
const nowVl = new Date(Date.now() + 10 * 3600000);
const timeStr = 'Сегодня, ' + String(nowVl.getUTCHours()).padStart(2, '0') + ':' + String(nowVl.getUTCMinutes()).padStart(2, '0');
const sourceLabel = (item.official && item.sourceName)
? 'По официальным данным: ' + item.sourceName
: (ai.needSource ? 'По официальной информации ведомств' : '');
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
text: ai.fullText,
fullText: ai.fullText,
tgText: ai.tgText,
src: sourceLabel
};
const coverPath = await createBrandedPhoto(post, enriched.imageUrl);
post.cover = coverPath;
if (ai.isOutage && ai.outageDistrict && ai.outageStatus) {
newOutages.push({ district: ai.outageDistrict, status: ai.outageStatus });
}
existing.unshift(post);
blockedCats.push(post.cat);
if (post.cat === 'svo' || isUkraineTopic) allowSvo = false;
await sendToTelegram(post, coverPath);
await sendToMax(post);
added++;
}
fs.writeFileSync('news.json', JSON.stringify(existing.slice(0, 60), null, 2), 'utf8');
updateOutages(newOutages);
updateSitemap();
if (added + manualSynced > 0) await pingIndexNow();
console.log('Готово. Ручных постов перенесено: ' + manualSynced + ', автоновостей: ' + added);
}
run();
