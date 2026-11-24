/**
 * ИА «Прим_Дозор» (primdozor.ru)
 * Модуль app.js (Блок 1 из 3 исправленных) — Главный оркестратор автопилота:
 * сбор новостей Приморья, чистый старт с 07:00 25.11.2026 ВЛД,
 * ИИ-редактура (AI_API_KEY), генерация обложек, сборка сайта и кросспостинг.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { generateNewsCover, cleanupOldMedia, sanitizeCoverText } from './media.js';
import { CLEAN_START_UTC, RUBRICS, CITIES, LINKS, isPostEligible, buildPortal } from './builder.js';
import { publishEverywhere, pingIndexNow } from './bot.js';

const DATA_DIR = path.resolve('data');
const POSTS_DB_PATH = path.join(DATA_DIR, 'posts.json');
const SEEN_DB_PATH = path.join(DATA_DIR, 'seen.json');

const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_API_URL = process.env.AI_API_URL || 'https://openai.com';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

const RSS_SOURCES = [
  { name: 'Primpress', url: 'https://primpress.ru' },
  { name: 'VL.ru Новости', url: 'https://newsvl.ru' },
  { name: 'PrimaMedia', url: 'https://primamedia.ru' },
  { name: 'Восток-Медиа', url: 'https://vostokmedia.com' },
  { name: 'ДВ-Росс', url: 'https://deita.ru' }
];

const FORBIDDEN_YEARS_RE = /\b(2018|2019|2020|2021|2022|2023|2024|2025)\b/g;

const CYR_TO_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

function makeSlug(title, idHash) {
  const base = String(title)
    .toLowerCase()
    .split('')
    .map((ch) => (CYR_TO_LAT[ch] !== undefined ? CYR_TO_LAT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return (base || 'novost') + '-' + idHash.slice(0, 6);
}

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/\s+/g, ' ')
    .trim();
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function detectCity(text = '') {
  const lower = text.toLowerCase();
  if (lower.includes('уссурийск')) return 'Уссурийск';
  if (lower.includes('находк') || lower.includes('ливади') || lower.includes('врангел')) return 'Находка';
  if (lower.includes('артём') || lower.includes('артем')) return 'Артём';
  if (lower.includes('большой камен') || lower.includes('большом камн')) return 'Большой Камень';
  if (lower.includes('арсеньев')) return 'Арсеньев';
  if (lower.includes('спасск')) return 'Спасск-Дальний';
  if (lower.includes('партизанск')) return 'Партизанск';
  if (lower.includes('дальнегорск')) return 'Дальнегорск';
  if (
    lower.includes('владивосток') ||
    lower.includes('первомайск') ||
    lower.includes('первореченск') ||
    lower.includes('фрунзенск') ||
    lower.includes('ленинск') ||
    lower.includes('советск') ||
    lower.includes('остров русск') ||
    lower.includes('седанка') ||
    lower.includes('тихая') ||
    lower.includes('вторая речка')
  ) {
    return 'Владивосток';
  }
  return 'Весь Приморский край';
}

function detectRubric(text = '') {
  const t = text.toLowerCase();
  if (/(срочно|молния|экстренн|штормов|чс|внимание)/i.test(t)) return 'Молния • Главное';
  if (/(дтп|пожар|убийств|задержан|полиц|следком|ск рф|прокуратур|мошенник|краж|суд|наркот|погиб|трагед|112|чп)/i.test(t)) return 'Хроника 112 и ЧП';
  if (/(отключен|водоснабжен|свет|электричеств|тепло|отоплен|жкх|управляющ|подъезд|крыш|двор|благоустройств|остановк|мусор)/i.test(t)) return 'Коммунальный фронт';
  if (/(дорог|мост|трасс|пробк|переезд|автобус|маршрут|парковк|гибдд|светофор|асфальт|большегруз|фура)/i.test(t)) return 'Дороги и мосты';
  if (/(губернатор|кожемяко|мэр|шестаков|дума|законопроект|госдум|сво|военн|бойц|указ|закон|администрац|правительств)/i.test(t)) return 'Власть, закон и СВО';
  if (/(порт|экономик|бизнес|инвестиц|таможн|экспорт|импорт|рыб|судостроен|завод|стройк|тариф|цен[ыа]|рубл)/i.test(t)) return 'Экономика и порт';
  if (/(врач|больниц|поликлиник|медиц|здравоохранен|скорая|госпитализ|вакцин|здоровь|травмпункт)/i.test(t)) return 'Здравоохранение';
  if (/(спорт|матч|турнир|адмирал|динамо|концерт|фестивал|театр|выставк|кино|афиш|праздник)/i.test(t)) return 'Спорт и события';
  if (/(жител|волонтер|волонтёр|геро|школ|студент|семь|пенсионер|приморц|люди|помощ)/i.test(t)) return 'Люди Приморья';
  return 'Вся лента 24/7';
}

function enforceActualContactsAndLanguage(text = '') {
  return String(text)
    .replace(/(\+7|8)\s*\(?423\)?\s*249[\s-]*09[\s-]*21/g, '+7 (423) 249-09-21')
    .replace(FORBIDDEN_YEARS_RE, '2026')
    .replace(/\bTelegram\b/gi, 'Телеграм')
    .replace(/\bVK\b/gi, 'ВКонтакте')
    .replace(/\bMAX\b/gi, 'МАКС')
    .replace(/\bDzen\b/gi, 'Дзен')
    .trim();
}

async function fetchVladivostokWeather() {
  try {
    const url = 'https://open-meteo.com';
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('Weather HTTP error');
    const data = await res.json();
    const current = data && data.current ? data.current : {};
    const temp = Math.round(current.temperature_2m !== undefined ? current.temperature_2m : 0);
    const wind = Math.round(current.wind_speed_10m !== undefined ? current.wind_speed_10m : 4);
    const code = Number(current.weather_code !== undefined ? current.weather_code : 0);

    let desc = 'Ясно';
    if (code >= 71 && code <= 77) desc = 'Снег';
    else if (code >= 51 && code <= 67) desc = 'Осадки';
    else if (code >= 45 && code <= 48) desc = 'Туман';
    else if (code >= 1 && code <= 3) desc = 'Облачно';

    const sign = temp > 0 ? '+' + temp : String(temp);
    return 'Владивосток: ' + sign + '°C • ' + desc + ', ветер ' + wind + ' м/с';
  } catch {
    return 'Владивосток • Погода онлайн 24/7';
  }
}

async function fetchRssFeed(source) {
  try {
    const res = await fetch(source.url, {
      signal: AbortSignal.timeout(9000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PrimDozorBot/2.0; +https://primdozor.ru)'
      }
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items = [];
    const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

    for (const rawItem of itemMatches.slice(0, 15)) {
      const titleMatch = rawItem.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = rawItem.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const descMatch = rawItem.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
      const contentMatch = rawItem.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
      const pubDateMatch = rawItem.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const enclosureMatch = rawItem.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      const mediaMatch = rawItem.match(/<media:content[^>]+url=["']([^"']+)["']/i);

      const title = decodeHtmlEntities(titleMatch && titleMatch.at(1) ? titleMatch.at(1) : '');
      const link = decodeHtmlEntities(linkMatch && linkMatch.at(1) ? linkMatch.at(1) : '');
      const rawBody = decodeHtmlEntities(
        contentMatch && contentMatch.at(1)
          ? contentMatch.at(1)
          : (descMatch && descMatch.at(1) ? descMatch.at(1) : '')
      );
      const pubDateStr = decodeHtmlEntities(pubDateMatch && pubDateMatch.at(1) ? pubDateMatch.at(1) : '');
      const imageUrl = enclosureMatch && enclosureMatch.at(1)
        ? enclosureMatch.at(1)
        : (mediaMatch && mediaMatch.at(1) ? mediaMatch.at(1) : null);

      if (!title || title.length < 15) continue;

      const parsedDate = pubDateStr ? new Date(pubDateStr) : new Date();
      const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

      if (publishedAt.getTime() < CLEAN_START_UTC) continue;

      items.push({
        sourceName: source.name,
        title,
        link,
        rawBody,
        publishedAt: publishedAt.toISOString(),
        imageUrl
      });
    }

    return items;
  } catch {
    return [];
  }
}

async function rewriteNewsWithAi(rawItem) {
  const combinedRaw = rawItem.title + ' ' + rawItem.rawBody;
  const fallbackCity = detectCity(combinedRaw);
  const fallbackRubric = detectRubric(combinedRaw);

  const fallbackResult = () => {
    const cleanTitle = enforceActualContactsAndLanguage(sanitizeCoverText(rawItem.title));
    const cleanText = enforceActualContactsAndLanguage(rawItem.rawBody || rawItem.title);
    const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary = sentences.slice(0, 2).join(' ').slice(0, 240) || cleanTitle;
    let body = sentences.slice(0, 6).join('\n\n') || summary;

    if (fallbackRubric === 'Дороги и мосты' && /гибдд|дтп|авар/i.test(body)) {
      body = body + '\n\nТелефон дежурной части ГИБДД Приморского края: ' + LINKS.gibddPhone + '.';
    }

    return {
      title: cleanTitle,
      summary,
      body,
      rubric: fallbackRubric,
      city: fallbackCity
    };
  };

  if (!AI_API_KEY) {
    return fallbackResult();
  }

  const systemPrompt = [
'Ты — выпускающий редактор информационного агентства «Прим_Дозор» (primdozor.ru, Владивосток и Приморский край).',
'Перепиши исходную новость в строгом, живом, информативном стиле регионального СМИ (18+).',
'ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:',
'1. Весь текст СТРОГО на русском языке. Запрещены любые английские/латинские слова, хештеги и ссылки.',
'2. Запрещено упоминать прошлые годы (2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025). Актуальный год — 2026.',
'3. Выбери строго одну рубрику из списка: ' + RUBRICS.join(', ') + '.',
'4. Выбери строго один город/локацию из списка: ' + CITIES.join(', ') + '.',
'5. Если речь о ДТП или работе дорожной полиции Приморья, укажи актуальный телефон дежурной части ГИБДД Приморского края: +7 (423) 249-09-21.',
'6. Верни ответ СТРОГО в формате JSON без markdown-обёрток:',
'{"title":"Заголовок до 95 символов","summary":"Краткий лид 1-2 предложения до 220 символов","body":"Полный текст статьи 2-4 абзаца, разделённых двойным переносом строки","rubric":"Название рубрики","city":"Название города"}'
].join('\n');
try {
const res = await fetch(AI_API_URL, {
method: 'POST',
signal: AbortSignal.timeout(18000),
headers: {
'Content-Type': 'application/json',
'Authorization': 'Bearer ' + AI_API_KEY
},
body: JSON.stringify({
model: AI_MODEL,
temperature: 0.35,
messages: [
{ role: 'system', content: systemPrompt },
{
role: 'user',
content: 'Заголовок: ' + rawItem.title + '\nТекст: ' + rawItem.rawBody.slice(0, 1800)
}
]
})
});
if (!res.ok) return fallbackResult();
const data = await res.json();
const firstChoice = Array.isArray(data && data.choices) ? data.choices.at(0) : null;
const content = firstChoice && firstChoice.message && firstChoice.message.content ? firstChoice.message.content : '';
const jsonMatch = content.match(/{[\s\S]*}/);
if (!jsonMatch) return fallbackResult();
const parsed = JSON.parse(jsonMatch.at(0));
const validRubric = RUBRICS.includes(parsed.rubric) ? parsed.rubric : fallbackRubric;
const validCity = CITIES.includes(parsed.city) ? parsed.city : fallbackCity;
const title = enforceActualContactsAndLanguage(parsed.title || rawItem.title);
const summary = enforceActualContactsAndLanguage(parsed.summary || title);
const body = enforceActualContactsAndLanguage(parsed.body || summary);
if (!title || title.length < 10) return fallbackResult();
return {
title,
summary,
body,
rubric: validRubric,
city: validCity
};
} catch {
return fallbackResult();
}
}
export async function runAutopilot() {
console.log('[Прим_Дозор] Запуск цикла автопилота...');
await fs.mkdir(DATA_DIR, { recursive: true });
const rawPosts = await readJson(POSTS_DB_PATH, []);
const seenHashes = new Set(await readJson(SEEN_DB_PATH, []));
let posts = Array.isArray(rawPosts) ? rawPosts.filter(isPostEligible) : [];
console.log('[Прим_Дозор] Валидных постов после фильтра чистого старта (с 07:00 25.11.2026 ВЛД): ' + posts.length);
const feedBatches = await Promise.all(RSS_SOURCES.map((src) => fetchRssFeed(src)));
const incomingItems = feedBatches.flat();
console.log('[Прим_Дозор] Получено кандидатов из лент после 07:00 25.11.2026: ' + incomingItems.length);
const newlyPublished = [];
const MAX_NEW_PER_RUN = 4;
for (const item of incomingItems) {
if (newlyPublished.length >= MAX_NEW_PER_RUN) break;
const normKey = item.title
.toLowerCase()
.replace(/[^а-яёa-z0-9]/g, '')
.slice(0, 70);
const idHash = crypto.createHash('sha1').update(normKey || item.link).digest('hex');
if (seenHashes.has(idHash)) continue;
seenHashes.add(idHash);
const rewritten = await rewriteNewsWithAi(item);
const slug = makeSlug(rewritten.title, idHash);
const candidatePost = {
id: idHash.slice(0, 12),
slug,
title: rewritten.title,
summary: rewritten.summary,
body: rewritten.body,
rubric: rewritten.rubric,
city: rewritten.city,
publishedAt: item.publishedAt,
sourceImageUrl: item.imageUrl || null
};
if (!isPostEligible(candidatePost)) continue;
const cover = await generateNewsCover({
id: candidatePost.id,
title: candidatePost.title,
rubric: candidatePost.rubric,
city: candidatePost.city,
imageUrl: candidatePost.sourceImageUrl,
publishedAt: candidatePost.publishedAt
});
candidatePost.coverUrl = cover.publicUrl;
candidatePost.coverRelative = cover.relativePath;
candidatePost.coverFilePath = cover.filePath;
posts.unshift(candidatePost);
newlyPublished.push(candidatePost);
}
posts = posts
.filter(isPostEligible)
.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
.slice(0, 120);
const validCoverFiles = new Set(
posts
.map((p) => (p.coverRelative ? path.basename(p.coverRelative) : null))
.filter(Boolean)
);
await cleanupOldMedia(validCoverFiles);
const weatherText = await fetchVladivostokWeather();
const buildResult = await buildPortal(posts, { weatherText });
console.log('[Прим_Дозор] Сайт пересобран. Опубликовано на портале: ' + buildResult.totalPublished);
for (const newPost of newlyPublished.reverse()) {
try {
await publishEverywhere(newPost);
console.log('[Прим_Дозор] Опубликовано во все каналы: ' + newPost.title);
} catch (err) {
console.error('[Прим_Дозор] Ошибка кросспостинга "' + newPost.title + '":', err && err.message ? err.message : err);
}
}
if (newlyPublished.length > 0 || buildResult.totalPublished === 0) {
const urlsToPing = [
'primdozor.ru',
'primdozor.ru',
...newlyPublished.map((p) => 'primdozor.ru' + p.slug + '.html')
];
await pingIndexNow(urlsToPing).catch((err) => {
console.error('[Прим_Дозор] Ошибка IndexNow:', err && err.message ? err.message : err);
});
}
await writeJson(POSTS_DB_PATH, posts);
await writeJson(SEEN_DB_PATH, Array.from(seenHashes).slice(-2000));
console.log('[Прим_Дозор] Цикл завершён. Новых публикаций: ' + newlyPublished.length);
}
runAutopilot().catch((err) => {
console.error('[Прим_Дозор] Критическая ошибка автопилота:', err);
process.exitCode = 1;
});
