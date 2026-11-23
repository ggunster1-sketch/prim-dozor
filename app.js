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
  { cat: 'Травмпункты 24/7', title: 'Травмпункт №1 (Ленинский / Первомайский)', addr: 'Владивосток, ул. Уткинская, 7', phone: '+74232400386' },
  { cat: 'Травмпункты 24/7', title: 'Травмпункт №2 (Первореченский / Центр)', addr: 'Владивосток, ул. Калинина, 78', phone: '+74232276483' },
  { cat: 'Травмпункты 24/7', title: 'Травмпункт №3 (Советский / Вторая Речка)', addr: 'Владивосток, ул. Давыдова, 3', phone: '+74232319015' },
  { cat: 'Травмпункты 24/7', title: 'Детский краевой травмпункт 24/7', addr: 'Владивосток, пр-т Острякова, 27', phone: '+74232451907' },
  { cat: 'Аптеки 24/7', title: 'Дежурная аптека «Монастырёв» (Центр)', addr: 'Владивосток, Океанский пр-т, 18', phone: '+74232402402' },
  { cat: 'Аптеки 24/7', title: 'Круглосуточная аптека «Госаптека» (Чуркин)', addr: 'Владивосток, ул. Калинина, 42', phone: '+74232273510' },
  { cat: 'Аптеки 24/7', title: 'Аптека 24/7 «Овита» (Вторая Речка)', addr: 'Владивосток, ул. Русская, 46', phone: '+74232320808' },
  { cat: 'Паромы и катера', title: 'Морской вокзал (о. Попова, о. Рейнеке, Славянка)', addr: 'Владивосток, ул. Нижнепортовая, 1', phone: '+74232497301' },
  { cat: 'Паромы и катера', title: 'Справочная автовокзала Приморья', addr: 'Владивосток, ул. Русская, 2А', phone: '+74232323378' },
  { cat: 'Ветпомощь 24/7', title: 'Круглосуточная ветклиника «Друг»', addr: 'Владивосток, ул. Борисенко, 33', phone: '+74232608760' }
];

function getByIdx(a, i) {
  if (!Array.isArray(a)) return null;
  var t = Number(i) || 0, f = null;
  a.forEach(function(x, k) { if (k === t) f = x; });
  return f;
}

function cleanDigits(s) {
  var r = '', str = String(s || '');
  for (var i = 0; i < str.length; i++) {
    var c = str.charAt(i);
    if (c === ',') break;
    if ((c >= '0' && c <= '9') || c === '+') r += c;
  }
  if (r.indexOf('8') === 0 && r.length === 11) r = '+7' + r.slice(1);
  if (r.length === 7 && r.indexOf('+') !== 0) r = '+7423' + r;
  return r;
}

function fmtT(v) {
  var n = Math.round(Number(v) || 0);
  return n === 0 ? '0°C' : (n > 0 ? '+' : '') + n + '°C';
}
function applyW(w) {
  if (!w) return;
  var s = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
  s('w-top', w.now); s('w-name', w.name); s('w-now', w.now);
  s('w-m', w.morning); s('w-d', w.day); s('w-e', w.evening); s('w-t', w.tomorrow);
}

function setWeather(i) {
  var idx = Number(i) || 0, w = getByIdx(window.WEATHER, idx);
  if (w) applyW(w);
  fetchW(idx);
}

function fetchW(si) {
  var sel = document.getElementById('w-sel');
  var idx = si !== undefined ? Number(si) : (sel ? Number(sel.value) : 0);
  var c = getByIdx(PRIM_CITIES, idx) || getByIdx(PRIM_CITIES, 0);
  var u = 'https://' + ['api', 'open-meteo', 'com'].join('.') + '/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon + '&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok';
  fetch(u).then(function(r) { return r.json(); }).then(function(r) {
    if (!r || !r.current) return;
    var ico = function(k) { return k === 0 ? '☀' : k <= 3 ? '🌤' : (k >= 71 && k <= 77) ? '❄' : k >= 51 ? '🌧' : '☁'; };
    var h = (r.hourly && r.hourly.temperature_2m) || [], d = (r.daily && r.daily.temperature_2m_max) || [], ct = r.current.temperature_2m;
    applyW({
      name: c.name,
      now: fmtT(ct) + ' ' + ico(r.current.weather_code),
      morning: fmtT(h.length > 8 ? getByIdx(h, 8) : ct),
      day: fmtT(h.length > 14 ? getByIdx(h, 14) : ct),
      evening: fmtT(h.length > 20 ? getByIdx(h, 20) : ct),
      tomorrow: fmtT(d.length > 1 ? getByIdx(d, 1) : ct)
    });
  }).catch(function() {});
}

