/**
 * ИА «Прим_Дозор» (primdozor.ru)
 * Модуль bot.js (Блок 4) — Единый кросспостинг идентичного поста
 * в Telegram, ВКонтакте, MAX и Дзен + мгновенная отправка в IndexNow.
 */

import fs from 'node:fs/promises';
import { LINKS, isPostEligible } from './builder.js';

const SITE_URL = 'https://primdozor.ru';
const SITE_HOST = 'primdozor.ru';

// Секреты из GitHub Actions
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHANNEL_ID = process.env.TG_CHANNEL_ID || '@prim_dozor';

const VK_TOKEN = process.env.VK_TOKEN || '';
const VK_GROUP_ID = process.env.VK_GROUP_ID || ''; // числовой ID группы без минуса (если не задан — определяется автоматически для prim_dozor)

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const MAX_CHAT_ID = process.env.MAX_CHAT_ID || '';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';

/**
 * Формирует единый идентичный текст поста для Telegram, ВКонтакте, MAX и Дзен.
 */
export function buildUnifiedPostText(post) {
  const articleUrl = `${SITE_URL}/news/${post.slug}.html`;
  const cityLine = post.city && post.city !== 'Весь Приморский край' ? `📍 ${post.city}` : '📍 Приморский край';

  return [
    `🚨 ${post.title}`,
    '',
    `${post.summary}`,
    '',
    `${cityLine} • Рубрика: ${post.rubric}`,
    `👉 Читать полный материал на сайте: ${articleUrl}`,
    '',
    '———',
    `ИА «Прим_Дозор» (18+) • Оперативно 24/7`,
    `• Телеграм: ${LINKS.telegram}`,
    `• МАКС: ${LINKS.max}`,
    `• ВКонтакте: ${LINKS.vk}`,
    `• Дзен: ${LINKS.dzen}`
  ].join('\n');
}

/**
 * Публикация в Telegram-канал (@prim_dozor) с обложкой 1200x630
 */
