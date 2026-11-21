const fs = require('fs');

function buildSite() {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Прим_Дозор — Главные новости Владивостока, Приморья и России 24/7</title>
  <link rel="stylesheet" href="style.css">
  <script src="config.js"></script>
</head>
<body>
  <!-- Шапка, навигация, виджеты погоды, курсы валют и новостная лента -->
  <div class="top-bar">...</div>
  <header>...</header>
  <div class="container">
    <div class="tabs">...</div>
    <div class="grid">
      <aside>...</aside>
      <main><div id="feed"></div></main>
      <aside>...</aside>
    </div>
  </div>
  <footer>...</footer>
  <script src="app.js"></script>
</body>
</html>`;

  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Полный портал index.html успешно собран.');
}

module.exports = { buildSite };
