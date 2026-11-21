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
  { url: 'https://' + 'vestiprim.ru' + '/rss.xml', regional: true },
  { url: 'https://' + 'ria.ru' + '/export/rss2/archive/index.xml', regional: false },
  { url: 'https://' + 'tass.ru' + '/rss/v2.xml', regional: false }
];

const TG_SOURCES = [
  { channel: 'mchs_primorye', label: 'МЧС Приморья' },
  { channel: 'primorskyadmin', label: 'Правительство Приморского края' },
  { channel: 'adm_vl', label: 'Администрация Владивостока' },
  { channel: 'prok_prim', label: 'Прокуратура Приморского края' },
  { channel: 'umvd_pk', label: 'УМВД Приморья' },
  { channel: 'dpscontrol_125rus', label: 'ДПС Контроль Приморье' },
  { channel: 'newsvlru', label: 'Новости Владивостока' }
];

const PRIM_KEYWORDS = [
  'примор', 'владивосток', 'уссурийск', 'находк', 'артём', 'артем',
  'большой камен', 'большом камн', 'дальневосточ', 'дфо', 'кожемяко',
  'тихоокеан', 'чуркин', 'океанск', 'русский мост', 'золотой мост',
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

// Смайлы оставляем ТОЛЬКО в самом начале абзацев/строк, убирая их из середины и конца предложений
function cleanInlineEmojis(text) {
  if (!text) return '';
  const emojiRegex = /[\p{Extended_Pictographic}\u2600-\u27BF]/gu;
  return text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    const firstMatch = trimmed.match(/^([\p{Extended_Pictographic}\u2600-\u27BF]+\s*)/u);
    const prefix = firstMatch ? firstMatch.at(1) : '';
    const rest = trimmed.slice(prefix.length).replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trim();
    return prefix + rest;
  }).join('\n');
}

async function enrichArticleFromUrl(articleUrl, fallbackImg) {
  let fullText = '';
  let imageUrl = fallbackImg || '';
  if (!articleUrl) return { fullText, imageUrl };

  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
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
      if (paragraphs.join(' ').length > 2800) break;
    }
    fullText = paragraphs.join('\n\n');
  } catch (e) {}

  return { fullText, imageUrl };
}

