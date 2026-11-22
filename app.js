var cCat = 'all', cCity = 'all', cQuery = '';

var PRIM_CITIES = [
  { name: 'Владивосток', lat: 43.1155, lon: 131.8855 },
  { name: 'Уссурийск', lat: 43.7972, lon: 131.9517 },
  { name: 'Находка', lat: 42.8241, lon: 132.8928 },
  { name: 'Артём', lat: 43.3592, lon: 132.1892 },
  { name: 'Большой Камень', lat: 43.1128, lon: 132.3481 },
  { name: 'Арсеньев', lat: 44.1628, lon: 133.2778 },
  { name: 'Спасск-Дальний', lat: 44.5978, lon: 132.8192 },
  { name: 'Партизанск', lat: 43.1286, lon: 133.1244 },
  { name: 'Дальнегорск', lat: 44.5603, lon: 135.5700 }
];

function getByIdx(arr, index) {
  if (!Array.isArray(arr)) return null;
  var target = Number(index) || 0;
  var found = null;
  arr.forEach(function(item, i) {
    if (i === target) found = item;
  });
  return found;
}

function cleanPhoneDigits(str) {
  var s = String(str || '');
  var res = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if ((ch >= '0' && ch <= '9') || ch === '+') res += ch;
  }
  if (res.indexOf('8') === 0 && res.length === 11) {
    res = '+7' + res.slice(1);
  }
  return res;
}

function fmtTemp(v) {
  var n = Math.round(Number(v) || 0);
  if (n === 0) return '0°C';
  return (n > 0 ? '+' : '') + n + '°C';
}

function applyWeatherObj(w) {
  if (!w) return;
  var set = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
  set('w-top', w.now);
  set('w-name', w.name);
  set('w-now', w.now);
  set('w-m', w.morning);
  set('w-d', w.day);
  set('w-e', w.evening);
  set('w-t', w.tomorrow);
}

function setWeather(i) {
  var idx = Number(i) || 0;
  var w = getByIdx(window.WEATHER, idx);
  if (w) applyWeatherObj(w);
  fetchLiveWeather(idx);
}

function fetchLiveWeather(selectedIndex) {
  var sel = document.getElementById('w-sel');
  var idx = selectedIndex !== undefined ? Number(selectedIndex) : (sel ? Number(sel.value) : 0);
  var city = getByIdx(PRIM_CITIES, idx) || getByIdx(PRIM_CITIES, 0);
  var host = ['api', 'open-meteo', 'com'].join('.');
  var url = 'https://' + host + '/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon +
    '&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok';

  fetch(url).then(function(r) { return r.json(); }).then(function(r) {
    if (!r || !r.current) return;
    var ico = function(c) { return c === 0 ? '☀' : c <= 3 ? '🌤' : (c >= 71 && c <= 77) ? '❄' : c >= 51 ? '🌧' : '☁'; };
    var h = (r.hourly && r.hourly.temperature_2m) || [];
    var d = (r.daily && r.daily.temperature_2m_max) || [];
    var curT = r.current.temperature_2m;
    var fresh = {
      name: city.name,
      now: fmtTemp(curT) + ' ' + ico(r.current.weather_code),
      morning: fmtTemp(h.length > 8 ? getByIdx(h, 8) : curT),
      day: fmtTemp(h.length > 14 ? getByIdx(h, 14) : curT),
      evening: fmtTemp(h.length > 20 ? getByIdx(h, 20) : curT),
      tomorrow: fmtTemp(d.length > 1 ? getByIdx(d, 1) : curT)
    };
    applyWeatherObj(fresh);
  }).catch(function() {});
}

