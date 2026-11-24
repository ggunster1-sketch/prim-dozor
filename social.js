const fs = require('fs');

const SOCIAL_LINKS = {
  tgWeb: 'https://t.me',
  tgDirect: 'https://t.me',
  vkWeb: 'https://vk.com',
  maxWeb: 'https://max.ru',
  dzenWeb: 'https://dzen.ru/prim_dozor'
};


function escTg(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hasForeignGlitch(text) {
  const s = String(text || '');
  const latWords = s.match(/\b[A-Za-z]{4,}\b/g) || [];
  const allowed = new Set(['primdozor', 'telegram', 'https', 'http', 'vvo', 'toyota', 'nissan', 'honda', 'subaru', 'suzuki', 'mazda', 'mitsubishi', 'lexus', 'hyundai', 'kia', 'isuzu', 'sitrak', 'howo', 'kamaz', 'fesco', 'dns', 'cagmo', 'meta', 'facebook', 'instagram', 'covid', 'max']);
  const badLat = latWords.filter(w => !allowed.has(w.toLowerCase()));
  return badLat.length > 3;
}

function makeCityTag(city) {
  const c = String(city || 'Приморский край').replace(/[^А-ЯЁа-яё0-9]/g, '');
  return c ? '#' + c : '#ПриморскийКрай';
}

function smartLead(text, maxLen) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return lastDot > 240 ? cut.slice(0, lastDot + 1) : cut + '...';
}

function buildTgFooter(host, artUrl, city) {
  const cityTag = makeCityTag(city);
  return '\n\n' +
    '🔎 <a href="' + SOCIAL_LINKS.tgWeb + '">Прим_Дозор</a> — жестко фиксируем то, что другие пытаются скрыть.\n' +
    '👉 Наш сайт: <a href="https://' + host + '/">' + host + '</a> | <a href="' + artUrl + '">Читать полностью</a>\n' +
    '📲 Вопросы: <a href="' + SOCIAL_LINKS.tgDirect + '">связь с админом</a>\n' +
    '🤝 Сотрудничество: prim_dozor@internet.ru\n' +
    '👉 <a href="' + SOCIAL_LINKS.tgWeb + '">Читайте нас в Telegram</a>\n' +
    '👉 <a href="' + SOCIAL_LINKS.vkWeb + '">Читайте нас в ВК</a>\n' +
    '👉 <a href="' + SOCIAL_LINKS.maxWeb + '">Читайте нас в MAX</a>\n' +
    '👉 <a href="' + SOCIAL_LINKS.dzenWeb + '">Читайте нас в Дзен</a>\n\n' +
    escTg(cityTag + ' #ПриморскийКрай #ПримДозор');
}

function buildPlainFooter(host, artUrl, city) {
  const cityTag = makeCityTag(city);
  return '\n\n' +
    '🔎 Прим_Дозор — жестко фиксируем то, что другие пытаются скрыть.\n' +
    '👉 Полный текст на сайте: ' + artUrl + '\n' +
    '👉 Наш портал: https://' + host + '/\n' +
    '👉 Читайте нас в Telegram: ' + SOCIAL_LINKS.tgWeb + '\n' +
    '👉 Читайте нас в ВК: ' + SOCIAL_LINKS.vkWeb + '\n' +
    '👉 Читайте нас в MAX: ' + SOCIAL_LINKS.maxWeb + '\n' +
    '📲 Вопросы и новости: ' + SOCIAL_LINKS.tgDirect + '\n' +
    '🤝 Сотрудничество: prim_dozor@internet.ru\n\n' +
    cityTag + ' #ПриморскийКрай #ПримДозор';
}
async function sendTgMedia(token, caption, filePath, isVideo) {
  if (!token || !filePath || !fs.existsSync(filePath)) return false;
  try {
    const boundary = '----PrimDozorBoundary' + Date.now();
    const buf = fs.readFileSync(filePath);
    const field = isVideo ? 'video' : 'photo';
    const fname = isVideo ? 'video.mp4' : 'cover.jpg';
    const mime = isVideo ? 'video/mp4' : 'image/jpeg';
    const head = Buffer.from(
      '--' + boundary + '\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n@prim_dozor\r\n' +
      '--' + boundary + '\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n' +
      '--' + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + caption + '\r\n' +
      '--' + boundary + '\r\nContent-Disposition: form-data; name="' + field + '"; filename="' + fname + '"\r\nContent-Type: ' + mime + '\r\n\r\n'
    );
    const tail = Buffer.from('\r\n--' + boundary + '--\r\n');
    const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
    const res = await fetch('https://telegram.org' + token + '/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body: Buffer.concat([head, buf, tail])
    });
    const j = await res.json();
    return Boolean(j.ok);
  } catch (e) {
    return false;
  }
}

