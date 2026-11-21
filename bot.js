const fs = require('fs');

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
  'https://' + 'www.dv.kp.ru' + '/rss/allsections.xml',
  'https://' + 'vl.aif.ru' + '/rss/all.php',
  'https://' + 'www.kp.ru' + '/rss/allsections.xml',
  'https://' + 'ria.ru' + '/export/rss2/archive/index.xml',
  'https://' + 'tass.ru' + '/rss/v2.xml',
  'https://' + 'lenta.ru' + '/rss/news'
];

const PRIM_KEYWORDS = ['примор', 'владивосток', 'уссурийск', 'находк', 'артём', 'артем', 'большой камен', 'большом камн', 'дальневосточ', 'дфо', 'кожемяко', 'тихоокеан'];

function normalizeRussianText(str) {
  if (!str) return '';
  return str
    .replace(/\bв Украине\b/g, 'на Украине')
    .replace(/\bВ Украине\b/g, 'На Украине')
    .replace(/\bв украине\b/g, 'на Украине');
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

async function fetchRSS(url) {
  try {
    const res = await fetch(url, {
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
          desc: desc.replace(/<[^>]+>/g, '').trim()
        });
      }
    }
    console.log('RSS получено (' + items.length + '): ' + url);
    return items.slice(0, 10);
  } catch (e) {
    return [];
  }
}

async function rewriteWithAI(rawItem, blockedCats) {
  const blockedNote = (blockedCats && blockedCats.length > 0)
    ? '\nВАЖНО: Рубрики [' + blockedCats.join(', ') + '] уже опубликованы только что! Если эта новость относится к ним — верни строго слово SKIP, нам нужно разнообразие других рубрик.'
    : '';

  const prompt = [
    'Ты главный редактор информационного портала «Прим_Дозор» (Владивосток, Приморский край, Россия).',
    'ЗАДАЧА: Освещать ВСЕ стороны жизни Приморья и России: происшествия (ЧП и 112), ЖКХ и благоустройство, новые законы и выплаты, медицину и семью, спорт, а также СВО. Не зацикливайся только на военной теме — нам нужна живая, сбалансированная картина дня.' + blockedNote,
    'ЖЕСТКИЕ ПРАВИЛА РЕДАКЦИИ:',
    '1. ПОЗИЦИЯ ПО РФ И СВО: Материалы о России и СВО подаются в государственном патриотическом ключе, с опорой на официальные данные ведомств РФ. Запрещено ретранслировать враждебную пропаганду.',
    '2. НОРМА РУССКОГО ЯЗЫКА: Пиши строго «на Украине» (никогда не пиши «в Украине»).',
    '3. ЗАКОНЫ РФ И ТОЧНОСТЬ: Не выдумывай цифры и факты. Соблюдай УК, КоАП, ГК, 436-ФЗ. Если новость пустая (светские сплетни, шоу-бизнес, гороскопы) — верни строго слово SKIP.',
    'Верни ответ СТРОГО в формате JSON без markdown:',
    '{',
    '  "title": "Точный информативный SEO-заголовок (до 90 символов)",',
    '  "cat": "одно из: chp, svo, law, city, family, sport",',
    '  "catLabel": "одно из: 🚨 ЧП и 112, 🇷🇺 СВО и Защитники, 🏛 Законы и Политика, 🏙 Город и ЖКХ, 👨‍👩‍👧 Семья и Медицина, 🏆 Спорт",',
    '  "city": "город Приморья (Владивосток, Большой Камень, Артём, Уссурийск, Находка) или Россия",',
    '  "age": "возрастная маркировка по 436-ФЗ: 0+, 6+, 12+, 16+ или 18+",',
    '  "tldr": "• Краткий факт 1<br>• Краткий факт 2",',
    '  "text": "Полный уникальный текст статьи в спокойном, уверенном редакционном стиле с уместными эмодзи (2-3 абзаца)",',
    '  "needSource": true или false (true ТОЛЬКО если это официальная сводка Минобороны РФ/МВД/СК/МЧС/Прокуратуры/Правительства или прямая цитата; для обычного пересказа факта ставь false)',
    '}',
    'Исходник: ' + rawItem.title + '. ' + rawItem.desc
  ].join('\n');

  const content = await callAI(prompt);
  if (!content || content.includes('SKIP')) return null;
  try {
    const cleanJson = content.replace(/^```json|```$/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    parsed.title = normalizeRussianText(parsed.title);
    parsed.tldr = normalizeRussianText(parsed.tldr);
    parsed.text = normalizeRussianText(parsed.text);
    return parsed;
  } catch (e) {
    return null;
  }
}

async function sendToTelegram(news) {
  if (!TG_TOKEN) return;
  const tgApiUrl = 'https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/sendMessage';
  const cleanText = (news.text || '').replace(/<br\s*\/?>/gi, '\n');
  const caption = news.catLabel + ' | ' + news.city + ' (' + news.age + ')\n\n<b>' + news.title + '</b>\n\n' + cleanText + TG_FOOTER_HTML;

  try {
    const res = await fetch(tgApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const tgData = await res.json();
    if (tgData.ok) {
      console.log('Отправлено в Telegram: ' + news.title);
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
  const cleanText = (news.text || '').replace(/<br\s*\/?>/gi, '\n');
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
    if (res.ok) {
      console.log('Отправлено в Макс: ' + news.title);
    } else {
      console.log('Макс статус:', res.status);
    }
  } catch (e) {
    console.log('Макс сбой:', e.message);
  }
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
existing.unshift(manualPost);
await sendToMax(manualPost);
synced++;
console.log('Ручной пост из ТГ перенесен на сайт: ' + manualPost.title);
}
fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
} catch (e) {
console.log('Ошибка синхронизации ручных постов ТГ:', e.message);
}
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
const aIsPrim = PRIM_KEYWORDS.some(k => aText.includes(k)) ? 1 : 0;
const bIsPrim = PRIM_KEYWORDS.some(k => bText.includes(k)) ? 1 : 0;
return bIsPrim - aIsPrim;
});
console.log('Всего кандидатов из RSS: ' + candidates.length);
const recentCats = existing.slice(0, 2).map(e => e.cat).filter(Boolean);
const blockedCats = [...new Set(recentCats)];
let added = 0;
for (const item of candidates) {
if (added >= 2) break;
if (existing.some(e => e.rawTitle === item.title)) continue;
const ai = await rewriteWithAI(item, blockedCats);
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
existing.unshift(post);
blockedCats.push(post.cat);
await sendToTelegram(post);
await sendToMax(post);
added++;
}
fs.writeFileSync('news.json', JSON.stringify(existing.slice(0, 60), null, 2), 'utf8');
updateSitemap();
if (added + manualSynced > 0) await pingIndexNow();
console.log('Готово. Ручных постов перенесено: ' + manualSynced + ', автоновостей: ' + added);
}
run();
