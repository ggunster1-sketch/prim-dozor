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

var PRIM_APTEKI = [
  { city: 'Владивосток', title: 'Аптека 24/7 «Монастырёв» (Центр)', addr: 'Океанский пр-т, 18', phone: '+74232402402' },
  { city: 'Владивосток', title: 'Дежурная «Госаптека» 24/7 (Чуркин)', addr: 'ул. Калинина, 42', phone: '+74232273510' },
  { city: 'Владивосток', title: 'Аптека 24/7 «Овита» (Вторая Речка)', addr: 'ул. Русская, 46', phone: '+74232320808' },
  { city: 'Владивосток', title: 'Аптека 24/7 «Монастырёв» (Луговая)', addr: 'ул. Светланская, 167', phone: '+74232402402' },
  { city: 'Уссурийск', title: 'Дежурная аптека 24/7 «Монастырёв»', addr: 'ул. Некрасова, 64', phone: '+74234321010' },
  { city: 'Находка', title: 'Круглосуточная аптека 24/7 «Овита»', addr: 'Находкинский пр-т, 12', phone: '+74236655220' },
  { city: 'Артём', title: 'Дежурная аптека 24/7 «Монастырёв»', addr: 'ул. Кирова, 48', phone: '+74233742500' }
];

var PRIM_TRAVMA = [
  { city: 'Владивосток', title: 'Травмпункт №1 (Ленинский / Первомайский)', addr: 'ул. Уткинская, 7', phone: '+74232400386' },
  { city: 'Владивосток', title: 'Травмпункт №2 (Первореченский / Центр)', addr: 'ул. Калинина, 78', phone: '+74232276483' },
  { city: 'Владивосток', title: 'Травмпункт №3 (Советский / Вторая Речка)', addr: 'ул. Давыдова, 3', phone: '+74232319015' },
  { city: 'Владивосток', title: 'Детский краевой травмпункт 24/7', addr: 'пр-т Острякова, 27', phone: '+74232451907' },
  { city: 'Уссурийск', title: 'Травмпункт городской больницы 24/7', addr: 'ул. Пролетарская, 50', phone: '+74234322581' },
  { city: 'Находка', title: 'Травмпункт городской больницы 24/7', addr: 'ул. Пирогова, 9', phone: '+74236622014' },
  { city: 'Артём', title: 'Травмпункт городской больницы №1 24/7', addr: 'ул. Партизанская, 13', phone: '+74233742473' }
];

