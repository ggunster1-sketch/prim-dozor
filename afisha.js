const fs = require('fs');
const https = require('https');

const AFISHA_CHANNELS = [
  'primorskyadmin',
  'vlc_ru',
  'dvfu_official',
  'ussur_adm',
  'nakhodka_adm',
  'artem_adm',
  'bk_adm',
  'minsport25'
];

function getPage(url) {
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

function cleanAfishaTxt(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function isNearEvent(dateStr) {
  const vl = new Date(Date.now() + 10 * 3600000);
  const curYear = vl.getUTCFullYear();
  const curMonth = vl.getUTCMonth();
  const curDay = vl.getUTCDate();
  const todayUtc = Date.UTC(curYear, curMonth, curDay);
  const months = {
    'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3, 'мая': 4, 'июня': 5,
    'июля': 6, 'августа': 7, 'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
  };
  const m = String(dateStr || '').toLowerCase().match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/);
  if (!m) return true;
  const evDay = Number(m.at(1));
  const evMonth = months[m.at(2)];
  if (evMonth === undefined) return true;
  const evYear = (curMonth === 11 && evMonth === 0) ? curYear + 1 : curYear;
  const evUtc = Date.UTC(evYear, evMonth, evDay);
  const diffDays = Math.round((evUtc - todayUtc) / 86400000);
  return diffDays >= 0 && diffDays <= 7;
}
async function updateAfisha(aiKey) {
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  let dir = { outages: [], phones: {}, afisha: [], poll: null };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }

  // Оставляем только ближайшие события на 7 дней (сегодня, завтра, ближайшие выходные)
  dir.afisha = (dir.afisha || []).filter(ev => ev && ev.title && isNearEvent(ev.date));

  const rawEvents = [];
  const eventRe = /(фестивал|выставк|концерт|ярмарк|мастер-класс|лекци|спектакл|форум|забег|турнир|праздник|экскурси|показ|день открытых дверей|спартакиад|матч|соревнован)/i;
  const freeRe = /(вход свободн|бесплатн|без оплат|свободный вход|для всех желающих)/i;
  const paidRe = /(билет.*руб|стоимость.*руб|₽|платн|купить билет)/i;

  for (const ch of AFISHA_CHANNELS) {
    try {
      const html = await getPage('https://t.me' + ch);
      for (const b of html.split('tgme_widget_message_wrap').slice(-6)) {
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanAfishaTxt(b.slice(b.indexOf('>', idx) + 1, b.indexOf('</div>', idx)));
        if (txt.length < 70 || !eventRe.test(txt) || paidRe.test(txt)) continue;
        if (freeRe.test(txt) || /администрац|правительств|двфу|спорт/i.test(ch)) {
          rawEvents.push(txt.slice(0, 1200));
        }
      }
    } catch (e) {}
  }

  if (aiKey && rawEvents.length > 0) {
    try {
      const vl = new Date(Date.now() + 10 * 3600000);
      const todayRu = vl.getUTCDate() + '.' + String(vl.getUTCMonth() + 1).padStart(2, '0') + '.' + vl.getUTCFullYear();
      const prompt = [
        'Ты редактор городской афиши ИА «Прим_Дозор» (Приморский край). Сегодня ' + todayRu + '.',
        'Извлеки из анонсов до 8 БЕСПЛАТНЫХ мероприятий (городские праздники, культурные и массовые спортивные события со свободным входом), которые пройдут в БЛИЖАЙШИЕ 7 ДНЕЙ (сегодня, завтра или в ближайшие выходные) в городах Приморья.',
        'Обязательно укажи для каждого события: точную дату и время, город, полный адрес (площадка, улица, номер дома), а также телефон организаторов и официальный сайт/источник (если они есть в тексте, иначе пустую строку). Строго на русском языке.',
        'Верни строго JSON-массив без markdown:',
        '[{"date":"25 ноября, 14:00","city":"Владивосток","place":"Спортивный комплекс «Олимпиец», ул. Батарейная, 2","tag":"Спорт","title":"Название события","price":"Вход свободный","phone":"+7 (423) 000-00-00","url":"https://...","desc":"Подробное описание мероприятия и программа (3-4 предложения)."}]',
        'Исходные анонсы:\n' + rawEvents.slice(0, 8).join('\n---\n')
      ].join('\n');

      const res = await fetch('https://polza.ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiKey },
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
      });
      if (res.ok) {
        const data = await res.json();
        const rawJson = data.choices.at(0).message.content.replace(/^```json|```$/g, '').trim();
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(x => x && x.title && x.date && isNearEvent(x.date));
          if (valid.length > 0) dir.afisha = valid;
        }
      }
    } catch (e) {}
  }

  fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
}

module.exports = { updateAfisha };
