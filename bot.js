const fs = require('fs');
const https = require('https');
const { buildHtml } = require('./builder');
const { isAdOrSpam, updateLiveOutages, drawThemedCover } = require('./media');
const { postToTelegram, runScheduledReports } = require('./tg');
const { updateAfisha } = require('./afisha');

const AI_KEY = (process.env.AI_API_KEY || '').trim();
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim();
const TG_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const HOST = 'primdozor.ru';
const SLASH = String.fromCharCode(47);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const NL = String.fromCharCode(10);

const CHANNELS = [
  { id: 'prim_dozor', name: 'Редакция ИА «Прим_Дозор»', off: true, own: true },
  { id: 'vpes_vl', name: 'ВПЭС Владивосток', off: true, jkh: true },
  { id: 'primvodokanal', name: 'Примводоканал', off: true, jkh: true },
  { id: 'dgk_dv', name: 'ДГК Приморье', off: true, jkh: true },
  { id: 'dpskontrol_125rus', name: 'ДПС Контроль Приморье', off: false },
  { id: 'dpsvl', name: 'ДПС Владивосток', off: false },
  { id: 'gibdd25', name: 'Госавтоинспекция Приморья', off: true },
  { id: 'prim_police', name: 'УМВД Приморского края', off: true },
  { id: 'prosecutor_pk', name: 'Прокуратура Приморского края', off: true },
  { id: 'sledcom25', name: 'СУ СК по Приморскому краю', off: true },
  { id: 'mchs_primorye', name: 'ГУ МЧС по Приморскому краю', off: true },
  { id: 'primorskyadmin', name: 'Правительство Приморского края', off: true },
  { id: 'kozhemyako_official', name: 'Губернатор Олег Кожемяко', off: true },
  { id: 'shestakovblog', name: 'Глава Владивостока', off: true },
  { id: 'minzdrav_pk', name: 'Минздрав Приморья', off: true },
  { id: 'newsvlc', name: 'Новости Владивостока', off: false },
  { id: 'primamedia', name: 'PrimaMedia', off: false },
  { id: 'vladnews_ru', name: 'VladNews', off: false },
  { id: 'primpress_ru', name: 'PrimPress', off: false },
  { id: 'kp_dv', name: 'КП — Дальний Восток', off: false },
  { id: 'vostokmedia24', name: 'Восток-Медиа', off: false },
  { id: 'ussurmedia', name: 'Уссурийск Новости', off: false },
  { id: 'nakhodka_news', name: 'Находка Новости', off: false },
  { id: 'artem_news25', name: 'Артём Новости', off: false }
];
function detectDistrict(text) {
  const s = String(text || '').toLowerCase();
  if (/(остров\s*русск|о\.\s*русск|двфу|аякс|новик|поспелов|канал|ворошиловск)/i.test(s)) return 'о. Русский';
  if (/(первомайск|чуркин|окатов|калинин|фадеев|спортивн|лугов|борисенк|никифоров|сафонов|патрокл|тихая|бухта тихая|змеинк|диомид|героев тихоокеанцев|надибаидзе|харьковск|гульбинович)/i.test(s)) return 'Первомайский р-н (Чуркин)';
  if (/(ленинск|светланск|авангард|гайдамак|голубиная падь|шилкинск|нейбута|адмирала юмашева|лазо|суханова|капитана шефнера|баляева|котельникова|толстого)/i.test(s)) return 'Ленинский р-н';
  if (/(первореченск|снеговая падь|снегов|жигур|народн|проспект 100|столетия|океанск|некрасовск|огородн|бам|карбышева|шошина|ильичёва|давыдова)/i.test(s)) return 'Первореченский р-н';
  if (/(советск|вторая речка|вторяк|русск|кирова|енисейск|чапаева|заря|седанк|океанская|спутник|санаторн|весенн|угольн|трудов|де-фриз|низководн)/i.test(s)) return 'Советский р-н';
  if (/(фрунзенск|эгершельд|алеутск|посьетск|тигров|верхнепортов|крыгина|маяк|токаревск|бестужева|фонтанн|набережная|спортивная гавань|арбат|вокзал)/i.test(s)) return 'Фрунзенский р-н (Центр)';
  return '';
}

