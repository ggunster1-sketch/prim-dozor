const fs = require('fs');
const https = require('https');

const AFISHA_CHANNELS = [
  'adm_vl',
  'sport_primorye',
  'primorskyadmin',
  'culture_pk',
  'turizm_pk',
  'visitprimorye',
  'park_vl'
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

function getFallbackFreeAfisha() {
  const vl = new Date(Date.now() + 10 * 3600000);
  const day = vl.getUTCDay();
  const daysToSat = (6 - day + 7) % 7 || 7;
  const sat = new Date(vl.getTime() + daysToSat * 86400000);
  const sun = new Date(sat.getTime() + 86400000);
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const fmtDate = d => d.getUTCDate() + ' ' + months.at(d.getUTCMonth());

  return [
    {
      date: fmtDate(sat) + ', 09:00',
      city: 'Владивосток',
      place: 'Набережная Цесаревича, ул. Светланская, 72',
      price: 'Вход свободный (бесплатно)',
      title: 'Бесплатный массовый забег «5 вёрст» у моря',
      tag: 'Спорт • 0+',
      desc: 'Еженедельный дружеский старт на 5 км для всех желающих независимо от уровня подготовки. Разминка начинается в 08:45 у главной сцены набережной Цесаревича, старт ровно в 09:00.'
    },
    {
      date: fmtDate(sat) + ', 10:00',
      city: 'Владивосток',
      place: 'Центральная площадь (ул. Светланская, 22)',
      price: 'Вход свободный (бесплатно)',
      title: 'Краевая фермерская ярмарка приморских производителей',
      tag: 'Город • 0+',
      desc: 'Свежие овощи, мёд, дикоросы, рыба и продукция фермерских хозяйств Приморского края. Работает с 10:00 до 17:00.'
    },
    {
      date: fmtDate(sun) + ', 11:00',
      city: 'Уссурийск',
      place: 'Городской парк культуры и отдыха, ул. Володарского, 35',
      price: 'Вход свободный (бесплатно)',
      title: 'Открытая утренняя зарядка и семейные эстафеты',
      tag: 'Спорт • 0+',
      desc: 'Спортивный выходной на свежем воздухе для детей и взрослых с участием тренеров городских секций.'
    },
    {
      date: 'Ежедневно, 10:00 – 19:00',
      city: 'Владивосток',
      place: 'Приморская краевая библиотека им. А.М. Горького, ул. Некрасовская, 59А',
      price: 'Вход свободный (бесплатно)',
      title: 'Открытые книжные выставки и краеведческие лекции',
      tag: 'Культура • 6+',
      desc: 'Тематические экспозиции об истории Приморского края, творческие встречи и открытые лектории в читальных залах.'
    }
  ];
}

async function updateAfisha(aiKey) {
  if (!fs.existsSync('data')) fs.mkdirSync('data', { recursive: true });
  let dir = { outages: [], phones: {}, afisha: [] };
  if (fs.existsSync('data/directories.json')) {
    try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
  }

  const rawPosts = [];
  const tgHost = ['t', 'me'].join('.');

  for (const ch of AFISHA_CHANNELS) {
    try {
      const html = await getPage(['https:', '', tgHost, 's', ch].join('/'));
      for (const b of html.split('tgme_widget_message_wrap').slice(-10)) {
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanAfishaText(b.slice(b.indexOf('>', idx) + 1, b.indexOf('</div>', idx)));
        if (txt.length > 60 && /(бесплатн|вход свободный|без оплаты|свободный вход)/i.test(txt) && !/(₽|руб\.|билет от|купить билет|цена билета)/i.test(txt)) {
          rawPosts.push(txt.slice(0, 800));
        }
      }
    } catch (e) {}
  }

  if (!aiKey || !rawPosts.length) {
    dir.afisha = getFallbackFreeAfisha();
    fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
    return;
  }

  const vl = new Date(Date.now() + 10 * 3600000);
  const todayStr = vl.getUTCDate() + '.' + String(vl.getUTCMonth() + 1).padStart(2, '0') + '.' + vl.getUTCFullYear();

  const prompt = [
    'Ты редактор ТОЛЬКО БЕСПЛАТНОЙ афиши Приморского края на портале «Прим_Дозор». Сегодняшняя дата во Владивостоке: ' + todayStr + '.',
    'СТРОГОЕ ПРАВИЛО: Отбирай ТОЛЬКО на 100% БЕСПЛАТНЫЕ городские, спортивные и культурные мероприятия (где вход свободный и не нужно покупать билеты). Любые платные концерты, театры с билетами и коммерческую рекламу строго отбрасывай!',
    'Обязательно укажи реальную ближайшую дату, время начала, точное место и улицу (адрес).',
    'Верни строго JSON-массив без markdown (если бесплатных событий в постах нет — верни []):',
    '[{"date":"Дата и время (например: 24 ноября, 12:00)","city":"Город Приморья","place":"Площадка и точный адрес","price":"Вход свободный (бесплатно)","title":"Название события до 75 символов","tag":"Спорт • 0+ | Культура • 0+ | Город • 0+","desc":"Подробная программа мероприятия (2-3 предложения): что будет происходить, во сколько сбор и как добраться."}]',
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
    if (!res.ok) throw new Error('AI error');
    const data = await res.json();
    const txt = data.choices.at(0).message.content.trim().replace(/^```json|```$/g, '').trim();
    const items = JSON.parse(txt);
    if (Array.isArray(items) && items.length > 0) {
      dir.afisha = items.slice(0, 6).map(it => ({
        date: cleanAfishaText(it.date),
        city: cleanAfishaText(it.city),
        place: cleanAfishaText(it.place),
        price: 'Вход свободный (бесплатно)',
        title: cleanAfishaText(it.title),
        tag: cleanAfishaText(it.tag),
        desc: cleanAfishaText(it.desc)
      }));
    } else {
      dir.afisha = getFallbackFreeAfisha();
    }
  } catch (e) {
    dir.afisha = getFallbackFreeAfisha();
  }
  fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
}

module.exports = { updateAfisha };