function renderFeed() {
  var box = document.getElementById('feed');
  if (!box) return;
  var q = cQuery.toLowerCase();
  var list = (window.NEWS || []).filter(function(n) {
    var okCat = cCat === 'all' || (n.cat || '').indexOf(cCat) !== -1;
    var okCity = cCity === 'all' || (n.city || '').toLowerCase().indexOf(cCity.toLowerCase()) !== -1;
    var okQ = !q || (n.title || '').toLowerCase().indexOf(q) !== -1 || (n.text || '').toLowerCase().indexOf(q) !== -1;
    return okCat && okCity && okQ;
  });
  if (!list.length) {
    box.innerHTML = '<div class="widget"><p style="color:var(--muted);">По выбранному фильтру новостей пока нет.</p></div>';
    return;
  }
  box.innerHTML = list.map(function(n, i) {
    var lead = (n.text || '').replace(/\s+/g, ' ').slice(0, 155);
    var meta = '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span> <span>' + n.city + '</span> <span>• ' + n.date + '</span> <span class="badge-age">' + n.age + '</span></div>';
    return i === 0
      ? '<article class="hero-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="hero-img" src="./' + n.cover + '" alt=""><div class="hero-body">' + meta + ' <h2 class="hero-title">' + n.title + '</h2> <p class="hero-lead">' + lead + '...</p></div></article>'
      : '<article class="news-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="news-thumb" src="./' + n.cover + '" alt=""><div>' + meta + ' <h3 class="news-title">' + n.title + '</h3> <p class="news-excerpt">' + lead + '...</p></div></article>';
  }).join('');
}

function filterCat(c, btn) {
  cCat = c;
  document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderFeed();
}

function filterCity(c) { cCity = c; renderFeed(); }
function setSearch(val) { cQuery = (val || '').trim(); renderFeed(); }

function openArt(id) {
  var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
  if (!n) return;
  var cfg = window.PRIM_DOZOR_CONFIG || {};
  var soc = cfg.socials || {};
  var mBody = document.getElementById('m-body');
  var modal = document.getElementById('modal');
  if (!mBody || !modal) return;
  mBody.innerHTML =
    '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span> <span>' + n.city + '</span> <span>• ' + n.date + '</span> <span class="badge-age">' + n.age + '</span></div>\n' +
    '<h1 style="font-size:21px;line-height:1.3;margin:8px 0 14px">' + n.title + '</h1>\n' +
    '<img src="./' + n.cover + '" style="width:100%;border-radius:10px;margin-bottom:14px">\n' +
    '<div class="tldr"><strong>Главное:</strong><br>' + (n.tldr || '').replace(/\n/g, '<br>') + '</div>\n' +
    '<div style="white-space:pre-line;line-height:1.75;font-size:15.5px;margin-bottom:16px">' + n.text + '</div>\n' +
    (n.src ? '<p style="font-size:12px;color:var(--muted);margin-bottom:14px">' + n.src + '</p>\n' : '') +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:12px;border-top:1px solid var(--border)">' +
    '<a href="' + (soc.telegram || 'https://t.me') + '" target="_blank" class="btn-cta">✈ Telegram ЧП</a> ' +
    '<a href="' + (soc.max || 'https://max.ru') + '" target="_blank" class="soc-pill">💬 МАКС</a> ' +
    '<a href="' + (soc.vk || 'https://vk.ru') + '" target="_blank" class="soc-pill">🌐 ВК</a> ' +
    '<a href="' + (soc.dzen || 'https://dzen.ru') + '" target="_blank" class="soc-pill">🔥 Дзен</a>' +
    '</div>';
  modal.style.display = 'flex';
}

function openAfisha(idx) {
  var dir = window.DIRECTORIES || {};
  var a = getByIdx(dir.afisha, idx);
  if (!a) return;
  var mBody = document.getElementById('m-body');
  var modal = document.getElementById('modal');
  if (!mBody || !modal) return;
  mBody.innerHTML =
    '<div class="news-meta"><span class="badge-cat">' + (a.tag || 'Афиша Приморья') + '</span> <span>' + (a.city || 'Приморский край') + '</span></div>\n' +
    '<h1 style="font-size:21px;line-height:1.3;margin:8px 0 14px">' + a.title + '</h1>\n' +
    '<div class="tldr">\n' +
      '<div style="margin-bottom:6px">📅 <strong>Когда и во сколько:</strong> ' + (a.date || 'Уточняется') + '</div>\n' +
      '<div style="margin-bottom:6px">📍 <strong>Где проходит:</strong> ' + (a.place || a.city || 'Приморский край') + '</div>\n' +
      '<div>🎟 <strong>Условия входа:</strong> ' + (a.price || 'Вход свободный') + '</div>\n' +
    '</div>\n' +
    '<div style="line-height:1.7;font-size:15.5px;margin-bottom:16px">' +
      (a.desc || 'Приглашаем жителей и гостей Приморского края посетить мероприятие. Подробности и программа доступны на площадке проведения.') +
    '</div>';
  modal.style.display = 'flex';
}

