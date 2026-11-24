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
  { city: 'Владивосток', title: 'Аптека 24/7 «Монастырёв» (Центр)', addr: 'Океанский пр-т, 18', phone: '+74232402402', lat: 43.1178, lon: 131.8842 },
  { city: 'Владивосток', title: 'Дежурная «Госаптека» 24/7 (Чуркин)', addr: 'ул. Калинина, 42', phone: '+74232273510', lat: 43.0991, lon: 131.9114 },
  { city: 'Владивосток', title: 'Аптека 24/7 «Овита» (Вторая Речка)', addr: 'ул. Русская, 46', phone: '+74232320808', lat: 43.1684, lon: 131.9152 },
  { city: 'Владивосток', title: 'Аптека 24/7 «Монастырёв» (Луговая)', addr: 'ул. Светланская, 167', phone: '+74232402402', lat: 43.1125, lon: 131.9301 },
  { city: 'Уссурийск', title: 'Дежурная аптека 24/7 «Монастырёв»', addr: 'ул. Некрасова, 64', phone: '+74234321010', lat: 43.7985, lon: 131.9542 },
  { city: 'Находка', title: 'Круглосуточная аптека 24/7 «Овита»', addr: 'Находкинский пр-т, 12', phone: '+74236655220', lat: 42.8261, lon: 132.8935 },
  { city: 'Артём', title: 'Дежурная аптека 24/7 «Монастырёв»', addr: 'ул. Кирова, 48', phone: '+74233742500', lat: 43.3568, lon: 132.1864 }
];

var PRIM_TRAVMA = [
  { city: 'Владивосток', title: 'Травмпункт №1 (Ленинский / Первомайский)', addr: 'ул. Уткинская, 7', phone: '+74232400386', lat: 43.1195, lon: 131.8904 },
  { city: 'Владивосток', title: 'Травмпункт №2 (Первореченский / Центр)', addr: 'ул. Калинина, 78', phone: '+74232276483', lat: 43.0964, lon: 131.9178 },
  { city: 'Владивосток', title: 'Травмпункт №3 (Советский / Вторая Речка)', addr: 'ул. Давыдова, 3', phone: '+74232319015', lat: 43.1738, lon: 131.9225 },
  { city: 'Владивосток', title: 'Детский краевой травмпункт 24/7', addr: 'пр-т Острякова, 27', phone: '+74232451907', lat: 43.1322, lon: 131.8955 },
  { city: 'Уссурийск', title: 'Травмпункт городской больницы 24/7', addr: 'ул. Пролетарская, 50', phone: '+74234322581', lat: 43.8012, lon: 131.9488 },
  { city: 'Находка', title: 'Травмпункт городской больницы 24/7', addr: 'ул. Пирогова, 9', phone: '+74236622014', lat: 42.8154, lon: 132.8792 },
  { city: 'Артём', title: 'Травмпункт городской больницы №1 24/7', addr: 'ул. Партизанская, 13', phone: '+74233742473', lat: 43.3519, lon: 132.1795 }
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

function linkifyPhones(txt) {
  return String(txt || '').replace(/(?:(?:\+7|8)[\s\-]?\(?\d{3,5}\)?[\s\-]?\d{1,3}[\s\-]?\d{2}[\s\-]?\d{2}|\b\d{3}[\s\-]\d{2}[\s\-]\d{2}\b|\b112\b)/g, function(m) {
    var d = cleanDigits(m);
    if (d.length < 3) return m;
    return '<a href="tel:' + d + '" style="color:var(--accent);font-weight:700;text-decoration:underline">' + m + '</a>';
  });
}

function fmtT(v) {
  var n = Math.round(Number(v) || 0);
  return n === 0 ? '0°C' : (n > 0 ? '+' : '') + n + '°C';
}

function fetchLiveRates() {
  var el = document.getElementById('cbr-rates');
  if (!el) return;
  fetch('https://' + ['www', 'cbr-xml-daily', 'ru'].join('.') + '/daily_json.js')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d || !d.Valute) return;
      var v = d.Valute;
      var usd = (v.USD.Value / v.USD.Nominal).toFixed(4).replace('.', ',');
      var eur = (v.EUR.Value / v.EUR.Nominal).toFixed(4).replace('.', ',');
      var cny = (v.CNY.Value / v.CNY.Nominal).toFixed(4).replace('.', ',');
      el.textContent = 'ЦБ РФ: $' + usd + ' | €' + eur + ' | ¥' + cny;
    })
    .catch(function() {});
}