function makeReactHtml(id) {
  var st = getReactStore(), picked = st[id] || '';
  return '<div class="react-bar" data-react-id="' + id + '" style="display:flex;gap:6px;margin-top:8px">' +
    ['🔥', '😡', '👍'].map(function(emo) {
      var act = picked === emo;
      return '<button type="button" class="soc-pill react-btn" style="padding:3px 8px;font-size:12px;' + (act ? 'border-color:var(--accent);font-weight:700;' : '') + '" data-emo="' + emo + '" onclick="event.stopPropagation();toggleReact(\'' + id + '\',\'' + emo + '\')">' + emo + ' <span class="r-cnt">' + (act ? '1' : '0') + '</span></button>';
    }).join('') + '</div>';
}

function renderFeed() {
  var box = document.getElementById('feed');
  if (!box) return;
  var q = cQuery.toLowerCase(), tl = cCity.toLowerCase();
  var list = (window.NEWS || []).filter(function(n) {
    var okC = cCat === 'all' || (n.cat || '').indexOf(cCat) !== -1;
    var ls = ((n.city || '') + ' ' + (n.district || '') + ' ' + (n.title || '') + ' ' + (n.text || '')).toLowerCase();
    return okC && (tl === 'all' || ls.indexOf(tl) !== -1) && (!q || ls.indexOf(q) !== -1);
  });
  if (!list.length) {
    box.innerHTML = '<div class="widget" style="padding:20px;text-align:center;color:var(--muted)">По выбранному фильтру новостей пока нет.</div>';
    return;
  }
  box.innerHTML = list.map(function(n, i) {
    var lead = (n.text || '').replace(/\s+/g, ' ').slice(0, 155);
    var ll = n.city + (n.district ? ' • ' + n.district : '');
    var meta = '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span> <span>' + ll + '</span> <span>• ' + n.date + '</span> <span class="badge-age">' + (n.age || '18+') + '</span></div>';
    var rb = makeReactHtml(n.id);
    return i === 0
      ? '<article class="hero-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="hero-img" src="./' + n.cover + '" alt=""><div class="hero-body">' + meta + '<h2 class="hero-title">' + n.title + '</h2><p class="hero-lead">' + lead + '...</p>' + rb + '</div></article>'
      : '<article class="news-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="news-thumb" src="./' + n.cover + '" alt=""><div class="news-body">' + meta + '<h3 class="news-title">' + n.title + '</h3>' + rb + '</div></article>';
  }).join('');
}
function filterCat(c, b) {
  cCat = c;
  document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
  if (b) b.classList.add('active');
  renderFeed();
}

function filterCity(c) { cCity = c; renderFeed(); }
function setSearch(v) { cQuery = (v || '').trim(); renderFeed(); }

function filterJkh(q) {
  var qr = String(q || '').toLowerCase().trim(), b = document.getElementById('dir-jkh');
  if (!b) return;
  b.querySelectorAll('.w-row').forEach(function(r) {
    r.style.display = (!qr || (r.textContent || '').toLowerCase().indexOf(qr) !== -1) ? 'flex' : 'none';
  });
}

function renderGuide(q) {
  var lb = document.getElementById('guide-items');
  if (!lb) return;
  var qr = String(q || '').toLowerCase().trim();
  lb.innerHTML = PRIM_GUIDE.filter(function(it) {
    return !qr || (it.cat + ' ' + it.title + ' ' + it.addr).toLowerCase().indexOf(qr) !== -1;
  }).map(function(g) {
    return '<div class="w-row"><div style="flex:1;padding-right:8px"><div style="font-size:11px;color:var(--accent);font-weight:700">' + g.cat + '</div><div style="font-weight:700;font-size:13px">' + g.title + '</div><div style="font-size:11.5px;color:var(--muted)">📍 ' + g.addr + '</div></div><a href="tel:' + g.phone + '" class="tel-pill">📞 Позвонить</a></div>';
  }).join('');
}

