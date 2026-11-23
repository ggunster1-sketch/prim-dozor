const fs = require('fs');
const https = require('https');
const { buildHtml } = require('./builder');
const { isAdOrSpam, updateLiveOutages, drawThemedCover } = require('./media');
const { postToTelegram } = require('./tg');
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

function buildTrafficRadar(newsList) {
  const recent = (Array.isArray(newsList) ? newsList : []).slice(0, 12);
  const routes = [
    { id: 'gold', name: 'Золотой мост', re: /золот(ой|ом|ого)\s*мост/i },
    { id: 'russky', name: 'Русский мост', re: /русск(ий|ом|ого)\s*мост/i },
    { id: 'low', name: 'Де-Фриз — Седанка', re: /(низководн|де-фриз|седанк)/i },
    { id: 'm60', name: 'Трасса А-370 (Уссури)', re: /(а-370|м-60|трасс[аеу]\s*(владивосток|уссурийск|хабаровск)|кипарисово|раздольн)/i },
    { id: 'nakh', name: 'Трасса на Находку', re: /(трасс[аеу]\s*(на\s*)?находк|артём\s*—\s*находк|шкотово|смоляниново|фокино)/i }
  ];

  const radar = routes.map(rt => {
    const hit = recent.find(n => rt.re.test((n.title || '') + ' ' + (n.text || '')));
    if (!hit) return { name: rt.name, level: 'ok', status: 'Свободно' };
    const full = ((hit.title || '') + ' ' + (hit.text || '')).toLowerCase();
    if (/(перекрыт|закрыт|ограничен|обвал|размыв)/i.test(full)) {
      return { name: rt.name, level: 'danger', status: 'Перекрытие / Ограничено', newsId: hit.id };
    }
    if (/(дтп|авари|столкновен|пробк|затор|гололёд|гололед|снег)/i.test(full)) {
      return { name: rt.name, level: 'warn', status: 'ДТП / Затор', newsId: hit.id };
    }
    return { name: rt.name, level: 'ok', status: 'Штатно', newsId: hit.id };
  });

  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/traffic.json', JSON.stringify(radar, null, 2), 'utf8');
  return radar;
}
function getHttp(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, timeout: 9000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.on('error', reject);
  });
}

