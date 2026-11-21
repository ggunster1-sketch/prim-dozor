const fs = require('fs');
const https = require('https');
const { createCanvas, loadImage } = require('canvas');

const AI_KEY = (process.env.AI_API_KEY || '').trim();
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim();
const TG_BOT_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const TG_CHAT_ID = (process.env.TG_CHAT_ID || '').trim();
const HOST = 'primdozor.ru';
const SLASH = String.fromCharCode(47);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);

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
  { id: 'primvodokanal', name: 'Примводоканал', off: true }
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

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    const wRaw = await getHttp('https://open-meteo.com');
    const list = JSON.parse(wRaw);
    const fmt = v => (v > 0 ? '+' : '') + Math.round(v) + '°C';
    const ico = c => c === 0 ? '☀' : c <= 3 ? '🌤' : (c >= 71 && c <= 77) ? '❄' : c >= 51 ? '🌧' : '☁';
    if (Array.isArray(list)) {
      weather = list.map((r, i) => ({
        name: weather[i].name,
        now: fmt(r.current.temperature_2m) + ' ' + ico(r.current.weather_code),
        morning: fmt(r.hourly.temperature_2m),
        day: fmt(r.hourly.temperature_2m),
        evening: fmt(r.hourly.temperature_2m),
        tomorrow: fmt(r.daily.temperature_2m_max)
      }));
    }
  } catch (e) {}

  let rates = { usd: '98.5', eur: '104.2', cny: '13.6', jpy: '64.5' };
  try {
    const rRaw = await getHttp('https://cbr-xml-daily.ru');
    const d = JSON.parse(rRaw).Valute;
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
    'Ты главный редактор ведущего СМИ Приморского края «Прим_Дозор» (уровень РБК / VL.ru).',
    'Перепиши новость с нуля своими словами без нарушения авторских прав, сохраняя все факты, адреса, улицы и цифры.',
    'СТРОГО: Если событие не в Приморском крае (Владивосток, Уссурийск, Находка, Артём, Большой Камень, Арсеньев, Хасан, Спасск и др.) и не касается важных законов РФ — верни слово SKIP. Никогда не путай Благовещенск или Хабаровск с Приморьем.',
    'Рекламу, розыгрыши и шоу-бизнес отклоняй словом SKIP. Соблюдай законы РФ (436-ФЗ, УК, КоАП).',
    'Верни строго JSON без markdown:',
    '{"title":"Сильный заголовок до 85 символов","cat":"chp|city|law|svo|family|sport","catLabel":"ЧП и 112|Город и ЖКХ|Законы и Власть|СВО|Общество|Спорт","city":"Город Приморья","age":"0+|6+|12+|16+|18+","tldr":"• Тезис 1\\n• Тезис 2","text":"3 содержательных абзаца (800-1100 символов) без лишних смайлов."}',
    'Исходный текст: ' + raw.slice(0, 2200)
  ].join('\n');

  try {
    const res = await fetch('https://polza.ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4 })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = data.choices.at(0).message.content.trim();
    if (!txt || txt.includes('SKIP')) return null;
    const p = JSON.parse(txt.replace(/^```json|```$/g, '').trim());
    if (/\b(Meta|Instagram|Facebook|Инстаграм|Фейсбук)\b/i.test(p.text)) {
      p.text += '\n\n*Деятельность Meta (Facebook и Instagram) запрещена в России как экстремистская.';
    }
    return p;
  } catch (e) { return null; }
}

async function drawCover(post, imgUrl) {
  if (!fs.existsSync('covers')) fs.mkdirSync('covers', { recursive: true });
  const w = 1200, h = 675;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  let okImg = false;
  if (imgUrl && imgUrl.startsWith('http')) {
    try {
      const r = await fetch(imgUrl);
      if (r.ok) {
        const img = await loadImage(Buffer.from(await r.arrayBuffer()));
        const sc = Math.max(w / img.width, h / img.height);
        ctx.drawImage(img, (w - img.width * sc) / 2, (h - img.height * sc) / 2, img.width * sc, img.height * sc);
        okImg = true;
      }
    } catch (e) {}
  }
  if (!okImg) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0f172a'); g.addColorStop(1, '#1e293b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  const grad = ctx.createLinearGradient(0, h - 260, 0, h);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(9,13,22,0.96)');
  ctx.fillStyle = grad; ctx.fillRect(0, h - 260, w, 260);

  ctx.fillStyle = '#dc2626'; ctx.fillRect(40, 32, 220, 42);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 21px sans-serif';
  ctx.fillText('ПРИМ_ДОЗОР', 56, 60);

  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px sans-serif';
  const words = post.title.split(' ');
  let line = '', y = h - 115;
  for (const word of words) {
    if (ctx.measureText(line + ' ' + word).width > 1100) {
      ctx.fillText(line, 40, y); line = word; y += 44;
    } else line = line ? line + ' ' + word : word;
  }
  if (line) ctx.fillText(line, 40, y);

  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PRIMDOZOR.RU  •  ' + post.city.toUpperCase() + '  •  ' + post.age, 40, h - 22);

  const file = 'covers/c_' + post.id + '.jpg';
  fs.writeFileSync(file, canvas.toBuffer('image/jpeg', { quality: 0.84 }));
  return file;
}

