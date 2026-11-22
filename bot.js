const fs = require('fs');
const https = require('https');
const { buildHtml } = require('./builder');
const { isAdOrSpam, updateLiveOutages, drawThemedCover } = require('./media');
const { postToTelegram } = require('./tg');

const AI_KEY = (process.env.AI_API_KEY || '').trim();
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim();
const TG_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const HOST = 'primdozor.ru';
const SLASH = String.fromCharCode(47);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const NL = String.fromCharCode(10);

const CHANNELS = [
  { id: 'dpskontrol_125rus', name: 'ДПС Контроль Приморье', off: false },
  { id: 'dpsvl', name: 'ДПС Владивосток', off: false },
  { id: 'gibdd25', name: 'Госавтоинспекция Приморья', off: true },
  { id: 'newsvlc', name: 'Новости Владивостока', off: false },
  { id: 'vlnews25', name: 'VL News 25', off: false },
  { id: 'svodka25', name: 'Сводка 25', off: false },
  { id: 'prim_police', name: 'УМВД Приморского края', off: true },
  { id: 'prosecutor_pk', name: 'Прокуратура Приморского края', off: true },
  { id: 'sledcom25', name: 'СУ СК по Приморскому краю', off: true },
  { id: 'mchs_primorye', name: 'ГУ МЧС по Приморскому краю', off: true },
  { id: 'primorskyadmin', name: 'Правительство Приморского края', off: true },
  { id: 'kozhemyako_official', name: 'Губернатор Олег Кожемяко', off: true },
  { id: 'shestakovblog', name: 'Глава Владивостока', off: true },
  { id: 'ussurmedia', name: 'Уссурийск Новости', off: false },
  { id: 'nakhodka_news', name: 'Находка Новости', off: false },
  { id: 'artem_news25', name: 'Артём Новости', off: false },
  { id: 'primamedia', name: 'PrimaMedia', off: false },
  { id: 'vostokmedia24', name: 'Восток-Медиа', off: false },
  { id: 'vpes_vl', name: 'ВПЭС Владивосток', off: true },
  { id: 'primvodokanal', name: 'Примводоканал', off: true },
  { id: 'minzdrav_pk', name: 'Минздрав Приморья', off: true }
];

