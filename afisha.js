const fs = require('fs');
const https = require('https');

const AFISHA_CHANNELS = [
  'adm_vl',
  'sport_primorye',
  'primorskyadmin',
  'culture_pk',
  'turizm_pk',
  'vladivostok_afisha',
  'visitprimorye'
];

function getPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let d = '';
      res.setEncoding('utf8');
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

function cleanAfishaText(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/([а-яёa-z0-9])([А-ЯЁ])/g, '$1 $2')
    .replace(/([.!?])([А-ЯЁA-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

async function updateAfisha(aiKey) {
  if (!aiKey || !fs.existsSync('data/directories.json')) return;
  const rawPosts = [];
  const tgHost = ['t', 'me'].join('.');

  for (const ch of AFISHA_CHANNELS) {
    try {
      const html = await getPage(['https:', '', tgHost, 's', ch].join('/'));
      for (const b of html.split('tgme_widget_message_wrap').slice(-8)) {
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanAfishaText(b.slice(b.indexOf('>', idx) + 1, b.indexOf('</div>', idx)));
        if (txt.length > 60 && /(афиша|фестивал|ярмарк|матч|турнир|выставк|концерт|спектакл|забег|хокке|баскетбол|футбол|парк|набережн|музе|библиотек|бесплатн|вход свободный|состоится|пройдёт|пройдет)/i.test(txt)) {
          rawPosts.push(txt.slice(0, 800));
        }
      }
    } catch (e) {}
  }

  if (!rawPosts.length) return;

  const vl = new Date(Date.now() + 10 * 3600000);
  const todayStr = vl.getUTCDate() + '.' + String(vl.getUTCMonth() + 1).padStart(2, '0') + '.' + vl.getUTCFullYear();

  const prompt = [
    'Ты редактор актуальной афиши Приморского края на портале «Прим_Дозор». Сегодняшняя дата во Владивостоке: ' + todayStr + '.',
    'Из сообщений выбери 6 самых актуальных ближайших мероприятий (выставки, концерты, спортивные матчи, ярмарки, фестивали, городские праздники) во Владивостоке и городах Приморского края.',
    'Не бери прошедшие события и коммерческую рекламу кафе, салонов красоты или розыгрышей.',
    'Обязательно укажи для каждого события конкретную дату, время начала, точное место и улицу (адрес), а также стоимость или «Вход свободный».',
    'Верни строго JSON-массив без markdown:',
    '[{"date":"Дата и время (например: 23 ноября, 19:00)","city":"Город Приморья","place":"Площадка и точный адрес (например: Фетисов Арена, ул. Маковского, 284)","price":"Вход свободный или цена билета","title":"Название события до 75 символов","tag":"Спорт • 0+ | Культура • 6+ | Город • 0+","desc":"Подробная программа мероприятия (3-4 предложения): что ждёт зрителей, во сколько сбор гостей, как добраться и нужна ли предварительная регистрация."}]',
    'Исходные сообщения:\n' + rawPosts.slice(0, 15).join('\n---\n')
  ].join('\n');

  try {
    const aiHost = ['polza', 'ai'].join('.');
    const aiUrl = ['https:', '', aiHost, 'api', 'v1', 'chat', 'completions'].join('/');
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiKey },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
    });
    if (!res.ok) return;
    const data = await res.json();
    const txt = data.choices.at(0).message.content.trim().replace(/^```json|```$/g, '').trim();
    const items = JSON.parse(txt);
    if (Array.isArray(items) && items.length > 0) {
      const dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8'));
      dir.afisha = items.slice(0, 6).map(it => ({
        date: cleanAfishaText(it.date),
        city: cleanAfishaText(it.city),
        place: cleanAfishaText(it.place),
        price: cleanAfishaText(it.price),
        title: cleanAfishaText(it.title),
        tag: cleanAfishaText(it.tag),
        desc: cleanAfishaText(it.desc)
      }));
      fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
    }
  } catch (e) {}
}

module.exports = { updateAfisha };
