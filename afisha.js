const fs = require('fs');
const https = require('https');

const AFISHA_CHANNELS = [
  'adm_vl',
  'sport_primorye',
  'primorskyadmin',
  'culture_pk',
  'turizm_pk',
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

function cleanText(s) {
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
        const txt = cleanText(b.slice(b.indexOf('>', idx) + 1, b.indexOf('</div>', idx)));
        if (txt.length > 60 && /(бесплатн|вход свободный|свободный вход|ярмарк|фестивал|матч|турнир|выставк|забег|хокке|баскетбол|футбол|парк|набережн|музе|библиотек|состоится|пройдёт|пройдет)/i.test(txt)) {
          rawPosts.push(txt.slice(0, 800));
        }
      }
    } catch (e) {}
  }

  if (!rawPosts.length) return;

  const vl = new Date(Date.now() + 10 * 3600000);
  const todayStr = vl.getUTCDate() + '.' + String(vl.getUTCMonth() + 1).padStart(2, '0') + '.' + vl.getUTCFullYear();

  const prompt = [
    'Ты редактор раздела бесплатных городских событий Приморского края на портале «Прим_Дозор». Сегодняшняя дата во Владивостоке: ' + todayStr + '.',
    'Из приведённых официальных сообщений выбери ТОЛЬКО реальные БЕСПЛАТНЫЕ мероприятия (вход свободный): городские ярмарки, спортивные матчи и турниры, бесплатные выставки в музеях и библиотеках, утренние пробежки, фестивали.',
    'СТРОГИЙ ЗАПРЕТ: Никаких платных концертов, никаких билетов за деньги, никаких выдуманных событий. Если в тексте нет бесплатных событий, верни пустой массив [].',
    'Для каждого события укажи реальную дату, точное время начала, точный адрес (улица, дом или площадка) и всегда пиши price: "Вход свободный".',
    'Верни строго JSON-массив без markdown:',
    '[{"date":"Дата и время (например: 24 ноября, 12:00)","city":"Город Приморья","place":"Точное место и адрес (улица, дом)","price":"Вход свободный","title":"Название события до 75 символов","tag":"Спорт • 0+ | Культура • 6+ | Город • 0+","desc":"Подробная программа (2-3 предложения): что будет проходить и во сколько."}]',
    'Исходные сообщения:\n' + rawPosts.slice(0, 15).join('\n---\n')
  ].join('\n');

  try {
    const aiHost = ['polza', 'ai'].join('.');
    const aiUrl = ['https:', '', aiHost, 'api', 'v1', 'chat', 'completions'].join('/');
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiKey },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
    });
    if (!res.ok) return;
    const data = await res.json();
    const txt = data.choices.at(0).message.content.trim().replace(/^```json|```$/g, '').trim();
    const items = JSON.parse(txt);
    if (Array.isArray(items) && items.length > 0) {
      const dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8'));
      dir.afisha = items.slice(0, 6).map(it => ({
        date: cleanText(it.date),
        city: cleanText(it.city),
        place: cleanText(it.place),
        price: 'Вход свободный',
        title: cleanText(it.title),
        tag: cleanText(it.tag),
        desc: cleanText(it.desc)
      }));
      fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
    }
  } catch (e) {}
}

module.exports = { updateAfisha };
