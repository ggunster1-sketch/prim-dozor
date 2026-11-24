const fs = require('fs');
const https = require('https');
const { buildHtml } = require('./builder');
const { isAdOrSpam, updateLiveOutages, processCleanVideo, ensureHeroBanner, drawThemedCover } = require('./media');
const { hasForeignGlitch, broadcastPosts, runScheduledReports } = require('./social');
const { updateAfisha } = require('./afisha');

const AI_KEY = (process.env.AI_API_KEY || '').trim();
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || '').trim();
const TG_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const VK_TOKEN = (process.env.VK_TOKEN || '').trim();
const MAX_TOKEN = (process.env.MAX_TOKEN || '').trim();
const MAX_CHAT_ID = (process.env.MAX_CHAT_ID || '').trim();
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
  { id: 'dvec_ru', name: 'ДЭК Приморье', off: true, jkh: true },
  { id: 'dpskontrol_125rus', name: 'ДПС Контроль Приморье', off: false },
  { id: 'dpsvl', name: 'ДПС Владивосток', off: false },
  { id: 'svodka25', name: 'Сводка 25', off: false },
  { id: 'gibdd25', name: 'Госавтоинспекция Приморья', off: true },
  { id: 'prim_police', name: 'УМВД Приморского края', off: true },
  { id: 'prosecutor_pk', name: 'Прокуратура Приморского края', off: true },
  { id: 'sledcom25', name: 'СУ СК по Приморскому краю', off: true },
  { id: 'mchs_primorye', name: 'ГУ МЧС по Приморскому краю', off: true },
  { id: 'primorskyadmin', name: 'Правительство Приморского края', off: true },
  { id: 'kozhemyako_official', name: 'Губернатор Олег Кожемяко', off: true },
  { id: 'vlc_ru', name: 'Администрация Владивостока', off: true },
  { id: 'shestakovblog', name: 'Глава Владивостока', off: true },
  { id: 'minzdrav_pk', name: 'Минздрав Приморья', off: true },
  { id: 'newsvlc', name: 'Новости Владивостока', off: false },
  { id: 'vlnews25', name: 'VL News 25', off: false },
  { id: 'primamedia', name: 'PrimaMedia', off: false },
  { id: 'vladnews_ru', name: 'VladNews', off: false },
  { id: 'primpress_ru', name: 'PrimPress', off: false },
  { id: 'kp_dv', name: 'КП — Дальний Восток', off: false },
  { id: 'vostokmedia24', name: 'Восток-Медиа', off: false },
  { id: 'ussurmedia', name: 'Уссурийск Новости', off: false },
  { id: 'nakhodka_news', name: 'Находка Новости', off: false },
  { id: 'artem_news25', name: 'Артём Новости', off: false },
  { id: 'bk_news25', name: 'Большой Камень Новости', off: false }
];

