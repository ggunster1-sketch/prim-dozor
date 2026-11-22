const fs = require('fs');
const https = require('https');

const AFISHA_CHANNELS = ['adm_vl', 'sport_primorye', 'primorskyadmin', 'culture_pk', 'turizm_pk'];

function getPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let d = '';
      res.setEncoding('utf8');
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

function cleanAfishaText(s) {
  return String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/([а-яёa-z0-9])([А-ЯЁ])/g, '$1 $2')
    .replace(/([.!?])([А-ЯЁA-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

async function updateAfisha(aiKey) {
  if (!aiKey || !fs.existsSync('data/directories.json')) return;
  const rawPosts = [];

  for (const ch of AFISHA_CHANNELS) {
    try {
      const html = await getPage(['https:', '', 't.me', 's', ch].join('/'));
      for (const b of html.split('tgme_widget_message_wrap').slice(-6)) {
        const idx = b.indexOf('tgme_widget_message_text');
        if (idx === -1) continue;
        const txt = cleanAfishaText(b.slice(b.indexOf('>', idx) + 1, b.indexOf('</div>', idx)));
        if (txt.length > 70 && /(бесплатн|вход свободный|афиша|фестивал|ярмарк|матч|турнир|выставк|концерт|забег|хокке|баскетбол|футбол|парк|набережн)/i.test(txt)) {
          rawPosts.push(txt.slice(0, 650));
        }
      }
    } catch (e) {}
  }

  if (!rawPosts.length) return;

  const prompt = [
    'Ты редактор афиши Приморского края на портале «Прим_Дозор».',
    'Из сообщений выбери 5 самых интересных городских мероприятий, выставок, ярмарок или спортивных матчей во Владивостоке и Приморском крае.',
    'Пиши грамотным русским языком с пробелами после всех знаков препинания.',
    'Любую скрытую коммерческую рекламу кафе, клиник и розыгрышей отбрось.',
    'Верни строго JSON-массив без markdown:',
    '[{"date":"Дата и время начала (например: 24 ноября, 12:00)","city":"Город Приморья","place":"Точное место проведения и адрес","price":"Вход свободный или цена","title":"Название события до 75 символов","tag":"Спорт • 0+ | Культура • 0+ | Город • 0+","desc":"Подробное описание программы мероприятия (2-3 предложения): что будет происходить, для кого подходит и как добраться."}]',
    'Исходные сообщения:\n' + rawPosts.slice(0, 12).join('\n---\n')
  ].join('\n');

  try {
    const aiUrl = ['https:', '', 'polza.ai', 'api', 'v1', 'chat', 'completions'].join('/');
    const res = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiKey },
      body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.3 })
    });
    if (!res.ok) return;
    const data = await res.json();
    const txt = data.choices.at(0).message.content.trim().replace(/^```json|```$/g, '').trim();
    const items = JSON.parse(txt);
    if (Array.isArray(items) && items.length > 0) {
      const dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8'));
      dir.afisha = items.slice(0, 6).map(it => ({
        date: cleanAfishaText(it.date),
        city: cleanAfishaText(it.city),
        place: cleanAfishaText(it.place),
        price: cleanAfishaText(it.price),
        title: cleanAfishaText(it.title),
        tag: cleanAfishaText(it.tag),
        desc: cleanAfishaText(it.desc)
      }));
      fs.writeFileSync('data/directories.json', JSON.stringify(dir, null, 2), 'utf8');
    }
  } catch (e) {}
}

module.exports = { updateAfisha };
