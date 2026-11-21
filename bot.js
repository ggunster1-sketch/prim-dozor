const fs = require('fs');

const AI_KEY = process.env.AI_API_KEY;
const TG_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT = process.env.TG_CHAT_ID || '@prim_dozor';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';
const SITE_HOST = 'primdozor.ru';

const FEEDS = [
  'https://' + 'primamedia.ru' + '/export/new/news_all.rss',
  'https://' + 'www.kp.ru' + '/rss/allsections.xml',
  'https://' + 'ria.ru' + '/export/rss2/archive/index.xml',
  'https://' + 'tass.ru' + '/rss/v2.xml',
  'https://' + 'lenta.ru' + '/rss/news'
];

async function fetchRSS(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) {
      console.log('RSS статус ' + res.status + ': ' + url);
      return [];
    }
    const xml = await res.text();
    const items = [];
    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of matches) {
      const block = m.at(1) || '';
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/);
      const title = titleMatch ? titleMatch.at(1) : '';
      const desc = descMatch ? descMatch.at(1) : '';
      if (title) {
        items.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          desc: desc.replace(/<[^>]+>/g, '').trim()
        });
      }
    }
    console.log('RSS получено (' + items.length + '): ' + url);
    return items.slice(0, 6);
  } catch (e) {
    console.log('RSS сбой: ' + url, e.message);
    return [];
  }
}

async function rewriteWithAI(rawItem) {
  if (!AI_KEY) {
    console.log('ОШИБКА: Не задан AI_API_KEY');
    return null;
  }
  const prompt = `Ты главный редактор портала «Прим_Дозор» (Владивосток, Приморье, Россия).
Оцени важность новости от 1 до 10. Приоритет: Приморский край, Владивосток, законы РФ, ЧП, СВО, ЖКХ. Если важность меньше 5 — верни строго слово SKIP.
Если 5 и выше — перепиши уникальным живым языком в стиле «НТВ ЧП / 112 / Блокнот» со строгим соблюдением законов РФ (УК, КоАП, ГК, 436-ФЗ, без фейков и запрещенных данных).
Верни ответ СТРОГО в формате JSON без markdown:
{
  "title": "Цепляющий SEO-заголовок (до 90 символов)",
  "cat": "одно из: chp, svo, law, city, family, sport",
  "catLabel": "одно из: 🚨 ЧП и 112, 🇷🇺 СВО и Защитники, 🏛 Законы и Политика, 🏙 Город и ЖКХ, 👨‍👩‍👧 Семья и Медицина, 🏆 Спорт",
  "city": "город Приморья (Владивосток, Большой Камень, Артём, Уссурийск, Находка) или Россия",
  "age": "возрастная маркировка по 436-ФЗ: 0+, 6+, 12+, 16+ или 18+",
  "tldr": "• Пункт 1<br>• Пункт 2",
  "text": "Полный уникальный текст статьи с уместными эмодзи (2-3 абзаца)",
  "needSource": true или false (true ТОЛЬКО если это официальная сводка МВД/СК/МО/МЧС/Прокуратуры или прямая цитата; для обычного пересказа фактов ставь false)
}
Исходник: ${rawItem.title}. ${rawItem.desc}`;

  const endpoints = [
    { url: 'https://' + 'polza.ai' + '/api/v1/chat/completions', model: 'openai/gpt-4o-mini' },
    { url: 'https://' + 'api.polza.ai' + '/api/v1/chat/completions', model: 'openai/gpt-4o-mini' },
    { url: 'https://' + 'api.vsegpt.ru' + '/v1/chat/completions', model: 'openai/gpt-4o-mini' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + AI_KEY
        },
        body: JSON.stringify({
          model: ep.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });
      if (!res.ok) {
        console.log('AI статус ' + res.status + ' на ' + ep.url);
        continue;
      }
      const data = await res.json();
      const firstChoice = Array.isArray(data.choices) ? data.choices.at(0) : null;
      const content = firstChoice && firstChoice.message ? firstChoice.message.content.trim() : '';
      if (!content || content.includes('SKIP')) return null;
      const cleanJson = content.replace(/^```json|```$/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.log('AI ошибка на ' + ep.url + ':', e.message);
    }
  }
  return null;
}

async function sendToTelegram(news) {
  if (!TG_TOKEN) {
    console.log('ОШИБКА: Не задан TG_BOT_TOKEN');
    return;
  }
  const tgApiUrl = 'https://' + 'api.telegram.org' + '/bot' + TG_TOKEN + '/sendMessage';
  const maxLink = 'https://' + 'max.ru' + '/join/RyxItD9MEitACdZjmI88YZkBI2ps78Qq3iMW0sBJcoE';
  const siteLink = 'https://' + 'www.primdozor.ru';
  const caption = `${news.catLabel} | ${news.city} (${news.age})\n\n<b>${news.title}</b>\n\n${news.text}\n\n🌐 Полная картина: ${siteLink}\n💬 Мы в Макс: ${maxLink}\n✈️ Подписаться: @prim_dozor`;

  try {
    const res = await fetch(tgApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const tgData = await res.json();
    if (tgData.ok) {
      console.log('Отправлено в Telegram: ' + news.title);
    } else {
      console.log('Telegram ошибка:', tgData.description);
    }
  } catch (e) {
    console.log('Telegram сбой:', e.message);
  }
}

function updateSitemap() {
  const nowIso = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://sitemaps.org">
  <url>
    <loc>https://www.${SITE_HOST}/</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.${SITE_HOST}/legal.html</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
  fs.writeFileSync('sitemap.xml', xml, 'utf8');
}

async function pingIndexNow() {
  if (!INDEXNOW_KEY) return;
  try {
    await fetch('https://' + 'yandex.com' + '/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'www.' + SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: 'https://www.${SITE_HOST}/${INDEXNOW_KEY}.txt',
        urlList: ['https://www.' + SITE_HOST + '/']
      })
    });
  } catch (e) {}
}

async function run() {
  let existing = [];
  if (fs.existsSync('news.json')) {
    try { existing = JSON.parse(fs.readFileSync('news.json', 'utf8')); } catch (e) {}
  }

  let candidates = [];
  for (const f of FEEDS) {
    const items = await fetchRSS(f);
    candidates = candidates.concat(items);
  }
  console.log('Всего кандидатов из RSS: ' + candidates.length);

  let added = 0;
  for (const item of candidates) {
    if (added >= 2) break;
    if (existing.some(e => e.rawTitle === item.title)) continue;

    const ai = await rewriteWithAI(item);
    if (!ai) continue;

    const nowVl = new Date(Date.now() + 10 * 3600000);
    const timeStr = `Сегодня, ${String(nowVl.getUTCHours()).padStart(2, '0')}:${String(nowVl.getUTCMinutes()).padStart(2, '0')}`;

    const post = {
      id: Date.now() + added,
      isoDate: new Date().toISOString(),
      rawTitle: item.title,
      cat: ai.cat || 'city',
      catLabel: ai.catLabel || '🏙 Город и ЖКХ',
      city: ai.city || 'Приморье',
      age: ai.age || '16+',
      date: timeStr,
      title: ai.title,
      tldr: ai.tldr,
      text: ai.text,
      src: ai.needSource ? 'По официальной информации ведомств' : ''
    };

    existing.unshift(post);
    await sendToTelegram(post);
    added++;
  }

  fs.writeFileSync('news.json', JSON.stringify(existing.slice(0, 60), null, 2), 'utf8');
  updateSitemap();
  if (added > 0) await pingIndexNow();
  console.log('Опубликовано новых материалов: ' + added);
}

run();