function applyW(w) {
  if (!w) return;
  var s = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
  s('w-top', w.now); s('w-name', w.name); s('w-now', w.now);
  if (w.feel) s('w-feel', w.feel);
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
  var u = 'https://' + ['api', 'open-meteo', 'com'].join('.') + '/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon + '&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok';
  fetch(u).then(function(r) { return r.json(); }).then(function(r) {
    if (!r || !r.current) return;
    var desc = function(k) { return k === 0 ? 'Ясно' : k <= 3 ? 'Переменная облачность' : (k >= 71 && k <= 77) ? 'Снег' : k >= 51 ? 'Осадки' : 'Облачно'; };
    var h = (r.hourly && r.hourly.temperature_2m) || [], d = (r.daily && r.daily.temperature_2m_max) || [], ct = r.current.temperature_2m;
    var windMs = Math.round((Number(r.current.wind_speed_10m) || 0) / 3.6);
    var feelTxt = 'Ощущается как ' + fmtT(r.current.apparent_temperature) + ' • Ветер до ' + windMs + ' м/с';
    applyW({
      name: c.name,
      now: fmtT(ct) + ' • ' + desc(r.current.weather_code),
      feel: feelTxt,
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
function mapUrl(city, addr, lat, lon) {
  if (lat && lon) {
    return 'https://yandex.ru' + lon + '%2C' + lat + '&pt=' + lon + '%2C' + lat + '%2Cpm2rdm&z=15';
  }
  return 'https://yandex.ru' + encodeURIComponent((city || 'Приморский край') + (addr ? ', ' + addr : ''));
}

function focusDirTab(tabId) {
  var btn = document.getElementById('tab-' + tabId);
  switchDirTab(tabId, btn);
  var box = document.getElementById('dir-box');
  if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openJkhMap() {
  var mb = document.getElementById('m-body'), md = document.getElementById('modal');
  if (!mb || !md) return;
  var outList = (window.DIRECTORIES || {}).outages || [];
  var summaryHtml = outList.length
    ? outList.map(function(o, i) {
        return '<div class="w-row" style="cursor:pointer" onclick="openJkh(' + i + ')">' +
          '<div style="flex:1;padding-right:8px"><div style="font-size:11px;color:var(--accent);font-weight:700">' + o.city + ' • ' + (o.type || 'ЖКХ') + '</div>' +
          '<div style="font-size:13px">' + o.status + '</div></div>' +
          '<a href="' + mapUrl(o.city, '') + '" target="_blank" rel="noopener" class="soc-pill" style="font-size:12px" onclick="event.stopPropagation()">На карте</a></div>';
      }).join('')
    : '<div class="w-row" style="color:var(--muted);font-size:13.5px">На данный момент плановых и аварийных отключений по адресам не зафиксировано. Выберите муниципалитет ниже для просмотра карты и связи с ЕДДС.</div>';

  var citiesMapHtml = PRIM_CITIES.map(function(c) {
    return '<a href="' + mapUrl(c.name, '', c.lat, c.lon) + '" target="_blank" rel="noopener" class="soc-pill" style="font-size:12.5px">' + c.name + ' (карта)</a>';
  }).join('');

  mb.innerHTML =
    '<div class="news-meta"><span class="badge-cat">ЖКХ Приморского края • 24/7</span> <span>Интерактивная карта</span></div>' +
    '<h1 style="font-size:21px;margin:8px 0 12px">Карта отключений и диспетчерских служб Приморья</h1>' +
    '<div style="margin-bottom:14px"><div style="font-size:12.5px;font-weight:700;margin-bottom:8px">Открыть карту муниципалитета на Яндекс.Картах:</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' + citiesMapHtml + '</div></div>' +
    '<div style="font-size:13px;font-weight:700;margin-bottom:6px">Оперативная сводка по адресам:</div>' + summaryHtml;
  md.style.display = 'flex';
}

function openServiceModal(type) {
  var mb = document.getElementById('m-body'), md = document.getElementById('modal');
  if (!mb || !md) return;
  if (type === 'meters') {
    mb.innerHTML =
      '<div class="news-meta"><span class="badge-cat">Городские сервисы ЖКХ</span> <span>Официальные порталы</span></div>' +
      '<h1 style="font-size:21px;margin:8px 0 14px">Передача показаний счётчиков онлайн</h1>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>ПАО «ДЭК» (Электроэнергия и тепло)</strong><div style="font-size:12px;color:var(--muted)">Официальный сайт и личный кабинет для жителей Приморья</div></div><a href="https://dvec.ru" target="_blank" rel="noopener" class="tel-pill">Открыть ДЭК</a></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>КГУП «Примводоканал» (Холодная вода)</strong><div style="font-size:12px;color:var(--muted)">Передача показаний приборов учёта водоснабжения</div></div><a href="https://primvod.ru" target="_blank" rel="noopener" class="tel-pill">Открыть сайт</a></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>АО «ДГК» (Горячая вода и отопление)</strong><div style="font-size:12px;color:var(--muted)">Личный кабинет Дальневосточной генерирующей компании</div></div><a href="https://dgk.ru" target="_blank" rel="noopener" class="tel-pill">Открыть ДГК</a></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>ГИС ЖКХ (Государственный портал)</strong><div style="font-size:12px;color:var(--muted)">Единая система передачи показаний и оплаты квитанций РФ</div></div><a href="https://gosuslugi.ru" target="_blank" rel="noopener" class="tel-pill">Госуслуги ЖКХ</a></div>';
  } else if (type === 'transport') {
    mb.innerHTML =
      '<div class="news-meta"><span class="badge-cat">Транспорт Приморья 24/7</span> <span>Официальные расписания</span></div>' +
      '<h1 style="font-size:21px;margin:8px 0 14px">Расписание транспорта Приморского края</h1>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>Пригородные электропоезда и Аэроэкспресс</strong><div style="font-size:12px;color:var(--muted)">АО «Экспресс Приморья»: Владивосток, Аэропорт, Уссурийск, Находка, Спасск</div></div><a href="https://expressprim.ru" target="_blank" rel="noopener" class="tel-pill">Расписание</a></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>Междугородние автобусы Приморского края</strong><div style="font-size:12px;color:var(--muted)">Официальный портал автовокзалов и краевых маршрутов</div></div><a href="https://primavtovokzal.ru" target="_blank" rel="noopener" class="tel-pill">Рейсы и билеты</a></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>Онлайн-табло Аэропорта Владивосток (VVO)</strong><div style="font-size:12px;color:var(--muted)">Вылеты, прилёты и статус рейсов в реальном времени</div></div><a href="https://vvo.aero" target="_blank" rel="noopener" class="tel-pill">Онлайн-табло</a></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><strong>Морские перевозки (о. Русский, о. Попова, Славянка)</strong><div style="font-size:12px;color:var(--muted)">Справочная Морского вокзала Владивостока: +7 (423) 249-73-01</div></div><a href="tel:+74232497301" class="tel-pill">Позвонить</a></div>';
  }
  md.style.display = 'flex';
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
      '<a href="' + mapUrl(g.city, g.addr, g.lat, g.lon) + '" target="_blank" rel="noopener" class="soc-pill" style="font-size:12px;padding:4px 10px">На карте</a></div></div>';
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
    '<div style="white-space:pre-line;line-height:1.75;font-size:15.5px;margin-bottom:16px">' + linkifyPhones(o.fullText || o.status || '') + '</div>' +
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
    '<div class="tldr"><strong>Главное:</strong><br>' + linkifyPhones(n.tldr || '').replace(/\n/g, '<br>') + '</div>' +
    '<div style="white-space:pre-line;line-height:1.75;margin-bottom:16px">' + linkifyPhones(n.text) + '</div>' +
    makeReactHtml(n.id) +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:12px;margin-top:12px;border-top:1px solid var(--border)">' +
    '<button type="button" class="btn-cta" onclick="shareCard(\'' + n.id + '\',this)">Карточка для мессенджера</button> ' +
    '<a href="https://t.me" target="_blank" rel="noopener" class="soc-pill">Telegram @prim_dozor</a></div>';
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
    '<div style="line-height:1.75;margin-bottom:16px">' + linkifyPhones(a.desc || '') + '</div>' +
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

function renderPoll() {
  var box = document.getElementById('poll-widget');
  if (!box) return;
  var dirPoll = (window.DIRECTORIES || {}).poll;
  var qText = (dirPoll && dirPoll.question) ? dirPoll.question : 'Какая тема в Приморском крае сейчас требует первоочередного внимания властей и служб?';
  var opts = (dirPoll && Array.isArray(dirPoll.options) && dirPoll.options.length >= 3)
    ? dirPoll.options
    : ['Состояние дорог, мостов и работа общественного транспорта', 'Контроль качества ЖКХ, отопления и водоснабжения', 'Поддержка участников СВО, ветеранов и их семей', 'Развитие медицины и доступность поликлиник в крае'];
  var pollKey = 'pd_poll_' + qText.slice(0, 24);
  var voted = -1;
  try { var rawV = localStorage.getItem(pollKey); if (rawV !== null) voted = Number(rawV); } catch (e) {}

  var html = '<div style="font-size:11.5px;font-weight:800;text-transform:uppercase;color:var(--accent);margin-bottom:6px">Опрос читателей Приморья</div>' +
    '<div style="font-weight:700;font-size:14px;line-height:1.35;margin-bottom:10px">' + qText + '</div>';

  if (voted >= 0 && voted < opts.length) {
    html += opts.map(function(label, i) {
      var isMe = (i === voted);
      var pct = isMe ? 100 : 0;
      return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px"><span>' + label + (isMe ? ' — <strong>Ваш голос учтён</strong>' : '') + '</span><strong>' + pct + '%</strong></div>' +
        '<div style="height:6px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:var(--accent)"></div></div></div>';
    }).join('') + '<div style="font-size:11.5px;color:var(--muted);margin-top:6px">Голос принят редакцией ИА «Прим_Дозор». Всего голосов: 1.</div>';
  } else {
    html += opts.map(function(label, i) {
      return '<button type="button" class="soc-pill" style="display:block;width:100%;text-align:left;margin-bottom:6px;padding:8px 12px;font-size:13px" onclick="votePoll(' + i + ')">' + label + '</button>';
    }).join('');
  }
  box.innerHTML = html;
}

window.votePoll = function(idx) {
  var dirPoll = (window.DIRECTORIES || {}).poll;
  var qText = (dirPoll && dirPoll.question) ? dirPoll.question : 'Какая тема в Приморском крае сейчас требует первоочередного внимания властей и служб?';
  try { localStorage.setItem('pd_poll_' + qText.slice(0, 24), String(idx)); } catch (e) {}
  renderPoll();
};

function getBannerStyle(vl) {
  var m = vl.getMonth() + 1, d = vl.getDate();
  var hols = [
    { m: 1, d1: 1, d2: 6, title: 'С Новым годом, Приморский край!', c1: '#071324', c2: '#1d4ed8', acc: '#93c5fd' },
    { m: 1, d1: 7, d2: 8, title: 'Со светлым Рождеством Христовым!', c1: '#151236', c2: '#4338ca', acc: '#c7d2fe' },
    { m: 2, d1: 22, d2: 23, title: 'С Днём защитника Отечества!', c1: '#091f16', c2: '#15803d', acc: '#86efac' },
    { m: 3, d1: 7, d2: 8, title: 'С Международным женским днём 8 Марта!', c1: '#3b0726', c2: '#9d174d', acc: '#f9a8d4' },
    { m: 5, d1: 1, d2: 2, title: 'С Праздником Весны и Труда — 1 Мая!', c1: '#042f2e', c2: '#0f766e', acc: '#5eead4' },
    { m: 5, d1: 8, d2: 9, title: 'С Днём Великой Победы — 9 Мая!', c1: '#2b0606', c2: '#991b1b', acc: '#fcd34d' },
    { m: 6, d1: 11, d2: 12, title: 'С Днём России!', c1: '#091126', c2: '#1d4ed8', acc: '#fca5a5' },
    { m: 7, d1: 2, d2: 2, title: 'С Днём рождения, Владивосток!', c1: '#062038', c2: '#0284c7', acc: '#7dd3fc' },
    { m: 9, d1: 1, d2: 1, title: 'С Днём знаний — 1 Сентября!', c1: '#17153b', c2: '#4338ca', acc: '#fde047' },
    { m: 10, d1: 20, d2: 20, title: 'С Днём образования Приморского края!', c1: '#052e16', c2: '#15803d', acc: '#fde047' },
    { m: 11, d1: 3, d2: 4, title: 'С Днём народного единства!', c1: '#0f172a', c2: '#1e40af', acc: '#fdba74' }
  ];
  for (var i = 0; i < hols.length; i++) {
    if (hols[i].m === m && d >= hols[i].d1 && d <= hols[i].d2) return hols[i];
  }
  if (m === 12 || m <= 2) return { title: 'ИА «ПРИМ_ДОЗОР» • ПРИМОРСКИЙ КРАЙ 24/7', c1: '#060f1e', c2: '#1e3a8a', acc: '#7dd3fc' };
  if (m >= 3 && m <= 5) return { title: 'ИА «ПРИМ_ДОЗОР» • ПРИМОРСКИЙ КРАЙ 24/7', c1: '#042f2e', c2: '#0f766e', acc: '#5eead4' };
  if (m >= 6 && m <= 8) return { title: 'ИА «ПРИМ_ДОЗОР» • ПРИМОРСКИЙ КРАЙ 24/7', c1: '#06283d', c2: '#0369a1', acc: '#fde047' };
  return { title: 'ИА «ПРИМ_ДОЗОР» • ПРИМОРСКИЙ КРАЙ 24/7', c1: '#140c1c', c2: '#312e81', acc: '#fbbf24' };
}

function drawSeason() {
  var b = document.getElementById('season-banner');
  if (!b) return;
  b.style.padding = '0'; b.style.border = 'none'; b.style.borderRadius = '12px';
  b.style.overflow = 'hidden'; b.style.height = '104px'; b.style.display = 'block'; b.innerHTML = '';
  var c = document.createElement('canvas');
  c.width = 1200; c.height = 104; c.style.width = '100%'; c.style.height = '100%';
  b.appendChild(c);
  var x = c.getContext('2d');
  if (!x) return;
  var vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
  var info = getBannerStyle(vl);
  var g = x.createLinearGradient(0, 0, 1200, 104);
  g.addColorStop(0, info.c1); g.addColorStop(1, info.c2);
  x.fillStyle = g; x.fillRect(0, 0, 1200, 104);

  var glow = x.createRadialGradient(1020, 48, 10, 1020, 48, 260);
  glow.addColorStop(0, info.acc + '44'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = glow; x.fillRect(720, 0, 480, 104);

  x.fillStyle = 'rgba(0,0,0,0.34)';
  x.beginPath(); x.moveTo(0, 104); x.lineTo(0, 74);
  x.quadraticCurveTo(360, 48, 700, 76); x.quadraticCurveTo(960, 90, 1200, 62);
  x.lineTo(1200, 104); x.fill();

  x.strokeStyle = info.acc; x.lineWidth = 2.6;
  x.beginPath();
  x.moveTo(930, 98); x.lineTo(972, 16); x.lineTo(990, 16); x.lineTo(1032, 98);
  x.moveTo(1055, 98); x.lineTo(1092, 24); x.lineTo(1108, 24); x.lineTo(1145, 98);
  x.moveTo(860, 72); x.quadraticCurveTo(1035, 52, 1185, 72);
  x.stroke();

  x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 1.1;
  x.beginPath();
  x.moveTo(981, 20); x.lineTo(910, 72); x.moveTo(981, 20); x.lineTo(945, 72);
  x.moveTo(981, 20); x.lineTo(1020, 72); x.moveTo(1100, 28); x.lineTo(1050, 72);
  x.moveTo(1100, 28); x.lineTo(1140, 72); x.moveTo(1100, 28); x.lineTo(1170, 72);
  x.stroke();

  x.fillStyle = '#ffffff'; x.font = '800 22px sans-serif';
  x.fillText(info.title, 30, 60);
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
  var msg = 'Обращение в редакцию ИА «Прим_Дозор» (' + c + '):\n' + t;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(msg).catch(function() {});
  }
  alert('Текст обращения скопирован. Сейчас откроется канал редакции @prim_dozor в Telegram — вставьте сообщение для дежурного редактора.');
  window.open('https://t.me', '_blank');
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
renderPoll();
renderAllReacts();
fetchLiveRates();
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
