const fs = require('fs');

async function postToTelegram(posts, token, host) {
  if (!token || !posts.length) return;
  const chpPosts = posts.filter(p => p.cat === 'chp');
  const queue = chpPosts.length > 0 ? chpPosts.slice(0, 2) : posts.slice(0, 1);

  for (const p of queue) {
    try {
      const lead = (p.tgText || p.text || '').slice(0, 620).trim();
      const caption = '🔴 <b>' + p.title + '</b>\n\n' + lead + '...\n\n📍 ' + p.city + ' (' + p.age + ')\n👉 <b>Читать подробности и фото на портале:</b> https://' + host + '/news/' + p.id + '.html';
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
    } catch (e) { console.log('Сбой TG:', e.message); }
  }
}

module.exports = { postToTelegram };
