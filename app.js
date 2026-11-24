var cCat = 'all', cCity = 'all', cQuery = '', cJkhType = '';

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
  { city: 'Все города', name: 'Дежурная часть ГИБДД Приморского края (ДТП)', num: '+7 (423) 249-09-21' },
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
    var vidBadge = n.video ? ' <span class="badge-cat" style="background:#0369a1">ВИДЕО</span>' : '';
    var meta = '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span> <span>' + ll + '</span> <span>• ' + n.date + '</span> <span class="badge-age">' + (n.age || '18+') + '</span>' + vidBadge + '</div>';
    var rb = makeReactHtml(n.id);
    return i === 0
      ? '<article class="hero-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="hero-img" src="./' + n.cover + '" alt=""><div class="hero-body">' + meta + '<h2 class="hero-title">' + n.title + '</h2><p class="hero-lead">' + lead + '...</p>' + rb + '</div></article>'
      : '<article class="news-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="news-thumb" loading="lazy" src="./' + n.cover + '" alt=""><div class="news-body">' + meta + '<h3 class="news-title">' + n.title + '</h3>' + rb + '</div></article>';
  }).join('');
}

function filterCat(c, b) {
  cCat = c;
  document.querySelectorAll('.tab').forEach(function(x) {
    x.classList.remove('active');
    x.style.background = '';
    x.style.color = '';
  });
  if (b) {
    b.classList.add('active');
    var col = b.getAttribute('data-catcol');
    if (col) {
      b.style.background = col;
      b.style.color = '#ffffff';
    }
  }
  renderFeed();
}

function filterCity(c) { cCity = c; renderFeed(); }
function setSearch(v) { cQuery = (v || '').trim(); renderFeed(); }
function applyJkhFilters() {
  var inp = document.getElementById('jkh-search');
  var qr = inp ? String(inp.value || '').toLowerCase().trim() : '';
  var outList = (window.DIRECTORIES || {}).outages || [];
  document.querySelectorAll('.jkh-row').forEach(function(r, idx) {
    var item = getByIdx(outList, idx);
    if (!item) return;
    var full = ((item.city || '') + ' ' + (item.type || '') + ' ' + (item.fullText || item.status || '')).toLowerCase();
    var okText = !qr || full.indexOf(qr) !== -1;
    var okType = !cJkhType || String(item.type || '').toLowerCase() === cJkhType.toLowerCase();
    r.style.display = (okText && okType) ? 'flex' : 'none';
  });
}

function filterJkh(q) { applyJkhFilters(); }

function filterJkhType(t, btn) {
  cJkhType = (cJkhType === t) ? '' : t;
  document.querySelectorAll('.jkh-type-btn').forEach(function(b) {
    var act = b.getAttribute('data-jtype') === cJkhType;
    b.style.borderColor = act ? 'var(--accent)' : '';
    b.style.fontWeight = act ? '700' : '';
  });
  applyJkhFilters();
}

function mapUrl(city, addr, lat, lon) {
  if (lat && lon) {
    return 'https://yandex.ru' + lon + '%2C' + lat + '&pt=' + lon + '%2C' + lat + '%2Cpm2rdm&z=15';
  }
  var cName = String(city || '').trim();
  if (!addr && cName) {
    var found = PRIM_CITIES.find(function(x) { return x.name.toLowerCase() === cName.toLowerCase(); });
    if (found) {
      return 'https://yandex.ru' + found.lon + '%2C' + found.lat + '&pt=' + found.lon + '%2C' + found.lat + '%2Cpm2rdm&z=13';
    }
  }
  return 'https://yandex.ru' + encodeURIComponent((cName || 'Приморский край') + (addr ? ', ' + addr : ''));
}