function buildHtml(news, weather, rates) {
  if (!fs.existsSync('news')) fs.mkdirSync('news', { recursive: true });
  const w0 = weather;

  for (const p of news) {
    const artHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title)} — Прим_Дозор (${esc(p.age)})</title><meta name="description" content="${esc(p.title)}"><link rel="canonical" href="https://${HOST}/news/${p.id}.html"><link rel="stylesheet" href="/style.css"></head><body><header><div class="wrap head-flex"><a href="/" class="logo">ПРИМ_ДОЗОР</a><a href="/" class="pill" style="color:var(--text)">← Все новости</a></div></header><main class="wrap" style="max-width:780px;margin-top:20px"><article class="box" style="padding:22px"><div class="meta"><span class="cat">${esc(p.catLabel)}</span><span>${esc(p.city)}</span><span>• ${esc(p.date)}</span><span>${esc(p.age)}</span></div><h1 style="font-size:24px;line-height:1.3;margin:10px 0 16px">${esc(p.title)}</h1><img src="/${esc(p.cover)}" alt="${esc(p.title)}" style="width:100%;border-radius:10px;margin-bottom:14px"><div class="tldr">${esc(p.tldr).replace(/\n/g, '<br>')}</div><div style="font-size:16px;white-space:pre-line;line-height:1.75">${esc(p.text)}</div><p style="font-size:12px;color:var(--muted);margin-top:14px">${esc(p.src || '')}</p></article></main><footer><div class="wrap">© 2026 Прим_Дозор (18+). Приморский край.</div></footer></body></html>`;
    fs.writeFileSync('news/' + p.id + '.html', artHtml, 'utf8');
  }
const cards = news.map((n, i) => {
const lead = n.text.replace(/\s+/g, ' ').slice(0, 145);
if (i === 0) {
return <article class="hero" onclick="openArt('${n.id}')"><img src="./${esc(n.cover)}" alt="${esc(n.title)}"><div class="hero-body"><div class="meta"><span class="cat">${esc(n.catLabel)}</span><span>${esc(n.city)}</span><span>• ${esc(n.date)}</span><span>${esc(n.age)}</span></div><h1>${esc(n.title)}</h1><p class="lead">${esc(lead)}...</p></div></article>;
}
return <article class="item" onclick="openArt('${n.id}')"><img src="./${esc(n.cover)}" alt="${esc(n.title)}" loading="lazy"><div><div class="meta"><span class="cat">${esc(n.catLabel)}</span><span>${esc(n.city)}</span><span>• ${esc(n.date)}</span><span>${esc(n.age)}</span></div><h2>${esc(n.title)}</h2><p class="lead">${esc(lead)}...</p></div></article>;
}).join('');
const page = `
Прим_Дозор — Главные новости Владивостока и Приморского края 24/7 (18+)
Владивосток

${weather.map((w, idx) => <option value="\({idx}">\){esc(w.name)}</option>).join('')}

${esc(w0.now)}


$${esc(rates.usd)} | €${esc(rates.eur)} | ¥${esc(rates.cny)}
А+
🌙


ПРИМ_ДОЗОР18+


Весь край
Владивосток
Уссурийск
Находка
Артём
Б. Камень

+ Прислать ЧП


Главное
ЧП и 112
Город и ЖКХ
Законы и Власть
СВО
Общество
Спорт

${cards}


Погода: ${esc(w0.name)}
Сейчас${esc(w0.now)}
Утром${esc(w0.morning)}
Днём${esc(w0.day)}
Вечером${esc(w0.evening)}
Завтра${esc(w0.tomorrow)}


Курсы ЦБ РФ
Доллар (USD)${esc(rates.usd)} ₽
Евро (EUR)${esc(rates.eur)} ₽
Юань (CNY)${esc(rates.cny)} ₽
100 Иен (JPY)${esc(rates.jpy)} ₽


Экстренные службы края
Служба спасения112
ГИБДД Приморья231-09-08
ЕДДС Владивостока222-23-33
Примводоканал200-5-777


Каналы редакции
✈ Telegram-канал ЧП→
💬 Канал в МАКС→


