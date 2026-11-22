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
    const mmdd = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const hol = (cfg.holidays || []).find(h => mmdd >= h.start && mmdd <= h.end);
    if (hol) {
      banner.innerHTML = '<div><strong style="color:var(--accent)">' + hol.title + '</strong><div style="font-size:13px;color:var(--muted)">' + hol.text + '</div></div>';
      banner.style.display = 'flex';
    } else {
      const m = now.getMonth() + 1;
      const season = (m === 12 || m <= 2) ? 'Зима в Приморье: будьте внимательны на трассах и перевалах края'
        : (m >= 3 && m <= 5) ? 'Весна в Приморье: контроль паводковой обстановки и дорог края'
        : (m >= 6 && m <= 8) ? 'Лето в Приморье: сводки пляжей, морской обстановки и афиша края'
        : 'Осень в Приморье: подготовка ЖКХ к отопительному сезону и сводки 24/7';
      banner.innerHTML = '<div style="font-size:13px;font-weight:600">' + season + '</div>';
      banner.style.display = 'flex';
    }
  }

  const ad = cfg.partnerAd;
  const adBox = document.getElementById('ad-slot');
  if (ad && ad.enabled && adBox) {
    adBox.innerHTML =
      '<div class="ad-tag"><span>' + ad.label + '</span><span>' + ad.advertiserInfo + ' • erid: ' + ad.erid + '</span></div>' +
      '<div style="font-weight:800;font-size:15px;margin-bottom:4px">' + ad.title + '</div>' +
      '<div style="font-size:13px;color:var(--muted);margin-bottom:10px">' + ad.description + '</div>' +
      '<a href="tel:' + ad.phone.replace(/[^+\d]/g, '') + '" class="btn-cta" style="display:inline-block">' + ad.buttonText + ': ' + ad.phone + '</a>';
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
  window.open('https://t.me?text=' + msg, '_blank');
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
