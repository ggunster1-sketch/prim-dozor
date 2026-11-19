const newsData = [
  { id: 1, cat: 'chp', catLabel: '🚨 ЧП и 112', city: 'Владивосток', age: '16+', date: 'Сегодня, 23:10', title: 'Экстренные службы Приморья переведены в режим повышенной готовности на сутки', tldr: '• Проверены ключевые магистрали и мосты края.<br>• Аварийные бригады ЖКХ дежурят круглосуточно.', text: 'Оперативные ведомства Приморского края контролируют обстановку на дорогах и коммунальных сетях. Золотой и Русский мосты открыты для всех видов транспорта. Сообщить о проблемах можно через форму «Народный контроль».', src: 'По информации оперативных служб' },
  { id: 2, cat: 'svo', catLabel: '🇷🇺 СВО и Защитники', city: 'Россия', age: '12+', date: 'Сегодня, 21:45', title: 'Новые выплаты и льготы участникам СВО и их семьям: полный разбор изменений', tldr: '• Упрощено оформление региональных и федеральных мер поддержки.<br>• Расширены программы помощи семьям военнослужащих.', text: 'Вступили в силу обновлённые правила предоставления социальных гарантий бойцам СВО и их близким. Подать заявление можно в упрощённом порядке через МФЦ или Госуслуги.', src: 'По материалам официальных правовых актов РФ' },
  { id: 3, cat: 'law', catLabel: '🏛 Законы и Политика', city: 'Россия', age: '12+', date: 'Сегодня, 19:20', title: 'Важные поправки в законах РФ для водителей и собственников квартир', tldr: '• Уточнены правила перерасчёта за коммунальные аварии.<br>• Обновлены регламенты надзорных проверок.', text: 'Ряд федеральных изменений вступил в силу и уже применяется в Приморском крае. Эксперты отмечают усиление защиты прав потребителей в сфере ЖКХ.', src: '' },
  { id: 4, cat: 'sport', catLabel: '🏆 Спорт', city: 'Владивосток', age: '6+', date: 'Сегодня, 18:00', title: 'Приморские команды готовятся к решающим играм сезона: расписание матчей', tldr: '• ХК «Адмирал» и БК «Динамо» проводят важные встречи.<br>• Российские спортсмены завоевали медали на мировых стартах.', text: 'Болельщиков Приморья ждёт насыщенная спортивная неделя с участием краевых клубов и российских атлетов на международной арене.', src: '' }
];

let curCat = 'all', curCity = 'all';

function render() {
  const box = document.getElementById('feed');
  if (!box) return;
  const list = newsData.filter(n => (curCat === 'all' || n.cat === curCat) && (curCity === 'all' || n.city === curCity));
  box.innerHTML = list.map(n => `
    <div class="card">
      <div class="meta"><span class="cat-tag">${n.catLabel}</span><span>📍 ${n.city}</span><span>🕒 ${n.date}</span><span style="border:1px solid var(--border);padding:0 5px;border-radius:4px;">${n.age}</span></div>
      <h2 onclick="openArt(${n.id})">${n.title}</h2>
      <div class="tldr"><strong>Главное за 10 секунд:</strong><br>${n.tldr}</div>
      <p style="color:var(--muted); font-size:15px; margin-bottom:12px;">${n.text}</p>
      <div style="display:flex; justify-content:space-between; font-size:13px; border-top:1px solid var(--border); padding-top:10px;">
        <span style="color:var(--muted);">${n.src}</span>
        <button style="color:#60a5fa; font-weight:700;" onclick="openArt(${n.id})">Читать полностью ➔</button>
      </div>
    </div>
  `).join('');
}

function setCat(c, btn) {
  curCat = c;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  render();
}

function setCity(c) { curCity = c; render(); }

function openArt(id) {
  const n = newsData.find(x => x.id === id);
  if (!n) return;
  document.getElementById('art-body').innerHTML = `
    <div class="meta" style="margin-top:10px;"><span class="cat-tag">${n.catLabel}</span><span>📍 ${n.city}</span><span>${n.age}</span></div>
    <h1 style="font-size:22px; margin:10px 0;">${n.title}</h1>
    <div class="tldr">${n.tldr}</div>
    <p style="line-height:1.7; margin-bottom:16px;">${n.text}</p>
    <div style="background:var(--bg); padding:14px; border-radius:10px;">
      <p style="font-weight:700; margin-bottom:8px;">📲 Читайте «Прим_Дозор» во всех соцсетях:</p>
      <a href="https://t.me" target="_blank" class="btn" style="background:#0088cc;color:#fff;display:inline-block;margin:3px;">Telegram</a>
      <a href="https://max.ru" target="_blank" class="btn" style="background:#7c3aed;color:#fff;display:inline-block;margin:3px;">Макс</a>
    </div>
  `;
  document.getElementById('art-modal').style.display = 'flex';
}

function updateClock() {
  const now = new Date();
  const vl = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 36000000);
  const el = document.getElementById('clock');
  if (el) el.textContent = String(vl.getHours()).padStart(2, '0') + ':' + String(vl.getMinutes()).padStart(2, '0');
}

window.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('ck')) document.getElementById('cookie-box').style.display = 'none';
  const cfg = window.PRIM_DOZOR_CONFIG || {};
  if (cfg.socials) {
    if (cfg.socials.vk && !cfg.socials.vk.includes('ВПИШИ')) document.getElementById('s-vk').href = cfg.socials.vk;
    if (cfg.socials.dzen && !cfg.socials.dzen.includes('ВПИШИ')) document.getElementById('s-dzen').href = cfg.socials.dzen;
  }
  if (cfg.ownerName && !cfg.ownerName.includes('ВПИШИ')) {
    document.getElementById('foot-owner').textContent = cfg.legalStatus + '. Администратор: ' + cfg.ownerName + ' (' + cfg.contactEmail + ')';
  }
  if (cfg.partnerAd && cfg.partnerAd.enabled) {
    document.getElementById('ad-slot').style.display = 'block';
    document.getElementById('ad-mark').textContent = cfg.partnerAd.advertiserInfo + ' · erid: ' + cfg.partnerAd.erid;
    document.getElementById('ad-t').textContent = cfg.partnerAd.title;
    document.getElementById('ad-d').textContent = cfg.partnerAd.description;
    document.getElementById('ad-btn').textContent = cfg.partnerAd.buttonText + ': ' + cfg.partnerAd.phone;
  }
  updateClock();
  setInterval(updateClock, 10000);
  render();
});