function focusDirTab(tabId) {
  var btn = document.getElementById('tab-' + tabId);
  switchDirTab(tabId, btn);
  var box = document.getElementById('dir-box');
  if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openTraffic(idx) {
  var list = window.TRAFFIC || [];
  var t = getByIdx(list, idx);
  var mb = document.getElementById('m-body'), md = document.getElementById('modal');
  if (!mb || !md || !t) return;
  mb.innerHTML =
    '<div class="news-meta"><span class="badge-cat">Дорожный радар Приморья • 24/7</span> <span>Обновлено в ' + (t.updated || '') + '</span></div>' +
    '<h1 style="font-size:21px;margin:8px 0 12px">' + t.name + ': ' + t.status + '</h1>' +
    '<div class="tldr">' + linkifyPhones(t.details || 'По данным оперативного мониторинга дорожных служб и сообщений водителей, движение на данном участке осуществляется в штатном режиме.') + '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' +
    '<a href="' + mapUrl('Владивосток', t.name) + '" target="_blank" rel="noopener noreferrer" class="btn-cta">Открыть участок на Яндекс.Картах</a>' +
    '<a href="tel:+74232490921" class="soc-pill">Дежурная часть ГИБДД: +7 (423) 249-09-21</a></div>';
  md.style.display = 'flex';
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
          '<a href="' + mapUrl(o.city, '') + '" target="_blank" rel="noopener noreferrer" class="soc-pill" style="font-size:12px" onclick="event.stopPropagation()">На карте</a></div>';
      }).join('')
    : '<div class="w-row" style="color:var(--muted);font-size:13.5px">На данный момент плановых и аварийных отключений по адресам не зафиксировано. Выберите муниципалитет ниже для просмотра карты и связи с ЕДДС.</div>';

  var citiesMapHtml = PRIM_CITIES.map(function(c) {
    return '<a href="' + mapUrl(c.name, '', c.lat, c.lon) + '" target="_blank" rel="noopener noreferrer" class="soc-pill" style="font-size:12.5px">' + c.name + ' (карта)</a>';
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
      '<div class="news-meta"><span class="badge-cat">Государственные и ресурсоснабжающие порталы</span></div>' +
      '<h1 style="font-size:21px;margin:8px 0 14px">Передача показаний счётчиков ЖКХ</h1>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="https://dvec.ru" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--accent);text-decoration:none">ПАО «ДЭК» — Электроэнергия и тепло Приморья</a><div style="font-size:12px;color:var(--muted)">Официальный раздел передачи показаний и личный кабинет</div></div></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="https://primvod.ru" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--accent);text-decoration:none">КГУП «Примводоканал» — Холодное водоснабжение</a><div style="font-size:12px;color:var(--muted)">Официальный портал абонентов водоснабжения Приморского края</div></div></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="https://dgk.ru" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--accent);text-decoration:none">АО «ДГК» — Горячая вода и отопление</a><div style="font-size:12px;color:var(--muted)">Официальный портал Дальневосточной генерирующей компании</div></div></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="https://gosuslugi.ru" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--accent);text-decoration:none">ГИС ЖКХ — Единый государственный портал РФ</a><div style="font-size:12px;color:var(--muted)">Передача показаний и проверка начислений через Госуслуги</div></div></div>';
  } else if (type === 'transport') {
    mb.innerHTML =
      '<div class="news-meta"><span class="badge-cat">Транспорт Приморского края • 24/7</span></div>' +
      '<h1 style="font-size:21px;margin:8px 0 14px">Официальные расписания транспорта Приморья</h1>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="https://expressprim.ru" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--accent);text-decoration:none">АО «Экспресс Приморья» — Пригородные электропоезда и Аэроэкспресс</a><div style="font-size:12px;color:var(--muted)">Актуальное расписание электричек: Владивосток, Аэропорт, Уссурийск, Находка, Спасск</div></div></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="https://primavtovokzal.ru" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--accent);text-decoration:none">Автовокзалы Приморского края — Междугородние автобусы</a><div style="font-size:12px;color:var(--muted)">Официальное расписание краевых и междугородних автобусных рейсов</div></div></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="https://vvo.aero" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--accent);text-decoration:none">Международный аэропорт Владивосток (VVO) — Онлайн-табло</a><div style="font-size:12px;color:var(--muted)">Статус вылетов и прилётов в реальном времени</div></div></div>' +
      '<div class="w-row"><div style="flex:1;padding-right:8px"><a href="tel:+74232497301" style="font-weight:700;color:var(--accent);text-decoration:none">Морской вокзал Владивостока — Справочная паромных переправ</a><div style="font-size:12px;color:var(--muted)">Рейсы на о. Русский, о. Попова, о. Рейнеке и Славянку: +7 (423) 249-73-01</div></div></div>';
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
      '<a href="' + mapUrl(g.city, g.addr, g.lat, g.lon) + '" target="_blank" rel="noopener noreferrer" class="soc-pill" style="font-size:12px;padding:4px 10px">На карте</a></div></div>';
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
'ЖКХ 24/7 • ' + (o.type || 'Мониторинг') + ' ' + (o.city || 'Приморье') + '' +
'Информация об отключении и адресах' +
'' + linkifyPhones(o.fullText || o.status || '') + '' +
'' +
'Позвонить в диспетчерскую: ' + (o.phone || '112') + '' +
'Открыть карту города';
md.style.display = 'flex';
}
function shareNative(id) {
var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
if (!n) return;
var u = window.location.origin + '/news/' + n.id + '.html';
if (navigator.share) {
navigator.share({ title: n.title, text: n.title + ' — ИА «Прим_Дозор»', url: u }).catch(function() {});
} else if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(n.title + ' — ' + u).catch(function() {});
alert('Ссылка на статью скопирована в буфер обмена.');
}
}
function openArt(id) {
var n = (window.NEWS || []).find(function(x) { return String(x.id) === String(id); });
if (!n) return;
var mb = document.getElementById('m-body'), md = document.getElementById('modal');
if (!mb || !md) return;
try {
if (window.history && window.history.pushState) {
window.history.pushState({ artId: n.id }, n.title, '/news/' + n.id + '.html');
}
} catch (e) {}
var mediaHtml = n.video
? ''
: '';
mb.innerHTML =
'' + n.catLabel + ' ' + n.city + ' • ' + n.date + '' +
'' + n.title + '' +
mediaHtml +
'Главное:
' + linkifyPhones(n.tldr || '').replace(/\n/g, '
') + '' +
'' + linkifyPhones(n.text) + '' +
makeReactHtml(n.id) +
'' +
'Поделиться ' +
'Читайте нас в Telegram ' +
'Читайте нас в MAX ' +
'Читайте нас в ВК ' +
'Читайте нас в Дзен';
md.style.display = 'flex';
}
function openAfisha(idx) {
var a = getByIdx((window.DIRECTORIES || {}).afisha, idx);
if (!a) return;
var mb = document.getElementById('m-body'), md = document.getElementById('modal');
if (!mb || !md) return;
var phoneRow = a.phone ? 'Телефон организаторов: ' + a.phone + '' : '';
var srcBtn = a.url ? 'Официальный источник мероприятия ' : '';
mb.innerHTML =
'' + (a.tag || 'Афиша') + ' ' + (a.city || 'Приморье') + '' +
'' + a.title + '' +
'Дата и время: ' + (a.date || '') + 'Полный адрес: ' + (a.place || a.city || '') + 'Условия участия: Вход свободный' + phoneRow + '' +
'' + linkifyPhones(a.desc || '') + '' +
'' +
'Показать на Яндекс.Картах ' +
srcBtn + '';
md.style.display = 'flex';
}
function closeMainModal() {
var md = document.getElementById('modal');
if (md) md.style.display = 'none';
try {
if (window.location.pathname.indexOf('/news/') === 0 && window.history && window.history.pushState) {
window.history.pushState({}, '', '/');
}
} catch (e) {}
}
window.addEventListener('popstate', function() {
var md = document.getElementById('modal');
if (md && md.style.display === 'flex') md.style.display = 'none';
});
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
return '' + x.city + '' + x.name + '' + x.num + '';
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
var html = 'Опрос читателей Приморья' +
'' + qText + '';
if (voted >= 0 && voted < opts.length) {
html += opts.map(function(label, i) {
var isMe = (i === voted);
var pct = isMe ? 100 : 0;
return '' + label + (isMe ? ' — Ваш голос учтён' : '') + '' + pct + '%' +
'';
}).join('') + 'Голос принят редакцией ИА «Прим_Дозор».';
} else {
html += opts.map(function(label, i) {
return '' + label + '';
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
function getHolidayTitle(vl) {
var m = vl.getMonth() + 1, d = vl.getDate();
var hols = [
{ m: 1, d1: 1, d2: 6, title: 'С НОВЫМ ГОДОМ, ПРИМОРСКИЙ КРАЙ!' },
{ m: 1, d1: 7, d2: 8, title: 'СО СВЕТЛЫМ РОЖДЕСТВОМ ХРИСТОВЫМ!' },
{ m: 2, d1: 22, d2: 23, title: 'С ДНЁМ ЗАЩИТНИКА ОТЕЧЕСТВА!' },
{ m: 3, d1: 7, d2: 8, title: 'С МЕЖДУНАРОДНЫМ ЖЕНСКИМ ДНЁМ!' },
{ m: 5, d1: 1, d2: 2, title: 'С ПРАЗДНИКОМ ВЕСНЫ И ТРУДА — 1 МАЯ!' },
{ m: 5, d1: 8, d2: 9, title: 'С ДНЁМ ВЕЛИКОЙ ПОБЕДЫ — 9 МАЯ!' },
{ m: 6, d1: 11, d2: 12, title: 'С ДНЁМ РОССИИ!' },
{ m: 7, d1: 2, d2: 2, title: 'С ДНЁМ РОЖДЕНИЯ, ВЛАДИВОСТОК!' },
{ m: 9, d1: 1, d2: 1, title: 'С ДНЁМ ЗНАНИЙ — 1 СЕНТЯБРЯ!' },
{ m: 10, d1: 20, d2: 20, title: 'С ДНЁМ ОБРАЗОВАНИЯ ПРИМОРСКОГО КРАЯ!' },
{ m: 11, d1: 3, d2: 4, title: 'С ДНЁМ НАРОДНОГО ЕДИНСТВА!' }
];
for (var i = 0; i < hols.length; i++) {
if (hols[i].m === m && d >= hols[i].d1 && d <= hols[i].d2) return hols[i].title;
}
return 'ИА «ПРИМ_ДОЗОР»';
}
function drawSeason() {
var b = document.getElementById('season-banner');
if (!b) return;
var vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
var mainTitle = getHolidayTitle(vl);
var subTitle = mainTitle === 'ИА «ПРИМ_ДОЗОР»'
? 'Информационно-аналитический портал Приморского края • 24/7'
: 'ИА «ПРИМ_ДОЗОР» • Новости Владивостока и Приморского края 24/7';
b.style.cssText = 'position:relative;width:100%;min-height:112px;border-radius:14px;overflow:hidden;background:linear-gradient(125deg,#071120 0%,#0f294a 55%,#1e3a8a 100%);display:flex;align-items:center;padding:18px 24px;box-sizing:border-box';
b.innerHTML =
'' +
'' +
'ПРИМОРСКИЙ КРАЙ • 24/7' +
'' + mainTitle + '' +
'' + subTitle + '' +
'';
}
function openReport() {
var m = document.getElementById('report-modal');
if (m) m.style.display = 'flex';
}
function sendReport(e) {
e.preventDefault();
var tp = (document.getElementById('rep-type') || {}).value || 'Обращение';
var c = (document.getElementById('rep-city') || {}).value || 'Приморье';
var t = ((document.getElementById('rep-text') || {}).value || '').trim();
if (!t) return;
var msg = 'Обращение в ИА «Прим_Дозор» [' + tp + ' • ' + c + ']:\n' + t;
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(msg).catch(function() {});
}
alert('Текст обращения скопирован. Сейчас откроется связь с дежурным редактором @prim_dozor — вставьте сообщение.');
window.open('t.me', '_blank');
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
function updateLiveClock() {
var vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
var cl = document.getElementById('clock');
if (cl) {
cl.textContent = 'Владивосток ' +
String(vl.getHours()).padStart(2, '0') + ':' +
String(vl.getMinutes()).padStart(2, '0') + ':' +
String(vl.getSeconds()).padStart(2, '0');
}
}
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
updateLiveClock();
setInterval(updateLiveClock, 1000);
setInterval(function() { fetchLiveRates(); fetchW(); }, 60000);
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initSite); } else { initSite(); }