function buildTrafficRadar(rawFeedItems) {
  const now = Date.now();
  const vl = new Date(now + 10 * 3600000);
  const updTime = String(vl.getUTCHours()).padStart(2, '0') + ':' + String(vl.getUTCMinutes()).padStart(2, '0');
  const recent = (Array.isArray(rawFeedItems) ? rawFeedItems : []).filter(n => !n.ts || (now - Number(n.ts)) <= 3 * 3600000);
  const routes = [
    { name: 'Золотой мост', re: /золот(ой|ом|ого)\s*мост/i },
    { name: 'Русский мост', re: /русск(ий|ом|ого)\s*мост/i },
    { name: 'Де-Фриз — Седанка', re: /(низководн|де-фриз|седанк)/i },
    { name: 'Трасса А-370 (Уссури)', re: /(а-370|м-60|трасс[аеу]\s*(владивосток|уссурийск|хабаровск)|кипарисово|раздольн)/i },
    { name: 'Трасса на Находку', re: /(трасс[аеу]\s*(на\s*)?находк|артём\s*—\s*находк|шкотово|смоляниново|фокино)/i }
  ];

  const radar = routes.map(rt => {
    const hit = recent.find(n => rt.re.test((n.title || '') + ' ' + (n.text || n.raw || '')));
    if (!hit) return { name: rt.name, level: 'ok', status: 'Без инцидентов', updated: updTime };
    const full = ((hit.title || '') + ' ' + (hit.text || hit.raw || '')).toLowerCase();
    if (/(перекрыт|закрыт|ограничен|обвал|размыв)/i.test(full)) {
      return { name: rt.name, level: 'danger', status: 'Перекрытие / Ограничено', updated: updTime };
    }
    if (/(дтп|авари|столкновен|пробк|затор|гололёд|гололед|снег)/i.test(full)) {
      return { name: rt.name, level: 'warn', status: 'ДТП / Затруднение', updated: updTime };
    }
    return { name: rt.name, level: 'ok', status: 'Без инцидентов', updated: updTime };
  });

  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/traffic.json', JSON.stringify(radar, null, 2), 'utf8');
  return radar;
}
function getHttp(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, timeout: 14000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
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

function hasForeignGlitch(text) {
  const s = String(text || '');
  const latWords = s.match(/\b[A-Za-z]{4,}\b/g) || [];
  const allowed = new Set(['primdozor', 'telegram', 'https', 'http', 'vvo', 'toyota', 'nissan', 'honda', 'subaru', 'suzuki', 'mazda', 'mitsubishi', 'lexus', 'hyundai', 'kia', 'isuzu', 'sitrak', 'howo', 'kamaz', 'fesco', 'dns', 'cagmo', 'meta', 'facebook', 'instagram', 'covid']);
  const badLat = latWords.filter(w => !allowed.has(w.toLowerCase()));
  return badLat.length > 3;
}

function cleanText(s) {
  return String(s || '')
    .replace(new RegExp(LT + 'br\\s*' + SLASH + '?' + GT, 'gi'), ' ')
    .replace(new RegExp(LT + '[^' + GT + ']+' + GT, 'g'), ' ')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/([а-яёa-z0-9])([А-ЯЁ])/g, '$1 $2')
    .replace(/([.!?])([А-ЯЁA-Z])/g, '$1 $2')
    .replace(/([,;:])([А-ЯЁа-яёA-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ').trim();
}

function fixTypography(text) {
  return String(text || '')
    .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
    .replace(/([.!?])([А-ЯЁA-Z])/g, '$1 $2')
    .replace(/([,;:])([А-ЯЁа-яёA-Za-z])/g, '$1 $2')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
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
    { name: 'Владивосток', now: '0°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' },
    { name: 'Уссурийск', now: '0°C', morning: '-5°C', day: '+1°C', evening: '-3°C', tomorrow: '+2°C' },
    { name: 'Находка', now: '+2°C', morning: '-1°C', day: '+3°C', evening: '+1°C', tomorrow: '+4°C' },
    { name: 'Артём', now: '+1°C', morning: '-3°C', day: '+2°C', evening: '-1°C', tomorrow: '+3°C' },
    { name: 'Большой Камень', now: '+1°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' },
    { name: 'Арсеньев', now: '-1°C', morning: '-6°C', day: '0°C', evening: '-4°C', tomorrow: '+1°C' },
    { name: 'Спасск-Дальний', now: '-2°C', morning: '-7°C', day: '-1°C', evening: '-5°C', tomorrow: '0°C' },
    { name: 'Партизанск', now: '+1°C', morning: '-3°C', day: '+2°C', evening: '-1°C', tomorrow: '+3°C' },
    { name: 'Дальнегорск', now: '-3°C', morning: '-8°C', day: '-2°C', evening: '-6°C', tomorrow: '-1°C' }
  ];
  try {
    const lats = '43.1155,43.7972,42.8241,43.3592,43.1128,44.1628,44.5978,43.1286,44.5603';
    const lons = '131.8855,131.9517,132.8928,132.1892,132.3481,133.2778,132.8192,133.1244,135.5700';
    const wUrl = ['https:', '', ['api', 'open-meteo', 'com'].join('.'), 'v1', 'forecast?latitude=' + lats + '&longitude=' + lons + '&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok'].join(SLASH);
    const list = JSON.parse(await getHttp(wUrl));
    const fmt = v => { const n = Math.round(v) || 0; return (n > 0 ? '+' : '') + n + '°C'; };
    const desc = k => k === 0 ? 'Ясно' : k <= 3 ? 'Переменная облачность' : (k >= 71 && k <= 77) ? 'Снег' : k >= 51 ? 'Осадки' : 'Облачно';
    if (Array.isArray(list) && list.length === weather.length) {
      weather = list.map((r, i) => ({
        name: weather.at(i).name,
        now: fmt(r.current.temperature_2m) + ' • ' + desc(r.current.weather_code),
        morning: fmt(r.hourly.temperature_2m.at(8)),
        day: fmt(r.hourly.temperature_2m.at(14)),
        evening: fmt(r.hourly.temperature_2m.at(20)),
        tomorrow: fmt(r.daily.temperature_2m_max.at(1))
      }));
    }
  } catch (e) {}

  let rates = { usd: '82,1911', eur: '90,3445', cny: '12,3150' };
  try {
    const rUrl = ['https:', '', ['www', 'cbr-xml-daily', 'ru'].join('.'), 'daily_json.js'].join(SLASH);
    const d = JSON.parse(await getHttp(rUrl)).Valute;
    rates = {
      usd: (d.USD.Value / d.USD.Nominal).toFixed(4).replace('.', ','),
      eur: (d.EUR.Value / d.EUR.Nominal).toFixed(4).replace('.', ','),
      cny: (d.CNY.Value / d.CNY.Nominal).toFixed(4).replace('.', ',')
    };
  } catch (e) {}
  return { weather, rates };
}
async function rewriteNews(raw) {
  if (!AI_KEY) return null;
  const prompt = [
    'Ты главный редактор информационного агентства Приморского края «Прим_Дозор».',
    'Напиши глубокую, структурированную, SEO-оптимизированную журналистскую статью (5-6 содержательных абзацев, 1600-2200 символов) безупречным русским языком. Строго запрещены любые английские слова и вставки (кроме общепринятых марок автомобилей или аббревиатур). Сохрани все факты, улицы, номера домов, суммы и официальные комментарии ведомств без потери смысла.',
    'Также напиши отдельный информативный пост для официального Telegram-канала (tgText: 2-3 плотных абзаца, 650-800 символов, строго на чистом русском языке, без смайлов и воды).',
    'РЕДАКЦИОННАЯ ПОЛИТИКА И ЗАКОН РФ: Материал публикуется от лица редакции ИА «Прим_Дозор». Перерабатывай факты своими словами (ст. 1274 ГК РФ). Указывай официальное ведомство при цитировании (МВД, МЧС, Прокуратура, СК, Правительство Приморского края). Строго соблюдай законы РФ (152-ФЗ, 38-ФЗ, 436-ФЗ).',
    'ГОСУДАРСТВЕННАЯ ПОЗИЦИЯ: Уважительно и патриотично освещай поддержку Вооружённых Сил РФ, участников СВО, ветеранов и их семей.',
    'СТРОГИЙ ЗАПРЕТ РЕКЛАМЫ: Любые коммерческие предложения, услуги клиник, массаж, скидки, акции, розыгрыши и продвижение чужих каналов отклоняй словом SKIP.',
    'СТРОГИЙ ФИЛЬТР ГЕОГРАФИИ: Публикуй ТОЛЬКО события Приморского края (Владивосток, Уссурийск, Находка, Артём, Большой Камень, Арсеньев, Спасск-Дальний, Партизанск, Дальнегорск, Лесозаводск, Хасан и др.), важные федеральные решения РФ, а также события СВО. Другие регионы РФ отклоняй словом SKIP.',
    'Выбери точную рубрику: chp (Происшествия), city (Город и ЖКХ), law (Власть и закон), econ (Экономика и бизнес), auto (Авто и дороги), family (Общество), med (Медицина), sport (Спорт и культура). Если новость срочная (ЧП, криминал, штормовое МЧС, крупная авария ЖКХ, перекрытие трасс) — ставь "urgent": true.',
    'Верни строго валидный JSON без markdown:',
    '{"title":"Цепляющий SEO-заголовок до 85 символов","cat":"chp|city|law|econ|auto|family|med|sport","catLabel":"Происшествия|Город и ЖКХ|Власть и закон|Экономика и бизнес|Авто и дороги|Общество|Медицина|Спорт и культура","city":"Город Приморья","district":"Район Владивостока если применимо или пусто","age":"0+|6+|12+|16+|18+","urgent":false,"tldr":"• Факт 1 • Факт 2 • Факт 3","tgText":"Информативный пост для Telegram (650-800 символов, строго русский язык).","coverPrompt":"Short English visual description of documentary news photo matching the story scene in Vladivostok or Russian Far East, realistic photojournalism, no text","text":"Полная редакторская SEO-статья в 5-6 абзацах (1600-2200 символов, строго русский язык)."}',
    'Исходный материал: ' + raw.slice(0, 3200)
  ].join(NL);
  try {
    const aiUrl = ['https:', '', ['polza', 'ai'].join('.'), 'api', 'v1', 'chat', 'completions'].join(SLASH);
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
    p.title = fixTypography(p.title);
    p.tldr = fixTypography(p.tldr);
    p.tgText = fixTypography(p.tgText);
    p.text = fixTypography(p.text);
    if (hasForeignGlitch(p.title + ' ' + p.text + ' ' + p.tgText)) return null;
    const autoDist = detectDistrict(p.title + ' ' + p.text + ' ' + (p.district || ''));
    if (autoDist) p.district = autoDist;
    if (isAdOrSpam(p.title + ' ' + p.text)) return null;
    if (/\b(Meta|Instagram|Facebook|Инстаграм|Фейсбук)\b/i.test(p.text)) {
      p.text += NL + NL + '*Деятельность Meta (Facebook и Instagram) запрещена в России как экстремистская.';
    }
    return p;
  } catch (e) {
    return null;
  }
}

async function refreshDailyPoll(newsList) {
  if (!AI_KEY || !Array.isArray(newsList) || newsList.length < 2) return;
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  let dir = { outages: [], phones: {}, afisha: [], poll: null };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }
  const vl = new Date(Date.now() + 10 * 3600000);
  const dayKey = vl.toISOString().slice(0, 10);
  if (dir.poll && dir.poll.dayKey === dayKey) return;

  try {
    const headlines = newsList.slice(0, 8).map(n => '- ' + n.title).join(NL);
    const prompt = [
      'На основе сегодняшних реальных новостей Приморского края составь один актуальный, нейтральный и социально значимый опрос для читателей портала ИА «Прим_Дозор».',
      'Строго на русском языке. Без политики и нарушений законов РФ.',
      'Верни строго JSON без markdown: {"question":"Вопрос до 110 символов?","options":["Вариант 1","Вариант 2","Вариант 3","Вариант 4"]}',
      'Новости дня:' + NL + headlines
    ].join(NL);
    const aiUrl = ['https:', '', ['polza', 'ai'].join('.'), 'api', 'v1', 'chat', 'completions'].join(SLASH);
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4 })
    });
    if (!res.ok) return;
    const data = await res.json();
    const parsed = JSON.parse(data.choices.at(0).message.content.replace(/^```json|```$/g, '').trim());
    if (parsed && parsed.question && Array.isArray(parsed.options) && parsed.options.length >= 3 && !hasForeignGlitch(parsed.question + ' ' + parsed.options.join(' '))) {
      dir.poll = { dayKey: dayKey, question: parsed.question, options: parsed.options.slice(0, 4) };
      fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
    }
  } catch (e) {}
}