function getCategoryPalette(cat) {
  const palettes = {
    chp: { c1: '#2a0d0d', c2: '#14171d', accent: '#dc2626', tag: 'ЭКСТРЕННАЯ СВОДКА 112' },
    svo: { c1: '#141e18', c2: '#12151a', accent: '#16a34a', tag: 'СВО И ЗАЩИТНИКИ ОТЕЧЕСТВА' },
    law: { c1: '#101a2e', c2: '#13161c', accent: '#2563eb', tag: 'ЗАКОНЫ, СУДЫ И ВЛАСТЬ' },
    city: { c1: '#1e1b14', c2: '#14171d', accent: '#d97706', tag: 'ГОРОД, ДОРОГИ И ЖКХ' },
    family: { c1: '#0f2326', c2: '#14171d', accent: '#0891b2', tag: 'ОБЩЕСТВО, СЕМЬЯ И МЕДИЦИНА' },
    sport: { c1: '#161b29', c2: '#11141a', accent: '#4f46e5', tag: 'СПОРТ ПРИМОРЬЯ И РОССИИ' }
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
    const bottomGrad = ctx.createLinearGradient(0, height - 220, 0, height);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(1, 'rgba(10, 12, 16, 0.92)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height - 220, width, 220);

    // Заголовок в нижней части реального фото для максимальной информативности
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    const words = (post.title || '').split(' ');
    let l1 = '';
    let l2 = '';
    for (const w of words) {
      if (ctx.measureText(l1 + ' ' + w).width < 1100 && !l2) {
        l1 = l1 ? l1 + ' ' + w : w;
      } else if (ctx.measureText(l2 + ' ' + w).width < 1100) {
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

  // Диагональный водяной знак ПРИМ_ДОЗОР
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-22 * Math.PI / 180);
  ctx.font = 'bold 38px sans-serif';
  ctx.fillStyle = bgDrawn ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.045)';
  ctx.textAlign = 'center';
  for (let row = -360; row <= 360; row += 170) {
    for (let col = -650; col <= 650; col += 480) {
      ctx.fillText('ПРИМ_ДОЗОР', col, row);
    }
  }
  ctx.restore();

  // Верхний шильдик бренда и рубрики
  ctx.fillStyle = pal.accent;
  ctx.fillRect(36, 30, 235, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ПРИМ_ДОЗОР', 56, 60);

  ctx.fillStyle = 'rgba(15, 18, 24, 0.85)';
  ctx.fillRect(271, 30, 520, 44);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText((post.city || 'ПРИМОРЬЕ').toUpperCase() + '  •  ' + pal.tag, 289, 59);

  // Нижняя полоса портала
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, height - 8, width, 8);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 18px sans-serif';
ctx.fillText('PRIMDOZOR.RU  •  НЕЗАВИСИМЫЙ НАДЗОР ПРИМОРЬЯ 24/7', 36, height - 24);
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
temperature: 0.45
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
regional: feedObj.regional
});
}
}
console.log('RSS получено (' + items.length + '): ' + feedObj.url);
return items.slice(0, 10);
} catch (e) {
return [];
}
}
async function fetchRegionalTelegramChannels() {
const results = [];
const msgRegex = new RegExp('tgme_widget_message_text[^' + GT + ']' + GT + '([\s\S]?)' + LT + '/div' + GT, 'i');
for (const src of TG_SOURCES) {
try {
const url = 'https://' + 't.me' + '/s/' + src.channel;
const res = await fetch(url, {
headers: { 'User-Agent': 'Mozilla/5.0' }
});
if (!res.ok) continue;
const html = await res.text();
const blocks = html.split('tgme_widget_message_wrap').slice(-4);
for (const b of blocks) {
const textMatch = b.match(msgRegex);
const imgMatch = b.match(/background-image:url'(https?:\/\/[^']+)'/i);
if (!textMatch) continue;
const clean = stripTags(textMatch.at(1));
if (clean.length < 90) continue;
const firstLine = clean.split('.').at(0).slice(0, 100);
results.push({
title: firstLine,
desc: clean.slice(0, 2200),
link: '',
img: imgMatch ? imgMatch.at(1) : '',
regional: true,
officialSource: src.label
});
}
} catch (e) {}
}
console.log('Из местных ТГ-каналов и ведомств получено: ' + results.length);
return results;
}
async function rewriteWithAI(rawItem, fullArticleText, blockedCats, allowSvo) {
const svoRule = allowSvo
? 'Если новость касается СВО или политики — подавай строго в поддержку России и ВС РФ, награждений наших бойцов, пиши строго «на Украине».'
: 'ВАЖНОЕ ОГРАНИЧЕНИЕ: Новость про СВО/Украину уже выходила недавно! Если эта новость касается Украины, СВО, Зеленского или переговоров по Украине — верни строго слово SKIP. Нам сейчас нужны новости Приморского края, ЖКХ, ЧП, криминала, медицины, дорог, спорта и законов для граждан.';
const blockedNote = (blockedCats && blockedCats.length > 0)
? '\nИзбегай рубрик [' + blockedCats.join(', ') + '], если это не срочное ЧП в Приморье.'
: '';
const material = (fullArticleText && fullArticleText.length > rawItem.desc.length)
? fullArticleText
: rawItem.desc;
const prompt = [
'Ты главный редактор крупного регионального СМИ «Прим_Дозор» (уровень VL.ru / РБК / НТВ ЧП).',
'СТИЛЬ И КАЧЕСТВО ТЕКСТА:',
'- Пиши живым, острым, профессиональным журналистским языком, чтобы читатель дочитывал до конца. Никаких общих фраз и канцелярита!',
'- Обязательно сохраняй ВСЕ конкретные детали из исходника: улицы, районы, номера домов, суммы штрафов/ущерба, сроки, решения судов, фамилии должностных лиц.',
'- ПРАВИЛО СМАЙЛОВ: Смайлы ставь ТОЛЬКО в самом начале абзаца (один тематический смайл перед первым словом абзаца). Внутри текста и в конце предложений смайлы ставить ЗАПРЕЩЕНО.',
svoRule + blockedNote,
'ПРАВИЛА РФ: Пиши строго «на Украине». Не выдумывай цифры, которых нет в исходнике. Соблюдай УК, КоАП, ГК, 436-ФЗ. Светскую хронику и шоу-бизнес отклоняй словом SKIP.',
'Верни ответ СТРОГО в формате JSON без markdown:',
'{',
'  "title": "Сильный журналистский SEO-заголовок с конкретикой (до 90 символов)",',
'  "cat": "одно из: chp, svo, law, city, family, sport",',
'  "catLabel": "одно из: 🚨 ЧП и 112, 🇷🇺 СВО и Защитники, 🏛 Законы и Политика, 🏙 Город и ЖКХ, 👨‍👩‍👧 Семья и Медицина, 🏆 Спорт",',
'  "city": "город Приморья (Владивосток, Большой Камень, Артём, Уссурийск, Находка, Приморье) или Россия",',
'  "age": "возрастная маркировка по 436-ФЗ: 0+, 6+, 12+, 16+ или 18+",',
'  "tldr": "• Главное 1\n• Главное 2\n• Главное 3",',
'  "fullText": "Полная, развёрнутая журналистская статья на 3-4 содержательных абзаца (900–1300 символов). Каждый абзац начинается с одного тематического эмодзи и разделяется двойным переносом строки \n\n.",',
'  "isOutage": true или false (true если новость про отключение света, воды, отопления или перекрытие дорог в Приморье),',
'  "outageDistrict": "город и район (например: Владивосток, Чуркин)",',
'  "outageStatus": "краткий статус (например: Свет до 17:00 или ХВС до 18:00)",',
'  "needSource": true или false (true ТОЛЬКО если это официальная сводка ведомства)',
'}',
'Заголовок исходника: ' + rawItem.title,
'Полный текст исходника: ' + material.slice(0, 2600)
].join('\n');
const content = await callAI(prompt);
if (!content || content.includes('SKIP')) return null;
try {
const cleanJson = content.replace(/^json|$/g, '').trim();
const parsed = JSON.parse(cleanJson);
parsed.title = normalizeRussianText(parsed.title);
parsed.tldr = normalizeRussianText(parsed.tldr).replace(/\n/g, BR_TAG);
const cleanedArticle = cleanInlineEmojis(normalizeRussianText(parsed.fullText || parsed.tgText || ''));
parsed.fullText = cleanedArticle;
parsed.tgText = cleanedArticle;
return parsed;
} catch (e) {
return null;
}
}
// Отправка ПОЛНОГО поста в Telegram без потери смысла и обрезки
async function sendToTelegram(news, imagePath) {
if (!TG_TOKEN) return;
const cleanBody = stripTags((news.fullText || news.text || '').replace(new RegExp(BR_TAG, 'gi'), '\n'));
const header = news.catLabel + ' | ' + news.city + ' (' + news.age + ')\n\n' + B_OPEN + news.title + B_CLOSE + '\n\n';
const fullMessage = header + cleanBody + TG_FOOTER_HTML;
try {
// 1. Если весь полный текст вместе с подвалом помещается в 1020 символов — шлём одним постом с фото
if (imagePath && fs.existsSync(imagePath) && fullMessage.length <= 1020) {
const form = new FormData();
form.append('chat_id', TG_CHAT);
form.append('caption', fullMessage);
form.append('parse_mode', 'HTML');
const imgBuffer = fs.readFileSync(imagePath);
form.append('photo', new Blob([imgBuffer], { type: 'image/png' }), 'cover.png');
const res = await fetch('https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/sendPhoto', {
method: 'POST',
body: form
});
const tgData = await res.json();
if (tgData.ok) {
console.log('Отправлено в Telegram (единый пост с фото): ' + news.title);
return;
}
}
// 2. Если статья большая и глубокая (> 1020 символов) — отправляем фото с заголовком + полный текст без обрезки!
if (imagePath && fs.existsSync(imagePath)) {
const form = new FormData();
form.append('chat_id', TG_CHAT);
form.append('caption', news.catLabel + ' | ' + news.city + ' (' + news.age + ')\n\n' + B_OPEN + news.title + B_CLOSE);
form.append('parse_mode', 'HTML');
const imgBuffer = fs.readFileSync(imagePath);
form.append('photo', new Blob([imgBuffer], { type: 'image/png' }), 'cover.png');
await fetch('https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/sendPhoto', {
method: 'POST',
body: form
});
}
const res = await fetch('https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/sendMessage', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
chat_id: TG_CHAT,
text: fullMessage.slice(0, 4090),
parse_mode: 'HTML',
disable_web_page_preview: true
})
});
const tgData = await res.json();
if (tgData.ok) {
console.log('Отправлено в Telegram (фото + полный текст): ' + news.title);
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
{ district: 'Владивосток (Первомайский р-н)', status: 'Плановые работы ВПЭС' },
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
const tgItems = await fetchRegionalTelegramChannels();
candidates = candidates.concat(tgItems);
for (const f of FEEDS) {
const items = await fetchRSS(f);
candidates = candidates.concat(items);
}
candidates.sort((a, b) => {
const aText = (a.title + ' ' + a.desc).toLowerCase();
const bText = (b.title + ' ' + b.desc).toLowerCase();
const aScore = (PRIM_KEYWORDS.some(k => aText.includes(k)) ? 15 : 0) + (a.regional ? 5 : 0);
const bScore = (PRIM_KEYWORDS.some(k => bText.includes(k)) ? 15 : 0) + (b.regional ? 5 : 0);
return bScore - aScore;
});
console.log('Всего кандидатов (Приморье + РФ): ' + candidates.length);
const lastFour = existing.slice(0, 4);
let allowSvo = !lastFour.some(p => {
const t = ((p.title || '') + ' ' + (p.text || '')).toLowerCase();
return p.cat === 'svo' || UKRAINE_KEYWORDS.some(k => t.includes(k));
});
const recentCats = existing.slice(0, 2).map(e => e.cat).filter(Boolean);
const blockedCats = [...new Set(recentCats)];
const newOutages = [];
let added = 0;
for (const item of candidates) {
if (added >= 2) break;
if (existing.some(e => e.rawTitle === item.title)) continue;
const lowerRaw = (item.title + ' ' + item.desc).toLowerCase();
const isUkraineTopic = UKRAINE_KEYWORDS.some(k => lowerRaw.includes(k));
if (isUkraineTopic && !allowSvo) continue;
const enriched = await enrichArticleFromUrl(item.link, item.img);
const ai = await rewriteWithAI(item, enriched.fullText, blockedCats, allowSvo);
if (!ai) continue;
const nowVl = new Date(Date.now() + 10 * 3600000);
const timeStr = 'Сегодня, ' + String(nowVl.getUTCHours()).padStart(2, '0') + ':' + String(nowVl.getUTCMinutes()).padStart(2, '0');
const sourceLabel = item.officialSource
? 'По сообщению: ' + item.officialSource
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
