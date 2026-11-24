/**
 * ИА «Прим_Дозор» (primdozor.ru)
 * Модуль media.js (Блок 1) — Генерация фирменных обложек 1200x630,
 * поиск и валидация изображений, строгая кириллическая фильтрация.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const MEDIA_DIR = path.resolve('public/media');
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;

// 10 фирменных рубрик и их цветовые акценты для плашек обложек
export const RUBRIC_STYLES = {
  'Вся лента 24/7': { badge: '#1E3A8A', accent: '#3B82F6', tag: 'ЛЕНТА 24/7' },
  'Молния • Главное': { badge: '#B91C1C', accent: '#EF4444', tag: 'МОЛНИЯ • ГЛАВНОЕ' },
  'Хроника 112 и ЧП': { badge: '#991B1B', accent: '#F97316', tag: 'ХРОНИКА 112 И ЧП' },
  'Коммунальный фронт': { badge: '#0369A1', accent: '#0EA5E9', tag: 'КОММУНАЛЬНЫЙ ФРОНТ' },
  'Дороги и мосты': { badge: '#B45309', accent: '#F59E0B', tag: 'ДОРОГИ И МОСТЫ' },
  'Власть, закон и СВО': { badge: '#1F2937', accent: '#DC2626', tag: 'ВЛАСТЬ, ЗАКОН И СВО' },
  'Экономика и порт': { badge: '#065F46', accent: '#10B981', tag: 'ЭКОНОМИКА И ПОРТ' },
  'Люди Приморья': { badge: '#6D28D9', accent: '#8B5CF6', tag: 'ЛЮДИ ПРИМОРЬЯ' },
  'Здравоохранение': { badge: '#0F766E', accent: '#14B8A6', tag: 'ЗДРАВООХРАНЕНИЕ' },
  'Спорт и события': { badge: '#4338CA', accent: '#6366F1', tag: 'СПОРТ И СОБЫТИЯ' }
};

// Тематические SVG-паттерны фона при отсутствии внешнего фото (100% автономно и без латиницы)
const FALLBACK_GRADIENTS = {
  'Молния • Главное': ['#0F172A', '#450A0A', '#991B1B'],
  'Хроника 112 и ЧП': ['#111827', '#431407', '#9A3412'],
  'Коммунальный фронт': ['#082F49', '#0C4A6E', '#0369A1'],
  'Дороги и мосты': ['#1C1917', '#451A03', '#92400E'],
  'Власть, закон и СВО': ['#090D16', '#1E293B', '#334155'],
  'Экономика и порт': ['#022C22', '#064E3B', '#047857'],
  'Люди Приморья': ['#1E1B4B', '#312E81', '#4C1D95'],
  'Здравоохранение': ['#042F2E', '#115E59', '#0F766E'],
  'Спорт и события': ['#172554', '#1E3A8A', '#3730A3'],
  'default': ['#0B132B', '#1C2541', '#3A506B']
};

// Словарь принудительной замены латиницы на кириллицу для обложек и заголовков
const LATIN_TO_RU_MAP = [
  [/\bTelegram\b/gi, 'Телеграм'],
  [/\bVK\b/gi, 'ВКонтакте'],
  [/\bMAX\b/gi, 'МАКС'],
  [/\bDzen\b/gi, 'Дзен'],
  [/\bCOVID-19\b/gi, 'Ковид-19'],
  [/\bCOVID\b/gi, 'Ковид'],
  [/\bIT\b/g, 'ИТ'],
  [/\bAI\b/g, 'ИИ'],
  [/\bQR\b/g, 'Куар'],
  [/\bVIP\b/gi, 'ВИП'],
  [/\bGPS\b/gi, 'ГЛОНАСС/Джи-Пи-Эс'],
  [/\bUSB\b/gi, 'ЮСБ'],
  [/\bWi-Fi\b/gi, 'Вай-Фай'],
  [/\bSMS\b/gi, 'СМС'],
  [/\bPR\b/g, 'пиар'],
  [/\bHR\b/g, 'кадры'],
  [/\bCEO\b/gi, 'гендиректор'],
  [/\bMCHS\b/gi, 'МЧС'],
  [/\bGIBDD\b/gi, 'ГИБДД'],
  [/\bPrimorye\b/gi, 'Приморье'],
  [/\bVladivostok\b/gi, 'Владивосток']
];

/**
 * Очищает текст для обложки: убирает латиницу, HTML-теги, лишние символы
 * и блокирует упоминания запрещённых прошлых лет (2018–2025).
 */
