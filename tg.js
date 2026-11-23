const fs = require('fs');

function escTg(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isLaunchReady() {
  // Старт строго 24.11.2026 в 07:00 по Владивостоку (UTC+10) = 23.11.2026 21:00 UTC
  const startUtc = Date.UTC(2026, 10, 23, 21, 0, 0);
  return Date.now() >= startUtc;
}

function smartLead(text, maxLen) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return lastDot > 250 ? cut.slice(0, lastDot + 1) : cut + '...';
}

async function sendTgText(token, text) {
  if (!token || !text) return false;
  try {
    const url = ['https:', '', 'api.telegram.org', 'bot' + token, 'sendMessage'].join('/');
    const r = await fetch(url, {
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
async function postToTelegram(posts, token, host) {
  if (!isLaunchReady() || !token || !Array.isArray(posts) || !posts.length) return;
  const urgentPosts = posts.filter(p => p.urgent);
  const queue = urgentPosts.length > 0 ? posts.slice(0, 2) : posts.slice(0, 1);

  for (const p of queue) {
    try {
      if (!p.cover || !fs.existsSync(p.cover)) continue;
      const lead = escTg(smartLead(p.tgText || p.text, 800));
      const artUrl = 'https://' + host + '/news/' + p.id + '.html';
      const caption =
        '<b>' + escTg(p.title) + '</b> (' + escTg(p.age || '18+') + ')\n\n' +
        lead + '\n\n' +
        '<b>' + escTg(p.city || 'Приморский край') + '</b> • <a href="' + artUrl + '">Читать полную статью на портале</a>\n' +
        '———\n' +
        '<a href="https://' + host + '">ИА «Прим_Дозор»</a> | <a href="https://t.me">Telegram</a> | prim_dozor@internet.ru';

      const boundary = '----PrimDozorBoundary' + Date.now();
      const imgBuf = fs.readFileSync(p.cover);
      const head = Buffer.from(
        '--' + boundary + '\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n@prim_dozor\r\n' +
        '--' + boundary + '\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n' +
        '--' + boundary + '\r\nContent-Disposition: form-data; name="caption"\r\n\r\n' + caption + '\r\n' +
        '--' + boundary + '\r\nContent-Disposition: form-data; name="photo"; filename="cover.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'
      );
      const tail = Buffer.from('\r\n--' + boundary + '--\r\n');
      const url = ['https:', '', 'api.telegram.org', 'bot' + token, 'sendPhoto'].join('/');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
        body: Buffer.concat([head, imgBuf, tail])
      });
      const json = await res.json();
      if (!json.ok) console.log('Ошибка TG:', JSON.stringify(json));
    } catch (e) {
      console.log('Сбой TG:', e.message);
    }
  }
}

async function runScheduledReports(token, host, weather, newsList, state) {
  if (!isLaunchReady() || !token) return false;
  const vl = new Date(Date.now() + 10 * 3600000);
  const hr = vl.getUTCHours();
  const dow = vl.getUTCDay();
  const dayKey = vl.toISOString().slice(0, 10);
  const dateRu = dayKey.split('-').reverse().join('.');
  let changed = false;

  if (hr === 7 && state.lastMorningW !== dayKey && Array.isArray(weather) && weather.length) {
    const wLines = weather.map(w => '• <b>' + escTg(w.name) + '</b>: днём ' + escTg(w.day) + ', вечером ' + escTg(w.evening)).join('\n');
    const msg = '<b>ПРОГНОЗ ПОГОДЫ В ПРИМОРЬЕ НА СЕГОДНЯ • ' + dateRu + '</b> (18+)\n\n' + wLines + '\n\n<a href="https://' + host + '">Оперативная сводка ИА «Прим_Дозор» 24/7</a>';
    if (await sendTgText(token, msg)) { state.lastMorningW = dayKey; changed = true; }
  }

  if (hr === 20 && state.lastEvening !== dayKey && Array.isArray(newsList) && newsList.length >= 2) {
    const top5 = newsList.slice(0, 5).map((n, i) => (i + 1) + '. <a href="https://' + host + '/news/' + n.id + '.html">' + escTg(n.title) + '</a> (' + escTg(n.city || 'Приморье') + ')').join('\n');
    const wTom = (weather || []).slice(0, 6).map(w => '• ' + escTg(w.name) + ': ' + escTg(w.tomorrow)).join('\n');
    const msg = '<b>ИТОГИ ДНЯ В ПРИМОРЬЕ • ' + dateRu + '</b> (18+)\n\n' + top5 + '\n\n<b>Погода в крае на завтра:</b>\n' + wTom + '\n\n<a href="https://' + host + '">Все новости на портале ИА «Прим_Дозор»</a>';
    if (await sendTgText(token, msg)) { state.lastEvening = dayKey; changed = true; }
  }

  if (dow === 0 && hr === 19 && state.lastWeekly !== dayKey && Array.isArray(newsList) && newsList.length >= 5) {
    const top7 = newsList.slice(0, 7).map((n, i) => (i + 1) + '. <a href="https://' + host + '/news/' + n.id + '.html">' + escTg(n.title) + '</a>').join('\n');
    const msg = '<b>ГЛАВНОЕ В ПРИМОРСКОМ КРАЕ ЗА НЕДЕЛЮ</b> (18+)\n\n' + top7 + '\n\n<a href="https://' + host + '">ИА «Прим_Дозор» — главный региональный портал</a>';
    if (await sendTgText(token, msg)) { state.lastWeekly = dayKey; changed = true; }
  }
  return changed;
}

module.exports = { postToTelegram, runScheduledReports };