async function sendTgText(token, text) {
  if (!token || !text || hasForeignGlitch(text)) return false;
  try {
    const r = await fetch('https://telegram.org' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: '@prim_dozor', parse_mode: 'HTML', disable_web_page_preview: true, text: text })
    });
    const j = await r.json();
    return Boolean(j.ok);
  } catch (e) {
    return false;
  }
}

async function postToVk(post, vkToken, host) {
  if (!vkToken || !post) return false;
  try {
    const gRes = await fetch('https://vk.com' + encodeURIComponent(vkToken));
    const gData = await gRes.json();
    const grp = gData && gData.response && Array.isArray(gData.response.groups) ? gData.response.groups.at(0) : null;
    const groupId = grp ? grp.id : 0;
    if (!groupId) return false;

    let attachment = '';
    if (post.cover && fs.existsSync(post.cover)) {
      const upSrvRes = await fetch('https://vk.com' + groupId + '&v=5.199&access_token=' + encodeURIComponent(vkToken));
      const upSrv = await upSrvRes.json();
      const uploadUrl = upSrv && upSrv.response ? upSrv.response.upload_url : '';
      if (uploadUrl) {
        const fd = new FormData();
        fd.append('photo', new Blob([fs.readFileSync(post.cover)], { type: 'image/jpeg' }), 'cover.jpg');
        const upRes = await fetch(uploadUrl, { method: 'POST', body: fd });
        const upJson = await upRes.json();
        const saveRes = await fetch('https://vk.com' + groupId + '&photo=' + encodeURIComponent(upJson.photo) + '&server=' + upJson.server + '&hash=' + encodeURIComponent(upJson.hash) + '&v=5.199&access_token=' + encodeURIComponent(vkToken));
        const saveJson = await saveRes.json();
        const saved = saveJson && Array.isArray(saveJson.response) ? saveJson.response.at(0) : null;
        if (saved) attachment = 'photo' + saved.owner_id + '_' + saved.id;
      }
    }

    const artUrl = 'https://' + host + '/news/' + post.id + '.html';
    const bodyText = post.skipTg
      ? String(post.text || '') + '\n\n👉 Наш портал: https://' + host + '/'
      : post.title + ' (' + (post.age || '18+') + ')\n\n' + smartLead(post.tgText || post.text, 900) + buildPlainFooter(host, artUrl, post.city);

    const params = new URLSearchParams();
    params.set('owner_id', '-' + groupId);
    params.set('from_group', '1');
    params.set('message', bodyText);
    params.set('attachments', attachment ? attachment + ',' + artUrl : artUrl);
    params.set('v', '5.199');
    params.set('access_token', vkToken);

    const wallRes = await fetch('https://vk.com', { method: 'POST', body: params });
    const wallJson = await wallRes.json();
    return Boolean(wallJson && wallJson.response && wallJson.response.post_id);
  } catch (e) {
    return false;
  }
}

