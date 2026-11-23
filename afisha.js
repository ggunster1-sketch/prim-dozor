const fs = require('fs');
const https = require('https');

const AFISHA_CHANNELS = [
  'primorskyadmin',
  'vlc_ru',
  'dvfu_official',
  'ussur_adm',
  'nakhodka_adm',
  'artem_adm'
];

function getPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
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

function cleanAfishaTxt(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
async function updateAfisha(aiKey) {
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  let dir = { outages: [], phones: {}, afisha: [] };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }

  const rawEvents = [];
  const eventRe = /(фестивал|выставк|концерт|ярмарк|мастер-класс|лекци|спектакл|форум|забег|турнир|праздник|экскурси|показ|день открытых дверей)/i;
  const freeRe = /(вход свободн|бесплатн|без оплат|свободный вход)/i;
  const paidRe = /(билет.*руб|стоимость.*руб|₽|платн|купить билет)/i;

  for (const ch of AFISHA_CHANNELS) {
    try {
      const html = await getPage('https://t.me' + ch);
      for (const b of html.split('tgme_widget_message_wrap').slice(-6)) {
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanAfishaTxt(b.slice(b.indexOf('>', idx) + 1, b.indexOf('</div>', idx)));
        if (txt.length < 70 || !eventRe.test(txt) || paidRe.test(txt)) continue;
        if (freeRe.test(txt) || /администрац|правительств|двфу/i.test(ch)) {
          rawEvents.push(txt.slice(0, 1200));
        }
      }
    } catch (e) {}
  }

  if (aiKey && rawEvents.length > 0) {
    try {
      const prompt = [
        'Ты редактор афиши ИА «Прим_Дозор» (Приморский край). Извлеки из текстов до 8 актуальных БЕСПЛАТНЫХ мероприятий (вход свободный) в городах Приморья (Владивосток, Уссурийск, Находка, Артём, Большой Камень, Арсеньев и др.).',
        'Для каждого события обязательно укажи точную дату и время, город, точный адрес/площадку и подробное описание программы (3-4 предложения).',
        'Верни строго JSON-массив без markdown:',
        '[{"date":"28 ноября, 12:00","city":"Владивосток","place":"Светланская, 20 (Приморская краевая филармония)","tag":"Культура","title":"Название события","price":"Вход свободный","desc":"Подробное описание мероприятия, программа и условия посещения."}]',
        'Исходные анонсы:\n' + rawEvents.slice(0, 8).join('\n---\n')
      ].join('\n');

      const res = await fetch('https://polza.ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiKey },
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
      });
      if (res.ok) {
        const data = await res.json();
        const rawJson = data.choices[0].message.content.replace(/^```json|```$/g, '').trim();
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dir.afisha = parsed.filter(x => x && x.title && x.date);
          fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
        }
      }
    } catch (e) {}
  }
}

module.exports = { updateAfisha };
