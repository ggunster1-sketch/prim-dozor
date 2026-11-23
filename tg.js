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
async function postToTelegram(posts, token, host) {
  if (!isLaunchReady()) {
    console.log('Ожидание официального старта 24.11.2026 в 07:00 по Владивостоку.');
    return;
  }
  if (!token || !Array.isArray(posts) || !posts.length) return;
    const urgentPosts = posts.filter(p => p.urgent);
  const queue = urgentPosts.length > 0 ? posts.slice(0, 2) : posts.slice(0, 1);

  for (const p of queue) {
    try {
      if (!p.cover || !fs.existsSync(p.cover)) continue;
      const lead = escTg(smartLead(p.tgText || p.text, 820));
      const artUrl = 'https://' + host + '/news/' + p.id + '.html';
      const caption =
        '🔴 <b>' + escTg(p.title) + '</b> (' + escTg(p.age || '18+') + ')\n\n' +
        lead + '\n\n' +
        '📍 <b>' + escTg(p.city || 'Приморский край') + '</b> • <a href="' + artUrl + '">Читать полную статью →</a>\n' +
        '———\n' +
        '👁 <a href="https://' + host + '">Портал Прим_Дозор</a> | <a href="https://t.me/prim_dozor">Наш Telegram</a> | ✉ prim_dozor@internet.ru';

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

module.exports = { postToTelegram };
