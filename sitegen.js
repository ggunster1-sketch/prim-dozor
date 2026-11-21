const fs = require('fs');

function buildSite() {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Прим_Дозор — Главные новости Владивостока, Приморья и России 24/7</title>
  <meta name="description" content="Оперативные новости Владивостока, Приморского края и России 24/7: ЧП, криминал, ЖКХ, погода, мосты, законы РФ.">
  <link rel="stylesheet" href="style.css">
  <script src="config.js"></script>
</head>
<body>
  <!-- Шапка и навигация -->
  <header>
    <div class="container head-flex">
      <a href="https://primdozor.ru" class="logo">ПРИМ_ДОЗОР <span>18+</span></a>
      <div style="display:flex; gap:6px;">
        <a href="https://t.me" target="_blank" class="btn">✈ Telegram</a>
        <button type="button" class="btn" onclick="openModal('rep-modal')">+ ЧП</button>
      </div>
    </div>
  </header>

  <!-- Основной контейнер -->
  <div class="container">
    <div class="grid">
      <main>
        <div id="feed"></div>
      </main>
    </div>
  </div>

  <!-- Футер -->
  <footer>
    <div class="container">
      <p><strong>© 2026 Прим_Дозор (18+).</strong> Региональный информационный портал Приморского края.</p>
    </div>
  </footer>

  <script src="app.js"></script>
</body>
</html>`;

  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Сайт index.html успешно собран.');
}

module.exports = { buildSite };
