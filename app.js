let cCat = 'all', cCity = 'all', cQuery = '';

function setWeather(i) {
  const w = (window.WEATHER || [])[i];
  if (!w) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('w-top', w.now);
  set('w-name', w.name);
  set('w-now', w.now);
  set('w-m', w.morning);
  set('w-d', w.day);
  set('w-e', w.evening);
  set('w-t', w.tomorrow);
}

function renderFeed() {
  const box = document.getElementById('feed');
  if (!box) return;
  const q = cQuery.toLowerCase();
  const list = (window.NEWS || []).filter(n => {
    const okCat = cCat === 'all' || (n.cat || '').includes(cCat);
    const okCity = cCity === 'all' || (n.city || '').toLowerCase().includes(cCity.toLowerCase());
    const okQ = !q || (n.title || '').toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q);
    return okCat && okCity && okQ;
  });

  if (!list.length) {
    box.innerHTML = '<div class="widget"><p style="color:var(--muted);">По выбранному фильтру новостей пока нет.</p></div>';
    return;
  }

  box.innerHTML = list.map((n, i) => {
    const lead = (n.text || '').replace(/\s+/g, ' ').slice(0, 155);
    const meta = '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span><span>' + n.city + '</span><span>• ' + n.date + '</span><span class="badge-age">' + n.age + '</span></div>';
    return i === 0
      ? '<article class="hero-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="hero-img" src="./' + n.cover + '" alt=""><div class="hero-body">' + meta + '<h2 class="hero-title">' + n.title + '</h2><p class="hero-lead">' + lead + '...</p></div></article>'
      : '<article class="news-card" data-id="' + n.id + '" onclick="openArt(this.dataset.id)"><img class="news-thumb" src="./' + n.cover + '" alt=""><div>' + meta + '<h3 class="news-title">' + n.title + '</h3><p class="news-excerpt">' + lead + '...</p></div></article>';
  }).join('');
}

function filterCat(c, btn) {
  cCat = c;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFeed();
}

function filterCity(c) { cCity = c; renderFeed(); }
function setSearch(val) { cQuery = val.trim(); renderFeed(); }

function openArt(id) {
  const n = (window.NEWS || []).find(x => String(x.id) === String(id));
  if (!n) return;
  const cfg = window.PRIM_DOZOR_CONFIG || {};
  const soc = cfg.socials || {};
  document.getElementById('m-body').innerHTML =
    '<div class="news-meta"><span class="badge-cat">' + n.catLabel + '</span><span>' + n.city + '</span><span>• ' + n.date + '</span><span class="badge-age">' + n.age + '</span></div>' +
    '<h1 style="font-size:22px;line-height:1.3;margin:8px 0 14px">' + n.title + '</h1>' +
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
  document.getElementById('modal').style.display = 'flex';
}

function switchDirTab(tabId, btn) {
  document.querySelectorAll('.mini-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  ['dir-jkh', 'dir-phones', 'dir-afisha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === tabId) ? 'block' : 'none';
  });
}

function renderCityPhones(city) {
  const dir = window.DIRECTORIES || {};
  const list = (dir.phones || {})[city] || (dir.phones || {})['Все города'] || [];
  const box = document.getElementById('phones-list');
  if (box) {
    box.innerHTML = list.map(p => '<div class="w-row"><span>' + p.name + '</span><strong>' + p.num + '</strong></div>').join('');
  }
}

