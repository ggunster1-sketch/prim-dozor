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
    text: '🚨 Оперативные ведомства Приморского края контролируют обстановку на дорогах и коммунальных сетях. Золотой и Русский мосты открыты для всех видов транспорта.\n\n🏙 Сообщить об отключениях света, воды или нечищеных дорогах можно через кнопку «Прислать ЧП» или в наш Telegram.',
    src: 'Редакция «Прим_Дозор»'
  }
];

let newsData = [...fallbackNews];
let curCat = 'all';
let curCity = 'all';
let curSearch = '';
let weatherCache = [];

function getCfg() {
  return window.PRIM_DOZOR_CONFIG || {};
}

function render() {
  const box = document.getElementById('feed');
  if (!box) return;
  const q = curSearch.trim().toLowerCase();

  const list = newsData.filter(function(n) {
    const catOk = curCat === 'all' || n.cat === curCat;
    const cityOk = curCity === 'all' || (n.city && n.city.toLowerCase().includes(curCity.toLowerCase()));
    const searchOk = !q || ((n.title || '') + ' ' + (n.text || '') + ' ' + (n.city || '')).toLowerCase().includes(q);
    return catOk && cityOk && searchOk;
  });

  if (list.length === 0) {
    box.innerHTML = '<div class="card"><p style="color:var(--muted);">По вашему запросу публикаций не найдено. Попробуйте сбросить фильтр города или рубрики.</p></div>';
    return;
  }

  box.innerHTML = list.map(function(n) {
    const coverHtml = n.cover
      ? '<div onclick="openArt(\'' + n.id + '\')" style="cursor:pointer; margin-bottom:12px; border-radius:8px; overflow:hidden; border:1px solid var(--border);">' +
          '<img src="./' + n.cover + '" alt="' + n.title + '" loading="lazy" style="width:100%; height:auto; display:block;">' +
        '</div>'
      : '<div class="card-cover" onclick="openArt(\'' + n.id + '\')" style="cursor:pointer;">' +
          '<div style="font-size:11px; text-transform:uppercase; letter-spacing:0.8px; opacity:0.8; margin-bottom:4px;">' + n.catLabel + ' · ' + n.city + '</div>' +
          '<div style="font-weight:700; font-size:15px; line-height:1.3;">' + n.title + '</div>' +
        '</div>';

    const eridHtml = n.erid ? '<span class="erid-badge">Реклама · erid: ' + n.erid + '</span>' : '';

    return (
      '<article class="card">' +
        coverHtml +
        '<div class="meta">' +
          '<span class="cat-tag">' + n.catLabel + '</span>' +
          '<span>📍 ' + n.city + '</span>' +
          '<span>🕒 ' + n.date + '</span>' +
          '<span class="age-badge">' + (n.age || '16+') + '</span>' +
          eridHtml +
        '</div>' +
        '<h2 onclick="openArt(\'' + n.id + '\')">' + n.title + '</h2>' +
        '<div class="tldr"><strong>Главное за 10 секунд:</strong><br>' + n.tldr + '</div>' +
        '<p style="color:var(--muted); font-size:15px; margin-bottom:12px; white-space:pre-line;">' + n.text + '</p>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; border-top:1px solid var(--border); padding-top:10px;">' +
          '<span style="color:var(--muted);">' + (n.src || '') + '</span>' +
          '<div style="display:flex; gap:12px;">' +
            '<a href="/news/' + n.id + '.html" style="color:var(--muted);">Страница</a>' +
            '<button style="color:var(--blue); font-weight:700;" onclick="openArt(\'' + n.id + '\')">Читать полностью ➔</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join('');
}

function setCat(c, btn) {
  curCat = c;
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  render();
}

function setCity(c) { curCity = c; render(); }
function setSearch(val) { curSearch = val; render(); }

function openArt(id) {
  const n = newsData.find(function(x) { return String(x.id) === String(id); });
  if (!n) return;
  const soc = (getCfg().socials) || {};
  const tgUrl = soc.telegram || 'https://t.me/prim_dozor';
  const maxUrl = soc.max || 'https://max.ru';
  const coverImg = n.cover ? '<img src="./' + n.cover + '" alt="' + n.title + '" style="width:100%; border-radius:8px; margin-bottom:14px;">' : '';
  const srcLine = n.src ? '<p style="font-size:13px; color:var(--muted); margin-bottom:14px;">' + n.src + '</p>' : '';

  document.getElementById('art-body').innerHTML =
    '<div class="meta" style="margin-top:6px;">' +
      '<span class="cat-tag">' + n.catLabel + '</span>' +
      '<span>📍 ' + n.city + '</span>' +
      '<span>🕒 ' + n.date + '</span>' +
      '<span class="age-badge">' + (n.age || '16+') + '</span>' +
    '</div>' +
    '<h1 style="font-size:22px; line-height:1.3; margin:12px 0;">' + n.title + '</h1>' +
    coverImg +
    '<div class="tldr"><strong>Суть кратко:</strong><br>' + n.tldr + '</div>' +
    '<p style="line-height:1.75; margin-bottom:16px; white-space:pre-line;">' + (n.fullText || n.text) + '</p>' +
    srcLine +
    '<div class="article-socials">' +
      '<p style="font-weight:700; color:var(--text); margin-bottom:10px;">📲 Оперативные сводки «Прим_Дозор» в мессенджерах:</p>' +
      '<div style="display:flex; flex-wrap:wrap; gap:8px;">' +
        '<a href="' + tgUrl + '" target="_blank" rel="noopener" class="soc-link" style="border-left-color:#229ED9; padding:8px 14px;">✈ Telegram ЧП</a>' +
        '<a href="' + maxUrl + '" target="_blank" rel="noopener" class="soc-link" style="border-left-color:#0077FF; padding:8px 14px;">💬 Канал в МАКС</a>' +
        '<a href="/news/' + n.id + '.html" class="soc-link" style="padding:8px 14px;">🔗 Прямая ссылка</a>' +
      '</div>' +
    '</div>';
  document.getElementById('art-modal').style.display = 'flex';
}

function openReport() {
  const cfg = getCfg();
  const tgUrl = (cfg.socials && cfg.socials.telegram) ? cfg.socials.telegram : 'https://t.me/prim_dozor';
  document.getElementById('art-body').innerHTML =
    '<h2 style="margin-bottom:10px;">🚨 Народный контроль: прислать новость или ЧП</h2>' +
    '<p style="color:var(--muted); margin-bottom:14px;">Стали очевидцем ДТП, отключения воды/света, коммунальной аварии или важного события в Приморском крае? Присылайте фото, видео и адрес в нашу редакцию 24/7:</p>' +
    '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<a href="' + tgUrl + '" target="_blank" rel="noopener" class="btn btn-red" style="text-align:center;">✈ Написать в Telegram-канал Прим_Дозор</a>' +
    '</div>' +
    '<p style="font-size:12px; color:var(--muted); margin-top:14px;">Анонимность гарантируется. Не присылайте персональные данные третьих лиц (номера документов, телефоны) без их согласия (152-ФЗ).</p>';
  document.getElementById('art-modal').style.display = 'flex';
}

function applyConfig() {
  const cfg = getCfg();
  if (cfg.socials) {
    const grid = document.getElementById('soc-links-grid');
    if (grid) {
      const links = [];
      if (cfg.socials.telegram && !cfg.socials.telegram.includes('ВПИШИ')) links.push('<a href="' + cfg.socials.telegram + '" target="_blank" rel="noopener" class="soc-link">✈ Telegram ЧП</a>');
      if (cfg.socials.max && !cfg.socials.max.includes('ВПИШИ')) links.push('<a href="' + cfg.socials.max + '" target="_blank" rel="noopener" class="soc-link">💬 Канал в МАКС</a>');
      if (cfg.socials.dzen && !cfg.socials.dzen.includes('ВПИШИ')) links.push('<a href="' + cfg.socials.dzen + '" target="_blank" rel="noopener" class="soc-link">🔥 Яндекс Дзен</a>');
      if (cfg.socials.vk && !cfg.socials.vk.includes('ВПИШИ')) links.push('<a href="' + cfg.socials.vk + '" target="_blank" rel="noopener" class="soc-link">🌐 ВКонтакте</a>');
      if (links.length > 0) grid.innerHTML = links.join('');
    }
  }
  if (cfg.partnerAd && cfg.partnerAd.enabled) {
    const adBox = document.getElementById('partner-ad-box');
    if (adBox) {
      adBox.style.display = 'block';
      adBox.innerHTML =
        '<div style="font-size:11px; color:var(--muted); margin-bottom:6px;">' + cfg.partnerAd.advertiserInfo + ' · erid: ' + cfg.partnerAd.erid + '</div>' +
        '<h4 style="margin-bottom:6px;">' + cfg.partnerAd.title + '</h4>' +
        '<p style="font-size:13px; color:var(--muted); margin-bottom:10px;">' + cfg.partnerAd.description + '</p>' +
        '<a href="tel:' + cfg.partnerAd.phone + '" class="btn btn-red" style="display:block; text-align:center;">📞 ' + cfg.partnerAd.buttonText + '</a>';
    }
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('pd_dark', isDark ? '1' : '0');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = isDark ? '☀ День' : '🌙 Ночь';
}

function toggleBigFont() {
  document.body.classList.toggle('big-font');
  localStorage.setItem('pd_big', document.body.classList.contains('big-font') ? '1' : '0');
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
async function loadWeather() {
try {
const res = await fetch('./weather.json?v=' + Date.now());
if (!res.ok) return;
const data = await res.json();
if (Array.isArray(data) && data.length > 0) {
weatherCache = data;
selectWeatherCity(0);
}
} catch (e) {}
}
function selectWeatherCity(idx) {
const i = Number(idx) || 0;
const sel = document.getElementById('city-sel');
if (sel) sel.selectedIndex = i;
const w = weatherCache[i];
if (!w) return;
const setTxt = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
setTxt('w-city-name', w.name);
setTxt('w-top-now', w.now);
setTxt('w-now', w.now);
setTxt('w-morning', w.morning);
setTxt('w-day', w.day);
setTxt('w-evening', w.evening);
setTxt('w-tomorrow', w.tomorrow);
}
async function loadRates() {
try {
const res = await fetch('./rates.json?v=' + Date.now());
if (!res.ok) return;
const r = await res.json();
const setTxt = function(id, val) { var el = document.getElementById(id); if (el && val) el.textContent = val + ' ₽'; };
setTxt('r-usd', r.usd);
setTxt('r-eur', r.eur);
setTxt('r-cny', r.cny);
setTxt('r-jpy', r.jpy);
const topEl = document.getElementById('rates-top');
if (topEl && r.usd && r.cny) topEl.textContent = '💵 ' + r.usd + ' ₽ | 🇨🇳 ' + r.cny + ' ₽';
} catch (e) {}
}
async function loadNews() {
try {
const res = await fetch('./news.json?v=' + Date.now());
if (res.ok) {
const data = await res.json();
if (Array.isArray(data) && data.length > 0) newsData = data;
}
} catch (e) {}
render();
const params = new URLSearchParams(window.location.search);
const openId = params.get('news');
if (openId) openArt(openId);
}
async function loadOutages() {
try {
const res = await fetch('./outages.json?v=' + Date.now());
if (!res.ok) return;
const list = await res.json();
const box = document.getElementById('outages-list');
if (box && Array.isArray(list) && list.length > 0) {
box.innerHTML = list.map(function(o) {
return '' + o.district + '' + o.status + '';
}).join('');
}
} catch (e) {}
}
function openModal(id) { var el = document.getElementById(id); if (el) el.style.display = 'flex'; }
function closeModal(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
function acceptCookies() { localStorage.setItem('ck', '1'); closeModal('cookie-box'); }
window.addEventListener('DOMContentLoaded', function() {
if (localStorage.getItem('ck')) closeModal('cookie-box');
if (localStorage.getItem('pd_dark') === '1') {
document.body.classList.add('dark');
const btn = document.getElementById('theme-btn');
if (btn) btn.textContent = '☀ День';
}
if (localStorage.getItem('pd_big') === '1') document.body.classList.add('big-font');
applyConfig();
updateClock();
setInterval(updateClock, 10000);
updateSeasonAndHolidays();
loadWeather();
loadRates();
loadNews();
loadOutages();
