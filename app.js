const fallbackNews = [
  {
    id: 1,
    cat: 'chp',
    catLabel: '🚨 ЧП и 112',
    city: 'Владивосток',
    age: '16+',
    date: 'Сегодня',
    title: 'Экстренные службы Приморья переведены в режим повышенной готовности',
    tldr: '• Проверены ключевые магистрали и мосты края.<br>• Аварийные бригады ЖКХ дежурят круглосуточно.',
    text: '🚨 Оперативные ведомства Приморского края контролируют обстановку на дорогах и коммунальных сетях. Золотой и Русский мосты открыты для всех видов транспорта.\n\n🏙 Сообщить об отключениях света, воды или нечищеных дорогах можно через форму «Прислать ЧП» или в наш Telegram.',
    src: 'Редакция «Прим_Дозор»'
  }
];

let newsData = [...fallbackNews];
let curCat = 'all';
let curCity = 'all';
let weatherCache = [];

function render() {
  const box = document.getElementById('feed');
  if (!box) return;
  const list = newsData.filter(n => {
    const catOk = curCat === 'all' || n.cat === curCat;
    const cityOk = curCity === 'all' || (n.city && n.city.toLowerCase().includes(curCity.toLowerCase()));
    return catOk && cityOk;
  });

  if (list.length === 0) {
    box.innerHTML = '<div class="card"><p style="color:var(--muted);">В этой рубрике пока нет свежих публикаций. Выберите «Главное» или «Все» города.</p></div>';
    return;
  }

  box.innerHTML = list.map(n => {
    const coverHtml = n.cover
      ? `<div onclick="openArt('${n.id}')" style="cursor:pointer; margin-bottom:12px; border-radius:8px; overflow:hidden; border:1px solid var(--border);">
           <img src="./${n.cover}" alt="${n.title}" loading="lazy" style="width:100%; height:auto; display:block;">
         </div>`
      : `<div class="card-cover" onclick="openArt('${n.id}')" style="cursor:pointer;">
           <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; opacity:0.8; margin-bottom:4px;">${n.catLabel} · ${n.city}</div>
           <div style="font-weight:700; font-size:15px; line-height:1.3;">${n.title}</div>
         </div>`;

    return `
      <article class="card">
        ${coverHtml}
        <div class="meta">
          <span class="cat-tag">${n.catLabel}</span>
          <span>📍 ${n.city}</span>
          <span>🕒 ${n.date}</span>
          <span class="age-badge">${n.age || '16+'}</span>
          ${n.erid ? `<span class="erid-badge">Реклама · erid: ${n.erid}</span>` : ''}
        </div>
        <h2 onclick="openArt('${n.id}')">${n.title}</h2>
        <div class="tldr"><strong>Главное за 10 секунд:</strong><br>${n.tldr}</div>
        <p style="color:var(--muted); font-size:15px; margin-bottom:12px; white-space:pre-line;">${n.text}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; border-top:1px solid var(--border); padding-top:10px;">
          <span style="color:var(--muted);">${n.src || ''}</span>
          <button style="color:var(--blue); font-weight:700;" onclick="openArt('${n.id}')">Читать полностью ➔</button>
        </div>
      </article>
    `;
  }).join('');
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
  const tgUrl = 'https://t.me/prim_dozor';
  const maxUrl = 'https://max.ru/join/RyxItD9MEitACdZjmI88YZkBI2ps78Qq3iMW0sBJcoE';

  document.getElementById('art-body').innerHTML = `
    <div class="meta" style="margin-top:6px;">
      <span class="cat-tag">${n.catLabel}</span>
      <span>📍 ${n.city}</span>
      <span>🕒 ${n.date}</span>
      <span class="age-badge">${n.age || '16+'}</span>
    </div>
    <h1 style="font-size:22px; line-height:1.3; margin:12px 0;">${n.title}</h1>
    ${n.cover ? `<img src="./${n.cover}" alt="${n.title}" style="width:100%; border-radius:8px; margin-bottom:14px;">` : ''}
    <div class="tldr"><strong>Суть кратко:</strong><br>${n.tldr}</div>
    <p style="line-height:1.75; margin-bottom:16px; white-space:pre-line;">${n.fullText || n.text}</p>
    ${n.src ? `<p style="font-size:13px; color:var(--muted); margin-bottom:14px;">${n.src}</p>` : ''}
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

function updateSeasonAndHolidays() {
  const now = new Date();
  const vl = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 36000000);
  const m = vl.getMonth() + 1;
  const d = vl.getDate();

  const st = document.getElementById('season-title');
  const sd = document.getElementById('season-desc');
  const hb = document.getElementById('holiday-badge');
  const ht = document.getElementById('holiday-ticker');

  if (m === 12 || m <= 2) {
    if (st) st.textContent = '❄️ Зима в Приморском крае';
    if (sd) sd.textContent = 'Контроль работы котельных, расчистки дорог от снега и гололёда, ледовая обстановка в заливах.';
  } else if (m >= 3 && m <= 5) {
    if (st) st.textContent = '🌿 Весна в Приморском крае';
    if (sd) sd.textContent = 'Паводковый контроль, противопожарный режим в тайге, ремонт дорог и весенняя путина.';
  } else if (m >= 6 && m <= 8) {
    if (st) st.textContent = '🌊 Лето в Приморском крае';
    if (sd) sd.textContent = 'Мониторинг пляжей и тайфунов, расписание паромов, летний отдых и дорожные работы.';
  } else {
    if (st) st.textContent = '🍂 Осень в Приморском крае';
    if (sd) sd.textContent = 'Контроль запуска отопления в городах и сёлах края, дорожная обстановка и осенняя путина.';
  }

  const holidays = {
    '1-1': '🎄 С Новым годом, Приморье! Здоровья, мира и благополучия каждой семье!',
    '1-7': '✨ С Рождеством Христовым! Светлого праздника жителям Приморского края!',
    '2-23': '🇷🇺 С Днём защитника Отечества! Слава воинам-тихоокеанцам и защитникам России!',
    '3-8': '🌷 С Международным женским днём 8 Марта! Весны, тепла и счастья!',
    '5-1': '🚩 С Праздником Весны и Труда — 1 Мая!',
    '5-9': '🎖 С Днём Великой Победы! Помним и гордимся подвигом героев!',
    '6-12': '🇷🇺 С Днём России! Сильный край — сильная страна!',
    '7-2': '⚓ С Днём основания Владивостока! С праздником, город у моря!',
    '7-26': '🚢 С Днём Военно-Морского Флота России и Тихоокеанского флота!',
    '10-20': '🏔 С Днём образования Приморского края!',
    '11-4': '🇷🇺 С Днём народного единства!'
  };

  const key = m + '-' + d;
  if (holidays[key]) {
    if (hb) hb.textContent = '🎉 Праздник';
    if (ht) ht.textContent = holidays[key];
  }
}

async function loadNews() {
  try {
    const res = await fetch('./news.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        newsData = data;
      }
    }
  } catch (e) {}
  render();
}

async function loadOutages() {
  try {
    const res = await fetch('./outages.json?v=' + Date.now());
    if (!res.ok) return;
    const list = await res.json();
    const box = document.getElementById('outages-list');
    if (box && Array.isArray(list) && list.length > 0) {
      box.innerHTML = list.map(o =>
        `<div class="row"><span>${o.district}</span><span style="color:#d97706;font-weight:700;">${o.status}</span></div>`
      ).join('');
    }
  } catch (e) {}
}

function selectWeatherCity(idx) {
  const c = weatherCache[idx];
  if (!c) return;
  const nEl = document.getElementById('w-city-name');
  const dEl = document.getElementById('w-day');
  const eEl = document.getElementById('w-eve');
  const tEl = document.getElementById('w-tom');
  if (nEl) nEl.textContent = c.name;
  if (dEl) dEl.textContent = c.morning + ' / ' + c.day;
  if (eEl) eEl.textContent = c.evening;
  if (tEl) tEl.textContent = c.tomorrow;
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];

    const fmt = (v) => (v > 0 ? '+' : '') + Math.round(v) + '°C';
    const icon = (code) => {
      if (code === 0) return '☀';
      if (code <= 3) return '🌤';
      if (code >= 71 && code <= 77) return '❄';
      if (code >= 51) return '🌧';
      return '☁';
    };

    const sel = document.getElementById('city-sel');
    weatherCache = results.map((r, i) => {
      const h = (r.hourly && r.hourly.temperature_2m) ? r.hourly.temperature_2m : [];
const dMax = (r.daily && r.daily.temperature_2m_max) ? r.daily.temperature_2m_max : [];
const curT = r.current ? Math.round(r.current.temperature_2m) : 0;
const curI = r.current ? icon(r.current.weather_code) : '🌤';
if (sel && sel.options[i]) {
sel.options[i].textContent = ${cities[i].name} ${fmt(curT)} ${curI};
}
return {
name: cities[i].name,
morning: h[8] !== undefined ? fmt(h[8]) : fmt(curT),
day: h[14] !== undefined ? fmt(h[14]) : fmt(curT),
evening: h[20] !== undefined ? fmt(h[20]) : fmt(curT),
tomorrow: dMax[1] !== undefined ? fmt(dMax[1]) : fmt(curT)
};
});
selectWeatherCity(0);
} catch (e) {}
}
async function loadRates() {
try {
const res = await fetch('cbr-xml-daily.ru');
if (!res.ok) return;
const data = await res.json();
const usd = (data.Valute.USD.Value / data.Valute.USD.Nominal).toFixed(1);
const cny = (data.Valute.CNY.Value / data.Valute.CNY.Nominal).toFixed(1);
const rb = document.getElementById('rates-box');
if (rb) {
rb.innerHTML = 💵 USD: ${usd} ₽ · 💴 CNY: ${cny} ₽ · 🏫 Школы: <strong>Очно</strong>;
}
} catch (e) {}
}
window.addEventListener('DOMContentLoaded', function() {
if (localStorage.getItem('ck')) {
const ck = document.getElementById('cookie-box');
if (ck) ck.style.display = 'none';
}
const cfg = window.PRIM_DOZOR_CONFIG || {};
if (cfg.ownerName && !cfg.ownerName.includes('ВПИШИ')) {
const fo = document.getElementById('foot-owner');
if (fo) fo.textContent = cfg.legalStatus + '. Администратор: ' + cfg.ownerName + ' (' + cfg.contactEmail + ')';
}
updateClock();
setInterval(updateClock, 10000);
updateSeasonAndHolidays();
loadNews();
loadOutages();
loadWeather();
loadRates();
});