ПРИМ_ДОЗОР • 18+
✕ Закрыть



🍪 Используем cookie и Яндекс.Метрику (152-ФЗ).
ОК
© 2026 Прим_Дозор (18+). Региональный портал Приморского края. Соблюдение 152-ФЗ, 436-ФЗ и ГК РФ.
const NEWS = ${JSON.stringify(news)};
const WEATHER = ${JSON.stringify(weather)};
let cCat = 'all', cCity = 'all';
if (localStorage.getItem('ck')) document.getElementById('ck').style.display = 'none';
function setWeather(i) {
const w = WEATHER[i]; if (!w) return;
document.getElementById('w-top').textContent = w.now;
document.getElementById('w-name').textContent = w.name;
document.getElementById('w-now').textContent = w.now;
document.getElementById('w-m').textContent = w.morning;
document.getElementById('w-d').textContent = w.day;
document.getElementById('w-e').textContent = w.evening;
document.getElementById('w-t').textContent = w.tomorrow;
}
function renderFeed() {
const list = NEWS.filter(n => (cCat === 'all' || n.cat === cCat) && (cCity === 'all' || n.city.includes(cCity)));
document.getElementById('feed').innerHTML = list.map((n, i) => {
const lead = n.text.replace(/\s+/g, ' ').slice(0, 145);
return i === 0
? '' + n.catLabel + '' + n.city + '• ' + n.date + '' + n.age + '' + n.title + '' + lead + '...'
: '' + n.catLabel + '' + n.city + '• ' + n.date + '' + n.age + '' + n.title + '' + lead + '...';
}).join('');
}
function filterCat(c, btn) { cCat = c; document.querySelectorAll('.tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderFeed(); }
function filterCity(c) { cCity = c; renderFeed(); }
function openArt(id) {
const n = NEWS.find(x => String(x.id) === String(id)); if (!n) return;
document.getElementById('m-body').innerHTML = '' + n.catLabel + '' + n.city + '• ' + n.date + '' + n.age + '' + n.title + '' + n.tldr.replace(/\n/g, '
') + '' + n.text + '' + (n.src || '') + '';
document.getElementById('modal').style.display = 'flex';
}
setInterval(() => {
const vl = new Date(Date.now() + new Date().getTimezoneOffset()*60000 + 36000000);
document.getElementById('clock').textContent = 'Владивосток ' + String(vl.getHours()).padStart(2,'0') + ':' + String(vl.getMinutes()).padStart(2,'0');
}, 5000);


`;
fs.writeFileSync('index.html', page, 'utf8');
const urls = ['  https://' + HOST + '/1.0'];
for (const n of news) urls.push('  https://' + HOST + '/news/' + n.id + '.html0.8');
fs.writeFileSync('sitemap.xml', '\n\n' + urls.join('\n') + '\n', 'utf8');
}
async function run() {
const { weather, rates } = await fetchWeatherAndRates();
let news = [];
if (fs.existsSync('news.json')) { try { news = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {} }
let state = {};
if (fs.existsSync('tg_state.json')) { try { state = JSON.parse(fs.readFileSync('tg_state.json', 'utf8')); } catch (e) {} }
const candidates = [];
for (const ch of CHANNELS) {
try {
const html = await getHttp(['https:', '', 't.me', 's', ch.id].join(SLASH));
let maxId = state[ch.id] || 0;
for (const b of html.split('tgme_widget_message_wrap').slice(-5)) {
const pm = b.match(/data-post="[^"]+/(\d+)"/);
const num = pm ? Number(pm.at(1)) : 0;
if (num && state[ch.id] && num <= state[ch.id]) continue;
if (num > maxId) maxId = num;
const idx = b.indexOf('tgme_widget_message_text');
if (idx === -1) continue;
const txt = cleanText(b.slice(b.indexOf(GT, idx) + 1, b.indexOf(LT + SLASH + 'div' + GT, idx)));
if (txt.length < 80 || txt.includes('erid') || txt.includes('#реклама')) continue;
const im = b.match(/background-image:url'(https?:\/\/[^']+)'/);
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
if (!ai) continue;
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
post.cover = await drawCover(post, c.img);
news.unshift(post);
added++;
}
news = news.slice(0, 60);
fs.writeFileSync('news.json', JSON.stringify(news, null, 2), 'utf8');
buildHtml(news, weather, rates);
if (added > 0 && INDEXNOW_KEY) {
try {
await fetch('yandex.com', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: 'https://' + HOST + '/' + INDEXNOW_KEY + '.txt', urlList: ['https://' + HOST + '/'] })
});
} catch (e) {}
}
console.log('Готово. Опубликовано статей: ' + added);
}
run();