const RSS_FEEDS = [
  'https://primamedia.ru',
  'https://vladnews.ru',
  'https://primpress.ru'
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
    { name: 'Де-Фриз — Седанка', re: /(низководн(ый|ом)\s*мост|трасс[аеу]\s*де-фриз|де-фриз\s*[—-]\s*седанк)/i },
    { name: 'Трасса А-370 (Уссури)', re: /(а-370|м-60|трасс[аеу]\s*(владивосток|уссурийск|хабаровск)|кипарисово|раздольн)/i },
    { name: 'Трасса на Находку', re: /(трасс[аеу]\s*(на\s*)?находк|артём\s*[—-]\s*находк|шкотово|смоляниново|фокино|больш(ой|ом)\s*камен)/i },
    { name: 'Паромы и залив Петра Великого', re: /(паром|катер|морвокзал|залив петра великого|попова|рейнеке|славянк|штормов)/i }
  ];

  const radar = routes.map(rt => {
    const hit = recent.find(n => {
      const full = (n.title || '') + ' ' + (n.text || n.raw || '');
      if (/(картина дня|итоги дня|седанка сити)/i.test(full)) return false;
      return rt.re.test(full) && /(дтп|авари|столкновен|пробк|затор|перекрыт|закрыт|ограничен|голол[её]д|шторм|паром|катер)/i.test(full);
    });
    if (!hit) {
      return {
        name: rt.name,
        level: 'ok',
        status: 'Штатный режим',
        details: 'По данным оперативного мониторинга дорожных служб и сообщений водителей на ' + updTime + ', ограничений, перекрытий и крупных заторов на участке «' + rt.name + '» не зафиксировано.',
        updated: updTime
      };
    }
    const rawDetail = String(hit.text || hit.raw || hit.title || '').slice(0, 420);
    const full = rawDetail.toLowerCase();
    if (/(перекрыт|закрыт|ограничен|обвал|размыв|шторм)/i.test(full)) {
      return { name: rt.name, level: 'danger', status: 'Ограничение / Внимание', details: rawDetail, updated: updTime };
    }
    if (/(дтп|авари|столкновен|пробк|затор|гололёд|гололед|снег)/i.test(full)) {
      return { name: rt.name, level: 'warn', status: 'ДТП / Затруднение', details: rawDetail, updated: updTime };
    }
    return { name: rt.name, level: 'ok', status: 'Штатный режим', details: rawDetail, updated: updTime };
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

function hasOldYear(text) {
  return /\b20(1[0-9]|2[0-5])\b/.test(String(text || ''));
}

function isDuplicate(title, existingList) {
  const words = s => new Set(String(s || '').toLowerCase().replace(/[^а-яёa-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const w1 = words(title);
  if (w1.size < 2) return false;
  for (const item of existingList.slice(0, 45)) {
    const w2 = words(item.title);
    let common = 0;
    for (const w of w1) if (w2.has(w)) common++;
    if (common / Math.min(w1.size, w2.size) >= 0.5) return true;
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
// Асинхронная функция обработки и рерайтинга новостей через ИИ с учетом региональной специфики и фильтрацией
async function rewriteNews(raw) {
  // Логика формирования промпта, отправки запроса к модели openai/gpt-4o-mini, 
  // валидации JSON, проверки на стоп-слова, архивные события и рекламу.
  // Полный исходный код функции доступен в файле бота.
}

// Функция генерации ежедневного опроса для читателей портала на основе актуальной повестки
async function refreshDailyPoll(newsList) {
  // Логика создания и сохранения актуального опроса в directories.json
  // Полный исходный код функции доступен в файле бота.
}
async function run() {
  const { weather, rates } = await fetchWeatherAndRates();
  await ensureHeroBanner();
  const startUtc = Date.UTC(2026, 10, 24, 21, 0, 0);

  let rawNews = [];
  if (fs.existsSync('news.json')) {
    try { rawNews = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
  }

  const news = [];
  for (const item of rawNews) {
    if (!item.id || Number(item.id) < startUtc) {
      try { if (fs.existsSync('news/' + item.id + '.html')) fs.unlinkSync('news/' + item.id + '.html'); } catch (e) {}
      try { if (item.cover && fs.existsSync(item.cover)) fs.unlinkSync(item.cover); } catch (e) {}
      try { if (item.video && fs.existsSync(item.video)) fs.unlinkSync(item.video); } catch (e) {}
      continue;
    }
    if (hasOldYear(item.title + ' ' + item.text) || hasForeignGlitch(item.title + ' ' + item.text)) continue;
    if (!item.isPartner && !item.manual && isAdOrSpam(item.title + ' ' + item.text)) continue;
    if (!isDuplicate(item.title, news)) news.push(item);
  }

  let state = {};
  if (fs.existsSync('tg_state.json')) {
    try { state = JSON.parse(fs.readFileSync('tg_state.json', 'utf8')); } catch (e) {}
  }

  const candidates = [];
  const liveFeedRaw = [];
  const creditRe = /(источник:|видео:|кадры:|фото:|@|t\.me\/|vl\.ru|primamedia|mash|shot|baza|112)/i;

  for (const ch of CHANNELS) {
    try {
      const html = await getHttp(['https:', '', ['t', 'me'].join('.'), 's', ch.id].join(SLASH));
      let maxId = state[ch.id] || 0;
      for (const b of html.split('tgme_widget_message_wrap').slice(-6)) {
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanText(b.slice(b.indexOf(GT, idx) + 1, b.indexOf(LT + SLASH + 'div' + GT, idx)));
        if (txt.length < 35 || (!ch.own && isAdOrSpam(txt))) continue;

        const tm = b.match(/datetime="([^"]+)"/);
        const msgTs = tm ? Date.parse(tm.at(1)) : 0;
        liveFeedRaw.push({ raw: txt, title: '', text: txt, jkh: Boolean(ch.jkh), ts: msgTs || 0 });

        const pm = b.match(new RegExp('data-post="[^"]+' + SLASH + '(\\d+)"'));
        const num = pm ? Number(pm.at(1)) : 0;
        if (num && state[ch.id] && num <= state[ch.id]) continue;
        if (num > maxId) maxId = num;

        const vm = b.match(/<video[^>]+src="([^"]+)"/i);
        const rawVideoUrl = vm ? vm.at(1).replace(/&amp;/g, '&') : '';
        const safeVideoUrl = (ch.own || (!creditRe.test(txt) && rawVideoUrl)) ? rawVideoUrl : '';

        const im = b.match(/background-image:url\('([^']+)'\)/i);
        const ownPhotoUrl = (ch.own && im) ? im.at(1) : '';

        if (txt.length >= 60 && (!msgTs || (Date.now() - msgTs) <= 4 * 3600000) && !hasOldYear(txt)) {
          candidates.push({
            raw: txt,
            src: ch.off && !ch.own ? 'По данным: ' + ch.name : '',
            own: Boolean(ch.own),
            videoUrl: safeVideoUrl,
            ownPhotoUrl: ownPhotoUrl
          });
        }
      }
      if (maxId > 0) state[ch.id] = maxId;
    } catch (e) {}
  }

  for (const rssUrl of RSS_FEEDS) {
    try {
      const xml = await getHttp(rssUrl);
      for (const it of xml.split('<item>').slice(1, 7)) {
        const tM = it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const dM = it.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const title = cleanText(tM ? tM.at(1) : '');
        const desc = cleanText(dM ? dM.at(1) : '');
        const full = (title + '. ' + desc).trim();
        if (full.length >= 90 && !isAdOrSpam(full) && !hasOldYear(full) && !isDuplicate(title, news)) {
          candidates.push({ raw: full, src: '', own: false, videoUrl: '', ownPhotoUrl: '' });
        }
      }
    } catch (e) {}
  }

  updateLiveOutages(liveFeedRaw.concat(news));
  buildTrafficRadar(liveFeedRaw.concat(news));

  if (typeof updateAfisha === 'function') {
    await updateAfisha(AI_KEY);
  }

  if (Date.now() < startUtc) {
    fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
    fs.writeFileSync('news.json', JSON.stringify(news, null, 2), 'utf8');
    buildHtml(news, weather, rates);
    console.log('Подготовка к синхронному старту в 07:00 25.11.2026 выполнена.');
    return;
  }

  fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');

  const vlNow = new Date(Date.now() + 10 * 3600000);
  const vlHour = vlNow.getUTCHours();
  const isDayHours = vlHour >= 7 && vlHour < 23;
  const lastPostTs = news.length > 0 ? Number(news.at(0).id) || 0 : 0;
  const elapsedMin = (Date.now() - lastPostTs) / 60000;

  let added = 0;
  for (const c of candidates) {
    if (added >= 2) break;
    let ai = null;
    if (c.own) {
      const lines = c.raw.split('\n').map(s => s.trim()).filter(Boolean);
      const head = String((lines.length ? lines.at(0) : '') || 'Эксклюзив редакции ИА «Прим_Дозор»').slice(0, 85);
      ai = {
        title: head,
        cat: 'city',
        catLabel: 'Молния • Главное',
        city: 'Приморский край',
        district: detectDistrict(c.raw),
        age: '18+',
        urgent: true,
        tldr: '• Официальный материал редакции ИА «Прим_Дозор»',
        text: c.raw,
        skipTg: true
      };
    } else {
      ai = await rewriteNews(c.raw);
    }

    if (!ai || isDuplicate(ai.title, news)) continue;

    if (!ai.urgent) {
      if (!isDayHours) continue;
      if (elapsedMin < 28 && added === 0) continue;
      if (added >= 1) break;
    }

    const postId = Date.now() + added;
    const vl = new Date(Date.now() + 10 * 3600000);
    const videoFile = c.videoUrl ? await processCleanVideo(c.videoUrl, postId) : '';

    const post = {
      id: postId,
      isoDate: new Date().toISOString(),
      date: 'Сегодня, ' + String(vl.getUTCHours()).padStart(2, '0') + ':' + String(vl.getUTCMinutes()).padStart(2, '0'),
      cat: ai.cat || 'city',
      catLabel: ai.catLabel || 'Коммунальный фронт',
      city: ai.city || 'Приморский край',
      district: ai.district || '',
      age: ai.age || '18+',
      urgent: Boolean(ai.urgent),
      title: ai.title,
      tldr: ai.tldr,
      tgText: ai.tgText || '',
      text: ai.text,
      coverPrompt: ai.coverPrompt || '',
      ownPhotoUrl: c.ownPhotoUrl || '',
      video: videoFile,
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
      const urlsToPing = ['https://' + HOST + '/'].concat(finalNews.slice(0, added).map(n => 'https://' + HOST + '/news/' + n.id + '.html'));
      await fetch(idxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: 'https://' + HOST + '/' + INDEXNOW_KEY + '.txt', urlList: urlsToPing })
      });
    } catch (e) {}
  }

  const toBroadcast = finalNews.slice(0, added);
  if (toBroadcast.length > 0) {
    await broadcastPosts(toBroadcast, {
      tgToken: TG_TOKEN,
      vkToken: VK_TOKEN,
      maxToken: MAX_TOKEN,
      maxChatId: MAX_CHAT_ID
    }, HOST);
  }

  if (TG_TOKEN && await runScheduledReports(TG_TOKEN, HOST, weather, finalNews, state)) {
    fs.writeFileSync('tg_state.json', JSON.stringify(state, null, 2), 'utf8');
  }

  console.log('Готово. Опубликовано новых уникальных статей: ' + added);
}

run();
