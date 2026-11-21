'  "city": "город Приморья (Владивосток, Большой Камень, Артём, Уссурийск, Находка, Приморье) или Россия",',
'  "age": "возрастная маркировка по 436-ФЗ: 0+, 6+, 12+, 16+ или 18+",',
'  "tldr": "• Краткий факт 1
• Краткий факт 2",',
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
parsed.tldr = normalizeRussianText(parsed.tldr);
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
// Если есть обложка и текст укладывается в лимит подписи к фото (1024 символа) — шлём с картинкой
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
// Резервная отправка текстом, если пост длиннее 1020 символов
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
// Жёсткая сортировка: новости с упоминанием Владивостока и Приморского края всегда в самом верху
candidates.sort((a, b) => {
const aText = (a.title + ' ' + a.desc).toLowerCase();
const bText = (b.title + ' ' + b.desc).toLowerCase();
const aScore = (PRIM_KEYWORDS.some(k => aText.includes(k)) ? 10 : 0) + (a.regional ? 3 : 0);
const bScore = (PRIM_KEYWORDS.some(k => bText.includes(k)) ? 10 : 0) + (b.regional ? 3 : 0);
return bScore - aScore;
});
console.log('Всего кандидатов из RSS: ' + candidates.length);
// Проверяем, была ли тема СВО/Украины в последних 4 публикациях (разрешаем не чаще 1 раза из 5 постов)
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
