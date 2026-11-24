import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const MEDIA_DIR = path.resolve('media');
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;

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

const FALLBACK_GRADIENTS = {
  'Молния • Главное': ['#0F172A', '#991B1B'],
  'Хроника 112 и ЧП': ['#111827', '#9A3412'],
  'Коммунальный фронт': ['#082F49', '#0369A1'],
  'Дороги и мосты': ['#1C1917', '#92400E'],
  'Власть, закон и СВО': ['#090D16', '#334155'],
  'Экономика и порт': ['#022C22', '#047857'],
  'Люди Приморья': ['#1E1B4B', '#4C1D95'],
  'Здравоохранение': ['#042F2E', '#0F766E'],
  'Спорт и события': ['#172554', '#3730A3'],
  'default': ['#0B132B', '#1E3A8A']
};

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
  [/\bGPS\b/gi, 'ГЛОНАСС'],
  [/\bWi-Fi\b/gi, 'Вай-Фай'],
  [/\bSMS\b/gi, 'СМС'],
  [/\bMCHS\b/gi, 'МЧС'],
  [/\bGIBDD\b/gi, 'ГИБДД'],
  [/\bPrimorye\b/gi, 'Приморье'],
  [/\bVladivostok\b/gi, 'Владивосток']
];

export function sanitizeCoverText(rawText = '') {
  let text = String(rawText)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[@#][A-Za-z0-9_]+/g, '');

  for (const pair of LATIN_TO_RU_MAP) {
    text = text.replace(pair.at(0), pair.at(1));
  }

  text = text.replace(/\b(2018|2019|2020|2021|2022|2023|2024|2025)\s*(г\.|год[ауе]?|годах)?\b/gi, '');
  text = text.replace(/[A-Za-z]+/g, '');

  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTextLines(text, maxCharsPerLine = 31, maxLines = 4) {
  const clean = sanitizeCoverText(text);
  if (!clean) return ['Оперативная сводка Приморского края'];

  const words = clean.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxCharsPerLine) {
      current = current + ' ' + word;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  const joinedLength = lines.join(' ').length;
  if (joinedLength < clean.length && lines.length > 0) {
    let last = lines.at(-1);
    if (last.length > maxCharsPerLine - 3) {
      last = last.slice(0, maxCharsPerLine - 3).trim();
    }
    lines[lines.length - 1] = last.replace(/[.,:;!?-]+$/, '') + '...';
  }

  return lines;
}

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

export async function fetchValidImageBuffer(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(9000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PrimDozorBot/2.0; +https://primdozor.ru)'
      }
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') || contentType.includes('svg')) {
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.byteLength < 12000) return null;

    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) return null;
    if (meta.width < 480 || meta.height < 260) return null;

    return buf;
  } catch {
    return null;
  }
}

function buildCoverSvg(opts) {
  const style = RUBRIC_STYLES[opts.rubric] || RUBRIC_STYLES['Вся лента 24/7'];
  const grad = FALLBACK_GRADIENTS[opts.rubric] || FALLBACK_GRADIENTS.default;

  const safeRubric = escapeXml(sanitizeCoverText(style.tag || opts.rubric));
  const safeCity = escapeXml(sanitizeCoverText(opts.city || 'Приморский край').toUpperCase());
  const safeDate = escapeXml(formatVladivostokStamp(opts.publishedAt));
  const lines = wrapTextLines(opts.title, 31, 4);

  const badgeWidth = Math.min(540, Math.max(240, safeRubric.length * 16 + 56));
  const fontSize = lines.length <= 2 ? 52 : lines.length === 3 ? 46 : 41;
  const lineHeight = Math.round(fontSize * 1.24);
  const startY = lines.length <= 2 ? 310 : lines.length === 3 ? 280 : 255;

  const textLinesSvg = lines
    .map((line, idx) => {
      const y = startY + idx * lineHeight;
      return '<text x="64" y="' + y + '" font-family="DejaVu Sans, Arial, sans-serif" font-size="' + fontSize + '" font-weight="800" fill="#FFFFFF">' + escapeXml(line) + '</text>';
    })
    .join('\n');

  const bgSvg = opts.hasPhoto
    ? '<rect width="1200" height="630" fill="#060913" fill-opacity="0.68" />'
    : '<rect width="1200" height="630" fill="url(#bgGrad)" /><circle cx="1060" cy="120" r="320" fill="' + style.accent + '" fill-opacity="0.18" />';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg width="' + COVER_WIDTH + '" height="' + COVER_HEIGHT + '" viewBox="0 0 1200 630" xmlns="http://w3.org">',
    '<defs><linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
    '<stop offset="0%" stop-color="' + grad.at(0) + '" />',
    '<stop offset="100%" stop-color="' + grad.at(1) + '" />',
    '</linearGradient></defs>',
    bgSvg,
    '<rect x="64" y="44" width="12" height="44" rx="3" fill="' + style.accent + '" />',
    '<text x="88" y="75" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" font-weight="900" fill="#FFFFFF">ИА «ПРИМ_ДОЗОР»</text>',
    '<text x="415" y="74" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="700" fill="#94A3B8">• НОВОСТИ ВЛАДИВОСТОКА И КРАЯ 24/7</text>',
    '<rect x="64" y="122" width="' + badgeWidth + '" height="42" rx="6" fill="' + style.badge + '" />',
    '<text x="84" y="149" font-family="DejaVu Sans, Arial, sans-serif" font-size="19" font-weight="800" fill="#FFFFFF">' + safeRubric + '</text>',
    '<text x="' + (badgeWidth + 92) + '" y="149" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="700" fill="#E2E8F0">' + safeCity + '</text>',
    textLinesSvg,
    '<text x="64" y="584" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="700" fill="#CBD5E1">' + safeDate + '</text>',
    '<text x="1136" y="584" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="800" fill="' + style.accent + '">ПРИМДОЗОР.РФ • 18+</text>',
    '</svg>'
  ].join('\n');
}

export async function generateNewsCover(opts) {
  await fs.mkdir(MEDIA_DIR, { recursive: true });

  const hash = crypto
    .createHash('sha1')
    .update(opts.id + '|' + opts.title + '|' + opts.rubric + '|' + opts.city)
    .digest('hex')
    .slice(0, 12);

  const fileName = 'cover-' + hash + '.jpg';
  const outputPath = path.join(MEDIA_DIR, fileName);
  const publicUrl = 'https://primdozor.ru' + fileName;
  const relativePath = '/media/' + fileName;

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
  } catch {}

  const photoBuffer = await fetchValidImageBuffer(opts.imageUrl);
  const svgString = buildCoverSvg({
    title: opts.title,
    rubric: opts.rubric || 'Вся лента 24/7',
    city: opts.city || 'Владивосток',
    publishedAt: opts.publishedAt || new Date(),
    hasPhoto: Boolean(photoBuffer)
  });
  const svgBuffer = Buffer.from(svgString, 'utf-8');

  if (photoBuffer) {
    const resizedPhoto = await sharp(photoBuffer)
      .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'cover', position: 'attention' })
      .modulate({ brightness: 0.85, saturation: 1.08 })
      .toBuffer();

    await sharp(resizedPhoto)
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toFile(outputPath);
  } else {
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

export async function cleanupOldMedia(validFileNames = new Set()) {
  const CLEAN_START_UTC = Date.UTC(2026, 10, 24, 21, 0, 0);
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
} catch {}
}
export default {
RUBRIC_STYLES,
sanitizeCoverText,
formatVladivostokStamp,
fetchValidImageBuffer,
generateNewsCover,
cleanupOldMedia
};
