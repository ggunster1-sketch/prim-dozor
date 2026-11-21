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

// Приморские СМИ и федеральные ленты
const FEEDS = [
  { url: 'https://' + 'www.dv.kp.ru' + '/rss/allsections.xml', regional: true },
  { url: 'https://' + 'vl.aif.ru' + '/rss/all.php', regional: true },
  { url: 'https://' + 'deita.ru' + '/rss.xml', regional: true },
  { url: 'https://' + 'vestiprim.ru' + '/rss.xml', regional: true },
  { url: 'https://' + 'ria.ru' + '/export/rss2/archive/index.xml', regional: false },
  { url: 'https://' + 'tass.ru' + '/rss/v2.xml', regional: false }
];

// Официальные ведомства и местные Telegram-каналы Приморья (публичный веб-просмотр t.me/s/)
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

// Загрузка полного текста статьи и картинки со страницы первоисточника
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
      if (txt.length > 60 && !txt.includes('cookie') && !txt.includes('Подписывайтесь')) {
        paragraphs.push(txt);
      }
      if (paragraphs.join(' ').length > 2200) break;
    }
    fullText = paragraphs.join('\n\n');
  } catch (e) {}

  return { fullText, imageUrl };
}

// Скачивание реального фото новости + наложение водяного знака ПРИМ_ДОЗОР
async function createBrandedPhoto(post, sourceImageUrl) {
  if (!fs.existsSync('covers')) {
    fs.mkdirSync('covers', { recursive: true });
  }
  const width = 1200;
  const height = 675;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

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
    // Резервный редакционный фон, если источник не отдал фото
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#141820');
    grad.addColorStop(1, '#232a36');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'left';
    const words = (post.title || '').split(' ');
    let line = '';
    let y = 220;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > 1060) {
        ctx.fillText(line, 64, y);
        line = w;
        y += 58;
      } else {
        line = test;
      }
    }
    if (line && y < 520) ctx.fillText(line, 64, y);
  } else {
    // Лёгкое затемнение нижней части фото для читаемости плашки
    const bottomGrad = ctx.createLinearGradient(0, height - 180, 0, height);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGrad.addColorStop(1, 'rgba(10, 12, 16, 0.88)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, height - 180, width, 180);
  }

  // Диагональный защитный водяной знак ПРИМ_ДОЗОР по всему кадру
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-24 * Math.PI / 180);
  ctx.font = 'bold 42px sans-serif';
  ctx.fillStyle = bgDrawn ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)';
  ctx.textAlign = 'center';
  for (let row = -380; row <= 380; row += 160) {
    for (let col = -680; col <= 680; col += 460) {
      ctx.fillText('ПРИМ_ДОЗОР', col, row);
    }
  }
  ctx.restore();

  // Верхний левый фирменный шильдик ПРИМ_ДОЗОР
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(36, 32, 235, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 23px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ПРИМ_ДОЗОР', 56, 63);

  // Плашка города рядом с логотипом
  ctx.fillStyle = 'rgba(15, 18, 24, 0.82)';
  ctx.fillRect(271, 32, 260, 46);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText((post.city || 'ПРИМОРЬЕ').toUpperCase(), 289, 62);

  // Нижняя строка портала
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, height - 10, width, 10);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRIMDOZOR.RU  •  ГЛАВНЫЙ НАДЗОР ПРИМОРЬЯ 24/7', 36, height - 28);

  ctx.fillStyle = '#fca5a5';
  ctx.textAlign = 'right';
  ctx.fillText(post.age || '18+', width - 36, height - 28);

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
// Сбор постов из официальных ведомств и местных Telegram-каналов Приморья
async function fetchRegionalTelegramChannels() {
const results = [];
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
const textMatch = b.match(/tgme_widget_message_text[^>]>([\s\S]?)</div>/i);
const imgMatch = b.match(/background-image:url'(https?:\/\/[^']+)'/i);
if (!textMatch) continue;
const clean = stripTags(textMatch.at(1));
if (clean.length < 80) continue;
const firstLine = clean.split('.').at(0).slice(0, 100);
results.push({
title: firstLine,
desc: clean.slice(0, 1800),
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
? 'Если новость касается СВО или политики — подавай строго в поддержку России и ВС РФ, пиши строго «на Украине».'
: 'ВАЖНОЕ ОГРАНИЧЕНИЕ: Новость про СВО/Украину уже выходила недавно! Если эта новость касается Украины, СВО, Зеленского или переговоров по Украине — верни строго слово SKIP. Нам сейчас нужны новости Приморского края, ЖКХ, ЧП, медицины, дорог и законов для граждан.';
const blockedNote = (blockedCats && blockedCats.length > 0)
? '\nИзбегай рубрик [' + blockedCats.join(', ') + '], если это не срочное ЧП в Приморье.'
: '';
const material = (fullArticleText && fullArticleText.length > rawItem.desc.length)
? fullArticleText
: rawItem.desc;
const prompt = [
'Ты шеф-редактор крупного городского портала Приморского края «Прим_Дозор» (уровень VL.ru / РБК).',
'ЗАДАЧА: Написать подробный, содержательный, глубокий и полезный материал для жителей Владивостока и Приморья. Никакой «воды» и коротких отписок — дай все конкретные факты: адреса, улицы, сроки, суммы, номера телефонов, решения судов или ведомств.',
svoRule + blockedNote,
'ПРАВИЛА: Пиши строго «на Украине». Не выдумывай цифры, которых нет в исходнике. Соблюдай УК, КоАП, ГК, 436-ФЗ. Светскую хронику и шоу-бизнес отклоняй словом SKIP.',
'Верни ответ СТРОГО в формате JSON без markdown:',
'{',
'  "title": "Информативный SEO-заголовок с конкретикой (до 90 символов)",',
'  "cat": "одно из: chp, svo, law, city, family, sport",',
'  "catLabel": "одно из: 🚨 ЧП и 112, 🇷🇺 СВО и Защитники, 🏛 Законы и Политика, 🏙 Город и ЖКХ, 👨‍👩‍👧 Семья и Медицина, 🏆 Спорт",',
'  "city": "город Приморья (Владивосток, Большой Камень, Артём, Уссурийск, Находка, Приморье) или Россия",',
'  "age": "возрастная маркировка по 436-ФЗ: 0+, 6+, 12+, 16+ или 18+",',
'  "tldr": "• Главное 1\n• Главное 2\n• Главное 3",',
'  "tgText": "Развёрнутый, насыщенный фактами пост для Telegram (550–680 символов, 2-3 абзаца с эмодзи, чтобы читатель получил полную картину прямо в ленте)",',
'  "fullText": "Полная подробная статья для сайта на 3-4 абзаца со всеми деталями, адресами и разъяснениями",',
'  "isOutage": true или false (true если новость про отключение света, воды, отопления или перекрытие дорог в Приморье),',
'  "outageDistrict": "район или город (например: Владивосток, Чуркин)",',
'  "outageStatus": "краткий статус (например: Свет до 17:00 или ХВС до 18:00)",',
'  "needSource": true или false (true ТОЛЬКО если это официальное сообщение ведомства/ведомственного ТГ-канала)',
'}',
'Заголовок исходника: ' + rawItem.title,
'Полный текст исходника: ' + material.slice(0, 2400)
].join('\n');
const content = await callAI(prompt);
if (!content || content.includes('SKIP')) return null;
try {
const cleanJson = content.replace(/^json|$/g, '').trim();
const parsed = JSON.parse(cleanJson);
parsed.title = normalizeRussianText(parsed.title);
parsed.tldr = normalizeRussianText(parsed.tldr).replace(/\n/g, BR_TAG);
parsed.tgText = normalizeRussianText(parsed.tgText || parsed.fullText);
parsed.fullText = normalizeRussianText(parsed.fullText || parsed.tgText);
return parsed;
} catch (e) {
return null;
}
}
async function sendToTelegram(news, imagePath) {
if (!TG_TOKEN) return;
const cleanTgBody = stripTags((news.tgText || news.text || '').replace(new RegExp(BR_TAG, 'gi'), '\n'));
const header = news.catLabel + ' | ' + news.city + ' (' + news.age + ')\n\n' + B_OPEN + news.title + B_CLOSE + '\n\n';
const maxBodyLen = 1015 - header.length - TG_FOOTER_HTML.length;
const fittedBody = cleanTgBody.length > maxBodyLen
? cleanTgBody.slice(0, maxBodyLen - 3).trim() + '...'
: cleanTgBody;
const fullCaption = header + fittedBody + TG_FOOTER_HTML;
try {
if (imagePath && fs.existsSync(imagePath)) {
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
console.log('Отправлено в Telegram с фото-обложкой: ' + news.title);
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
if (tgData.ok) console.log('Отправлено в Telegram (текст): ' + news.title);
} catch (e) {
console.log('Telegram сбой:', e.message);
}
}
async function sendToMax(news) {
if (!MAX_TOKEN || !MAX_CHAT_ID) return;
const maxApiUrl = 'https://' + 'platform-api.max.ru' + '/messages?chat_id=' + encodeURIComponent(MAX_CHAT_ID);
const cleanText = stripTags((news.tgText || news.text || '').replace(new RegExp(BR_TAG, 'gi'), '\n'));
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
text: ai.tgText,
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