async function postToTelegram(post, unifiedText) {
  if (!TG_BOT_TOKEN) {
    console.warn('[Бот/Telegram] Пропуск: не задан секрет TG_BOT_TOKEN');
    return false;
  }

  const articleUrl = `${SITE_URL}/news/${post.slug}.html`;
  const replyMarkup = JSON.stringify({
    inline_keyboard: [
      [
        { text: 'Читать на сайте', url: articleUrl },
        { text: 'Прислать новость', url: LINKS.telegramDirect }
      ]
    ]
  });

  // 1. Пытаемся отправить локальный файл обложки напрямую через multipart/form-data
  if (post.coverFilePath) {
    try {
      const fileBuf = await fs.readFile(post.coverFilePath);
      const form = new FormData();
      form.append('chat_id', TG_CHANNEL_ID);
      form.append('photo', new Blob([fileBuf], { type: 'image/jpeg' }), 'cover.jpg');
      form.append('caption', unifiedText.slice(0, 1024));
      form.append('disable_notification', 'false');
      form.append('reply_markup', replyMarkup);

      const res = await fetch(`https://telegram.org{TG_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(15000)
      });
      const data = await res.json();
      if (data.ok) return true;
      console.warn('[Бот/Telegram] Ошибка sendPhoto (файл):', data.description);
    } catch (err) {
      console.warn('[Бот/Telegram] Сбой отправки файла обложки:', err?.message || err);
    }
  }

  // 2. Резервная отправка по публичному URL обложки или текстовым сообщением
  try {
    const res = await fetch(`https://telegram.org{TG_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        chat_id: TG_CHANNEL_ID,
        photo: post.coverUrl,
        caption: unifiedText.slice(0, 1024),
        reply_markup: JSON.parse(replyMarkup)
      })
    });
    const data = await res.json();
    if (data.ok) return true;

    // Если картинка ещё не закэширована CDN — отправляем чистый текст с превью ссылки
    const textRes = await fetch(`https://telegram.org{TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        chat_id: TG_CHANNEL_ID,
        text: unifiedText,
        disable_web_page_preview: false,
        reply_markup: JSON.parse(replyMarkup)
      })
    });
    const textData = await textRes.json();
    return Boolean(textData.ok);
  } catch (err) {
    console.error('[Бот/Telegram] Критическая ошибка отправки:', err?.message || err);
    return false;
  }
}

/**
 * Определяет числовой ID сообщества ВКонтакте (prim_dozor)
 */
async function resolveVkGroupId() {
  if (VK_GROUP_ID) {
    return String(VK_GROUP_ID).replace(/^-/, '');
  }

  try {
    const url = new URL('https://vk.com');
    url.searchParams.set('group_id', 'prim_dozor');
    url.searchParams.set('access_token', VK_TOKEN);
    url.searchParams.set('v', '5.199');

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const id = data?.response?.groups?.?.id || data?.response?.?.id;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

/**
 * Загружает обложку 1200x630 на стену сообщества ВКонтакте и возвращает attachment вида photo-123_456
 */
async function uploadVkWallPhoto(groupId, coverFilePath) {
  if (!coverFilePath) return null;

  try {
    const serverUrl = new URL('https://vk.com');
    serverUrl.searchParams.set('group_id', groupId);
    serverUrl.searchParams.set('access_token', VK_TOKEN);
    serverUrl.searchParams.set('v', '5.199');

    const srvRes = await fetch(serverUrl, { signal: AbortSignal.timeout(10000) });
    const srvData = await srvRes.json();
    const uploadUrl = srvData?.response?.upload_url;
    if (!uploadUrl) return null;

    const fileBuf = await fs.readFile(coverFilePath);
    const form = new FormData();
    form.append('photo', new Blob([fileBuf], { type: 'image/jpeg' }), 'cover.jpg');

    const upRes = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15000)
    });
    const upData = await upRes.json();
    if (!upData.photo || upData.photo === '[]') return null;

    const saveUrl = new URL('https://vk.com');
    saveUrl.searchParams.set('group_id', groupId);
    saveUrl.searchParams.set('photo', upData.photo);
    saveUrl.searchParams.set('server', String(upData.server));
    saveUrl.searchParams.set('hash', upData.hash);
    saveUrl.searchParams.set('access_token', VK_TOKEN);
    saveUrl.searchParams.set('v', '5.199');

    const saveRes = await fetch(saveUrl, { signal: AbortSignal.timeout(10000) });
    const saveData = await saveRes.json();
    const saved = saveData?.response?.?.[0];
    if (!saved) return null;

    return `photo${saved.owner_id}_${saved.id}`;
  } catch {
    return null;
  }
}

/**
 * Публикация идентичного поста на стену сообщества ВКонтакте (://vk.com)
 */
async function postToVk(post, unifiedText) {
  if (!VK_TOKEN) {
    console.warn('[Бот/ВК] Пропуск: не задан секрет VK_TOKEN');
    return false;
  }

  const groupId = await resolveVkGroupId();
  if (!groupId) {
    console.error('[Бот/ВК] Не удалось определить ID сообщества prim_dozor');
    return false;
  }

  const articleUrl = `${SITE_URL}/news/${post.slug}.html`;
  const photoAttachment = await uploadVkWallPhoto(groupId, post.coverFilePath);
  const attachments = photoAttachment ? `${photoAttachment},${articleUrl}` : articleUrl;

  try {
    const params = new URLSearchParams();
    params.set('owner_id', `-${groupId}`);
    params.set('from_group', '1');
    params.set('message', unifiedText);
    params.set('attachments', attachments);
    params.set('access_token', VK_TOKEN);
    params.set('v', '5.199');

    const res = await fetch('https://vk.com', {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(12000)
    });
    const data = await res.json();
    if (data?.response?.post_id) return true;

    console.warn('[Бот/ВК] Ошибка wall.post:', data?.error?.error_msg || JSON.stringify(data));
    return false;
  } catch (err) {
    console.error('[Бот/ВК] Критическая ошибка публикации:', err?.message || err);
    return false;
  }
}

/**
 * Публикация идентичного поста в мессенджер MAX (platform-api.max.ru)
 * Работает автоматически при добавлении MAX_BOT_TOKEN и MAX_CHAT_ID в секреты GitHub.
 */
async function postToMax(post, unifiedText) {
  if (!MAX_BOT_TOKEN || !MAX_CHAT_ID) {
    console.log('[Бот/MAX] Ожидание токена: добавьте MAX_BOT_TOKEN и MAX_CHAT_ID для автопостинга в канал MAX');
    return false;
  }

  try {
    const url = new URL('https://max.ru');
    url.searchParams.set('chat_id', MAX_CHAT_ID);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MAX_BOT_TOKEN
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        text: unifiedText,
        format: 'markdown',
        attachments: [
          {
            type: 'image',
            payload: { url: post.coverUrl }
          }
        ]
      })
    });

    if (res.ok) return true;
    const errText = await res.text();
    console.warn('[Бот/MAX] Ошибка API MAX:', errText);
    return false;
  } catch (err) {
    console.error('[Бот/MAX] Критическая ошибка отправки:', err?.message || err);
    return false;
  }
}

/**
 * Уведомляет Дзен и агрегаторы об обновлении RSS-фида (https://primdozor.ru)
 */
async function notifyDzenFeedUpdated() {
  try {
    const form = new URLSearchParams();
    form.set('hub.mode', 'publish');
    form.set('hub.url', LINKS.dzenRss);

    await fetch('https://appspot.com', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8000)
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Единая точка публикации одного материала во все каналы:
 * Telegram, ВКонтакте, MAX и Дзен (через RSS dzen.xml + WebSub)
 */
export async function publishEverywhere(post) {
  if (!isPostEligible(post)) {
console.warn('[Бот] Пост отклонён фильтром чистого старта (до 07:00 25.11.2026 ВЛД или содержит 2018-2025 гг.)');
return;
}
const unifiedText = buildUnifiedPostText(post);
const [tgOk, vkOk, maxOk, dzenOk] = await Promise.all([
postToTelegram(post, unifiedText),
postToVk(post, unifiedText),
postToMax(post, unifiedText),
notifyDzenFeedUpdated()
]);
console.log(
[Бот/Итог] "${post.title.slice(0, 48)}..." ->  +
Telegram: ${tgOk ? 'OK' : 'НЕТ'}, ВК: ${vkOk ? 'OK' : 'НЕТ'}, MAX: ${maxOk ? 'OK' : 'ОЖИДАЕТ ТОКЕН'}, Дзен RSS: ${dzenOk ? 'OK' : 'ОБНОВЛЁН'}
);
}
/**
• Отправка списка URL в IndexNow (Яндекс, Bing и партнёры)
*/
export async function pingIndexNow(urlList = []) {
if (!INDEXNOW_KEY) {
console.warn('[IndexNow] Пропуск: не задан секрет INDEXNOW_KEY');
return false;
}
const cleanUrls = Array.from(new Set(urlList)).filter((u) => u.startsWith(SITE_URL));
if (cleanUrls.length === 0) return false;
const payload = {
host: SITE_HOST,
key: INDEXNOW_KEY,
keyLocation: ${SITE_URL}/${INDEXNOW_KEY}.txt,
urlList: cleanUrls
};
const endpoints = [
'yandex.com',
'indexnow.org'
];
let anySuccess = false;
for (const endpoint of endpoints) {
try {
const res = await fetch(endpoint, {
method: 'POST',
headers: { 'Content-Type': 'application/json; charset=utf-8' },
body: JSON.stringify(payload),
signal: AbortSignal.timeout(10000)
});
if (res.ok || res.status === 202) {
anySuccess = true;
}
} catch {
// Продолжаем отправку на следующий эндпоинт
}
}
console.log([IndexNow] Отправлено ссылок (${cleanUrls.length}): ${anySuccess ? 'УСПЕШНО' : 'ПОВТОРИМ В СЛЕДУЮЩЕМ ЦИКЛЕ'});
return anySuccess;
}
export default {
buildUnifiedPostText,
publishEverywhere,
pingIndexNow
};