export function sanitizeCoverText(rawText = '') {
  let text = String(rawText)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[@#][A-Za-z0-9_]+/g, '');

  for (const [pattern, replacement] of LATIN_TO_RU_MAP) {
    text = text.replace(pattern, replacement);
  }

  // Удаляем упоминания старых лет (2018-2025)
  text = text.replace(/\b(2018|2019|2020|2021|2022|2023|2024|2025)\s*(г\.|год[ауе]?|годах)?\b/gi, '');

  // Удаляем оставшиеся латинские слова, чтобы на обложке был 100% русский язык
  text = text.replace(/[A-Za-z]+/g, '');

  // Нормализация пробелов и кавычек
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();

  return text;
}

/**
 * Экранирование спецсимволов для безопасной вставки в XML/SVG
 */
function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Разбивка заголовка на аккуратные строки для обложки (макс. 4 строки)
 */
function wrapTextLines(text, maxCharsPerLine = 32, maxLines = 4) {
  const clean = sanitizeCoverText(text);
  if (!clean) return ['Оперативная сводка Приморского края'];

  const words = clean.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxCharsPerLine) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  // Если текст обрезался — ставим многоточие в конце последней строки
  const joinedLength = lines.join(' ').length;
  if (joinedLength < clean.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    if (last.length > maxCharsPerLine - 3) {
      last = last.slice(0, maxCharsPerLine - 3).trim();
    }
    lines[lines.length - 1] = last.replace(/[.,:;!?-]+$/, '') + '...';
  }

  return lines;
}

/**
 * Форматирует текущую дату и время строго по Владивостоку (UTC+10)
 */
export function formatVladivostokStamp(dateInput = new Date()) {
  const dt = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Vladivostok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return formatter.format(dt).replace(',', ' •') + ' (ВЛД)';
}

/**
 * Загружает внешнее изображение по URL, проверяет его размеры и формат.
 * Возвращает Buffer или null, если картинка битая / слишком маленькая / водяной знак.
 */
export async function fetchValidImageBuffer(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PrimDozorBot/2.0; +https://primdozor.ru)',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') || contentType.includes('svg')) {
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.byteLength < 12000) return null; // отсекаем пиксели-заглушки

    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) return null;
    if (meta.width < 480 || meta.height < 260) return null;

    return buf;
  } catch {
    return null;
  }
}

/**
 * Генерирует SVG-оверлей с фирменной плашкой ИА «Прим_Дозор», рубрикой,
 * городом, заголовком и датой строго на русском языке.
 */
