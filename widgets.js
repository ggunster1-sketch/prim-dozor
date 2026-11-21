const fs = require('fs');

async function updateWeather() {
  const cities = [
    { name: 'Владивосток', lat: 43.1155, lon: 131.8855 },
    { name: 'Большой Камень', lat: 43.1128, lon: 132.3481 },
    { name: 'Артём', lat: 43.3592, lon: 132.1892 },
    { name: 'Уссурийск', lat: 43.7972, lon: 131.9517 },
    { name: 'Находка', lat: 42.8241, lon: 132.8928 }
  ];
  try {
    const lats = cities.map(c => c.lat).join(',');
    const lons = cities.map(c => c.lon).join(',');
    const url = 'https://open-meteo.com' + lats + '&longitude=' + lons + '&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok';
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];

    const fmt = v => (v === undefined || v === null) ? '--°C' : (v > 0 ? '+' : '') + Math.round(v) + '°C';
    const ico = c => c === 0 ? '☀' : c <= 3 ? '🌤' : (c >= 71 && c <= 77) ? '❄' : c >= 51 ? '🌧' : '☁';

    const out = list.map((r, i) => {
      const h = (r.hourly && r.hourly.temperature_2m) || [];
      const d = (r.daily && r.daily.temperature_2m_max) || [];
      const cur = r.current ? Math.round(r.current.temperature_2m) : 0;
      const sign = r.current ? ico(r.current.weather_code) : '🌤';
      const cObj = cities.at(i) || { name: 'Приморье' };
      return {
        name: cObj.name,
        now: fmt(cur) + ' ' + sign,
        morning: h.at(8) !== undefined ? fmt(h.at(8)) : fmt(cur),
        day: h.at(14) !== undefined ? fmt(h.at(14)) : fmt(cur),
        evening: h.at(20) !== undefined ? fmt(h.at(20)) : fmt(cur),
        tomorrow: d.at(1) !== undefined ? fmt(d.at(1)) : fmt(cur)
      };
    });
    fs.writeFileSync('weather.json', JSON.stringify(out, null, 2), 'utf8');
    console.log('Погода Приморья обновлена.');
  } catch (e) {}
}

async function updateRates() {
  try {
    const res = await fetch('https://cbr-xml-daily.ru');
    if (!res.ok) return;
    const data = await res.json();
    const out = {
      usd: (data.Valute.USD.Value / data.Valute.USD.Nominal).toFixed(1),
      cny: (data.Valute.CNY.Value / data.Valute.CNY.Nominal).toFixed(1)
    };
    fs.writeFileSync('rates.json', JSON.stringify(out, null, 2), 'utf8');
    console.log('Курсы ЦБ РФ обновлены.');
  } catch (e) {}
}

async function runWidgets() {
  await updateWeather();
  await updateRates();
}

module.exports = { runWidgets };
if (require.main === module) runWidgets();