function switchDirTab(tabId, btn) {
  document.querySelectorAll('.mini-tab').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ['dir-jkh', 'dir-phones', 'dir-afisha'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = (id === tabId) ? 'block' : 'none';
  });
}

function makeTelHref(num) {
  var parts = String(num || '').split('/');
  var first = getByIdx(parts, 0) || '';
  var clean = cleanPhoneDigits(first);
  if (clean.length === 7 && clean.indexOf('+') !== 0) clean = '+7423' + clean;
  return 'tel:' + clean;
}

function renderCityPhones(city) {
  var dir = window.DIRECTORIES || {};
  var phones = dir.phones || {};
  var list = phones[city] || phones['Все города'] || [];
  var box = document.getElementById('phones-list');
  if (box) {
    box.innerHTML = list.map(function(p) {
      return '<div class="w-row"><span style="flex:1;padding-right:8px">' + p.name + '</span> <a href="' + makeTelHref(p.num) + '" class="tel-pill">📞 ' + p.num + '</a></div>';
    }).join('\n');
  }
}

function renderSeasonBanner() {
  var banner = document.getElementById('season-banner');
  if (!banner) return;
  var now = new Date();
  var m = now.getMonth() + 1;
  var mmdd = String(m).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  var theme = 'autumn';
  if (mmdd >= '12-20' || mmdd <= '01-10') theme = 'newyear';
  else if (mmdd >= '02-21' && mmdd <= '02-24') theme = 'feb23';
  else if (mmdd >= '03-06' && mmdd <= '03-09') theme = 'mar8';
  else if (mmdd >= '05-01' && mmdd <= '05-03') theme = 'may1';
  else if (mmdd >= '05-07' && mmdd <= '05-10') theme = 'victory';
  else if (mmdd >= '06-11' && mmdd <= '06-13') theme = 'russia';
  else if (mmdd >= '07-01' && mmdd <= '07-03') theme = 'vladivostok';
  else if (mmdd >= '07-25' && mmdd <= '07-28') theme = 'navy';
  else if (mmdd >= '09-25' && mmdd <= '09-28') theme = 'tiger';
  else if (m === 12 || m <= 2) theme = 'winter';
  else if (m >= 3 && m <= 5) theme = 'spring';
  else if (m >= 6 && m <= 8) theme = 'summer';

  var svgArt = '';
  if (theme === 'newyear') {
svgArt = '';
} else if (theme === 'victory' || theme === 'feb23') {
svgArt = '';
} else if (theme === 'mar8' || theme === 'spring' || theme === 'may1') {
svgArt = '';
} else if (theme === 'russia' || theme === 'vladivostok' || theme === 'navy' || theme === 'summer') {
svgArt = '';
} else if (theme === 'winter') {
svgArt = '';
} else {
svgArt = '';
}
banner.style.padding = '0';
banner.style.overflow = 'hidden';
banner.style.height = '112px';
banner.style.borderRadius = '14px';
banner.style.border = 'none';
banner.innerHTML = svgArt;
banner.style.display = 'block';
}
function openReport() {
var m = document.getElementById('report-modal');
if (m) m.style.display = 'flex';
}
function sendReport(e) {
e.preventDefault();
var cityEl = document.getElementById('rep-city');
var textEl = document.getElementById('rep-text');
var city = cityEl ? cityEl.value : 'Приморский край';
var text = textEl ? textEl.value.trim() : '';
if (!text) return;
var msg = encodeURIComponent('Народный контроль (' + city + '):\n' + text);
window.open('t.me' + encodeURIComponent('https://primdozor.ru') + '&text=' + msg, '_blank');
var m = document.getElementById('report-modal');
if (m) m.style.display = 'none';
}
function initSite() {
try {
if (localStorage.getItem('ck')) {
var ck = document.getElementById('ck');
if (ck) ck.style.display = 'none';
}
} catch (e) {}
renderSeasonBanner();
renderCityPhones('Все города');
var firstW = getByIdx(window.WEATHER, 0);
if (firstW) applyWeatherObj(firstW);
fetchLiveWeather(0);
setInterval(function() { fetchLiveWeather(); }, 600000);
setInterval(function() {
var vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
var cl = document.getElementById('clock');
if (cl) cl.textContent = 'Владивосток ' + String(vl.getHours()).padStart(2, '0') + ':' + String(vl.getMinutes()).padStart(2, '0');
}, 5000);
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initSite);
} else {
initSite();
}