function getHttp(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, timeout: 9000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

function cleanText(s) {
  return String(s || '').replace(new RegExp(LT + '[^' + GT + ']+' + GT, 'g'), ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function isDuplicate(title, existingList) {
  const words = s => new Set(String(s || '').toLowerCase().replace(/[^а-яёa-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const w1 = words(title);
  if (w1.size < 2) return false;
  for (const item of existingList.slice(0, 40)) {
    const w2 = words(item.title);
    let common = 0;
    for (const w of w1) if (w2.has(w)) common++;
    if (common / Math.min(w1.size, w2.size) >= 0.52) return true;
  }
  return false;
}

async function fetchWeatherAndRates() {
  let weather = [
    { name: 'Владивосток', now: '🌤 +1°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' },
    { name: 'Уссурийск', now: '☀ 0°C', morning: '-5°C', day: '+1°C', evening: '-3°C', tomorrow: '+2°C' },
    { name: 'Находка', now: '🌤 +2°C', morning: '-1°C', day: '+3°C', evening: '+1°C', tomorrow: '+4°C' },
    { name: 'Артём', now: '🌤 +1°C', morning: '-3°C', day: '+2°C', evening: '-1°C', tomorrow: '+3°C' },
    { name: 'Большой Камень', now: '🌤 +1°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' }
  ];
  try {
    const wUrl = ['https:', '', '://open-meteo.com', 'v1', 'forecast?latitude=43.1155,43.7972,42.8241,43.3592,43.1128&longitude=131.8855,131.9517,132.8928,132.1892,132.3481&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok'].join(SLASH);
    const list = JSON.parse(await getHttp(wUrl));
    const fmt = v => (v > 0 ? '+' : '') + Math.round(v) + '°C';
    const ico = c => c === 0 ? '☀' : c <= 3 ? '🌤' : (c >= 71 && c <= 77) ? '❄' : c >= 51 ? '🌧' : '☁';
    if (Array.isArray(list)) {
      weather = list.map((r, i) => ({
        name: weather[i].name,
        now: fmt(r.current.temperature_2m) + ' ' + ico(r.current.weather_code),
        morning: fmt(r.hourly.temperature_2m.at(8)),
        day: fmt(r.hourly.temperature_2m.at(14)),
        evening: fmt(r.hourly.temperature_2m.at(20)),
        tomorrow: fmt(r.daily.temperature_2m_max.at(1))
      }));
    }
  } catch (e) {}

  let rates = { usd: '98.5', eur: '104.2', cny: '13.6', jpy: '64.5' };
  try {
    const rUrl = ['https:', '', 'www.cbr-xml-daily.ru', 'daily_json.js'].join(SLASH);
    const d = JSON.parse(await getHttp(rUrl)).Valute;
    rates = {
      usd: (d.USD.Value / d.USD.Nominal).toFixed(1),
      eur: (d.EUR.Value / d.EUR.Nominal).toFixed(1),
      cny: (d.CNY.Value / d.CNY.Nominal).toFixed(1),
      jpy: ((d.JPY.Value / d.JPY.Nominal) * 100).toFixed(1)
    };
  } catch (e) {}
  return { weather, rates };
}

async function rewriteNews(raw) {
  if (!AI_KEY) return null;
  const prompt = [
    'Ты старший корреспондент и редактор портала Приморского края «Прим_Дозор» (уровень РБК и VL.ru).',
    'Напиши полноценную, развёрнутую журналистскую статью (3-4 подробных абзаца, 950-1300 символов) живым, профессиональным языком без шаблонных фраз ИИ («подчеркивает важность», «вызывает широкий резонанс», «в заключение стоит отметить»). Сохрани все факты, адреса, имена ведомств и цифры.',
    'СТРОГИЙ ЗАПРЕТ РЕКЛАМЫ: Любые коммерческие предложения, услуги клиник, массаж, скидки, акции, розыгрыши, продвижение услуг или сторонних каналов отклоняй словом SKIP.',
    'СТРОГИЙ ФИЛЬТР ГЕОГРАФИИ: Публикуй ТОЛЬКО события Приморского края (Владивосток, Уссурийск, Находка, Артём, Большой Камень, Арсеньев, Спасск-Дальний, Партизанск, Дальнегорск, Лесозаводск, Хасан и др.), важные федеральные законы РФ, а также события СВО и изменения в законодательстве Украины (если тема касается СВО/Украины). Другие регионы РФ отклоняй словом SKIP.',
    'Верни строго валидный JSON без markdown:',
    '{"title":"Информативный заголовок до 85 символов","cat":"chp|city|law|svo|family|sport","catLabel":"ЧП и 112|Город и ЖКХ|Законы и Власть|СВО и Защита|Общество|Спорт и Афиша","city":"Город Приморья","age":"0+|6+|12+|16+|18+","tldr":"• Факт 1 • Факт 2","text":"Полный текст статьи в 3-4 абзацах."}',
    'Исходный материал: ' + raw.slice(0, 2400)
  ].join(NL);

  try {
    const aiUrl = ['https:', '', 'polza.ai', 'api', 'v1', 'chat', 'completions'].join(SLASH);
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.35 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = data.choices.at(0).message.content.trim();
    if (!txt || txt.includes('SKIP')) return null;
    const p = JSON.parse(txt.replace(/^```json|```$/g, '').trim());
    if (isAdOrSpam(p.title + ' ' + p.text)) return null;
    if (/\b(Meta|Instagram|Facebook|Инстаграм|Фейсбук)\b/i.test(p.text)) {
      p.text += NL + NL + '*Деятельность Meta (Facebook и Instagram) запрещена в России как экстремистская.';
    }
    return p;
  } catch (e) { return null; }
}

async function run() {
  const { weather, rates } = await fetchWeatherAndRates();
  let rawNews = [];
  if (fs.existsSync('news.json')) { try { rawNews = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {} }

  const news = [];
  for (const item of rawNews) {
    if (isAdOrSpam(item.title + ' ' + item.text)) continue;
    if (!isDuplicate(item.title, news)) news.push(item);
  }

  let state = {};
  if (fs.existsSync('tg_state.json')) { try { state = JSON.parse(fs.readFileSync('tg_state.json', 'utf8')); } catch (e) {} }

  const candidates = [];
  for (const ch of CHANNELS) {
    try {
      const html = await getHttp(['https:', '', 't.me', 's', ch.id].join(SLASH));
      let maxId = state[ch.id] || 0;
      for (const b of html.split('tgme_widget_message_wrap').slice(-5)) {
        const pm = b.match(new RegExp('data-post="[^"]+' + SLASH + '(\\d+)"'));
        const num = pm ? Number(pm.at(1)) : 0;
        if (num && state[ch.id] && num <= state[ch.id]) continue;
        if (num > maxId) maxId = num;
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanText(b.slice(b.indexOf(GT, idx) + 1, b.indexOf(LT + SLASH + 'div' + GT, idx)));
        if (txt.length < 90 || isAdOrSpam(txt)) continue;
        const im = b.match(new RegExp("background-image:url\\('(https?:" + SLASH + SLASH + "[^']+)'\\)"));
        candidates.push({ raw: txt, img: im ? im.at(1) : '', src: ch.off ? 'По данным: ' + ch.name : '' });
      }
      if (maxId > 0) state[ch.id] = maxId;
    } catch (e) {}
  }
  fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');

  let added = 0;
  for (const c of candidates) {
    if (added >= 5) break;
    const ai = await rewriteNews(c.raw);
    if (!ai || isDuplicate(ai.title, news)) continue;
    const vl = new Date(Date.now() + 10 * 3600000);
    const post = {
      id: Date.now() + added,
      date: 'Сегодня, ' + String(vl.getUTCHours()).padStart(2, '0') + ':' + String(vl.getUTCMinutes()).padStart(2, '0'),
      cat: ai.cat || 'city',
      catLabel: ai.catLabel || 'Город и ЖКХ',
      city: ai.city || 'Приморье',
      age: ai.age || '16+',
      title: ai.title,
      tldr: ai.tldr,
      text: ai.text,
      src: c.src
    };
    post.cover = await drawThemedCover(post, c.img);
    news.unshift(post);
    added++;
  }

const finalNews = news.slice(0, 60);
fs.writeFileSync('news.json', JSON.stringify(finalNews, null, 2), 'utf8');
updateLiveOutages(finalNews);
buildHtml(finalNews, weather, rates);
if (added > 0 && INDEXNOW_KEY) {
try {
const idxUrl = ['https:', '', 'yandex.com', 'indexnow'].join(SLASH);
await fetch(idxUrl, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: 'https://' + HOST + '/' + INDEXNOW_KEY + '.txt', urlList: ['https://' + HOST + '/'] })
});
} catch (e) {}
}
if (added > 0 && TG_TOKEN) {
await postToTelegram(finalNews.slice(0, added), TG_TOKEN, HOST);
}
console.log('Готово. Опубликовано новых уникальных статей: ' + added);
}
run();
