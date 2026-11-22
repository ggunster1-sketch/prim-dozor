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
  var targetLoc = cCity.toLowerCase();
  var list = (window.NEWS || []).filter(function(n) {
    var okCat = cCat === 'all' || (n.cat || '').indexOf(cCat) !== -1;
    var locStr = ((n.city || '') + ' ' + (n.district || '') + ' ' + (n.title || '') + ' ' + (n.text || '')).toLowerCase();
    var okCity = targetLoc === 'all' || locStr.indexOf(targetLoc) !== -1;
    var okQ = !q || locStr.indexOf(q) !== -1;
    return okCat && okCity && okQ;
  });
  if (!list.length) {
    box.innerHTML = '<div class="widget"><p style="color:var(--muted);">По выбранному району или фильтру новостей пока нет.</p></div>';
    return;
  }
  box.innerHTML = list.map(function(n, i) {
    var lead = (n.text || '').replace(/\s+/g, ' ').slice(0, 155);
    var locLabel = n.city + (n.district ? ' • ' + n.district : '');
    var meta = '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span> <span>' + locLabel + '</span> <span>• ' + n.date + '</span> <span class="badge-age">' + n.age + '</span></div>';
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
  var locLabel = n.city + (n.district ? ' (' + n.district + ')' : '');
  mBody.innerHTML =
    '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span> <span>' + locLabel + '</span> <span>• ' + n.date + '</span> <span class="badge-age">' + n.age + '</span></div>\n' +
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
      '<div>🎟 <strong>Условия входа:</strong> Вход свободный</div>\n' +
    '</div>\n' +
    '<div style="line-height:1.7;font-size:15.5px;margin-bottom:16px">' +
      (a.desc || 'Бесплатное городское мероприятие для жителей и гостей Приморского края.') +
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

function drawSeasonArtCanvas() {
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

banner.style.padding = '0';
banner.style.border = 'none';
banner.style.borderRadius = '14px';
banner.style.overflow = 'hidden';
banner.style.height = '108px';
banner.style.display = 'block';
banner.innerHTML = '';
var cvs = document.createElement('canvas');
var W = 1200;
var H = 120;
cvs.width = W;
cvs.height = H;
cvs.style.width = '100%';
cvs.style.height = '100%';
cvs.style.display = 'block';
banner.appendChild(cvs);
var ctx = cvs.getContext('2d');
if (!ctx) return;
var grad = ctx.createLinearGradient(0, 0, W, H);
if (theme === 'newyear') {
grad.addColorStop(0, '#071329');
grad.addColorStop(0.55, '#153263');
grad.addColorStop(1, '#1e4e8c');
} else if (theme === 'victory' || theme === 'feb23') {
grad.addColorStop(0, '#181412');
grad.addColorStop(0.5, '#4c1d05');
grad.addColorStop(1, '#881337');
} else if (theme === 'mar8' || theme === 'spring' || theme === 'may1') {
grad.addColorStop(0, '#0f4c45');
grad.addColorStop(0.55, '#0d9488');
grad.addColorStop(1, '#be185d');
} else if (theme === 'russia' || theme === 'vladivostok' || theme === 'navy' || theme === 'summer') {
grad.addColorStop(0, '#083358');
grad.addColorStop(0.5, '#0284c7');
grad.addColorStop(1, '#1d4ed8');
} else if (theme === 'winter') {
grad.addColorStop(0, '#0b132b');
grad.addColorStop(0.55, '#1c3d7a');
grad.addColorStop(1, '#0284c7');
} else {
grad.addColorStop(0, '#2d0c04');
grad.addColorStop(0.45, '#9a3412');
grad.addColorStop(0.8, '#d97706');
grad.addColorStop(1, '#b45309');
}
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);
var sun = ctx.createRadialGradient(W * 0.78, H * 0.32, 8, W * 0.78, H * 0.32, 220);
sun.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
sun.addColorStop(1, 'rgba(254, 240, 138, 0)');
ctx.fillStyle = sun;
ctx.fillRect(0, 0, W, H);
ctx.fillStyle = 'rgba(15, 10, 8, 0.32)';
ctx.beginPath();
ctx.moveTo(0, H);
ctx.lineTo(0, 82);
ctx.quadraticCurveTo(220, 46, 460, 78);
ctx.quadraticCurveTo(720, 106, 980, 62);
ctx.quadraticCurveTo(1100, 44, W, 68);
ctx.lineTo(W, H);
ctx.closePath();
ctx.fill();
ctx.fillStyle = 'rgba(10, 6, 4, 0.45)';
ctx.beginPath();
ctx.moveTo(0, H);
ctx.lineTo(0, 96);
ctx.quadraticCurveTo(320, 74, 640, 98);
ctx.quadraticCurveTo(920, 114, W, 84);
ctx.lineTo(W, H);
ctx.closePath();
ctx.fill();
if (theme === 'autumn' || theme === 'tiger') {
var leaves = new Array(
{ x: 140, y: 34, r: 15, a: -0.4, c: '#f97316' },
{ x: 260, y: 66, r: 12, a: 0.5, c: '#facc15' },
{ x: 410, y: 28, r: 16, a: -0.2, c: '#ef4444' },
{ x: 560, y: 58, r: 13, a: 0.7, c: '#fb923c' },
{ x: 730, y: 32, r: 15, a: -0.5, c: '#fde047' },
{ x: 890, y: 62, r: 14, a: 0.3, c: '#f97316' },
{ x: 1060, y: 36, r: 16, a: -0.3, c: '#ef4444' }
);
leaves.forEach(function(lf) {
ctx.save();
ctx.translate(lf.x, lf.y);
ctx.rotate(lf.a);
ctx.fillStyle = lf.c;
ctx.beginPath();
ctx.ellipse(0, 0, lf.r, lf.r * 0.48, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = 'rgba(255,255,255,0.35)';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(-lf.r, 0);
ctx.lineTo(lf.r + 5, 0);
ctx.stroke();
ctx.restore();
});
} else if (theme === 'victory' || theme === 'feb23') {
ctx.strokeStyle = '#f97316';
ctx.lineWidth = 18;
ctx.beginPath();
ctx.moveTo(-20, 92);
ctx.quadraticCurveTo(380, 32, 680, 82);
ctx.quadraticCurveTo(960, 118, W + 20, 42);
ctx.stroke();
ctx.strokeStyle = '#090d16';
ctx.lineWidth = 6;
ctx.stroke();
} else if (theme === 'newyear' || theme === 'winter') {
for (var i = 0; i < 36; i++) {
var sx = (i * 137) % W;
var sy = (i * 53) % (H - 14);
ctx.fillStyle = i % 3 === 0 ? 'rgba(253, 224, 71, 0.85)' : 'rgba(255, 255, 255, 0.8)';
ctx.beginPath();
ctx.arc(sx, sy, (i % 3) + 1.5, 0, Math.PI * 2);
ctx.fill();
}
} else if (theme === 'mar8' || theme === 'spring' || theme === 'may1') {
var petals = new Array(220, 440, 680, 940);
petals.forEach(function(px, idx) {
ctx.fillStyle = idx % 2 === 0 ? 'rgba(244, 114, 182, 0.85)' : 'rgba(251, 207, 232, 0.85)';
ctx.beginPath();
ctx.arc(px, 46 + (idx % 2) * 18, 13, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#fde047';
ctx.beginPath();
ctx.arc(px, 46 + (idx % 2) * 18, 4.5, 0, Math.PI * 2);
ctx.fill();
});
} else {
ctx.strokeStyle = 'rgba(224, 242, 254, 0.45)';
ctx.lineWidth = 3;
for (var row = 0; row < 3; row++) {
ctx.beginPath();
for (var wx = 0; wx <= W; wx += 40) {
var wy = 76 + row * 14 + Math.sin(wx * 0.03 + row) * 4;
if (wx === 0) ctx.moveTo(wx, wy);
else ctx.lineTo(wx, wy);
}
ctx.stroke();
}
}
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
drawSeasonArtCanvas();
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