async function postToMax(post, maxToken, maxChatId, host) {
  if (!maxToken || !maxChatId || !post) return false;
  try {
    const artUrl = 'https://' + host + '/news/' + post.id + '.html';
    const text = post.skipTg
      ? String(post.text || '') + '\n\n👉 Наш портал: https://' + host + '/'
      : post.title + ' (' + (post.age || '18+') + ')\n\n' + smartLead(post.tgText || post.text, 850) + buildPlainFooter(host, artUrl, post.city);
    const res = await fetch('https://max.ru' + encodeURIComponent(maxChatId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': maxToken },
      body: JSON.stringify({ text: text })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function broadcastPosts(posts, tokens, host) {
  if (!Array.isArray(posts) || !posts.length) return;
  const { tgToken, vkToken, maxToken, maxChatId } = tokens || {};
  for (const p of posts) {
    const rawLead = p.tgText || p.text;
    if (!p.skipTg && hasForeignGlitch(p.title + ' ' + rawLead)) continue;
    const artUrl = 'https://' + host + '/news/' + p.id + '.html';

    if (!p.skipTg && tgToken) {
      const caption = '<b>' + escTg(p.title) + '</b> (' + escTg(p.age || '18+') + ')\n\n' +
        escTg(smartLead(rawLead, 620)) + buildTgFooter(host, artUrl, p.city);
      if (p.video && fs.existsSync(p.video)) {
        await sendTgMedia(tgToken, caption, p.video, true);
      } else if (p.cover && fs.existsSync(p.cover)) {
        await sendTgMedia(tgToken, caption, p.cover, false);
      }
    }

    if (vkToken) await postToVk(p, vkToken, host);
    if (maxToken && maxChatId) await postToMax(p, maxToken, maxChatId, host);
  }
}

async function runScheduledReports(token, host, weather, newsList, state) {
  if (!token) return false;
  const vl = new Date(Date.now() + 10 * 3600000);
  const hr = vl.getUTCHours();
  const dow = vl.getUTCDay();
  const dayKey = vl.toISOString().slice(0, 10);
  const dateRu = dayKey.split('-').reverse().join('.');
  let changed = false;

  if (hr === 7 && state.lastMorningW !== dayKey && Array.isArray(weather) && weather.length) {
    const wLines = weather.map(w => '• <b>' + escTg(w.name) + '</b>: днём ' + escTg(w.day) + ', вечером ' + escTg(w.evening)).join('\n');
    const msg = '<b>ПРОГНОЗ ПОГОДЫ В ПРИМОРСКОМ КРАЕ НА СЕГОДНЯ • ' + dateRu + '</b> (18+)\n\n' + wLines + buildTgFooter(host, 'https://' + host + '/', 'Приморский край');
    if (await sendTgText(token, msg)) { state.lastMorningW = dayKey; changed = true; }
  }

  if (hr === 20 && state.lastEvening !== dayKey && Array.isArray(newsList) && newsList.length >= 2) {
    const top5 = newsList.slice(0, 5).map((n, i) => (i + 1) + '. <a href="https://' + host + '/news/' + n.id + '.html">' + escTg(n.title) + '</a> (' + escTg(n.city || 'Приморье') + ')').join('\n');
    const wTom = (weather || []).slice(0, 6).map(w => '• ' + escTg(w.name) + ': ' + escTg(w.tomorrow)).join('\n');
    const msg = '<b>ИТОГИ ДНЯ В ПРИМОРСКОМ КРАЕ • ' + dateRu + '</b> (18+)\n\n' + top5 + '\n\n<b>Погода в крае на завтра:</b>\n' + wTom + buildTgFooter(host, 'https://' + host + '/', 'Приморский край');
    if (await sendTgText(token, msg)) { state.lastEvening = dayKey; changed = true; }
  }

  if (dow === 0 && hr === 19 && state.lastWeekly !== dayKey && Array.isArray(newsList) && newsList.length >= 5) {
    const top7 = newsList.slice(0, 7).map((n, i) => (i + 1) + '. <a href="https://' + host + '/news/' + n.id + '.html">' + escTg(n.title) + '</a>').join('\n');
    const msg = '<b>ГЛАВНЫЕ СОБЫТИЯ ПРИМОРСКОГО КРАЯ ЗА НЕДЕЛЮ</b> (18+)\n\n' + top7 + buildTgFooter(host, 'https://' + host + '/', 'Приморский край');
    if (await sendTgText(token, msg)) { state.lastWeekly = dayKey; changed = true; }
  }
  return changed;
}

module.exports = { SOCIAL_LINKS, hasForeignGlitch, broadcastPosts, runScheduledReports };