function shareCard(id, btn) {
  var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
  if (!n) return;
  if (btn) btn.textContent = '⏳ Создаём...';
  var c = document.createElement('canvas');
  c.width = 1080; c.height = 620;
  var x = c.getContext('2d');
  if (!x) return;
  x.fillStyle = '#0f172a'; x.fillRect(0, 0, 1080, 620);
  x.fillStyle = '#c81e1e'; x.fillRect(0, 0, 1080, 14); x.fillRect(56, 48, 260, 48);
  x.fillStyle = '#fff'; x.font = '900 24px sans-serif'; x.fillText('ПРИМ_ДОЗОР • 24/7', 74, 80);
  x.font = '800 40px sans-serif';
  var w = String(n.title || '').split(' '), l = '', y = 170;
  for (var i = 0; i < w.length; i++) {
    var t = l + w[i] + ' ';
    if (x.measureText(t).width > 960 && i > 0) { x.fillText(l, 56, y); l = w[i] + ' '; y += 52; }
    else l = t;
  }
  x.fillText(l, 56, y);
  x.fillStyle = '#94a3b8'; x.font = '700 22px sans-serif'; x.fillText('PRIMDOZOR.RU  •  ' + (n.city || 'Приморье'), 56, 574);
  var a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = 'primdozor-' + n.id + '.png';
  a.click();
  if (btn) btn.textContent = '✓ Карточка скачана';
}

function openArt(id) {
  var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
  if (!n) return;
  var mb = document.getElementById('m-body'), md = document.getElementById('modal');
  if (!mb || !md) return;
  mb.innerHTML =
    '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span> <span>' + n.city + '</span> <span>• ' + n.date + '</span></div>' +
    '<h1 style="font-size:21px;margin:8px 0 14px">' + n.title + '</h1>' +
    '<img src="./' + n.cover + '" style="width:100%;border-radius:10px;margin-bottom:14px">' +
    '<div class="tldr"><strong>Главное:</strong><br>' + (n.tldr || '').replace(/\n/g, '<br>') + '</div>' +
    '<div style="white-space:pre-line;line-height:1.75;margin-bottom:16px">' + n.text + '</div>' +
    makeReactHtml(n.id) +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:12px;margin-top:12px;border-top:1px solid var(--border)">' +
    '<button type="button" class="btn-cta" onclick="shareCard(\'' + n.id + '\',this)">🖼 Карточка для чата</button> ' +
    '<a href="https://t.me" target="_blank" rel="noopener" class="soc-pill">✈ Наш Telegram</a></div>';
  md.style.display = 'flex';
}
function openAfisha(idx) {
  var a = getByIdx((window.DIRECTORIES || {}).afisha, idx);
  if (!a) return;
  var mb = document.getElementById('m-body'), md = document.getElementById('modal');
  if (!mb || !md) return;
  mb.innerHTML =
    '<div class="news-meta"><span class="badge-cat">' + (a.tag || 'Афиша') + '</span> <span>' + (a.city || 'Приморье') + '</span></div>' +
    '<h1 style="font-size:21px;margin:8px 0 14px">' + a.title + '</h1>' +
    '<div class="tldr"><div>📅 ' + (a.date || '') + '</div><div>📍 ' + (a.place || a.city || '') + '</div><div>🎟 Вход свободный</div></div>' +
    '<div style="line-height:1.7">' + (a.desc || '') + '</div>';
  md.style.display = 'flex';
}

function switchDirTab(id, b) {
  document.querySelectorAll('.mini-tab').forEach(function(x) { x.classList.remove('active'); });
  if (b) b.classList.add('active');
  ['dir-jkh', 'dir-phones', 'dir-afisha', 'dir-guide'].forEach(function(k) {
    var e = document.getElementById(k);
    if (e) e.style.display = (k === id) ? 'block' : 'none';
  });
}

