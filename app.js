const fallbackNews = [
  {
    id: 1,
    cat: 'chp',
    catLabel: '🚨 ЧП и 112',
    city: 'Владивосток',
    age: '16+',
    date: 'Сегодня',
    title: 'Экстренные службы Приморья переведены в режим повышенной готовности на сутки',
    tldr: '• Проверены ключевые магистрали и мосты края.<br>• Аварийные бригады ЖКХ дежурят круглосуточно.',
    text: 'Оперативные ведомства Приморского края контролируют обстановку на дорогах и коммунальных сетях. Золотой и Русский мосты открыты для всех видов транспорта. Сообщить о проблемах можно через форму «Народный контроль».',
    src: 'По информации оперативных служб'
  }
];

let newsData = [...fallbackNews];
let curCat = 'all';
let curCity = 'all';

function render() {
  const box = document.getElementById('feed');
  if (!box) return;
  const list = newsData.filter(n => (curCat === 'all' || n.cat === curCat) && (curCity === 'all' || n.city === curCity));

  if (list.length === 0) {
    box.innerHTML = `<div class="card"><p style="color:var(--muted);">В этой рубрике пока нет свежих публикаций. Выберите «Главное» или другой город.</p></div>`;
    return;
  }

  box.innerHTML = list.map(n => `
    <article class="card">
      <div class="card-cover" onclick="openArt('${n.id}')" style="cursor:pointer;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; opacity:0.8; margin-bottom:4px;">${n.catLabel} · ${n.city}</div>
        <div style="font-weight:700; font-size:15px; line-height:1.3;">${n.title}</div>
      </div>
      <div class="meta">
        <span class="cat-tag">${n.catLabel}</span>
        <span>📍 ${n.city}</span>
        <span>🕒 ${n.date}</span>
        <span class="age-badge">${n.age || '16+'}</span>
        ${n.erid ? `<span class="erid-badge">Реклама · erid: ${n.erid}</span>` : ''}
      </div>
      <h2 onclick="openArt('${n.id}')">${n.title}</h2>
      <div class="tldr"><strong>Главное за 10 секунд:</strong><br>${n.tldr}</div>
      <p style="color:var(--muted); font-size:15px; margin-bottom:12px;">${n.text}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; border-top:1px solid var(--border); padding-top:10px;">
        <span style="color:var(--muted);">${n.src || ''}</span>
        <button style="color:var(--blue); font-weight:700;" onclick="openArt('${n.id}')">Читать полностью ➔</button>
      </div>
    </article>
  `).join('');
}

function setCat(c, btn) {
  curCat = c;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  render();
}

function setCity(c) {
  curCity = c;
  render();
}

function openArt(id) {
  const n = newsData.find(x => String(x.id) === String(id));
  if (!n) return;
  const cfg = window.PRIM_DOZOR_CONFIG || {};
  const tgUrl = (cfg.socials && cfg.socials.tg) ? cfg.socials.tg : 'https://t.me/prim_dozor';
  const maxUrl = (cfg.socials && cfg.socials.max) ? cfg.socials.max : 'https://max.ru/join/RyxItD9MEitACdZjmI88YZkBI2ps78Qq3iMW0sBJcoE';

  document.getElementById('art-body').innerHTML = `
    <div class="meta" style="margin-top:6px;">
      <span class="cat-tag">${n.catLabel}</span>
      <span>📍 ${n.city}</span>
      <span>🕒 ${n.date}</span>
      <span class="age-badge">${n.age || '16+'}</span>
    </div>
    <h1 style="font-size:22px; line-height:1.3; margin:12px 0;">${n.title}</h1>
    <div class="tldr"><strong>Суть кратко:</strong><br>${n.tldr}</div>
    <p style="line-height:1.75; margin-bottom:16px; white-space:pre-line;">${n.fullText || n.text}</p>
    ${n.src ? `<p style="font-size:13px; color:var(--muted); margin-bottom:14px;">Источник: ${n.src}</p>` : ''}
    <div class="article-socials">
      <p style="font-weight:700; color:var(--text); margin-bottom:10px;">📲 Оперативные сводки «Прим_Дозор» в мессенджерах:</p>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        <a href="${tgUrl}" target="_blank" rel="noopener" class="soc-link" style="border-left-color:#229ED9; padding:8px 14px;">✈ Telegram-канал</a>
        <a href="${maxUrl}" target="_blank" rel="noopener" class="soc-link" style="border-left-color:#0077FF; padding:8px 14px;">💬 Канал в Макс</a>
      </div>
    </div>
  `;
  document.getElementById('art-modal').style.display = 'flex';
}

