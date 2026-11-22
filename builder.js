const fs = require('fs');

const HOST = 'primdozor.ru';
const SLASH = String.fromCharCode(47);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const NL = String.fromCharCode(10);
const SQ = String.fromCharCode(39);

function tag(name, attrs, inner) {
  return LT + name + (attrs ? ' ' + attrs : '') + GT + (inner !== undefined ? inner + LT + SLASH + name + GT : '');
}

function esc(s) {
  return String(s || '')
    .replace(/\+0°C/g, '0°C')
    .replace(/-0°C/g, '0°C')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function telHref(phone) {
  let clean = String(phone || '').replace(/[^\d+]/g, '');
  if (clean.length === 7 && !clean.startsWith('+')) clean = '+7423' + clean;
  if (clean.startsWith('8') && clean.length === 11) clean = '+7' + clean.slice(1);
  return 'tel:' + clean;
}

function safeJson(data) {
  return JSON.stringify(data || [])
    .replace(/\+0°C/g, '0°C')
    .replace(/-0°C/g, '0°C')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const CLIENT_JS = [
  "var cCat='all',cCity='all',cQuery='';",
  "var PRIM_CITIES=[{name:'Владивосток',lat:43.1155,lon:131.8855},{name:'Уссурийск',lat:43.7972,lon:131.9517},{name:'Находка',lat:42.8241,lon:132.8928},{name:'Артём',lat:43.3592,lon:132.1892},{name:'Большой Камень',lat:43.1128,lon:132.3481},{name:'Арсеньев',lat:44.1628,lon:133.2778},{name:'Спасск-Дальний',lat:44.5978,lon:132.8192},{name:'Партизанск',lat:43.1286,lon:133.1244},{name:'Дальнегорск',lat:44.5603,lon:135.5700}];",
  "var PRIM_GUIDE=[{cat:'Травмпункты 24/7',title:'Травмпункт №1 (Ленинский / Первомайский)',addr:'Владивосток, ул. Уткинская, 7',phone:'+7 (423) 240-03-86'},{cat:'Травмпункты 24/7',title:'Травмпункт №2 (Первореченский / Центр)',addr:'Владивосток, ул. Калинина, 78',phone:'+7 (423) 227-64-83'},{cat:'Травмпункты 24/7',title:'Травмпункт №3 (Советский / Вторая Речка)',addr:'Владивосток, ул. Давыдова, 3',phone:'+7 (423) 231-90-15'},{cat:'Травмпункты 24/7',title:'Детский краевой травмпункт 24/7',addr:'Владивосток, пр-т Острякова, 27',phone:'+7 (423) 245-19-07'},{cat:'Аптеки 24/7',title:'Дежурная аптека «Монастырёв» (Центр)',addr:'Владивосток, Океанский пр-т, 18',phone:'+7 (423) 240-24-02'},{cat:'Аптеки 24/7',title:'Круглосуточная аптека «Госаптека» (Чуркин)',addr:'Владивосток, ул. Калинина, 42',phone:'+7 (423) 227-35-10'},{cat:'Аптеки 24/7',title:'Аптека 24/7 «Овита» (Вторая Речка)',addr:'Владивосток, ул. Русская, 46',phone:'+7 (423) 232-08-08'},{cat:'Паромы и катера',title:'Морской вокзал (о. Попова, о. Рейнеке, Славянка)',addr:'Владивосток, ул. Нижнепортовая, 1',phone:'+7 (423) 249-73-01'},{cat:'Паромы и катера',title:'Справочная автовокзала Приморья',addr:'Владивосток, ул. Русская, 2А',phone:'+7 (423) 232-33-78'},{cat:'Ветпомощь 24/7',title:'Круглосуточная ветклиника «Друг»',addr:'Владивосток, ул. Борисенко, 33',phone:'+7 (423) 260-87-60'}];",
  "function getByIdx(a,i){if(!Array.isArray(a))return null;var t=Number(i)||0,f=null;a.forEach(function(x,k){if(k===t)f=x;});return f;}",
  "function cleanDigits(s){var r='',str=String(s||'');for(var i=0;i<str.length;i++){var c=str.charAt(i);if((c>='0'&&c<='9')||c==='+')r+=c;}if(r.indexOf('8')===0&&r.length===11)r='+7'+r.slice(1);return r;}",
  "function fmtT(v){var n=Math.round(Number(v)||0);return n===0?'0°C':(n>0?'+':'')+n+'°C';}",
  "function applyW(w){if(!w)return;var s=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};s('w-top',w.now);s('w-name',w.name);s('w-now',w.now);s('w-m',w.morning);s('w-d',w.day);s('w-e',w.evening);s('w-t',w.tomorrow);}",
  "function setWeather(i){var idx=Number(i)||0,w=getByIdx(window.WEATHER,idx);if(w)applyW(w);fetchW(idx);}",
  "function fetchW(si){var sel=document.getElementById('w-sel'),idx=si!==undefined?Number(si):(sel?Number(sel.value):0),c=getByIdx(PRIM_CITIES,idx)||getByIdx(PRIM_CITIES,0);var u='https://'+['api','open-meteo','com'].join('.')+'/v1/forecast?latitude='+c.lat+'&longitude='+c.lon+'&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=2&timezone=Asia%2FVladivostok';fetch(u).then(function(r){return r.json();}).then(function(r){if(!r||!r.current)return;var ico=function(k){return k===0?'☀':k<=3?'🌤':(k>=71&&k<=77)?'❄':k>=51?'🌧':'☁';};var h=(r.hourly&&r.hourly.temperature_2m)||[],d=(r.daily&&r.daily.temperature_2m_max)||[],ct=r.current.temperature_2m;applyW({name:c.name,now:fmtT(ct)+' '+ico(r.current.weather_code),morning:fmtT(h.length>8?getByIdx(h,8):ct),day:fmtT(h.length>14?getByIdx(h,14):ct),evening:fmtT(h.length>20?getByIdx(h,20):ct),tomorrow:fmtT(d.length>1?getByIdx(d,1):ct)});}).catch(function(){});}",
  "function renderFeed(){var box=document.getElementById('feed');if(!box)return;var q=cQuery.toLowerCase(),tl=cCity.toLowerCase();var list=(window.NEWS||[]).filter(function(n){var okC=cCat==='all'||(n.cat||'').indexOf(cCat)!==-1;var ls=((n.city||'')+' '+(n.district||'')+' '+(n.title||'')+' '+(n.text||'')).toLowerCase();return okC&&(tl==='all'||ls.indexOf(tl)!==-1)&&(!q||ls.indexOf(q)!==-1);});if(!list.length){box.innerHTML='<div class=\"widget\"><p style=\"color:var(--muted)\">По выбранному фильтру новостей пока нет.</p></div>';return;}box.innerHTML=list.map(function(n,i){var lead=(n.text||'').replace(/\\s+/g,' ').slice(0,155),ll=n.city+(n.district?' • '+n.district:'');var meta='<div class=\"news-meta\"><span class=\"badge-cat\">'+n.catLabel+'</span> <span>'+ll+'</span> <span>• '+n.date+'</span> <span class=\"badge-age\">'+n.age+'</span></div>';return i===0?'<article class=\"hero-card\" data-id=\"'+n.id+'\" onclick=\"openArt(this.dataset.id)\"><img class=\"hero-img\" src=\"./'+n.cover+'\" alt=\"\"><div class=\"hero-body\">'+meta+'<h2 class=\"hero-title\">'+n.title+'</h2><p class=\"hero-lead\">'+lead+'...</p></div></article>':'<article class=\"news-card\" data-id=\"'+n.id+'\" onclick=\"openArt(this.dataset.id)\"><img class=\"news-thumb\" src=\"./'+n.cover+'\" alt=\"\"><div>'+meta+'<h3 class=\"news-title\">'+n.title+'</h3><p class=\"news-excerpt\">'+lead+'...</p></div></article>';}).join('');}",
  "function filterCat(c,b){cCat=c;document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active');});if(b)b.classList.add('active');renderFeed();}",
  "function filterCity(c){cCity=c;renderFeed();}",
  "function setSearch(v){cQuery=(v||'').trim();renderFeed();}",
  "function filterJkh(q){var qr=String(q||'').toLowerCase().trim(),b=document.getElementById('dir-jkh');if(!b)return;b.querySelectorAll('.w-row').forEach(function(r){r.style.display=(!qr||(r.textContent||'').toLowerCase().indexOf(qr)!==-1)?'flex':'none';});}",
  "function renderGuide(q){var lb=document.getElementById('guide-items');if(!lb)return;var qr=String(q||'').toLowerCase().trim();lb.innerHTML=PRIM_GUIDE.filter(function(it){return !qr||(it.cat+' '+it.title+' '+it.addr).toLowerCase().indexOf(qr)!==-1;}).map(function(g){return '<div class=\"w-row\"><div style=\"flex:1;padding-right:8px\"><div style=\"font-size:11px;color:var(--accent);font-weight:700\">'+g.cat+'</div><div style=\"font-weight:700;font-size:13px\">'+g.title+'</div><div style=\"font-size:11.5px;color:var(--muted)\">📍 '+g.addr+'</div></div><a href=\"tel:'+cleanDigits(g.phone)+'\" class=\"tel-pill\">📞 Позвонить</a></div>';}).join('');}",
  "function shareCard(id,btn){var n=(window.NEWS||[]).find(function(x){return String(x.id)===String(id);});if(!n)return;if(btn)btn.textContent='⏳ Создаём...';var c=document.createElement('canvas');c.width=1080;c.height=620;var x=c.getContext('2d');if(!x)return;x.fillStyle='#0f172a';x.fillRect(0,0,1080,620);x.fillStyle='#c81e1e';x.fillRect(0,0,1080,14);x.fillRect(56,48,260,48);x.fillStyle='#fff';x.font='900 24px sans-serif';x.fillText('ПРИМ_ДОЗОР • 24/7',74,80);x.font='800 40px sans-serif';var w=String(n.title||'').split(' '),l='',y=170;for(var i=0;i<w.length;i++){var t=l+w[i]+' ';if(x.measureText(t).width>960&&i>0){x.fillText(l,56,y);l=w[i]+' ';y+=52;}else l=t;}x.fillText(l,56,y);x.fillStyle='#94a3b8';x.font='700 22px sans-serif';x.fillText('primdozor.ru',56,574);var a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='primdozor-'+n.id+'.png';a.click();if(btn)btn.textContent='✓ Карточка скачана';}",
  "function openArt(id){var n=(window.NEWS||[]).find(function(x){return String(x.id)===String(id);});if(!n)return;var mb=document.getElementById('m-body'),md=document.getElementById('modal');if(!mb||!md)return;mb.innerHTML='<div class=\"news-meta\"><span class=\"badge-cat\">'+n.catLabel+'</span> <span>'+n.city+'</span> <span>• '+n.date+'</span></div><h1 style=\"font-size:21px;margin:8px 0 14px\">'+n.title+'</h1><img src=\"./'+n.cover+'\" style=\"width:100%;border-radius:10px;margin-bottom:14px\"><div class=\"tldr\"><strong>Главное:</strong><br>'+(n.tldr||'').replace(/\\n/g,'<br>')+'</div><div style=\"white-space:pre-line;line-height:1.75;margin-bottom:16px\">'+n.text+'</div><div style=\"display:flex;flex-wrap:wrap;gap:8px;padding-top:12px;border-top:1px solid var(--border)\"><button type=\"button\" class=\"btn-cta\" onclick=\"shareCard(\\''+n.id+'\\',this)\">🖼 Карточка для чата</button> <a href=\"https://t.me\" target=\"_blank\" class=\"soc-pill\">✈ Telegram</a></div>';md.style.display='flex';}",
  "function openAfisha(idx){var a=getByIdx((window.DIRECTORIES||{}).afisha,idx);if(!a)return;var mb=document.getElementById('m-body'),md=document.getElementById('modal');if(!mb||!md)return;mb.innerHTML='<div class=\"news-meta\"><span class=\"badge-cat\">'+(a.tag||'Афиша')+'</span> <span>'+(a.city||'Приморье')+'</span></div><h1 style=\"font-size:21px;margin:8px 0 14px\">'+a.title+'</h1><div class=\"tldr\"><div>📅 '+(a.date||'')+'</div><div>📍 '+(a.place||a.city||'')+'</div><div>🎟 Вход свободный</div></div><div style=\"line-height:1.7\">'+(a.desc||'')+'</div>';md.style.display='flex';}",
"function switchDirTab(id,b){document.querySelectorAll('.mini-tab').forEach(function(x){x.classList.remove('active');});if(b)b.classList.add('active');['dir-jkh','dir-phones','dir-afisha','dir-guide'].forEach(function(k){var e=document.getElementById(k);if(e)e.style.display=(k===id)?'block':'none';});}",
"function renderCityPhones(c){var p=(window.DIRECTORIES||{}).phones||{},l=p[c]||p['Все города']||[],b=document.getElementById('phones-list');if(b)b.innerHTML=l.map(function(x){return '<div class="w-row"><span style="flex:1;padding-right:8px">'+x.name+'<a href="tel:'+cleanDigits(String(x.num||'').split('/')[0])+'" class="tel-pill">📞 '+x.num+'';}).join('');}",
"function drawSeason(){var b=document.getElementById('season-banner');if(!b)return;b.style.padding='0';b.style.border='none';b.style.borderRadius='14px';b.style.overflow='hidden';b.style.height='100px';b.style.display='block';b.innerHTML='';var c=document.createElement('canvas');c.width=1200;c.height=100;c.style.width='100%';c.style.height='100%';b.appendChild(c);var x=c.getContext('2d');if(!x)return;var g=x.createLinearGradient(0,0,1200,100);g.addColorStop(0,'#2d0c04');g.addColorStop(0.5,'#9a3412');g.addColorStop(1,'#d97706');x.fillStyle=g;x.fillRect(0,0,1200,100);x.fillStyle='rgba(10,6,4,0.4)';x.beginPath();x.moveTo(0,100);x.lineTo(0,72);x.quadraticCurveTo(320,46,640,76);x.quadraticCurveTo(920,96,1200,64);x.lineTo(1200,100);x.fill();}",
"function openReport(){var m=document.getElementById('report-modal');if(m)m.style.display='flex';}",
"function sendReport(e){e.preventDefault();var c=(document.getElementById('rep-city')||{}).value||'Приморье',t=((document.getElementById('rep-text')||{}).value||'').trim();if(!t)return;window.open('t.me('Народный контроль ('+c+'):\n'+t),'_blank');var m=document.getElementById('report-modal');if(m)m.style.display='none';}",
"function initSite(){try{if(localStorage.getItem('ck')){var ck=document.getElementById('ck');if(ck)ck.style.display='none';}}catch(e){}drawSeason();renderCityPhones('Все города');renderGuide('');var fw=getByIdx(window.WEATHER,0);if(fw)applyW(fw);fetchW(0);setInterval(function(){var vl=new Date(Date.now()+new Date().getTimezoneOffset()*60000+36000000),cl=document.getElementById('clock');if(cl)cl.textContent='Владивосток '+String(vl.getHours()).padStart(2,'0')+':'+String(vl.getMinutes()).padStart(2,'0');},5000);}",
"if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initSite);}else{initSite();}"
].join(NL);
function buildHtml(news, weather, rates) {
if (!fs.existsSync('news')) fs.mkdirSync('news', { recursive: true });
const list = Array.isArray(news) ? news : [];
const w0 = (Array.isArray(weather) && weather.length > 0 ? weather.at(0) : null) || {
name: 'Владивосток', now: '🌤 0°C', morning: '-2°C', day: '+2°C', evening: '0°C', tomorrow: '+3°C'
};
let dir = { outages: [], phones: {}, afisha: [] };
if (fs.existsSync('data/directories.json')) {
try { dir = JSON.parse(fs.readFileSync('data/directories.json', 'utf8')); } catch (e) {}
}
let traffic = [
{ name: 'Золотой мост', level: 'ok', status: 'Свободно' },
{ name: 'Русский мост', level: 'ok', status: 'Свободно' },
{ name: 'Де-Фриз — Седанка', level: 'ok', status: 'Свободно' },
{ name: 'Трасса А-370 (Уссури)', level: 'ok', status: 'Свободно' },
{ name: 'Трасса на Находку', level: 'ok', status: 'Свободно' }
];
if (fs.existsSync('data/traffic.json')) {
try {
const pt = JSON.parse(fs.readFileSync('data/traffic.json', 'utf8'));
if (Array.isArray(pt) && pt.length > 0) traffic = pt;
} catch (e) {}
}
const trafficHtml = traffic.map(t => {
const dc = t.level === 'danger' ? '#ef4444' : t.level === 'warn' ? '#f59e0b' : '#10b981';
return tag('span', 'class="soc-pill"', tag('span', 'style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dc + ';margin-right:6px"', '') + esc(t.name) + ': ' + tag('strong', '', esc(t.status)));
}).join('');
const freeAfisha = (dir.afisha || []).filter(a => !/руб|₽|билет от/i.test(String(a.price || '')));
const jkhHtml = tag('input', 'type="search" class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" placeholder="Поиск отключения по улице..." oninput="filterJkh(this.value)"') +
(dir.outages || []).map(o =>
tag('div', 'class="w-row"',
tag('div', 'style="flex:1;padding-right:8px"',
tag('div', 'style="font-size:11px;color:var(--accent);font-weight:700"', esc(o.city) + ' • ' + esc(o.type || 'Мониторинг 24/7')) +
tag('div', 'style="font-size:13px;line-height:1.35;margin-top:2px"', esc(o.status))
) +
tag('a', 'href="' + telHref(o.phone) + '" class="tel-pill"', '📞 ' + esc(o.phone))
)
).join('');
const afishaHtml = freeAfisha.map((a, idx) =>
tag('div', 'class="w-row afisha-item" onclick="openAfisha(' + idx + ')"',
tag('div', 'style="flex:1"',
tag('div', 'style="font-size:11.5px;color:var(--accent);font-weight:700"', '📅 ' + esc(a.date) + ' • ' + esc(a.city)) +
tag('div', 'style="font-weight:700;font-size:13.5px;margin:3px 0"', esc(a.title)) +
tag('div', 'style="font-size:12px;opacity:0.85"', '📍 ' + esc(a.place || a.city)) +
tag('div', 'style="font-size:11.5px;color:var(--muted);margin-top:3px"', '🎟 Вход свободный • Подробнее →')
)
)
).join('');
for (const p of list) {
const body = tag('article', 'class="widget" style="padding:24px"',
tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(p.catLabel)) + tag('span', '', esc(p.city)) + tag('span', '', '• ' + esc(p.date))) +
tag('h1', 'style="font-size:24px;line-height:1.3;margin:10px 0 14px"', esc(p.title)) +
tag('img', 'class="hero-img" src="/' + esc(p.cover) + '" alt="" style="border-radius:10px;margin-bottom:14px"') +
tag('div', 'class="tldr"', esc(p.tldr).split(NL).join(tag('br'))) +
tag('div', 'style="font-size:16px;white-space:pre-line;line-height:1.75"', esc(p.text))
);
const artHtml = '' + tag('html', 'lang="ru"',
tag('head', '', tag('meta', 'charset="UTF-8"') + tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') + tag('title', '', esc(p.title) + ' — Прим_Дозор') + tag('link', 'rel="stylesheet" href="/style.css?v=130"')) +
tag('body', '', tag('header', 'class="site-header"', tag('div', 'class="wrap header-inner"', tag('a', 'href="/" class="brand"', tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР')) + tag('a', 'href="/" class="soc-pill"', '← На главную'))) + tag('main', 'class="wrap" style="max-width:800px;margin-top:20px"', body))
);
fs.writeFileSync('news/' + p.id + '.html', artHtml, 'utf8');
}
const cards = list.length ? list.map((n, i) => {
const lead = String(n.text || '').replace(/\s+/g, ' ').slice(0, 155);
const loc = esc(n.city) + (n.district ? ' • ' + esc(n.district) : '');
const meta = tag('div', 'class="news-meta"', tag('span', 'class="badge-cat"', esc(n.catLabel)) + tag('span', '', loc) + tag('span', '', '• ' + esc(n.date)) + tag('span', 'class="badge-age"', esc(n.age)));
const attr = 'data-id="' + esc(n.id) + '" onclick="openArt(this.dataset.id)"';
return i === 0
? tag('article', 'class="hero-card" ' + attr, tag('img', 'class="hero-img" src="./' + esc(n.cover) + '" alt=""') + tag('div', 'class="hero-body"', meta + tag('h2', 'class="hero-title"', esc(n.title)) + tag('p', 'class="hero-lead"', esc(lead) + '...')))
: tag('article', 'class="news-card" ' + attr, tag('img', 'class="news-thumb" src="./' + esc(n.cover) + '" alt="" loading="lazy"') + tag('div', '', meta + tag('h3', 'class="news-title"', esc(n.title)) + tag('p', 'class="news-excerpt"', esc(lead) + '...')));
}).join('') : tag('div', 'class="widget"', tag('p', 'style="color:var(--muted)"', 'Лента новостей обновляется. Первые сводки появятся в 07:00 по Владивостоку.'));
const wCities = ['Владивосток','Уссурийск','Находка','Артём','Большой Камень','Арсеньев','Спасск-Дальний','Партизанск','Дальнегорск'].map((c, i) => tag('option', 'value="' + i + '"', c)).join('');
const fCities = [
['all','Весь край'], ['Владивосток','Владивосток (весь)'], ['Первомайский','↳ Первомайский (Чуркин)'],
['Ленинский','↳ Ленинский р-н'], ['Первореченский','↳ Первореченский р-н'], ['Советский','↳ Советский р-н'],
['Фрунзенский','↳ Фрунзенский (Центр)'], ['Русский','↳ о. Русский'], ['Уссурийск','Уссурийск'],
['Находка','Находка'], ['Артём','Артём'], ['Большой Камень','Большой Камень']
].map(c => tag('option', 'value="' + c.at(0) + '"', c.at(1))).join('');
const tabsHtml = [
['all','Главное',1], ['chp','ЧП и 112',0], ['city','Город и ЖКХ',0],
['law','Законы и Власть',0], ['svo','СВО и Защита',0], ['family','Общество',0], ['sport','Спорт и Афиша',0]
].map(t => tag('button', 'type="button" class="tab' + (t.at(2) ? ' active' : '') + '" onclick="filterCat(' + SQ + t.at(0) + SQ + ',this)"', t.at(1))).join('');
const socLinks = [
[['https:', '', 't.me'].join(SLASH), '✈ Telegram'],
[['https:', '', 'max.ru'].join(SLASH), '💬 МАКС'],
[['https:', '', 'vk.ru'].join(SLASH), '🌐 ВК'],
[['https:', '', 'dzen.ru'].join(SLASH), '🔥 Дзен']
].map(s => tag('a', 'href="' + s.at(0) + '" target="_blank" rel="noopener" class="soc-pill"', s.at(1))).join('');
const pCities = ['Все города','Владивосток','Уссурийск','Находка','Артём','Большой Камень'].map(c => tag('option', 'value="' + c + '"', c === 'Все города' ? 'Экстренные службы края' : c)).join('');
const repCities = ['Владивосток','Уссурийск','Находка','Артём','Большой Камень','Другой город Приморья'].map(c => tag('option', '', c)).join('');
const headHtml = tag('head', '',
tag('meta', 'charset="UTF-8"') +
tag('meta', 'name="viewport" content="width=device-width,initial-scale=1"') +
tag('meta', 'name="yandex-verification" content="0dc10018fffed4cc"') +
tag('title', '', 'Прим_Дозор — Главные новости Владивостока и Приморского края 24/7 (18+)') +
tag('link', 'rel="canonical" href="https://primdozor.ru"') +
tag('link', 'rel="stylesheet" href="/style.css?v=130"')
);
const infobarHtml = tag('div', 'class="infobar"',
tag('div', 'class="wrap infobar-inner"',
tag('div', 'class="infobar-left"',
tag('span', 'class="live-dot"', '') +
tag('strong', 'id="clock"', 'Владивосток') +
tag('select', 'class="pill-btn" id="w-sel" onchange="setWeather(this.value)"', wCities) +
tag('strong', 'id="w-top"', esc(w0.now))
) +
tag('div', 'class="infobar-right"',
tag('span', 'class="hide-mob"', '$' + esc(rates.usd) + ' | €' + esc(rates.eur) + ' | ¥' + esc(rates.cny)) +
tag('button', 'type="button" class="pill-btn" onclick="document.body.classList.toggle(' + SQ + 'big-font' + SQ + ')"', 'А+') +
tag('button', 'type="button" class="pill-btn" onclick="document.body.classList.toggle(' + SQ + 'dark' + SQ + ')"', '🌙')
)
)
);
const headerHtml = tag('header', 'class="site-header"',
tag('div', 'class="wrap header-inner"',
tag('a', 'href="/" class="brand"',
tag('span', 'class="brand-mark"', 'ПРИМ_ДОЗОР') +
tag('span', 'class="brand-sub"', 'Приморский край 24/7') +
tag('span', 'class="brand-age"', '18+')
) +
tag('div', 'class="header-actions"',
tag('select', 'class="filter-city" onchange="filterCity(this.value)"', fCities) +
tag('button', 'type="button" class="btn-cta" onclick="openReport()"', '+ Прислать новость')
)
)
);
const navHtml = tag('div', 'class="nav-strip"', tag('div', 'class="wrap"', tag('nav', 'class="tabs"', tabsHtml)));
const guideHtml = tag('input', 'type="search" class="input" style="margin-bottom:8px;padding:6px 10px;font-size:13px" placeholder="Травмпункт, аптека, паром..." oninput="renderGuide(this.value)"') + tag('div', 'id="guide-items"', '');
const asideHtml = tag('aside', '',
tag('div', 'class="widget"',
tag('div', 'class="widget-title"', 'Отключения и службы 24/7') +
tag('div', 'class="mini-tabs"',
tag('button', 'type="button" class="mini-tab active" onclick="switchDirTab(' + SQ + 'dir-jkh' + SQ + ',this)"', 'ЖКХ и свет') +
tag('button', 'type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-phones' + SQ + ',this)"', 'Телефоны') +
tag('button', 'type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-afisha' + SQ + ',this)"', 'Афиша') +
tag('button', 'type="button" class="mini-tab" onclick="switchDirTab(' + SQ + 'dir-guide' + SQ + ',this)"', '24/7')
) +
tag('div', 'id="dir-jkh"', jkhHtml) +
tag('div', 'id="dir-phones" style="display:none"', tag('select', 'class="input" style="margin-bottom:8px;padding:6px 8px;font-size:13px" onchange="renderCityPhones(this.value)"', pCities) + tag('div', 'id="phones-list"', '')) +
tag('div', 'id="dir-afisha" style="display:none"', afishaHtml) +
tag('div', 'id="dir-guide" style="display:none"', guideHtml)
) +
tag('div', 'class="widget"',
tag('div', 'class="widget-title"', 'Погода: ' + tag('span', 'id="w-name"', esc(w0.name))) +
tag('div', 'class="w-row"', tag('span', '', 'Сейчас') + tag('strong', 'id="w-now"', esc(w0.now))) +
tag('div', 'class="w-row"', tag('span', '', 'Утром') + tag('strong', 'id="w-m"', esc(w0.morning))) +
tag('div', 'class="w-row"', tag('span', '', 'Днём') + tag('strong', 'id="w-d"', esc(w0.day))) +
tag('div', 'class="w-row"', tag('span', '', 'Вечером') + tag('strong', 'id="w-e"', esc(w0.evening))) +
tag('div', 'class="w-row"', tag('span', '', 'Завтра') + tag('strong', 'id="w-t"', esc(w0.tomorrow)))
) +
tag('div', 'class="widget"',
tag('div', 'class="widget-title"', 'Курсы ЦБ РФ') +
tag('div', 'class="w-row"', tag('span', '', 'Доллар (USD)') + tag('strong', '', esc(rates.usd) + ' ₽')) +
tag('div', 'class="w-row"', tag('span', '', 'Евро (EUR)') + tag('strong', '', esc(rates.eur) + ' ₽')) +
tag('div', 'class="w-row"', tag('span', '', 'Юань (CNY)') + tag('strong', '', esc(rates.cny) + ' ₽')) +
tag('div', 'class="w-row"', tag('span', '', '100 Иен (JPY)') + tag('strong', '', esc(rates.jpy) + ' ₽'))
) +
tag('div', 'class="widget"',
tag('div', 'class="widget-title"', 'Редакция и СМИ') +
tag('a', 'href="mailto:prim_dozor@internet.ru" class="w-row"', tag('span', '', 'Почта редакции') + tag('strong', '', 'prim_dozor@internet.ru')) +
tag('a', 'href="/legal.html" class="w-row"', tag('span', '', '⚖ Правовая информация (152-ФЗ)') + tag('strong', '', '→'))
)
);
const editorialSlotHtml =
tag('div', 'class="ad-tag"', tag('span', '', 'Народный контроль Приморья • 24/7') + ' ' + tag('span', '', 'Бесплатно для жителей края')) +
tag('div', 'style="font-weight:800;font-size:15px;margin-bottom:6px"', 'Сообщите о проблеме ЖКХ, ДТП или перекрытии дороги') +
tag('div', 'style="font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.45"', 'Оперативно публикуем сигналы жителей Владивостока, Уссурийска, Находки, Артёма и других городов Приморского края.') +
tag('div', 'style="display:flex;flex-wrap:wrap;gap:8px"',
tag('button', 'type="button" class="btn-cta" onclick="openReport()"', '📢 Сообщить в редакцию') +
tag('a', 'href="mailto:prim_dozor@internet.ru?subject=%D0%A0%D0%B5%D0%BA%D0%BB%D0%B0%D0%BC%D0%B0%20%D0%BD%D0%B0%20PrimDozor.ru" class="soc-pill"', '💼 Разместить рекламу (38-ФЗ)')
);
const mainWrapHtml = tag('div', 'class="wrap"',
tag('div', 'id="season-banner" class="season-banner"', '') +
tag('div', 'class="soc-pills" style="margin-top:10px"', trafficHtml) +
tag('div', 'class="sub-tools"',
tag('input', 'type="search" class="search-input" placeholder="Поиск по новостям и районам Приморья..." oninput="setSearch(this.value)"') +
tag('div', 'class="soc-pills"', socLinks)
) +
tag('div', 'class="layout"',
tag('div', '', tag('main', 'id="feed"', cards) + tag('div', 'id="ad-slot" class="ad-box"', editorialSlotHtml)) +
asideHtml
)
);
const modalsHtml =
tag('div', 'id="modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
tag('div', 'class="modal-sheet"',
tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
tag('strong', 'style="color:var(--accent)"', 'ПРИМ_ДОЗОР • 18+') +
tag('button', 'type="button" class="soc-pill" onclick="document.getElementById(' + SQ + 'modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕ Закрыть')
) +
tag('div', 'id="m-body"', '')
)
) +
tag('div', 'id="report-modal" class="modal" onclick="if(event.target===this)this.style.display=' + SQ + 'none' + SQ + '"',
tag('div', 'class="modal-sheet" style="max-width:480px"',
tag('div', 'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"',
tag('strong', '', 'Народный контроль Приморья') +
tag('button', 'type="button" class="soc-pill" onclick="document.getElementById(' + SQ + 'report-modal' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', '✕')
) +
tag('form', 'onsubmit="sendReport(event)"',
tag('select', 'id="rep-city" class="input"', repCities) +
tag('textarea', 'id="rep-text" class="input" rows="4" placeholder="Опишите событие, адрес ДТП, отключение воды или света..." required', '') +
tag('p', 'style="font-size:11.5px;color:var(--muted);margin-bottom:10px"', 'Отправляя сообщение, вы соглашаетесь с политикой обработки персональных данных (152-ФЗ).') +
tag('button', 'type="submit" class="btn-cta" style="width:100%;padding:10px"', 'Отправить в редакцию (Telegram)')
)
)
) +
tag('div', 'id="ck" class="cookie-bar"',
tag('span', '', '🍪 Используем cookie и Яндекс.Метрику (152-ФЗ). ' + tag('a', 'href="/legal.html" style="text-decoration:underline"', 'Подробнее')) +
tag('button', 'type="button" class="btn-cta" onclick="try{localStorage.setItem(' + SQ + 'ck' + SQ + ',' + SQ + '1' + SQ + ')}catch(e){};document.getElementById(' + SQ + 'ck' + SQ + ').style.display=' + SQ + 'none' + SQ + '"', 'ОК')
) +
tag('footer', 'class="site-footer"',
tag('div', 'class="wrap"', '© 2026 Прим_Дозор (18+). Региональный информационный портал Приморского края. Администратор: Козин А.И. • ' + tag('a', 'href="/legal.html" style="text-decoration:underline;"', 'Правовая информация и 152-ФЗ'))
);
const dirClean = Object.assign({}, dir, { afisha: freeAfisha });
const scriptsHtml = tag('script', '',
NL + 'window.NEWS=' + safeJson(list) + ';' +
NL + 'window.WEATHER=' + safeJson(weather) + ';' +
NL + 'window.DIRECTORIES=' + safeJson(dirClean) + ';' +
NL + CLIENT_JS + NL
);
fs.writeFileSync('index.html', '' + tag('html', 'lang="ru"', headHtml + tag('body', '', infobarHtml + headerHtml + navHtml + mainWrapHtml + modalsHtml + scriptsHtml)), 'utf8');
const urls = [tag('url', '', tag('loc', '', 'https://' + HOST + '/') + tag('priority', '', '1.0'))];
for (const n of list) {
urls.push(tag('url', '', tag('loc', '', 'https://' + HOST + '/news/' + n.id + '.html') + tag('priority', '', '0.8')));
}
fs.writeFileSync('sitemap.xml', '' + NL + tag('urlset', 'xmlns="sitemaps.org"', NL + urls.join(NL) + NL), 'utf8');
fs.writeFileSync('robots.txt', ['User-agent: *', 'Allow: /', 'Disallow: /data/', 'Host: https://' + HOST, 'Sitemap: https://' + HOST + '/sitemap.xml'].join(NL), 'utf8');
}
module.exports = { buildHtml };