function renderCityPhones(c) {
  var p = (window.DIRECTORIES || {}).phones || {};
  var l = p[c] || p['Все города'] || [];
  var b = document.getElementById('phones-list');
  if (b) {
    b.innerHTML = l.map(function(x) {
      return '<div class="w-row"><span style="flex:1;padding-right:8px">' + x.name + '</span><a href="tel:' + cleanDigits(x.num) + '" class="tel-pill">📞 ' + x.num + '</a></div>';
    }).join('');
  }
}

function getHolidayOrSeason(vl) {
  var m = vl.getMonth() + 1, d = vl.getDate();
  var hols = [
    { m: 1, d1: 1, d2: 6, title: 'С Новым годом, Приморье!', sub: 'Редакция «Прим_Дозор» желает мира, здоровья и добрых вестей', c1: '#091e3a', c2: '#1d4ed8', acc: '#60a5fa' },
    { m: 1, d1: 7, d2: 8, title: 'Со светлым Рождеством Христовым!', sub: 'Тепла и благополучия каждому дому Приморского края', c1: '#1e1b4b', c2: '#4338ca', acc: '#a5b4fc' },
    { m: 2, d1: 22, d2: 23, title: 'С Днём защитника Отечества!', sub: 'Гордимся моряками Тихоокеанского флота и воинами Приморья', c1: '#0f291e', c2: '#15803d', acc: '#4ade80' },
    { m: 3, d1: 7, d2: 8, title: 'С Международным женским днём 8 Марта!', sub: 'Весеннего настроения и счастья прекрасным жительницам Приморья', c1: '#4a044e', c2: '#be185d', acc: '#f472b6' },
    { m: 5, d1: 1, d2: 2, title: 'С Праздником Весны и Труда — 1 Мая!', sub: 'Мирного неба, солнечных дней и успехов Приморскому краю', c1: '#064e3b', c2: '#059669', acc: '#34d399' },
    { m: 5, d1: 8, d2: 9, title: 'С Днём Великой Победы — 9 Мая!', sub: 'Вечная слава и низкий поклон поколению победителей!', c1: '#3b0707', c2: '#b91c1c', acc: '#fbbf24' },
    { m: 6, d1: 11, d2: 12, title: 'С Днём России!', sub: 'От Тихого океана до Балтики — мы гордимся нашей страной!', c1: '#0f172a', c2: '#1d4ed8', acc: '#f87171' },
    { m: 7, d1: 2, d2: 2, title: 'С Днём рождения, Владивосток!', sub: 'Любимому городу у Тихого океана — процветания и попутного ветра!', c1: '#082f49', c2: '#0284c7', acc: '#38bdf8' },
    { m: 9, d1: 1, d2: 1, title: 'С Днём знаний — 1 Сентября!', sub: 'Успехов школьникам, студентам ДВФУ и педагогам Приморья', c1: '#1e1b4b', c2: '#4f46e5', acc: '#fbbf24' },
    { m: 10, d1: 20, d2: 20, title: 'С Днём образования Приморского края!', sub: 'Гордимся нашим уникальным краем у Тихого океана!', c1: '#064e3b', c2: '#047857', acc: '#fbbf24' },
    { m: 11, d1: 3, d2: 4, title: 'С Днём народного единства!', sub: 'В единстве народов Приморья и России — наша сила!', c1: '#172554', c2: '#1e40af', acc: '#fb923c' }
  ];
  for (var i = 0; i < hols.length; i++) {
    if (hols[i].m === m && d >= hols[i].d1 && d <= hols[i].d2) return hols[i];
  }
  if (m === 12 || m <= 2) return { title: 'Зима в Приморском крае • 24/7', sub: 'Оперативный мониторинг дорог, погоды, ЖКХ и событий региона', c1: '#0b192c', c2: '#1e3a8a', acc: '#7dd3fc' };
  if (m >= 3 && m <= 5) return { title: 'Весна в Приморском крае • 24/7', sub: 'Главные новости Владивостока и всех городов Приморья', c1: '#064e3b', c2: '#0f766e', acc: '#5eead4' };
  if (m >= 6 && m <= 8) return { title: 'Лето у Тихого океана • Приморье 24/7', sub: 'Сводки края, обстановка на трассах к морю, погода и афиша', c1: '#0c4a6e', c2: '#0369a1', acc: '#fde047' };
  return { title: 'Золотая осень в Приморье • 24/7', sub: 'Главные события края, погода, трассы и народный контроль', c1: '#2d0c04', c2: '#9a3412', acc: '#fdba74' };
}