var PRIM_SERVICES = [
  { city: 'Все города', name: 'Единая служба спасения и вызова экстренных служб', num: '112' },
  { city: 'Все города', name: 'Дежурная часть УМВД по Приморскому краю', num: '+7 (423) 249-04-91' },
  { city: 'Все города', name: 'Дежурная часть ГИБДД Приморского края (ДТП)', num: '+7 (423) 231-09-08' },
  { city: 'Владивосток', name: 'ЕДДС Владивостока (ЖКХ, свет, вода, тепло 24/7)', num: '+7 (423) 222-23-33' },
  { city: 'Владивосток', name: 'Примводоканал (аварийная диспетчерская 24/7)', num: '+7 (423) 200-57-77' },
  { city: 'Владивосток', name: 'ВПЭС (аварийная электросетей Владивостока)', num: '+7 (423) 209-90-00' },
  { city: 'Владивосток', name: 'Справочная Морского вокзала (паромы и катера)', num: '+7 (423) 249-73-01' },
  { city: 'Уссурийск', name: 'ЕДДС Уссурийского городского округа 24/7', num: '+7 (4234) 32-11-78' },
  { city: 'Находка', name: 'ЕДДС Находкинского городского округа 24/7', num: '+7 (4236) 65-68-01' },
  { city: 'Артём', name: 'ЕДДС Артёмовского городского округа 24/7', num: '+7 (42337) 4-25-32' },
  { city: 'Большой Камень', name: 'ЕДДС ГО Большой Камень 24/7', num: '+7 (42335) 5-11-12' },
  { city: 'Арсеньев', name: 'ЕДДС Арсеньевского городского округа 24/7', num: '+7 (42361) 4-22-44' },
  { city: 'Спасск-Дальний', name: 'ЕДДС ГО Спасск-Дальний 24/7', num: '+7 (42352) 2-32-30' },
  { city: 'Партизанск', name: 'ЕДДС Партизанского городского округа 24/7', num: '+7 (42363) 6-24-34' },
  { city: 'Дальнегорск', name: 'ЕДДС Дальнегорского городского округа 24/7', num: '+7 (42373) 3-21-51' }
];
function toggleFontSize() {
  var isBig = document.documentElement.classList.toggle('large-font');
  document.documentElement.style.fontSize = isBig ? '118%' : '';
  try { localStorage.setItem('pd_font', isBig ? '1' : '0'); } catch (e) {}
}

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
    var desc = function(k) { return k === 0 ? 'Ясно' : k <= 3 ? 'Переменная облачность' : (k >= 71 && k <= 77) ? 'Снег' : k >= 51 ? 'Осадки' : 'Облачно'; };
    var h = (r.hourly && r.hourly.temperature_2m) || [], d = (r.daily && r.daily.temperature_2m_max) || [], ct = r.current.temperature_2m;
    applyW({
      name: c.name,
      now: fmtT(ct) + ' • ' + desc(r.current.weather_code),
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
    var okC = cCat === 'all' || (cCat === 'urgent' ? Boolean(n.urgent) : (n.cat || '').indexOf(cCat) !== -1);
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
  var qr = String(q || '').toLowerCase().trim();
  var outList = (window.DIRECTORIES || {}).outages || [];
  document.querySelectorAll('.jkh-row').forEach(function(r, idx) {
    var item = getByIdx(outList, idx);
    var full = item ? ((item.city || '') + ' ' + (item.type || '') + ' ' + (item.fullText || item.status || '')).toLowerCase() : (r.textContent || '').toLowerCase();
    r.style.display = (!qr || full.indexOf(qr) !== -1) ? 'flex' : 'none';
  });
}
function mapUrl(city, addr) {
  return 'https://yandex.ru' + encodeURIComponent((city || 'Приморский край') + ', ' + (addr || ''));
}

function renderListItems(boxId, arr, q) {
  var lb = document.getElementById(boxId);
  if (!lb) return;
  var qr = String(q || '').toLowerCase().trim();
  lb.innerHTML = arr.filter(function(it) {
    return !qr || (it.city + ' ' + it.title + ' ' + it.addr).toLowerCase().indexOf(qr) !== -1;
  }).map(function(g) {
    return '<div class="w-row" style="flex-direction:column;align-items:stretch;gap:6px">' +
      '<div><div style="font-size:11px;color:var(--accent);font-weight:700">' + g.city + ' • 24/7</div>' +
      '<div style="font-weight:700;font-size:13.5px">' + g.title + '</div>' +
      '<div style="font-size:12px;color:var(--muted)">Адрес: ' + g.addr + '</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<a href="tel:' + g.phone + '" class="tel-pill">Позвонить</a>' +
      '<a href="' + mapUrl(g.city, g.addr) + '" target="_blank" rel="noopener" class="soc-pill" style="font-size:12px;padding:4px 10px">На карте</a></div></div>';
  }).join('');
}

function renderAp(q) { renderListItems('apteki-items', PRIM_APTEKI, q); }
function renderTr(q) { renderListItems('travma-items', PRIM_TRAVMA, q); }

function openJkh(idx) {
  var o = getByIdx((window.DIRECTORIES || {}).outages, idx);
  if (!o) return;
  var mb = document.getElementById('m-body'), md = document.getElementById('modal');
  if (!mb || !md) return;
  mb.innerHTML =
    '<div class="news-meta"><span class="badge-cat">ЖКХ 24/7 • ' + (o.type || 'Мониторинг') + '</span> <span>' + (o.city || 'Приморье') + '</span></div>' +
    '<h1 style="font-size:20px;margin:10px 0 14px">Информация об отключении и адресах</h1>' +
    '<div style="white-space:pre-line;line-height:1.75;font-size:15.5px;margin-bottom:16px">' + (o.fullText || o.status || '') + '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border)">' +
    '<a href="tel:' + cleanDigits(o.phone) + '" class="btn-cta">Позвонить в диспетчерскую: ' + (o.phone || '112') + '</a>' +
    '<a href="' + mapUrl(o.city, '') + '" target="_blank" rel="noopener" class="soc-pill">Открыть карту города</a></div>';
  md.style.display = 'flex';
}

function shareCard(id, btn) {
  var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
  if (!n) return;
  if (btn) btn.textContent = 'Формируем карточку...';
  var c = document.createElement('canvas');
  c.width = 1080; c.height = 620;
  var x = c.getContext('2d');
  if (!x) return;
  x.fillStyle = '#0f172a'; x.fillRect(0, 0, 1080, 620);
  x.fillStyle = '#b91c1c'; x.fillRect(0, 0, 1080, 14); x.fillRect(56, 48, 280, 48);
  x.fillStyle = '#fff'; x.font = '900 23px sans-serif'; x.fillText('ИА «ПРИМ_ДОЗОР» • 24/7', 72, 80);
  x.font = '800 40px sans-serif';
  var w = String(n.title || '').split(' '), l = '', y = 170;
  for (var i = 0; i < w.length; i++) {
    var t = l + w[i] + ' ';
    if (x.measureText(t).width > 960 && i > 0) { x.fillText(l, 56, y); l = w[i] + ' '; y += 52; }
    else l = t;
  }
  x.fillText(l, 56, y);
  x.fillStyle = '#94a3b8'; x.font = '700 22px sans-serif'; x.fillText('PRIMDOZOR.RU  •  ' + (n.city || 'Приморский край'), 56, 574);
  var a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = 'primdozor-' + n.id + '.png';
  a.click();
  if (btn) btn.textContent = 'Карточка сохранена';
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
    '<button type="button" class="btn-cta" onclick="shareCard(\'' + n.id + '\',this)">Карточка для мессенджера</button> ' +
    '<a href="https://t.me" target="_blank" rel="noopener" class="soc-pill">Telegram редакции</a></div>';
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
    '<div class="tldr"><div>Дата и время: ' + (a.date || '') + '</div><div>Адрес: ' + (a.place || a.city || '') + '</div><div>Стоимость: Вход свободный</div></div>' +
    '<div style="line-height:1.75;margin-bottom:16px">' + (a.desc || '') + '</div>' +
    '<a href="' + mapUrl(a.city, a.place) + '" target="_blank" rel="noopener" class="btn-cta">Показать на Яндекс.Картах</a>';
  md.style.display = 'flex';
}

function switchDirTab(id, b) {
  document.querySelectorAll('.mini-tab').forEach(function(x) { x.classList.remove('active'); });
  if (b) b.classList.add('active');
  ['dir-jkh', 'dir-phones', 'dir-apteki', 'dir-travma', 'dir-afisha'].forEach(function(k) {
    var e = document.getElementById(k);
    if (e) e.style.display = (k === id) ? 'block' : 'none';
  });
}

function renderCityPhones(city) {
  var sel = city || 'Все города';
  var list = PRIM_SERVICES.filter(function(x) {
    return sel === 'Все города' || x.city === 'Все города' || x.city === sel;
  });
  var b = document.getElementById('phones-list');
  if (b) {
    b.innerHTML = list.map(function(x) {
      return '<div class="w-row"><div style="flex:1;padding-right:8px"><div style="font-size:11px;color:var(--accent);font-weight:700">' + x.city + '</div><div style="font-size:13px">' + x.name + '</div></div><a href="tel:' + cleanDigits(x.num) + '" class="tel-pill">' + x.num + '</a></div>';
    }).join('');
  }
}

function getHolidayOrSeason(vl) {
  var m = vl.getMonth() + 1, d = vl.getDate();
  var hols = [
    { m: 1, d1: 1, d2: 6, badge: 'ГОСУДАРСТВЕННЫЙ ПРАЗДНИК', title: 'С Новым годом, Приморский край!', sub: 'Редакция ИА «Прим_Дозор» желает мира, стабильности и добрых событий', c1: '#091526', c2: '#1e3a8a', acc: '#93c5fd' },
    { m: 1, d1: 7, d2: 8, badge: 'ПРАЗДНИК РОССИИ', title: 'Со светлым Рождеством Христовым!', sub: 'Тепла, благополучия и согласия каждому дому Приморья', c1: '#161338', c2: '#3730a3', acc: '#c7d2fe' },
    { m: 2, d1: 22, d2: 23, badge: 'ГОСУДАРСТВЕННЫЙ ПРАЗДНИК', title: 'С Днём защитника Отечества!', sub: 'Честь и слава морякам Тихоокеанского флота и защитникам Родины', c1: '#0a1f16', c2: '#14532d', acc: '#86efac' },
    { m: 3, d1: 7, d2: 8, badge: 'ГОСУДАРСТВЕННЫЙ ПРАЗДНИК', title: 'С Международным женским днём 8 Марта!', sub: 'Искренние поздравления прекрасным жительницам Приморского края', c1: '#3b0726', c2: '#831843', acc: '#f9a8d4' },
    { m: 5, d1: 1, d2: 2, badge: 'ГОСУДАРСТВЕННЫЙ ПРАЗДНИК', title: 'С Праздником Весны и Труда — 1 Мая!', sub: 'Созидания, развития и процветания Приморскому краю', c1: '#042f2e', c2: '#0f766e', acc: '#5eead4' },
    { m: 5, d1: 8, d2: 9, badge: 'ДЕНЬ ВЕЛИКОЙ ПОБЕДЫ', title: 'С Днём Победы — 9 Мая!', sub: 'Вечная память и благодарность героям, отстоявшим свободу Отечества', c1: '#2b0606', c2: '#991b1b', acc: '#fcd34d' },
    { m: 6, d1: 11, d2: 12, badge: 'ГОСУДАРСТВЕННЫЙ ПРАЗДНИК', title: 'С Днём России!', sub: 'От берегов Тихого океана до Балтики — мы гордимся нашей страной', c1: '#0a1128', c2: '#1d4ed8', acc: '#fca5a5' },
    { m: 7, d1: 2, d2: 2, badge: 'ПРАЗДНИК ПРИМОРЬЯ', title: 'С Днём рождения, Владивосток!', sub: 'Форпосту России на Тихом океане — развития и попутного ветра', c1: '#062038', c2: '#0369a1', acc: '#7dd3fc' },
    { m: 9, d1: 1, d2: 1, badge: 'ДЕНЬ ЗНАНИЙ', title: 'С 1 Сентября — Днём знаний!', sub: 'Успехов школьникам, студентам и педагогам Приморского края', c1: '#17153b', c2: '#3730a3', acc: '#fde047' },
    { m: 10, d1: 20, d2: 20, badge: 'ПРАЗДНИК КРАЯ', title: 'С Днём образования Приморского края!', sub: 'Гордимся историей, природой и людьми нашего уникального региона', c1: '#052e16', c2: '#15803d', acc: '#fde047' },
    { m: 11, d1: 3, d2: 4, badge: 'ГОСУДАРСТВЕННЫЙ ПРАЗДНИК', title: 'С Днём народного единства!', sub: 'В сплочённости народов России и Приморья — наша главная опора', c1: '#0f172a', c2: '#1e40af', acc: '#fdba74' }
  ];
  for (var i = 0; i < hols.length; i++) {
    if (hols[i].m === m && d >= hols[i].d1 && d <= hols[i].d2) return hols[i];
  }
  if (m === 12 || m <= 2) return { badge: 'ЗИМА В ПРИМОРЬЕ • 24/7', title: 'Информационное агентство «Прим_Дозор»', sub: 'Оперативная картина дня: дороги, погода, ЖКХ и главные события края', c1: '#081221', c2: '#1e3a8a', acc: '#7dd3fc' };
  if (m >= 3 && m <= 5) return { badge: 'ВЕСНА В ПРИМОРЬЕ • 24/7', title: 'Информационное агентство «Прим_Дозор»', sub: 'Главные новости Владивостока и всех муниципалитетов Приморского края', c1: '#042f2e', c2: '#0d9488', acc: '#5eead4' };
  if (m >= 6 && m <= 8) return { badge: 'ЛЕТО У ТИХОГО ОКЕАНА • 24/7', title: 'Информационное агентство «Прим_Дозор»', sub: 'Сводки края, обстановка на трассах, прогноз погоды и события региона', c1: '#082f49', c2: '#0284c7', acc: '#fde047' };
  return { badge: 'ОСЕНЬ В ПРИМОРЬЕ • 24/7', title: 'Информационное агентство «Прим_Дозор»', sub: 'Оперативный мониторинг событий, погоды, трасс и ЖКХ Приморского края', c1: '#1f0c06', c2: '#7c2d12', acc: '#fdba74' };
}

function drawSeason() {
  var b = document.getElementById('season-banner');
  if (!b) return;
  b.style.padding = '0'; b.style.border = 'none'; b.style.borderRadius = '12px';
  b.style.overflow = 'hidden'; b.style.height = '126px'; b.style.display = 'block'; b.innerHTML = '';
  var c = document.createElement('canvas');
  c.width = 1200; c.height = 126; c.style.width = '100%'; c.style.height = '100%';
  b.appendChild(c);
  var x = c.getContext('2d');
  if (!x) return;
  var vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
  var info = getHolidayOrSeason(vl);
  var g = x.createLinearGradient(0, 0, 1200, 126);
  g.addColorStop(0, info.c1); g.addColorStop(1, info.c2);
  x.fillStyle = g; x.fillRect(0, 0, 1200, 126);
  x.fillStyle = 'rgba(0,0,0,0.28)';
  x.beginPath(); x.moveTo(0, 126); x.lineTo(0, 88);
  x.quadraticCurveTo(320, 60, 650, 92); x.quadraticCurveTo(940, 110, 1200, 74);
  x.lineTo(1200, 126); x.fill();
  x.strokeStyle = info.acc; x.lineWidth = 2.5;
  x.beginPath();
  x.moveTo(940, 120); x.lineTo(990, 24); x.lineTo(1040, 120);
  x.moveTo(1055, 120); x.lineTo(1095, 36); x.lineTo(1135, 120);
  x.moveTo(890, 90); x.quadraticCurveTo(1015, 64, 1165, 90);
  x.stroke();
  x.fillStyle = info.acc; x.font = '700 12px sans-serif';
  x.fillText(info.badge, 28, 34);
  x.fillStyle = '#ffffff'; x.font = '800 25px sans-serif';
  x.fillText(info.title, 28, 68);
  x.fillStyle = 'rgba(255,255,255,0.88)'; x.font = '500 15px sans-serif';
  x.fillText(info.sub, 28, 98);
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
  try {
    if (localStorage.getItem('ck')) { var ck = document.getElementById('ck'); if (ck) ck.style.display = 'none'; }
    if (localStorage.getItem('pd_font') === '1') { document.documentElement.classList.add('large-font'); document.documentElement.style.fontSize = '118%'; }
  } catch (e) {}
  drawSeason();
  renderCityPhones('Все города');
  renderAp('');
  renderTr('');
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