async function run() {
  const { weather, rates } = await fetchWeatherAndRates();
  const startUtc = Date.UTC(2026, 10, 23, 21, 0, 0);

  let rawNews = [];
  if (fs.existsSync('news.json')) {
    try { rawNews = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
  }

  const news = [];
  for (const item of rawNews) {
    if (!item.id || Number(item.id) < startUtc) {
      try { if (fs.existsSync('news/' + item.id + '.html')) fs.unlinkSync('news/' + item.id + '.html'); } catch (e) {}
      try { if (item.cover && fs.existsSync(item.cover)) fs.unlinkSync(item.cover); } catch (e) {}
      continue;
    }
    if (/^ПРОГНОЗ ПОГОДЫ В ПРИМОРЬЕ/i.test(String(item.title || '').trim())) {
      try { if (fs.existsSync('news/' + item.id + '.html')) fs.unlinkSync('news/' + item.id + '.html'); } catch (e) {}
      try { if (item.cover && fs.existsSync(item.cover)) fs.unlinkSync(item.cover); } catch (e) {}
      continue;
    }
    if (hasForeignGlitch(item.title + ' ' + item.text)) continue;
    if (!item.isPartner && !item.manual && isAdOrSpam(item.title + ' ' + item.text)) continue;
    if (!isDuplicate(item.title, news)) news.push(item);
  }

  let state = {};
  if (fs.existsSync('tg_state.json')) {
    try { state = JSON.parse(fs.readFileSync('tg_state.json', 'utf8')); } catch (e) {}
  }

  const candidates = [];
  const liveFeedRaw = [];
  for (const ch of CHANNELS) {
    try {
      const html = await getHttp(['https:', '', ['t', 'me'].join('.'), 's', ch.id].join(SLASH));
      let maxId = state[ch.id] || 0;
      for (const b of html.split('tgme_widget_message_wrap').slice(-6)) {
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanText(b.slice(b.indexOf(GT, idx) + 1, b.indexOf(LT + SLASH + 'div' + GT, idx)));
        if (txt.length < 40 || isAdOrSpam(txt)) continue;

        const tm = b.match(/datetime="([^"]+)"/);
        const msgTs = tm ? Date.parse(tm.at(1)) : 0;
        liveFeedRaw.push({ raw: txt, title: '', text: txt, jkh: Boolean(ch.jkh), ts: msgTs || 0 });

        const pm = b.match(new RegExp('data-post="[^"]+' + SLASH + '(\\d+)"'));
        const num = pm ? Number(pm.at(1)) : 0;
        if (num && state[ch.id] && num <= state[ch.id]) continue;
        if (num > maxId) maxId = num;
        if (txt.length >= 90 && (!msgTs || (Date.now() - msgTs) <= 12 * 3600000)) {
          candidates.push({ raw: txt, src: ch.off ? 'По данным: ' + ch.name : '', own: Boolean(ch.own) });
        }
      }
      if (maxId > 0) state[ch.id] = maxId;
    } catch (e) {}
  }

  updateLiveOutages(liveFeedRaw.concat(news));
  buildTrafficRadar(liveFeedRaw.concat(news));

  if (typeof updateAfisha === 'function') {
    await updateAfisha(AI_KEY);
  }
  if (Date.now() < startUtc) {
    fs.writeFileSync('news.json', JSON.stringify(news, null, 2), 'utf8');
    buildHtml(news, weather, rates);
    return;
  }

  fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');

  const lastPostTs = news.length > 0 ? Number(news.at(0).id) || 0 : 0;
  const elapsedMin = (Date.now() - lastPostTs) / 60000;

  let added = 0;
  for (const c of candidates) {
    if (added >= 2) break;
    let ai = null;
    if (c.own) {
      const lines = c.raw.split('\n').map(s => s.trim()).filter(Boolean);
      const head = String((lines.length ? lines.at(0) : '') || 'Сообщение редакции ИА «Прим_Дозор»').slice(0, 85);
      ai = {
        title: head,
        cat: 'city',
        catLabel: 'Эксклюзив редакции',
        city: 'Приморский край',
        district: detectDistrict(c.raw),
        age: '18+',
        urgent: true,
        tldr: '• Официальное сообщение редакции ИА «Прим_Дозор»',
        text: c.raw,
        skipTg: true
      };
    } else {
      ai = await rewriteNews(c.raw);
    }

    if (!ai || isDuplicate(ai.title, news)) continue;
    // Обычные материалы выходят не чаще 1 раза в 30 минут; срочные (ЧП, МЧС, погода, криминал) — вне очереди
    if (!ai.urgent && elapsedMin < 28 && added === 0) continue;
    if (added >= 1 && !ai.urgent) break;

    const vl = new Date(Date.now() + 10 * 3600000);
    const post = {
      id: Date.now() + added,
      isoDate: new Date().toISOString(),
      date: 'Сегодня, ' + String(vl.getUTCHours()).padStart(2, '0') + ':' + String(vl.getUTCMinutes()).padStart(2, '0'),
      cat: ai.cat || 'city',
      catLabel: ai.catLabel || 'Город и ЖКХ',
      city: ai.city || 'Приморский край',
      district: ai.district || '',
      age: ai.age || '18+',
      urgent: Boolean(ai.urgent),
      title: ai.title,
      tldr: ai.tldr,
      tgText: ai.tgText || '',
      text: ai.text,
      coverPrompt: ai.coverPrompt || '',
      src: c.src,
      skipTg: Boolean(ai.skipTg)
    };
    post.cover = await drawThemedCover(post);
    news.unshift(post);
    added++;
  }

  const finalNews = news.slice(0, 60);
  await refreshDailyPoll(finalNews);
  fs.writeFileSync('news.json', JSON.stringify(finalNews, null, 2), 'utf8');
  buildHtml(finalNews, weather, rates);

  if (added > 0 && INDEXNOW_KEY) {
    try {
      const idxUrl = ['https:', '', ['yandex', 'com'].join('.'), 'indexnow'].join(SLASH);
      await fetch(idxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: 'https://' + HOST + '/' + INDEXNOW_KEY + '.txt', urlList: ['https://' + HOST + '/'] })
      });
    } catch (e) {}
  }

  const toTg = finalNews.slice(0, added).filter(p => !p.skipTg);
  if (toTg.length > 0 && TG_TOKEN) {
    await postToTelegram(toTg, TG_TOKEN, HOST);
  }

  if (TG_TOKEN && await runScheduledReports(TG_TOKEN, HOST, weather, finalNews, state)) {
    fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
  }

  console.log('Готово. Опубликовано новых уникальных статей: ' + added);
}

run();
