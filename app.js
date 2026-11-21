let cCat = 'all', cCity = 'all';

function setWeather(i) {
  const w = (window.WEATHER || [])[i];
  if (!w) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('w-top', w.now); set('w-name', w.name); set('w-now', w.now);
  set('w-m', w.morning); set('w-d', w.day); set('w-e', w.evening); set('w-t', w.tomorrow);
}

function renderFeed() {
  const box = document.getElementById('feed');
  if (!box) return;
  const list = (window.NEWS || []).filter(n =>
    (cCat === 'all' || n.cat === cCat) && (cCity === 'all' || (n.city || '').includes(cCity))
  );
  box.innerHTML = list.map((n, i) => {
    const lead = (n.text || '').replace(/\s+/g, ' ').slice(0, 145);
    const meta = `<div class="meta"><span class="cat">${n.catLabel}</span><span>${n.city}</span><span>• ${n.date}</span><span>${n.age}</span></div>`;
    return i === 0
      ? `<article class="hero" onclick="openArt('${n.id}')"><img src="./${n.cover}" alt=""><div class="hero-body">${meta}<h1>${n.title}</h1><p class="lead">${lead}...</p></div></article>`
      : `<article class="item" onclick="openArt('${n.id}')"><img src="./${n.cover}" alt=""><div>${meta}<h2>${n.title}</h2><p class="lead">${lead}...</p></div></article>`;
  }).join('');
}

function filterCat(c, btn) {
  cCat = c;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFeed();
}

function filterCity(c) { cCity = c; renderFeed(); }

function openArt(id) {
  const n = (window.NEWS || []).find(x => String(x.id) === String(id));
  if (!n) return;
  document.getElementById('m-body').innerHTML =
    `<div class="meta"><span class="cat">${n.catLabel}</span><span>${n.city}</span><span>• ${n.date}</span><span>${n.age}</span></div>` +
    `<h1 style="font-size:21px;margin:8px 0 12px">${n.title}</h1>` +
    `<img src="./${n.cover}" style="width:100%;border-radius:10px;margin-bottom:12px">` +
    `<div class="tldr">${(n.tldr || '').replace(/\n/g, '<br>')}</div>` +
    `<p style="white-space:pre-line;line-height:1.7;margin-bottom:14px">${n.text}</p>` +
    `<p style="font-size:12px;color:var(--muted)">${n.src || ''}</p>`;
  document.getElementById('modal').style.display = 'flex';
}

window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('ck')) {
    const ck = document.getElementById('ck');
    if (ck) ck.style.display = 'none';
  }
  setInterval(() => {
    const vl = new Date(Date.now() + new Date().getTimezoneOffset() * 60000 + 36000000);
    const cl = document.getElementById('clock');
    if (cl) cl.textContent = 'Владивосток ' + String(vl.getHours()).padStart(2, '0') + ':' + String(vl.getMinutes()).padStart(2, '0');
  }, 5000);
});