function updateClock() {
  const now = new Date();
  const vl = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 36000000);
  const el = document.getElementById('clock');
  if (el) el.textContent = String(vl.getHours()).padStart(2, '0') + ':' + String(vl.getMinutes()).padStart(2, '0');
}

async function loadNews() {
  try {
    const res = await fetch('./news.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        newsData = data;
        injectSchema(data.slice(0, 10));
      }
    }
  } catch (e) {
    console.log('Используется резервная лента');
  }
  render();
}

function injectSchema(items) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": items.map((n, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "NewsArticle",
        "headline": n.title,
        "datePublished": n.isoDate || new Date().toISOString(),
        "author": { "@type": "Organization", "name": "Прим_Дозор" },
        "publisher": { "@type": "Organization", "name": "Прим_Дозор" }
      }
    }))
  };
  let script = document.getElementById('news-schema');
  if (!script) {
    script = document.createElement('script');
    script.id = 'news-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

async function loadWeather() {
  const cities = [
    { name: 'Владивосток', lat: 43.1155, lon: 131.8855 },
    { name: 'Большой Камень', lat: 43.1128, lon: 132.3481 },
    { name: 'Артём', lat: 43.3592, lon: 132.1892 },
    { name: 'Уссурийск', lat: 43.7972, lon: 131.9517 },
    { name: 'Находка', lat: 42.8241, lon: 132.8928 }
  ];
  try {
    const lats = cities.map(c => c.lat).join(',');
    const lons = cities.map(c => c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code&timezone=Asia%2FVladivostok`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];

    const icon = (code) => {
      if (code === 0) return '☀';
      if (code <= 3) return '🌤';
      if (code >= 71 && code <= 77) return '❄';
      if (code >= 51) return '🌧';
      return '☁';
    };

    const sel = document.getElementById('city-sel');
    if (sel && results.length === cities.length) {
      Array.from(sel.options).forEach((opt, i) => {
        if (results[i] && results[i].current) {
          const t = Math.round(results[i].current.temperature_2m);
          const sign = t > 0 ? '+' : '';
          opt.textContent = `${cities[i].name} ${sign}${t}°C ${icon(results[i].current.weather_code)}`;
        }
      });
    }
  } catch (e) {}
}

async function loadRates() {
  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    if (!res.ok) return;
    const data = await res.json();
    const usd = (data.Valute.USD.Value / data.Valute.USD.Nominal).toFixed(1);
    const cny = (data.Valute.CNY.Value / data.Valute.CNY.Nominal).toFixed(1);
    const rb = document.getElementById('rates-box');
    if (rb) {
      rb.innerHTML = `💵 USD: ${usd} ₽ · 💴 CNY: ${cny} ₽ · 🏫 Школы: <strong>Очно</strong>`;
    }
  } catch (e) {}
}

window.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('ck')) {
    const ck = document.getElementById('cookie-box');
    if (ck) ck.style.display = 'none';
  }
  const cfg = window.PRIM_DOZOR_CONFIG || {};
  if (cfg.socials) {
    const vk = document.getElementById('s-vk');
    const dz = document.getElementById('s-dzen');
    if (vk && cfg.socials.vk && !cfg.socials.vk.includes('ВПИШИ')) vk.href = cfg.socials.vk;
    if (dz && cfg.socials.dzen && !cfg.socials.dzen.includes('ВПИШИ')) dz.href = cfg.socials.dzen;
  }
  if (cfg.ownerName && !cfg.ownerName.includes('ВПИШИ')) {
    const fo = document.getElementById('foot-owner');
    if (fo) fo.textContent = cfg.legalStatus + '. Администратор: ' + cfg.ownerName + ' (' + cfg.contactEmail + ')';
  }
  if (cfg.partnerAd && cfg.partnerAd.enabled) {
    const slot = document.getElementById('ad-slot');
    if (slot) {
      slot.style.display = 'block';
      document.getElementById('ad-mark').textContent = cfg.partnerAd.advertiserInfo + ' · erid: ' + cfg.partnerAd.erid;
      document.getElementById('ad-t').textContent = cfg.partnerAd.title;
      document.getElementById('ad-d').textContent = cfg.partnerAd.description;
      document.getElementById('ad-btn').textContent = cfg.partnerAd.buttonText + ': ' + cfg.partnerAd.phone;
    }
  }
  updateClock();
  setInterval(updateClock, 10000);
  loadNews();
  loadWeather();
  loadRates();
});