function initBannerAndAds() {
  const cfg = window.PRIM_DOZOR_CONFIG || {};
  const banner = document.getElementById('season-banner');
  if (banner) {
    const now = new Date();
    const m = now.getMonth() + 1;
    const mmdd = String(m).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const allHolidays = (cfg.holidays || []).concat([
      { start: '01-25', end: '01-25', title: 'С Днём российского студенчества (Татьянин день)!', text: 'Поздравляем студентов и преподавателей ДВФУ, ВВГУ, МГУ им. Невельского и всех вузов Приморья!' },
      { start: '05-07', end: '05-07', title: 'С Днём радио и работников связи!', text: 'Поздравляем связистов, журналистов и IT-специалистов Приморского края!' },
      { start: '05-28', end: '05-28', title: 'С Днём пограничника!', text: 'Благодарим пограничников Приморья за надёжную охрану дальневосточных рубежей России!' },
      { start: '06-12', end: '06-12', title: 'С Днём России!', text: 'Гордимся великой страной и нашим родным Приморским краем!' },
      { start: '07-03', end: '07-03', title: 'С Днём ГИБДД (ГАИ) МВД России!', text: 'Поздравляем сотрудников Госавтоинспекции Приморья с профессиональным праздником!' },
      { start: '09-01', end: '09-01', title: 'С Днём знаний — 1 Сентября!', text: 'Успешного учебного года школьникам, студентам и педагогам Приморского края!' },
      { start: '10-05', end: '10-05', title: 'С Днём учителя!', text: 'Низкий поклон и благодарность всем педагогам Приморья!' },
      { start: '11-29', end: '11-30', title: 'С Днём матери!', text: 'Тепла, здоровья и благодарности всем мамам Приморского края!' }
    ]);

    const hol = allHolidays.find(h => (h.start <= h.end) ? (mmdd >= h.start && mmdd <= h.end) : (mmdd >= h.start || mmdd <= h.end));
    const uHost = ['images', 'unsplash', 'com'].join('.');
    const seasonBg = (m === 12 || m <= 2)
      ? 'linear-gradient(90deg, rgba(15,23,42,0.88), rgba(30,58,138,0.78)), url("https://' + uHost + '/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1200&q=75")'
      : (m >= 3 && m <= 5)
      ? 'linear-gradient(90deg, rgba(15,23,42,0.86), rgba(6,95,70,0.76)), url("https://' + uHost + '/photo-1522748906645-95d8adfd52c7?auto=format&fit=crop&w=1200&q=75")'
      : (m >= 6 && m <= 8)
      ? 'linear-gradient(90deg, rgba(15,23,42,0.84), rgba(3,105,161,0.76)), url("https://' + uHost + '/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=75")'
      : 'linear-gradient(90deg, rgba(15,23,42,0.88), rgba(146,64,14,0.78)), url("https://' + uHost + '/photo-1508193638397-1c4234db14d8?auto=format&fit=crop&w=1200&q=75")';

    banner.style.backgroundImage = seasonBg;
    if (hol) {
      banner.innerHTML = '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#fca5a5;font-weight:800;margin-bottom:2px">Поздравление редакции</div><strong style="font-size:17px;display:block">' + hol.title + '</strong><span style="font-size:13px;opacity:0.92">' + hol.text + '</span></div>';
    } else {
      const sTitle = (m === 12 || m <= 2) ? 'Зима в Приморском крае • Оперативный мониторинг 24/7'
        : (m >= 3 && m <= 5) ? 'Весна в Приморском крае • Оперативный мониторинг 24/7'
        : (m >= 6 && m <= 8) ? 'Лето в Приморском крае • Оперативный мониторинг 24/7'
        : 'Осень в Приморском крае • Оперативный мониторинг 24/7';
      const sSub = (m === 12 || m <= 2) ? 'Сводки трасс, перевалов, работа снегоуборочной техники и ЖКХ во всех городах края.'
        : (m >= 3 && m <= 5) ? 'Контроль паводковой обстановки, состояние дорог и городских служб Приморья.'
        : (m >= 6 && m <= 8) ? 'Погода на побережье, оперативная обстановка на дорогах и афиша мероприятий края.'
        : 'Подготовка к зиме, запуск отопления, сводки ГИБДД и оперативные новости Приморья.';
      banner.innerHTML = '<div><strong style="font-size:16px;display:block;margin-bottom:2px">' + sTitle + '</strong><span style="font-size:13px;opacity:0.9">' + sSub + '</span></div>';
    }
    banner.style.display = 'flex';
  }

  const ad = cfg.partnerAd;
  const adBox = document.getElementById('ad-slot');
  if (ad && ad.enabled && adBox) {
    const uHost = ['images', 'unsplash', 'com'].join('.');
    adBox.innerHTML =
      '<div class="ad-tag"><span>' + ad.label + '</span><span>' + ad.advertiserInfo + ' • erid: ' + ad.erid + '</span></div>' +
      '<div style="display:grid;grid-template-columns:130px 1fr;gap:14px;align-items:center">' +
        '<img src="https://' + uHost + '/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80" alt="Аварийный комиссар Приморье" style="width:100%;height:96px;object-fit:cover;border-radius:8px">' +
        '<div>' +
          '<div style="font-weight:800;font-size:15px;margin-bottom:4px">' + ad.title + '</div>' +
          '<div style="font-size:13px;color:var(--muted);margin-bottom:8px">' + ad.description + '</div>' +
          '<a href="tel:' + ad.phone.replace(/[^+\d]/g, '') + '" class="btn-cta" style="display:inline-block">' + ad.buttonText + ': ' + ad.phone + '</a>' +
        '</div>' +
      '</div>';
    adBox.style.display = 'block';
  }
}

function openReport() {
  const m = document.getElementById('report-modal');
  if (m) m.style.display = 'flex';
}

function sendReport(e) {
  e.preventDefault();
  const city = document.getElementById('rep-city').value;
  const text = document.getElementById('rep-text').value.trim();
  if (!text) return;
const msg = encodeURIComponent('Народный контроль (' + city + '):\n' + text);
window.open('t.me' + msg, '_blank');
document.getElementById('report-modal').style.display = 'none';
}
window.addEventListener('DOMContentLoaded', () => {
if (localStorage.getItem('ck')) {
const ck = document.getElementById('ck');
if (ck) ck.style.display = 'none';
}
initBannerAndAds();
renderCityPhones('Все города');
setInterval(() => {
const vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
const cl = document.getElementById('clock');
if (cl) cl.textContent = 'Владивосток ' + String(vl.getHours()).padStart(2, '0') + ':' + String(vl.getMinutes()).padStart(2, '0');
}, 5000);
});
