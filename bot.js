const fs = require('fs');

const AI_KEY = process.env.AI_API_KEY;
const TG_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT = process.env.TG_CHAT_ID || '@prim_dozor';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';
const SITE_HOST = 'www.primdozor.ru';

const FEEDS = [
  'https://primamedia.ru',
  'https://kp.ru',
  'https://ria.ru',
  'https://tass.ru'
];

async function fetchRSS(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PrimDozorBot/1.0' } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [];
    const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of matches) {
      const block = m[1];
      const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      const desc = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
      if (title) {
        items.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          desc: desc.replace(/<[^>]+>/g, '').trim()
        });
      }
    }
    return items.slice(0, 6);
  } catch (e) {
    return [];
  }
}

async function rewriteWithAI(rawItem) {
  if (!AI_KEY) return null;
  const prompt = `Ты главный редактор портала «Прим_Дозор» (Владивосток, Приморье, Россия).
Оцени важность новости от 1 до 10. Приоритет: Приморский край, Владивосток, законы РФ, ЧП, СВО, ЖКХ. Если важность меньше 6 — верни строго слово SKIP.
Если 6 и выше — перепиши уникальным живым языком в стиле «НТВ ЧП / 112 / Блокнот» со строгим соблюдением законов РФ (УК, КоАП, ГК, 436-ФЗ, без фейков и запрещенных данных).
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
    { url: 'https://polza.ai', model: 'openai/gpt-4o-mini' },
    { url: 'https://polza.ai', model: 'openai/gpt-4o-mini' },
    { url: 'https://vsegpt.ru', model: 'openai/gpt-4o-mini' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_KEY}`
        },
        body: JSON.stringify({
          model: ep.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content || content.includes('SKIP')) return null;
      const cleanJson = content.replace(/^```json|```$/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {}
  }
  return null;
}

async function sendToTelegram(news) {
  if (!TG_TOKEN) return;
  const caption = `${news.catLabel} | ${news.city} (${news.age})\n\n<b>${news.title}</b>\n\n${news.text}\n\n🌐 Полная картина: https://www.primdozor.ru\n💬 Мы в Макс: https://max.ru\n✈️ Подписаться: @prim_dozor`;
  try {
    await fetch(`https://telegram.org{TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
  } catch (e) {}
}

function updateSitemap() {
  const nowIso = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://sitemaps.org">
  <url>
    <loc>https://${SITE_HOST}/</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${SITE_HOST}/legal.html</loc>
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
    await fetch('https://yandex.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: [`https://${SITE_HOST}/`]
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
  console.log(`Опубликовано новых материалов: ${added}`);
}

run();
