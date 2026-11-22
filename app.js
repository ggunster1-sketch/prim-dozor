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

var PRIM_GUIDE = [
  { cat: 'Травмпункты 24/7', title: 'Травмпункт №1 (Ленинский / Первомайский)', addr: 'Владивосток, ул. Уткинская, 7', phone: '+7 (423) 240-03-86' },
  { cat: 'Травмпункты 24/7', title: 'Травмпункт №2 (Первореченский / Центр)', addr: 'Владивосток, ул. Калинина, 78', phone: '+7 (423) 227-64-83' },
  { cat: 'Травмпункты 24/7', title: 'Травмпункт №3 (Советский / Вторая Речка)', addr: 'Владивосток, ул. Давыдова, 3', phone: '+7 (423) 231-90-15' },
  { cat: 'Травмпункты 24/7', title: 'Детский краевой травмпункт 24/7', addr: 'Владивосток, пр-т Острякова, 27', phone: '+7 (423) 245-19-07' },
  { cat: 'Аптеки 24/7', title: 'Дежурная аптека «Монастырёв» (Центр)', addr: 'Владивосток, Океанский пр-т, 18', phone: '+7 (423) 240-24-02' },
  { cat: 'Аптеки 24/7', title: 'Круглосуточная аптека «Госаптека» (Чуркин)', addr: 'Владивосток, ул. Калинина, 42', phone: '+7 (423) 227-35-10' },
  { cat: 'Аптеки 24/7', title: 'Аптека 24/7 «Овита» (Вторая Речка)', addr: 'Владивосток, ул. Русская, 46', phone: '+7 (423) 232-08-08' },
  { cat: 'Паромы и катера', title: 'Морской вокзал (о. Попова, о. Рейнеке, Славянка)', addr: 'Владивосток, ул. Нижнепортовая, 1 (Причал №1)', phone: '+7 (423) 249-73-01' },
  { cat: 'Паромы и катера', title: 'Справочная автовокзала Приморья', addr: 'Владивосток, ул. Русская, 2А', phone: '+7 (423) 232-33-78' },
  { cat: 'Ветпомощь 24/7', title: 'Круглосуточная ветклиника «Друг»', addr: 'Владивосток, ул. Борисенко, 33', phone: '+7 (423) 260-87-60' }
];

function getByIdx(arr, index) {
  if (!Array.isArray(arr)) return null;
  var target = Number(index) || 0;
  var found = null;
  arr.forEach(function(item, i) { if (i === target) found = item; });
  return found;
}

function cleanPhoneDigits(str) {
  var s = String(str || ''), res = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if ((ch >= '0' && ch <= '9') || ch === '+') res += ch;
  }
  if (res.indexOf('8') === 0 && res.length === 11) res = '+7' + res.slice(1);
  return res;
}

function fmtTemp(v) {
  var n = Math.round(Number(v) || 0);
  return n === 0 ? '0°C' : (n > 0 ? '+' : '') + n + '°C';
}

function applyWeatherObj(w) {
  if (!w) return;
  var set = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
  set('w-top', w.now); set('w-name', w.name); set('w-now', w.now);
  set('w-m', w.morning); set('w-d', w.day); set('w-e', w.evening); set('w-t', w.tomorrow);
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
    applyWeatherObj({
      name: city.name,
      now: fmtTemp(curT) + ' ' + ico(r.current.weather_code),
      morning: fmtTemp(h.length > 8 ? getByIdx(h, 8) : curT),
      day: fmtTemp(h.length > 14 ? getByIdx(h, 14) : curT),
      evening: fmtTemp(h.length > 20 ? getByIdx(h, 20) : curT),
      tomorrow: fmtTemp(d.length > 1 ? getByIdx(d, 1) : curT)
    });
  }).catch(function() {});
}

