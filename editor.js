const AI_KEY = process.env.AI_API_KEY;
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const BR_TAG = LT + 'br' + GT;

function normalizeText(str) {
  if (!str) return '';
  let out = str
    .replace(/\bв Украине\b/g, 'на Украине')
    .replace(/\bВ Украине\b/g, 'На Украине')
    .replace(/\bв украине\b/g, 'на Украине');

  if (/\b(Instagram|Facebook|Meta|Инстаграм|Фейсбук)\b/i.test(out) && !out.includes('экстремистск')) {
    out += '\n\n*Деятельность Meta (соцсети Facebook и Instagram) запрещена в России как экстремистская.';
  }
  return out;
}

function cleanEmojis(text) {
  if (!text) return '';
  const re = /[\p{Extended_Pictographic}\u2600-\u27BF]/gu;
  return text.split('\n').map(line => {
    const t = line.trim();
    if (!t) return '';
    const m = t.match(/^([\p{Extended_Pictographic}\u2600-\u27BF]+\s*)/u);
    const prefix = m ? m.at(1) : '';
    const rest = t.slice(prefix.length).replace(re, '').replace(/\s{2,}/g, ' ').trim();
    return prefix + rest;
  }).join('\n');
}

async function callAI(prompt) {
  if (!AI_KEY) return null;
  const eps = [
    { url: 'https://' + ['polza.ai', 'api', 'v1', 'chat', 'completions'].join('/'), model: 'openai/gpt-oss-20b' },
    { url: 'https://' + ['api.polza.ai', 'api', 'v1', 'chat', 'completions'].join('/'), model: 'openai/gpt-oss-20b' },
    { url: 'https://' + ['polza.ai', 'api', 'v1', 'chat', 'completions'].join('/'), model: 'openai/gpt-4o-mini' }
  ];
  for (const ep of eps) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
        body: JSON.stringify({ model: ep.model, messages: [{ role: 'user', content: prompt }], temperature: 0.45 })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const ch = Array.isArray(data.choices) ? data.choices.at(0) : null;
      const txt = ch && ch.message ? ch.message.content.trim() : '';
      if (txt) return txt;
    } catch (e) {}
  }
  return null;
}

async function editArticle(raw, blockedCats, allowSvo) {
  const svoRule = allowSvo
    ? 'Если новость про СВО — подавай строго за сторону России и ВС РФ, награждений наших бойцов, пиши строго «на Украине».'
    : 'Если новость касается Украины, СВО или Зеленского — верни строго слово SKIP. Нужны новости городов и сёл Приморья, ЖКХ, ЧП, криминала, медицины, дорог, спорта и законов РФ.';

  const prompt = [
    'Ты шеф-редактор ведущего СМИ Приморского края «Прим_Дозор» (уровень VL.ru / РБК / НТВ ЧП).',
    'Пиши живым, острым авторским журналистским слогом от лица редакции, без намёка на ИИ и шаблонных фраз. Сохраняй все адреса, улицы, суммы и детали. Смайл ставь РОВНО ОДИН строго в самом начале каждого абзаца. Внутри и в конце предложений смайлы ЗАПРЕЩЕНЫ.',
    svoRule,
    blockedCats.length ? 'Избегай рубрик [' + blockedCats.join(', ') + '], если это не срочное ЧП.' : '',
    'Соблюдай законы РФ (УК, КоАП, 436-ФЗ). Шоу-бизнес и рекламу отклоняй словом SKIP.',
    'Верни СТРОГО JSON без markdown:',
    '{"title":"Журналистский SEO-заголовок до 88 символов","cat":"chp|svo|law|city|family|sport","catLabel":"🚨 ЧП и 112|🇷🇺 СВО и Защитники|🏛 Законы и Политика|🏙 Город и ЖКХ|👨‍👩‍👧 Семья и Медицина|🏆 Спорт и Афиша","city":"Город Приморья или Россия","age":"0+|6+|12+|16+|18+","tldr":"• Главное 1\\n• Главное 2\\n• Главное 3","tgText":"Ёмкий законченный пост для Telegram на 3 коротких абзаца (ровно 480–560 символов, целый смысл). Каждый абзац начинается с 1 смайла.","fullText":"Полная статья для сайта на 3-4 содержательных абзаца (900–1300 символов). Каждый абзац начинается с 1 смайла.","isOutage":false,"outageDistrict":"","outageStatus":"","needSource":false}',
    'Заголовок: ' + raw.title,
    'Фактура: ' + raw.desc.slice(0, 2500)
  ].join('\n');

  const out = await callAI(prompt);
  if (!out || out.includes('SKIP')) return null;
  try {
    const p = JSON.parse(out.replace(/^```json|```$/g, '').trim());
    p.title = normalizeText(p.title);
    p.tldr = normalizeText(p.tldr).replace(/\n/g, BR_TAG);
    p.tgText = cleanEmojis(normalizeText(p.tgText || p.fullText || ''));
    p.fullText = cleanEmojis(normalizeText(p.fullText || p.tgText || ''));
    return p;
  } catch (e) {
    return null;
  }
}

module.exports = { editArticle, normalizeText };