function drawSeason() {
  var b = document.getElementById('season-banner');
  if (!b) return;
  b.style.padding = '0'; b.style.border = 'none'; b.style.borderRadius = '14px';
  b.style.overflow = 'hidden'; b.style.height = '112px'; b.style.display = 'block'; b.innerHTML = '';
  var c = document.createElement('canvas');
  c.width = 1200; c.height = 112; c.style.width = '100%'; c.style.height = '100%';
  b.appendChild(c);
  var x = c.getContext('2d');
  if (!x) return;
  var vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
  var info = getHolidayOrSeason(vl);
  var g = x.createLinearGradient(0, 0, 1200, 112);
  g.addColorStop(0, info.c1); g.addColorStop(1, info.c2);
  x.fillStyle = g; x.fillRect(0, 0, 1200, 112);
  x.fillStyle = 'rgba(0,0,0,0.28)';
  x.beginPath(); x.moveTo(0, 112); x.lineTo(0, 78);
  x.quadraticCurveTo(300, 52, 620, 82); x.quadraticCurveTo(920, 100, 1200, 66);
  x.lineTo(1200, 112); x.fill();
  x.strokeStyle = info.acc; x.lineWidth = 3;
  x.beginPath(); x.moveTo(960, 106); x.lineTo(1015, 22); x.lineTo(1070, 106);
  x.moveTo(910, 82); x.quadraticCurveTo(1015, 58, 1120, 82); x.stroke();
  x.fillStyle = '#ffffff'; x.font = '800 26px sans-serif';
  x.fillText(info.title, 28, 48);
  x.fillStyle = info.acc; x.font = '600 16px sans-serif';
  x.fillText(info.sub, 28, 82);
}

function openReport() {
  var m = document.getElementById('report-modal');
  if (m) m.style.display = 'flex';
}

function sendReport(e) {
  e.preventDefault();
  var c = (document.getElementById('rep-city') || {}).value || 'Приморье';
  var t = ((document.getElementById('rep-text') || {}).value || '').trim();
  if (!t) return;
  window.open('https://t.me' + encodeURIComponent('https://primdozor.ru') + '&text=' + encodeURIComponent('Народный контроль (' + c + '):\n' + t), '_blank');
  var m = document.getElementById('report-modal');
  if (m) m.style.display = 'none';
}

function getReactStore() {
  try { return JSON.parse(localStorage.getItem('pd_reacts') || '{}'); } catch (e) { return {}; }
}

function renderAllReacts() {
  var st = getReactStore();
  document.querySelectorAll('.react-bar').forEach(function(bar) {
    var id = bar.getAttribute('data-react-id'), picked = st[id] || '';
    bar.querySelectorAll('.react-btn').forEach(function(btn) {
      var emo = btn.getAttribute('data-emo'), cnt = btn.querySelector('.r-cnt'), act = (picked === emo);
      btn.style.borderColor = act ? 'var(--accent)' : '';
      btn.style.fontWeight = act ? '700' : '';
      if (cnt) cnt.textContent = act ? '1' : '0';
    });
  });
}

window.toggleReact = function(id, emo) {
  var st = getReactStore();
  if (st[id] === emo) { delete st[id]; } else { st[id] = emo; }
  try { localStorage.setItem('pd_reacts', JSON.stringify(st)); } catch (e) {}
  renderAllReacts();
};

function initSite() {
  try { if (localStorage.getItem('ck')) { var ck = document.getElementById('ck'); if (ck) ck.style.display = 'none'; } } catch (e) {}
  drawSeason();
  renderCityPhones('Все города');
  renderGuide('');
  renderAllReacts();
  var fw = getByIdx(window.WEATHER, 0);
  if (fw) applyW(fw);
  fetchW(0);
  setInterval(function() {
    var vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
    var cl = document.getElementById('clock');
    if (cl) cl.textContent = 'Владивосток ' + String(vl.getHours()).padStart(2, '0') + ':' + String(vl.getMinutes()).padStart(2, '0');
  }, 5000);
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initSite); } else { initSite(); }