function renderFeed() {
  var box = document.getElementById('feed');
  if (!box) return;
  var q = cQuery.toLowerCase(), targetLoc = cCity.toLowerCase();
  var list = (window.NEWS || []).filter(function(n) {
    var okCat = cCat === 'all' || (n.cat || '').indexOf(cCat) !== -1;
    var locStr = ((n.city || '') + ' ' + (n.district || '') + ' ' + (n.title || '') + ' ' + (n.text || '')).toLowerCase();
    return okCat && (targetLoc === 'all' || locStr.indexOf(targetLoc) !== -1) && (!q || locStr.indexOf(q) !== -1);
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

function filterJkh(q) {
  var query = String(q || '').toLowerCase().trim();
  var box = document.getElementById('dir-jkh');
  if (!box) return;
  box.querySelectorAll('.w-row').forEach(function(row) {
    var txt = (row.textContent || '').toLowerCase();
    row.style.display = (!query || txt.indexOf(query) !== -1) ? 'flex' : 'none';
  });
}

function injectJkhSearch() {
  var box = document.getElementById('dir-jkh');
  if (!box || document.getElementById('jkh-search-inp')) return;
  var inp = document.createElement('input');
  inp.id = 'jkh-search-inp';
  inp.type = 'search';
  inp.className = 'input';
  inp.placeholder = 'Поиск отключения по улице...';
  inp.style.marginBottom = '8px';
  inp.style.padding = '6px 10px';
  inp.style.fontSize = '13px';
  inp.oninput = function() { filterJkh(this.value); };
  box.insertBefore(inp, box.firstChild);
}

function renderGuideList(q) {
  var listBox = document.getElementById('guide-items');
  if (!listBox) return;
  var query = String(q || '').toLowerCase().trim();
  var filtered = PRIM_GUIDE.filter(function(item) {
    if (!query) return true;
    return (item.cat + ' ' + item.title + ' ' + item.addr).toLowerCase().indexOf(query) !== -1;
  });
  listBox.innerHTML = filtered.map(function(g) {
    return '<div class="w-row"><div style="flex:1;padding-right:8px">' +
      '<div style="font-size:11px;color:var(--accent);font-weight:700">' + g.cat + '</div>' +
      '<div style="font-weight:700;font-size:13px;margin-top:1px">' + g.title + '</div>' +
      '<div style="font-size:11.5px;color:var(--muted)">📍 ' + g.addr + '</div></div>' +
      '<a href="tel:' + cleanPhoneDigits(g.phone) + '" class="tel-pill">📞 Позвонить</a></div>';
  }).join('');
}

function injectGuideTab() {
  var jkhBox = document.getElementById('dir-jkh');
  if (!jkhBox || document.getElementById('dir-guide')) return;
  var widget = jkhBox.parentNode;
  var tabs = widget.querySelector('.mini-tabs');
  if (tabs) {
    var btn = document.createElement('button');
    btn.className = 'mini-tab';
    btn.textContent = '24/7';
    btn.onclick = function() { switchDirTab('dir-guide', btn); };
    tabs.appendChild(btn);
  }
  var guideDiv = document.createElement('div');
  guideDiv.id = 'dir-guide';
  guideDiv.style.display = 'none';

  var inp = document.createElement('input');
  inp.type = 'search';
  inp.className = 'input';
  inp.placeholder = 'Травмпункт, аптека, паром...';
  inp.style.marginBottom = '8px';
  inp.style.padding = '6px 10px';
  inp.style.fontSize = '13px';
  inp.oninput = function() { renderGuideList(this.value); };

  var itemsBox = document.createElement('div');
  itemsBox.id = 'guide-items';

  guideDiv.appendChild(inp);
  guideDiv.appendChild(itemsBox);
  widget.appendChild(guideDiv);
  renderGuideList('');
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  var words = String(text || '').split(' ');
  var line = '', lines = 0;
  for (var i = 0; i < words.length; i++) {
    var testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[i] + ' ';
      y += lineHeight;
      lines++;
      if (lines >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

function shareNewsCard(id, btnEl) {
  var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
  if (!n) return;
  if (btnEl) btnEl.textContent = '⏳ Создаём карточку...';

var cvs = document.createElement('canvas');
var W = 1080, H = 620;
cvs.width = W; cvs.height = H;
var ctx = cvs.getContext('2d');
if (!ctx) return;
var grad = ctx.createLinearGradient(0, 0, W, H);
grad.addColorStop(0, '#0f172a');
grad.addColorStop(1, '#1e293b');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);
ctx.fillStyle = '#c81e1e';
ctx.fillRect(0, 0, W, 14);
ctx.fillRect(56, 48, 250, 48);
ctx.fillStyle = '#ffffff';
ctx.font = '900 24px sans-serif';
ctx.fillText('ПРИМ_ДОЗОР • 24/7', 74, 80);
ctx.fillStyle = '#fca5a5';
ctx.font = '700 24px sans-serif';
var locText = (n.city || 'Приморье') + (n.district ? ' • ' + n.district : '') + ' • ' + (n.date || '');
ctx.fillText(locText, 330, 80);
ctx.fillStyle = '#ffffff';
ctx.font = '800 44px sans-serif';
wrapCanvasText(ctx, n.title, 56, 165, W - 112, 56, 4);
ctx.fillStyle = 'rgba(255,255,255,0.12)';
ctx.fillRect(56, 405, W - 112, 2);
ctx.fillStyle = '#cbd5e1';
ctx.font = '500 26px sans-serif';
var summary = String(n.tldr || n.text || '').replace(/\s+/g, ' ').slice(0, 140) + '...';
wrapCanvasText(ctx, summary, 56, 452, W - 112, 36, 2);
ctx.fillStyle = '#94a3b8';
ctx.font = '700 22px sans-serif';
ctx.fillText('Подробности и оперативные сводки: primdozor.ru', 56, 574);
cvs.toBlob(function(blob) {
if (!blob) return;
var fileName = 'primdozor-' + n.id + '.png';
var blobList = new Array(blob);
var fileObj = new File(blobList, fileName, { type: 'image/png' });
var filesList = new Array(fileObj);
if (navigator.canShare && navigator.canShare({ files: filesList })) {
navigator.share({
files: filesList,
title: n.title,
text: n.title + ' — primdozor.ru' + n.id + '.html'
}).catch(function() {});
} else {
var a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = fileName;
a.click();
}
if (btnEl) btnEl.textContent = '✓ Карточка готова';
setTimeout(function() { if (btnEl) btnEl.textContent = '🖼 Карточка для чата'; }, 3000);
}, 'image/png');
}
function openArt(id) {
var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
if (!n) return;
var soc = (window.PRIM_DOZOR_CONFIG || {}).socials || {};
var mBody = document.getElementById('m-body'), modal = document.getElementById('modal');
if (!mBody || !modal) return;
var locLabel = n.city + (n.district ? ' (' + n.district + ')' : '');
mBody.innerHTML =
'' + n.catLabel + ' ' + locLabel + ' • ' + n.date + ' ' + n.age + '' +
'' + n.title + '' +
'' +
'Главное:
' + (n.tldr || '').replace(/\n/g, '
') + '' +
'' + n.text + '' +
(n.src ? '' + n.src + '' : '') +
'' +
'🖼 Карточка для чата ' +
'✈ Telegram ЧП ' +
'💬 МАКС ' +
'🌐 ВК';
modal.style.display = 'flex';
}
function openAfisha(idx) {
var a = getByIdx((window.DIRECTORIES || {}).afisha, idx);
if (!a) return;
var mBody = document.getElementById('m-body'), modal = document.getElementById('modal');
if (!mBody || !modal) return;
mBody.innerHTML =
'' + (a.tag || 'Афиша Приморья') + ' ' + (a.city || 'Приморский край') + '' +
'' + a.title + '' +
'📅 Когда и во сколько: ' + (a.date || 'Уточняется') + '' +
'📍 Где проходит: ' + (a.place || a.city || 'Приморский край') + '' +
'🎟 Условия входа: Вход свободный' +
'' + (a.desc || 'Бесплатное городское мероприятие для жителей и гостей Приморского края.') + '';
modal.style.display = 'flex';
}
function switchDirTab(tabId, btn) {
document.querySelectorAll('.mini-tab').forEach(function(b) { b.classList.remove('active'); });
if (btn) btn.classList.add('active');
['dir-jkh', 'dir-phones', 'dir-afisha', 'dir-guide'].forEach(function(id) {
var el = document.getElementById(id);
if (el) el.style.display = (id === tabId) ? 'block' : 'none';
});
}
function makeTelHref(num) {
var first = getByIdx(String(num || '').split('/'), 0) || '';
var clean = cleanPhoneDigits(first);
if (clean.length === 7 && clean.indexOf('+') !== 0) clean = '+7423' + clean;
return 'tel:' + clean;
}
function renderCityPhones(city) {
var phones = (window.DIRECTORIES || {}).phones || {};
var list = phones[city] || phones['Все города'] || [];
var box = document.getElementById('phones-list');
if (box) {
box.innerHTML = list.map(function(p) {
return '' + p.name + ' 📞 ' + p.num + '';
}).join('\n');
}
}
function drawSeasonArtCanvas() {
var banner = document.getElementById('season-banner');
if (!banner) return;
var now = new Date(), m = now.getMonth() + 1;
var mmdd = String(m).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
var theme = 'autumn';
if (mmdd >= '12-20' || mmdd <= '01-10') theme = 'newyear';
else if (mmdd >= '02-21' && mmdd <= '02-24') theme = 'feb23';
else if (mmdd >= '03-06' && mmdd <= '03-09') theme = 'mar8';
else if (mmdd >= '05-07' && mmdd <= '05-10') theme = 'victory';
else if (mmdd >= '06-11' && mmdd <= '06-13') theme = 'russia';
else if (mmdd >= '07-01' && mmdd <= '07-03') theme = 'vladivostok';
else if (mmdd >= '07-25' && mmdd <= '07-28') theme = 'navy';
else if (mmdd >= '09-25' && mmdd <= '09-28') theme = 'tiger';
else if (m === 12 || m <= 2) theme = 'winter';
else if (m >= 3 && m <= 5) theme = 'spring';
else if (m >= 6 && m <= 8) theme = 'summer';
banner.style.padding = '0'; banner.style.border = 'none'; banner.style.borderRadius = '14px';
banner.style.overflow = 'hidden'; banner.style.height = '108px'; banner.style.display = 'block';
banner.innerHTML = '';
var cvs = document.createElement('canvas'), W = 1200, H = 120;
cvs.width = W; cvs.height = H; cvs.style.width = '100%'; cvs.style.height = '100%'; cvs.style.display = 'block';
banner.appendChild(cvs);
var ctx = cvs.getContext('2d');
if (!ctx) return;
var grad = ctx.createLinearGradient(0, 0, W, H);
if (theme === 'newyear' || theme === 'winter') {
grad.addColorStop(0, '#071329'); grad.addColorStop(0.55, '#153263'); grad.addColorStop(1, '#0284c7');
} else if (theme === 'victory' || theme === 'feb23') {
grad.addColorStop(0, '#181412'); grad.addColorStop(0.5, '#4c1d05'); grad.addColorStop(1, '#881337');
} else if (theme === 'mar8' || theme === 'spring') {
grad.addColorStop(0, '#0f4c45'); grad.addColorStop(0.55, '#0d9488'); grad.addColorStop(1, '#be185d');
} else if (theme === 'russia' || theme === 'vladivostok' || theme === 'navy' || theme === 'summer') {
grad.addColorStop(0, '#083358'); grad.addColorStop(0.5, '#0284c7'); grad.addColorStop(1, '#1d4ed8');
} else {
grad.addColorStop(0, '#2d0c04'); grad.addColorStop(0.45, '#9a3412'); grad.addColorStop(0.8, '#d97706'); grad.addColorStop(1, '#b45309');
}
ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
ctx.fillStyle = 'rgba(10, 6, 4, 0.42)';
ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 86);
ctx.quadraticCurveTo(320, 56, 640, 88); ctx.quadraticCurveTo(920, 112, W, 74);
ctx.lineTo(W, H); ctx.closePath(); ctx.fill();













}
function sendReport(e) {
e.preventDefault();
var city = (document.getElementById('rep-city') || {}).value || 'Приморский край';
var text = ((document.getElementById('rep-text') || {}).value || '').trim();
if (!text) return;
var msg = encodeURIComponent('Народный контроль (' + city + '):\n' + text);
window.open('t.me' + encodeURIComponent('https://primdozor.ru') + '&text=' + msg, '_blank');
var m = document.getElementById('report-modal'); if (m) m.style.display = 'none';
}
function initSite() {
try { if (localStorage.getItem('ck')) { var ck = document.getElementById('ck'); if (ck) ck.style.display = 'none'; } } catch (e) {}
drawSeasonArtCanvas();
injectJkhSearch();
injectGuideTab();
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
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initSite); } else { initSite(); }
