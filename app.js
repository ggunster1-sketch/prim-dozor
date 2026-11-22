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

function fmtTemp(v) {
  var n = Math.round(Number(v) || 0);
  if (Object.is(n, -0) || n === 0) return '0°C';
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
  var w = (window.WEATHER || []).at(idx);
  if (w) applyWeatherObj(w);
  fetchLiveWeather(idx);
}

function fetchLiveWeather(selectedIndex) {
  var lats = PRIM_CITIES.map(function(c) { return c.lat; }).join(',');
  var lons = PRIM_CITIES.map(function(c) { return c.lon; }).join(',');
  var url = 'https://open-meteo.com' + lats + '&longitude=' + lons +
    '&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok';
  fetch(url).then(function(r) { return r.json(); }).then(function(list) {
    if (!Array.isArray(list)) return;
    var ico = function(c) { return c === 0 ? '☀' : c <= 3 ? '🌤' : (c >= 71 && c <= 77) ? '❄' : c >= 51 ? '🌧' : '☁'; };
    window.WEATHER = list.map(function(r, idx) {
      var h = (r.hourly && r.hourly.temperature_2m) || [];
      var d = (r.daily && r.daily.temperature_2m_max) || [];
      var curT = r.current.temperature_2m;
      var cityObj = PRIM_CITIES.at(idx) || { name: 'Приморье' };
      return {
        name: cityObj.name,
        now: fmtTemp(curT) + ' ' + ico(r.current.weather_code),
        morning: fmtTemp(h.length > 8 ? h.at(8) : curT),
        day: fmtTemp(h.length > 14 ? h.at(14) : curT),
        evening: fmtTemp(h.length > 20 ? h.at(20) : curT),
        tomorrow: fmtTemp(d.length > 1 ? d.at(1) : curT)
      };
    });
    var sel = document.getElementById('w-sel');
    var curIdx = selectedIndex !== undefined ? selectedIndex : (sel ? Number(sel.value) : 0);
    applyWeatherObj(window.WEATHER.at(curIdx) || window.WEATHER.at(0));
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
    var meta = '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span><span>' + n.city + '</span><span>• ' + n.date + '</span><span class="badge-age">' + n.age + '</span></div>';
    return i === 0
      ? '<article class="hero-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="hero-img" src="./' + n.cover + '" alt=""><div class="hero-body">' + meta + '<h2 class="hero-title">' + n.title + '</h2><p class="hero-lead">' + lead + '...</p></div></article>'
      : '<article class="news-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="news-thumb" src="./' + n.cover + '" alt=""><div>' + meta + '<h3 class="news-title">' + n.title + '</h3><p class="news-excerpt">' + lead + '...</p></div></article>';
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
    '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span><span>' + n.city + '</span><span>• ' + n.date + '</span><span class="badge-age">' + n.age + '</span></div>' +
    '<h1 style="font-size:21px;line-height:1.3;margin:8px 0 14px">' + n.title + '</h1>' +
    '<img src="./' + n.cover + '" style="width:100%;border-radius:10px;margin-bottom:14px">' +
    '<div class="tldr"><strong>Главное:</strong><br>' + (n.tldr || '').replace(/\n/g, '<br>') + '</div>' +
    '<div style="white-space:pre-line;line-height:1.75;font-size:15.5px;margin-bottom:16px">' + n.text + '</div>' +
    (n.src ? '<p style="font-size:12px;color:var(--muted);margin-bottom:14px">' + n.src + '</p>' : '') +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:12px;border-top:1px solid var(--border)">' +
    '<a href="' + (soc.telegram || 'https://t.me') + '" target="_blank" class="btn-cta">✈ Telegram ЧП</a>' +
    '<a href="' + (soc.max || 'https://max.ru') + '" target="_blank" class="soc-pill">💬 МАКС</a>' +
    '<a href="' + (soc.vk || 'https://vk.ru') + '" target="_blank" class="soc-pill">🌐 ВК</a>' +
    '<a href="' + (soc.dzen || 'https://dzen.ru') + '" target="_blank" class="soc-pill">🔥 Дзен</a>' +
    '</div>';
  modal.style.display = 'flex';
}

function openAfisha(idx) {
  var dir = window.DIRECTORIES || {};
  var a = (dir.afisha || []).at(Number(idx));
  if (!a) return;
  var mBody = document.getElementById('m-body');
  var modal = document.getElementById('modal');
  if (!mBody || !modal) return;
  mBody.innerHTML =
    '<div class="news-meta"><span class="badge-cat">' + (a.tag || 'Афиша Приморья') + '</span><span>' + (a.city || 'Приморский край') + '</span></div>' +
    '<h1 style="font-size:21px;line-height:1.3;margin:8px 0 14px">' + a.title + '</h1>' +
    '<div class="tldr">' +
      '<div style="margin-bottom:6px">📅 <strong>Когда и во сколько:</strong> ' + (a.date || 'Уточняется') + '</div>' +
      '<div style="margin-bottom:6px">📍 <strong>Где проходит:</strong> ' + (a.place || a.city || 'Приморский край') + '</div>' +
      '<div>🎟 <strong>Условия входа:</strong> ' + (a.price || 'Вход свободный') + '</div>' +
    '</div>' +
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
  var first = parts.length > 0 ? parts.at(0) : '';
  var clean = first.replace(/[^\d+]/g, '');
  if (clean.length === 7 && clean.indexOf('+') !== 0) clean = '+7423' + clean;
  if (clean.indexOf('8') === 0 && clean.length === 11) clean = '+7' + clean.slice(1);
  return 'tel:' + clean;
}

function renderCityPhones(city) {
  var dir = window.DIRECTORIES || {};
  var phones = dir.phones || {};
  var list = phones[city] || phones['Все города'] || [];
  var box = document.getElementById('phones-list');
  if (box) {
    box.innerHTML = list.map(function(p) {
      return '<div class="w-row"><span style="flex:1;padding-right:8px">' + p.name + '</span><a href="' + makeTelHref(p.num) + '" class="tel-pill">📞 ' + p.num + '</a></div>';
    }).join('');
  }
}

function renderSeasonBanner() {
  var banner = document.getElementById('season-banner');
  if (!banner) return;
  var cfg = window.PRIM_DOZOR_CONFIG || {};
  var now = new Date();
  var m = now.getMonth() + 1;
  var mmdd = String(m).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  var holidays = (cfg.holidays || []).concat([
    { start: '01-25', end: '01-25', icon: '🎓', title: 'С Днём российского студенчества (Татьянин день)!', text: 'Редакция «Прим_Дозора» поздравляет студентов и преподавателей ДВФУ, ВВГУ и всех вузов Приморья!' },
    { start: '02-23', end: '02-23', icon: '🎖', title: 'С Днём защитника Отечества!', text: 'Поздравляем моряков Тихоокеанского флота, бойцов СВО и всех защитников России!' },
    { start: '03-08', end: '03-08', icon: '🌷', title: 'С Международным женским днём 8 Марта!', text: 'Дорогие жительницы Приморского края, с праздником весны, тепла и красоты!' },
    { start: '05-01', end: '05-01', icon: '🌿', title: 'С Праздником Весны и Труда — 1 Мая!', text: 'Мира, созидания и весеннего настроения всем жителям Приморского края!' },
    { start: '05-09', end: '05-09', icon: '🎗', title: 'С Днём Великой Победы!', text: 'Вечная слава героям! Поздравляем Приморье и всю страну с 9 Мая!' },