function cleanText(s) {
  return String(s || '')
    .replace(new RegExp(LT + 'br\\s*' + SLASH + '?' + GT, 'gi'), ' ')
    .replace(new RegExp(LT + '[^' + GT + ']+' + GT, 'g'), ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/([а-яёa-z0-9])([А-ЯЁ])/g, '$1 $2')
    .replace(/([.!?])([А-ЯЁA-Z])/g, '$1 $2')
    .replace(/([,;:])([А-ЯЁа-яёA-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixTypography(text) {
  return String(text || '')
    .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
    .replace(/([.!?])([А-ЯЁA-Z])/g, '$1 $2')
    .replace(/([,;:])([А-ЯЁа-яёA-Za-z])/g, '$1 $2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function isDuplicate(title, existingList) {
  const words = s => new Set(
    String(s || '')
      .toLowerCase()
      .replace(/[^а-яёa-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
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
    { name: 'Владивосток', now: '🌤 0°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' },
    { name: 'Уссурийск', now: '☀ 0°C', morning: '-5°C', day: '+1°C', evening: '-3°C', tomorrow: '+2°C' },
    { name: 'Находка', now: '🌤 +2°C', morning: '-1°C', day: '+3°C', evening: '+1°C', tomorrow: '+4°C' },
    { name: 'Артём', now: '🌤 +1°C', morning: '-3°C', day: '+2°C', evening: '-1°C', tomorrow: '+3°C' },
    { name: 'Большой Камень', now: '🌤 +1°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C' },
    { name: 'Арсеньев', now: '☀ -1°C', morning: '-6°C', day: '0°C', evening: '-4°C', tomorrow: '+1°C' },
    { name: 'Спасск-Дальний', now: '☀ -2°C', morning: '-7°C', day: '-1°C', evening: '-5°C', tomorrow: '0°C' },
    { name: 'Партизанск', now: '🌤 +1°C', morning: '-3°C', day: '+2°C', evening: '-1°C', tomorrow: '+3°C' },
    { name: 'Дальнегорск', now: '❄ -3°C', morning: '-8°C', day: '-2°C', evening: '-6°C', tomorrow: '-1°C' }
  ];
  try {
    const lats = '43.1155,43.7972,42.8241,43.3592,43.1128,44.1628,44.5978,43.1286,44.5603';
    const lons = '131.8855,131.9517,132.8928,132.1892,132.3481,133.2778,132.8192,133.1244,135.5700';
    const wHost = ['api', 'open-meteo', 'com'].join('.');
    const wUrl = [
      'https:', '', wHost, 'v1',
      'forecast?latitude=' + lats + '&longitude=' + lons + '&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok'
    ].join(SLASH);
    const list = JSON.parse(await getHttp(wUrl));
    const fmt = v => { const n = Math.round(v) || 0; return (n > 0 ? '+' : '') + n + '°C'; };
    const ico = c => c === 0 ? '☀' : c <= 3 ? '🌤' : (c >= 71 && c <= 77) ? '❄' : c >= 51 ? '🌧' : '☁';
    if (Array.isArray(list) && list.length === weather.length) {
      weather = list.map((r, i) => ({
        name: weather.at(i).name,
        now: fmt(r.current.temperature_2m) + ' ' + ico(r.current.weather_code),
        morning: fmt(r.hourly.temperature_2m.at(8)),
        day: fmt(r.hourly.temperature_2m.at(14)),
        evening: fmt(r.hourly.temperature_2m.at(20)),
        tomorrow: fmt(r.daily.temperature_2m_max.at(1))
      }));
    }
  } catch (e) {}

  let rates = { usd: '82.2', eur: '90.3', cny: '12.3', jpy: '51.5' };
  try {
    const rHost = ['www', 'cbr-xml-daily', 'ru'].join('.');
    const rUrl = ['https:', '', rHost, 'daily_json.js'].join(SLASH);
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
    'Ты опытный шеф-редактор и журналист ведущего СМИ Приморского края «Прим_Дозор» (круче VL.ru и РБК).',
    'Напиши глубокую, развёрнутую, SEO-оптимизированную редакторскую статью (5-6 содержательных абзацев, 1600-2200 символов) живым, грамотным русским языком с пробелами после всех знаков препинания. Сохрани все факты, адреса, улицы, суммы, номера маршрутов, хронологию и официальные комментарии.',
    'Также напиши отдельный максимально информативный пост для Telegram-канала (tgText: 2-3 плотных абзаца, 650-800 символов, с главными фактами, деталями и причиной интереса, без воды и обрыва смысла).',
    'ЗАКОН РФ И АВТОРСКОЕ ПРАВО: Перерабатывай факты полностью своими словами (ст. 1274 ГК РФ), без копирования чужого текста. Указывай официальное ведомство при цитировании (МВД, МЧС, Прокуратура, Администрация). Строго соблюдай законы РФ (152-ФЗ, 38-ФЗ, 436-ФЗ).',
    'СТРОГИЙ ЗАПРЕТ РЕКЛАМЫ: Любые коммерческие предложения, услуги клиник, массаж, скидки, акции, розыгрыши и продвижение чужих каналов отклоняй словом SKIP.',
    'СТРОГИЙ ФИЛЬТР ГЕОГРАФИИ: Публикуй ТОЛЬКО события Приморского края (Владивосток, Уссурийск, Находка, Артём, Большой Камень, Арсеньев, Спасск-Дальний, Партизанск, Дальнегорск, Лесозаводск, Хасан и др.), важные федеральные законы РФ, а также события СВО и изменения в законодательстве Украины (если тема касается СВО/Украины). Другие регионы РФ отклоняй словом SKIP.',
    'Верни строго валидный JSON без markdown:',
    '{"title":"Цепляющий SEO-заголовок до 85 символов","cat":"chp|city|law|svo|family|sport","catLabel":"ЧП и 112|Город и ЖКХ|Законы и Власть|СВО и Защита|Общество|Спорт и Афиша","city":"Город Приморья","district":"Район Владивостока если применимо или пусто","age":"0+|6+|12+|16+|18+","urgent":false,"tldr":"• Факт 1 • Факт 2 • Факт 3","tgText":"Информативный пост для Telegram (650-800 символов).","text":"Полная редакторская SEO-статья в 5-6 абзацах (1600-2200 символов)."}',
    'Исходный материал: ' + raw.slice(0, 3000)
  ].join(NL);
  try {
    const aiHost = ['polza', 'ai'].join('.');
    const aiUrl = ['https:', '', aiHost, 'api', 'v1', 'chat', 'completions'].join(SLASH);
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4 })
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
async function run() {
  const { weather, rates } = await fetchWeatherAndRates();
  let rawNews = [];
  if (fs.existsSync('news.json')) {
    try { rawNews = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
  }
  const news = [];
  for (const item of rawNews) {
    if (!item.isPartner && !item.manual && isAdOrSpam(item.title + ' ' + item.text)) continue;
    item.title = fixTypography(item.title);
    item.text = fixTypography(item.text);
    item.tldr = fixTypography(item.tldr);
    if (!item.district) {
      const d = detectDistrict(item.title + ' ' + item.text);
      if (d) item.district = d;
    }
    if (!item.cover || item.cover.startsWith('http')) {
      item.cover = await drawThemedCover(item, '');
    }
    if (!isDuplicate(item.title, news)) news.push(item);
  }
  if (typeof updateAfisha === 'function') {
    await updateAfisha(AI_KEY);
  }
  // Старт публикаций новостей строго с 07:00 24 ноября 2026 года по Владивостоку (21:00 UTC 23 ноября 2026)
  const startUtc = Date.UTC(2026, 10, 23, 21, 0, 0);
  if (Date.now() < startUtc) {
    fs.writeFileSync('news.json', JSON.stringify(news, null, 2), 'utf8');
    updateLiveOutages(news);
    buildTrafficRadar(news);
    buildHtml(news, weather, rates);
    console.log('Ожидание старта новостей в 07:00 24.11.2026 (Владивосток). Погода, курсы, радар трасс и Афиша обновлены.');
    return;
  }
  let state = {};
  if (fs.existsSync('tg_state.json')) {
    try { state = JSON.parse(fs.readFileSync('tg_state.json', 'utf8')); } catch (e) {}
  }
  const candidates = [];
  for (const ch of CHANNELS) {
    try {
      const tgHost = ['t', 'me'].join('.');
      const html = await getHttp(['https:', '', tgHost, 's', ch.id].join(SLASH));
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
        candidates.push({ raw: txt, src: ch.off ? 'По данным: ' + ch.name : '' });
      }
      if (maxId > 0) state[ch.id] = maxId;
    } catch (e) {}
  }
  fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
  let added = 0;
  for (const c of candidates) {
    if (added >= 2) break;
    const ai = await rewriteNews(c.raw);
    if (!ai || isDuplicate(ai.title, news)) continue;
    if (added >= 1 && !ai.urgent && ai.cat !== 'chp') break;
    const vl = new Date(Date.now() + 10 * 3600000);
    const post = {
      id: Date.now() + added,
      date: 'Сегодня, ' + String(vl.getUTCHours()).padStart(2, '0') + ':' + String(vl.getUTCMinutes()).padStart(2, '0'),
      cat: ai.cat || 'city',
      catLabel: ai.catLabel || 'Город и ЖКХ',
      city: ai.city || 'Приморье',
      district: ai.district || '',
      age: ai.age || '18+',
      title: ai.title,
      tldr: ai.tldr,
      tgText: ai.tgText || '',
      text: ai.text,
      src: c.src
    };
    post.cover = await drawThemedCover(post, '');
    news.unshift(post);
    added++;
  }
  const finalNews = news.slice(0, 60);
  fs.writeFileSync('news.json', JSON.stringify(finalNews, null, 2), 'utf8');
  updateLiveOutages(finalNews);
  buildTrafficRadar(finalNews);
  buildHtml(finalNews, weather, rates);
  if (added > 0 && INDEXNOW_KEY) {
    try {
      const yHost = ['yandex', 'com'].join('.');
      const idxUrl = ['https:', '', yHost, 'indexnow'].join(SLASH);
      await fetch(idxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: 'https://' + HOST + '/' + INDEXNOW_KEY + '.txt', urlList: ['https://' + HOST + '/'] })
      });
    } catch (e) {}
  }
    if (added > 0 && TG_TOKEN) await postToTelegram(finalNews.slice(0, added), TG_TOKEN, HOST);

  const vlNow = new Date(Date.now() + 10 * 3600000);
  const vlHour = vlNow.getUTCHours();
  const dayKey = vlNow.toISOString().slice(0, 10);
  if (TG_TOKEN && vlHour === 20 && state.lastDigest !== dayKey && finalNews.length >= 3) {
    const top5 = finalNews.slice(0, 5);
    const lines = top5.map((n, i) => (i + 1) + '. <a href="https://' + HOST + '/news/' + n.id + '.html">' + n.title + '</a> (' + (n.city || 'Приморье') + ')').join('\n\n');
    const digestText =
      '🌙 <b>ИТОГИ ДНЯ В ПРИМОРЬЕ • ' + dayKey.split('-').reverse().join('.') + '</b> (18+)\n\n' +
      lines + '\n\n' +
      '———\n' +
      '👁 <a href="https://' + HOST + '">Все новости портала Прим_Дозор</a> | ✉ prim_dozor@internet.ru';
    try {
      const dgUrl = ['https:', '', 'api.telegram.org', 'bot' + TG_TOKEN, 'sendMessage'].join('/');
      const r = await fetch(dgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: '@prim_dozor', parse_mode: 'HTML', disable_web_page_preview: true, text: digestText })
      });
      const j = await r.json();
      if (j.ok) {
        state.lastDigest = dayKey;
        fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
        console.log('Вечерний дайджест успешно отправлен.');
      }
    } catch (e) {}
  }

  console.log('Готово. Опубликовано новых уникальных статей: ' + added);

