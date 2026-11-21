let newsData = [];
let curCat = 'all';
let curCity = 'all';
let curSearch = '';
let weatherCache = [];

function getCfg() { return window.PRIM_DOZOR_CONFIG || {}; }

function shortLead(n) {
  const raw = (n.text || n.tldr || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return raw.length > 145 ? raw.slice(0, 145).trim() + '...' : raw;
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
    box.innerHTML = '<div class="widget"><p style="color:var(--muted);">В этой рубрике пока нет публикаций.</p></div>';
    return;
  }

  box.innerHTML = list.map(function(n, idx) {
    if (idx === 0) {
      return (
        '<article class="hero-card" onclick="openArt(\'' + n.id + '\')">' +
          (n.cover ? '<img class="hero-img" src="./' + n.cover + '" alt="' + n.title + '">' : '') +
          '<div class="hero-body">' +
            '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span><span>' + n.city + '</span><span>• ' + n.date + '</span><span class="badge-age">' + (n.age || '16+') + '</span></div>' +
            '<h2 class="hero-title">' + n.title + '</h2>' +
            '<p class="hero-lead">' + shortLead(n) + '</p>' +
          '</div>' +
        '</article>'
      );
    }
    return (
      '<article class="news-card" onclick="openArt(\'' + n.id + '\')">' +
        (n.cover ? '<img class="news-thumb" src="./' + n.cover + '" alt="' + n.title + '" loading="lazy">' : '<div class="news-thumb"></div>') +
        '<div>' +
          '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span><span>' + n.city + '</span><span>• ' + n.date + '</span><span class="badge-age">' + (n.age || '16+') + '</span></div>' +
          '<h3 class="news-title">' + n.title + '</h3>' +
          '<p class="news-excerpt">' + shortLead(n) + '</p>' +
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
  const coverImg = n.cover ? '<img src="./' + n.cover + '" alt="' + n.title + '" style="width:100%; border-radius:10px; margin-bottom:14px;">' : '';
  const srcLine = n.src ? '<p style="font-size:12px; color:var(--muted); margin-bottom:14px;">' + n.src + '</p>' : '';

  document.getElementById('art-body').innerHTML =
    '<div class="news-meta">' +
      '<span class="badge-cat">' + n.catLabel + '</span>' +
      '<span>' + n.city + '</span>' +
      '<span>• ' + n.date + '</span>' +
      '<span class="badge-age">' + (n.age || '16+') + '</span>' +
    '</div>' +
    '<h1 style="font-size:21px; line-height:1.3; margin:8px 0 12px;">' + n.title + '</h1>' +
    coverImg +
    '<div class="tldr"><strong>Главное:</strong><br>' + n.tldr + '</div>' +
    '<p style="line-height:1.7; margin-bottom:16px; white-space:pre-line; font-size:15.5px;">' + (n.fullText || n.text) + '</p>' +
    srcLine +
    '<div style="display:flex; flex-wrap:wrap; gap:8px; padding-top:14px; border-top:1px solid var(--border);">' +
      '<a href="' + tgUrl + '" target="_blank" rel="noopener" class="btn-cta">✈ Telegram ЧП</a>' +
      '<a href="' + maxUrl + '" target="_blank" rel="noopener" class="soc-pill">💬 МАКС</a>' +
      '<a href="/news/' + n.id + '.html" class="soc-pill">🔗 Ссылка</a>' +
    '</div>';
  document.getElementById('art-modal').style.display = 'flex';
}

function openReport() {
  const cfg = getCfg();
  const tgUrl = (cfg.socials && cfg.socials.telegram) ? cfg.socials.telegram : 'https://t.me/prim_dozor';
  document.getElementById('art-body').innerHTML =
    '<h2 style="font-size:20px; margin-bottom:8px;">🚨 Прислать новость или ЧП</h2>' +
    '<p style="color:var(--muted); font-size:14px; margin-bottom:16px;">Очевидец ДТП, пожара или отключения в Приморье? Присылайте фото и адрес в редакцию 24/7:</p>' +
    '<a href="' + tgUrl + '" target="_blank" rel="noopener" class="btn-cta" style="display:block; text-align:center; padding:11px;">✈ Написать в Telegram Прим_Дозор</a>';
  document.getElementById('art-modal').style.display = 'flex';
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('pd_dark', isDark ? '1' : '0');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = isDark ? '☀' : '🌙';
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
    if (topEl && r.usd && r.cny) topEl.textContent = '$' + r.usd + ' | ¥' + r.cny;
  } catch (e) {}
}

async function loadNews() {
  try {
    const res = await fetch('./news.json?v=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        newsData = data;
        render();
      }
    }
  } catch (e) {}
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
        return '<div class="w-row"><span>' + o.district + '</span><strong>' + o.status + '</strong></div>';
      }).join('');
    }
  } catch (e) {}
}

function closeModal(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
function acceptCookies() { localStorage.setItem('ck', '1'); closeModal('cookie-box'); }

window.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('ck')) closeModal('cookie-box');
  if (localStorage.getItem('pd_dark') === '1') {
    document.body.classList.add('dark');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = '☀';
  }
  if (localStorage.getItem('pd_big') === '1') document.body.classList.add('big-font');

  updateClock();
  setInterval(updateClock, 10000);
  loadWeather();
  loadRates();
  loadNews();
  loadOutages();
});