function buildCoverSvg({ title, rubric, city, publishedAt, hasPhoto }) {
  const style = RUBRIC_STYLES[rubric] || RUBRIC_STYLES['Вся лента 24/7'];
  const grad = FALLBACK_GRADIENTS[rubric] || FALLBACK_GRADIENTS.default;

  const safeRubric = escapeXml(sanitizeCoverText(style.tag || rubric));
  const safeCity = escapeXml(sanitizeCoverText(city || 'Приморский край').toUpperCase());
  const safeDate = escapeXml(formatVladivostokStamp(publishedAt));
  const lines = wrapTextLines(title, 31, 4);

  const badgeWidth = Math.min(540, Math.max(240, safeRubric.length * 16 + 56));
  const cityWidth = Math.min(420, Math.max(170, safeCity.length * 15 + 48));

  // Динамический размер шрифта в зависимости от числа строк
  const fontSize = lines.length <= 2 ? 52 : lines.length === 3 ? 46 : 41;
  const lineHeight = Math.round(fontSize * 1.24);
  const startY = lines.length <= 2 ? 310 : lines.length === 3 ? 280 : 255;

  const textTspans = lines
    .map((line, idx) => {
      const y = startY + idx * lineHeight;
      return `<text x="64" y="${y}" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">${escapeXml(line)}</text>`;
    })
    .join('\n    ');

  const backgroundLayer = hasPhoto
    ? `
      <rect width="1200" height="630" fill="url(#photoShade)" />
      <rect width="1200" height="630" fill="#090D16" fill-opacity="0.32" />
    `
    : `
      <rect width="1200" height="630" fill="url(#bgGrad)" />
      <circle cx="1060" cy="120" r="320" fill="${style.accent}" fill-opacity="0.16" />
      <circle cx="160" cy="560" r="260" fill="${style.badge}" fill-opacity="0.24" />
      <path d="M0 490 L1200 370 L1200 630 L0 630 Z" fill="#050811" fill-opacity="0.45" />
      <g stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="1">
        <line x1="0" y1="105" x2="1200" y2="105" />
        <line x1="0" y1="535" x2="1200" y2="535" />
        <line x1="64" y1="0" x2="64" y2="630" />
        <line x1="1136" y1="0" x2="1136" y2="630" />
      </g>
    `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${COVER_WIDTH}" height="${COVER_HEIGHT}" viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}" xmlns="http://w3.org">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${grad[0]}" />
      <stop offset="55%" stop-color="${grad[1]}" />
      <stop offset="100%" stop-color="${grad[2]}" />
    </linearGradient>
    <linearGradient id="photoShade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#060913" stop-opacity="0.62" />
      <stop offset="45%" stop-color="#060913" stop-opacity="0.72" />
      <stop offset="100%" stop-color="#04070F" stop-opacity="0.94" />
    </linearGradient>
    <linearGradient id="accentBar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${style.accent}" />
      <stop offset="100%" stop-color="${style.badge}" />
    </linearGradient>
  </defs>

  ${backgroundLayer}

${textTspans}
`;
}
/**
• Создаёт готовую брендированную обложку JPEG 1200x630 в public/media/
• и возвращает метаданные файла для сайта, Telegram, ВК, MAX и Дзен RSS.
*/
export async function generateNewsCover({
id,
title,
rubric = 'Вся лента 24/7',
city = 'Владивосток',
imageUrl = null,
publishedAt = new Date()
}) {
await fs.mkdir(MEDIA_DIR, { recursive: true });
const hash = crypto
.createHash('sha1')
.update(${id}|${title}|${rubric}|${city})
.digest('hex')
.slice(0, 12);
const fileName = cover-${hash}.jpg;
const outputPath = path.join(MEDIA_DIR, fileName);
const publicUrl = https://primdozor.ru{fileName};
const relativePath = /media/${fileName};
// Если обложка уже собрана в рамках текущего прогона — переиспользуем
try {
const stat = await fs.stat(outputPath);
if (stat.size > 15000) {
return {
filePath: outputPath,
relativePath,
publicUrl,
width: COVER_WIDTH,
height: COVER_HEIGHT
};
}
} catch {
// Файл ещё не создан — продолжаем генерацию
}
const photoBuffer = await fetchValidImageBuffer(imageUrl);
const svgString = buildCoverSvg({
title,
rubric,
city,
publishedAt,
hasPhoto: Boolean(photoBuffer)
});
const svgBuffer = Buffer.from(svgString, 'utf-8');
if (photoBuffer) {
// Накладываем фирменный кириллический оверлей поверх реального фото новости
const resizedPhoto = await sharp(photoBuffer)
.resize(COVER_WIDTH, COVER_HEIGHT, {
fit: 'cover',
position: 'attention'
})
.modulate({ brightness: 0.85, saturation: 1.08 })
.toBuffer();
await sharp(resizedPhoto)
.composite([{ input: svgBuffer, top: 0, left: 0 }])
.jpeg({ quality: 88, progressive: true, mozjpeg: true })
.toFile(outputPath);
} else {
// Генерируем автономную векторную обложку в фирменных цветах рубрики
await sharp(svgBuffer)
.jpeg({ quality: 90, progressive: true, mozjpeg: true })
.toFile(outputPath);
}
return {
filePath: outputPath,
relativePath,
publicUrl,
width: COVER_WIDTH,
height: COVER_HEIGHT
};
}
/**
• Очистка устаревших медиафайлов (старше 7 дней или до точки чистого старта 25.11.2026 07:00 ВЛД)
*/
export async function cleanupOldMedia(validFileNames = new Set()) {
const CLEAN_START_UTC = Date.UTC(2026, 10, 24, 21, 0, 0); // 25.11.2026 07:00 (UTC+10)
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();
try {
await fs.mkdir(MEDIA_DIR, { recursive: true });
const files = await fs.readdir(MEDIA_DIR);
for (const file of files) {
if (!file.startsWith('cover-') || !file.endsWith('.jpg')) continue;
if (validFileNames.has(file)) continue;
const fullPath = path.join(MEDIA_DIR, file);
const stat = await fs.stat(fullPath);
if (stat.mtimeMs < CLEAN_START_UTC || now - stat.mtimeMs > MAX_AGE_MS) {
await fs.unlink(fullPath).catch(() => {});
}
}
} catch {
// Игнорируем ошибки доступа к директории при первом запуске
}
}
export default {
RUBRIC_STYLES,
sanitizeCoverText,
formatVladivostokStamp,
fetchValidImageBuffer,
generateNewsCover,
cleanupOldMedia
};
