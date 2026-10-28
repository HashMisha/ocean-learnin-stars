/*
 * Раздел «Региональный компонент».
 * Регион определяется ТОЛЬКО по действию пользователя: кнопка «Определить по геопозиции» (браузер спросит разрешение)
 * или ввод региона/города. Координаты уходят в OpenStreetMap Nominatim лишь для получения названия региона.
 * Дальше: опорные сведения из data/regions.js + поиск в открытых источниках (Википедия, Wikimedia Commons).
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  App.pages = App.pages || {};

  const KEY = 'ols.region';
  const REGIONS = window.SITE_DATA.regions || [];
  const NOMINATIM = 'https://nominatim.openstreetmap.org';
  const WIKI = 'https://ru.wikipedia.org';

  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').trim();

  function matchRegion(name) {
    const n = norm(name);
    if (!n) return null;
    return REGIONS.find((r) => r.names.some((a) => n.includes(norm(a)) || norm(a).includes(n) && n.length > 3)) || null;
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function writeSaved(v) {
    try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (e) { /* без запоминания */ }
  }

  async function getJson(url) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10000);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { 'Accept-Language': 'ru' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  const stateOf = (addr) => (addr && (addr.state || addr.region || addr.city || addr.county)) || '';

  async function byText(q) {
    const local = matchRegion(q);
    if (local) return { name: local.title, how: 'по запросу «' + q + '»' };
    const list = await getJson(NOMINATIM + '/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=ru&accept-language=ru&q=' + encodeURIComponent(q));
    if (!list.length) throw new Error('Не нашли такое место. Попробуйте написать область или город иначе.');
    return { name: stateOf(list[0].address) || q, place: list[0].name, how: 'по запросу «' + q + '»' };
  }

  function byGeo() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Браузер не умеет определять местоположение. Введите регион вручную.'));
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const j = await getJson(NOMINATIM + '/reverse?format=jsonv2&zoom=5&accept-language=ru&lat=' + pos.coords.latitude.toFixed(3) + '&lon=' + pos.coords.longitude.toFixed(3));
          resolve({ name: stateOf(j.address) || j.display_name, how: 'по геопозиции' });
        } catch (e) { reject(new Error('Не удалось узнать название региона. Введите его вручную.')); }
      }, (err) => reject(new Error(err.code === 1 ? 'Доступ к местоположению не разрешён. Можно просто ввести регион или город.' : 'Не удалось определить местоположение. Введите регион вручную.')),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 3600000 });
    });
  }

  function card(title, items) {
    if (!items || !items.length) return '';
    return '<section class="panel reg-card"><h3>' + title + '</h3><ul>' + items.map((i) => '<li>' + U.esc(i) + '</li>').join('') + '</ul></section>';
  }

  const QUERIES = [
    ['Народные промыслы и ремёсла', (n) => n + ' народные промыслы'],
    ['Природа и животные', (n) => n + ' природа животные заповедник'],
    ['Красная книга', (n) => 'Красная книга ' + n],
    ['Праздники и традиции', (n) => n + ' народные праздники традиции'],
    ['Достопримечательности', (n) => n + ' достопримечательности']
  ];

  App.pages.region = {
    title: 'Региональный компонент',
    render(root) {
      const online = App.sources.enabled();
      root.innerHTML =
        '<section class="page-head"><p class="eyebrow">Часть программы, формируемая участниками образовательных отношений</p><h1>Региональный компонент</h1>' +
        '<p class="lead">Материалы о родном крае: природа, промыслы, традиции, писатели и места для экскурсий. Укажите регион — сайт покажет опорные сведения и найдёт материалы в открытых источниках.</p></section>' +
        '<section class="panel reg-find">' +
        '<form class="reg-form"><label class="feed-search">' + U.icon('search') + '<span class="sr-only">Регион или город</span>' +
        '<input id="reg-q" type="search" placeholder="Регион или город: Казань, Кубань, Вологодская область…" autocomplete="off"></label>' +
        '<button type="submit" class="btn btn--primary">Найти</button>' +
        '<button type="button" class="btn" data-geo>' + U.icon('home') + 'Определить по геопозиции</button></form>' +
        '<p class="reg-note">Местоположение запрашивается только по нажатию кнопки, и браузер сначала спросит разрешение. Координаты (с точностью до ~100 м) отправляются в OpenStreetMap лишь для того, чтобы узнать название региона; сайт их не хранит. Выбранный регион запоминается только в этом браузере.</p>' +
        '<div class="chip-row"><span class="chip-row-label">Быстрый выбор</span>' + REGIONS.map((r) => '<button type="button" class="chip" data-reg="' + U.esc(r.title) + '">' + U.esc(r.title) + '</button>').join('') + '</div>' +
        '<p class="reg-status" aria-live="polite"></p></section>' +
        (online ? '' : '<div class="notice panel">В предпросмотре claude.ai геопозиция и поиск в открытых источниках недоступны. Опорные сведения по регионам из списка работают.</div>') +
        '<div class="reg-out"></div>';

      const out = root.querySelector('.reg-out'), status = root.querySelector('.reg-status');

      async function show(found) {
        writeSaved(found);
        const r = matchRegion(found.name);
        const name = r ? r.title : found.name;
        status.innerHTML = 'Регион: <b>' + U.esc(name) + '</b> (' + U.esc(found.how) + (found.place ? ', ' + U.esc(found.place) : '') + ') · <button type="button" class="linkbtn" data-forget>Сбросить</button>';
        out.innerHTML =
          '<section class="reg-head"><h2>' + U.esc(name) + '</h2>' +
          '<div class="editor-row"><button type="button" class="btn btn--primary" data-deck>' + U.icon('slides') + 'Собрать презентацию о крае</button></div></section>' +
          '<div class="reg-wiki"></div>' +
          (r ? '<div class="reg-grid">' + card('Природа', r.nature) + card('Промыслы и ремёсла', r.crafts) + card('Традиции и культура', r.culture) +
            card('Куда сходить с детьми', r.places) + card('Почитать', r.books) + '</div>' +
            '<div class="chip-row"><span class="chip-row-label">Материалы сайта по темам края</span>' + r.topics.map((t) => '<a class="chip" href="#printables?q=' + encodeURIComponent(t) + '&season=any">' + U.esc(t) + '</a>').join('') + '</div>'
            : '<div class="notice panel">Для этого региона на сайте пока нет готовой подборки — ниже то, что нашлось в открытых источниках.</div>') +
          '<section class="reg-open"><h2 class="sec-title">Найдено в открытых источниках</h2><div class="reg-links">' +
          QUERIES.map(([t]) => '<section class="panel reg-card"><h3>' + t + '</h3><ul class="reg-list"><li class="reg-wait">Ищем в Википедии…</li></ul></section>').join('') + '</div>' +
          '<h3 class="sec-title">Картинки о крае (Wikimedia Commons)</h3><div class="picker-grid reg-pics"><p class="picker-status">Ищем картинки…</p></div>' +
          '<p class="reg-note">Тексты Википедии — CC BY-SA 4.0, у каждой картинки свой автор и лицензия (видны при наведении). Проверяйте материалы перед занятием.</p></section>';
        const ctx = { name, region: r, pics: [] };
        out.querySelector('[data-deck]').onclick = () => regionDeck(ctx);
        if (!online) {
          out.querySelector('.reg-open').innerHTML = '<p class="picker-status">Поиск в открытых источниках работает на опубликованном сайте.</p>';
          return;
        }
        // Справка
        getJson(WIKI + '/api/rest_v1/page/summary/' + encodeURIComponent((r && r.wiki) || name)).then((j) => {
          ctx.summary = j.extract;
          out.querySelector('.reg-wiki').innerHTML = '<section class="panel reg-summary">' + (j.thumbnail ? '<img src="' + U.esc(j.thumbnail.source) + '" alt="" loading="lazy">' : '') +
            '<div><p>' + U.esc(j.extract || '') + '</p><a href="' + U.esc((j.content_urls && j.content_urls.desktop.page) || WIKI) + '" target="_blank" rel="noopener">Статья в Википедии' + U.icon('external', 'i-s') + '</a></div></section>';
        }).catch(() => {});
        // Подборки ссылок
        QUERIES.forEach(([, q], i) => {
          getJson(WIKI + '/w/api.php?action=query&format=json&origin=*&list=search&srlimit=4&srsearch=' + encodeURIComponent(q(name))).then((j) => {
            const list = (j.query && j.query.search) || [];
            const ul = out.querySelectorAll('.reg-list')[i];
            ul.innerHTML = list.length ? list.map((x) => '<li><a href="' + WIKI + '/wiki/' + encodeURIComponent(x.title.replace(/ /g, '_')) + '" target="_blank" rel="noopener">' + U.esc(x.title) + '</a>' +
              '<span>' + U.esc(x.snippet.replace(/<[^>]+>/g, '').slice(0, 140)) + '…</span></li>').join('') : '<li>Ничего не нашлось</li>';
          }).catch(() => { out.querySelectorAll('.reg-list')[i].innerHTML = '<li>Википедия не ответила</li>'; });
        });
        // Картинки
        App.sources.translate(name).then((en) => App.sources.searchCommons(en + ' filetype:bitmap', { subjects: ['world'] }, 12)).then((items) => {
          ctx.pics = items;
          out.querySelector('.reg-pics').innerHTML = items.length ? items.map((p) => '<a class="pick" href="' + U.esc(p.source.url) + '" target="_blank" rel="noopener" title="' + U.esc(p.title + ' — ' + p.author.slice(0, 60) + ', ' + p.license.code) + '"><img src="' + U.esc(p.preview) + '" alt="' + U.esc(p.title) + '" loading="lazy"></a>').join('') : '<p class="picker-status">Картинок не нашлось</p>';
        }).catch(() => { out.querySelector('.reg-pics').innerHTML = '<p class="picker-status">Wikimedia Commons не ответил</p>'; });
      }

      // Презентация о крае: разделы подборки + картинки Commons, затем переход в конструктор.
      function regionDeck(ctx) {
        const r = ctx.region, pics = ctx.pics.slice();
        const pic = () => { const p = pics.shift(); return p ? { url: p.preview, credit: p.author.slice(0, 60) + ', ' + p.license.code + ', Wikimedia Commons' } : null; };
        const slides = [{ layout: 'title', title: 'Мой край: ' + ctx.name, text: 'Региональный компонент', image: pic() }];
        if (ctx.summary) slides.push({ layout: 'text', title: 'Где мы живём', text: ctx.summary.split(/(?<=\.)\s/).slice(0, 3).join('\n') });
        if (r) [['Природа', r.nature], ['Промыслы и ремёсла', r.crafts], ['Традиции', r.culture], ['Куда сходить', r.places]].forEach(([t, list]) => {
          if (list && list.length) { const im = pic(); slides.push({ layout: im ? 'image-text' : 'text', title: t, text: list.join('\n'), image: im }); }
        });
        slides.push({ layout: 'title', title: 'Люблю свой край!', text: 'Спасибо за внимание' });
        try {
          const prev = JSON.parse(localStorage.getItem('ols.slides.v1') || 'null');
          localStorage.setItem('ols.slides.v1', JSON.stringify({ title: 'Мой край: ' + ctx.name, theme: (prev && prev.theme) || 'kids-spring', slides: slides.map((s) => Object.assign({ id: Math.random().toString(36).slice(2, 9), image: null }, s)) }));
        } catch (e) { return U.toast('Браузер не дал сохранить презентацию', 'error'); }
        App.router.navigate('slides', {});
        U.toast('Презентация о крае готова — проверьте и дополните слайды');
      }

      async function run(fn) {
        status.textContent = 'Определяем регион…';
        try { await show(await fn()); } catch (e) { status.textContent = e.message; }
      }

      root.querySelector('.reg-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = root.querySelector('#reg-q').value.trim();
        if (q.length < 2) return root.querySelector('#reg-q').focus();
        if (!online && !matchRegion(q)) { status.textContent = 'Выберите регион из списка ниже — поиск других мест работает на опубликованном сайте.'; return; }
        run(() => byText(q));
      });
      root.addEventListener('click', (e) => {
        if (e.target.closest('[data-geo]')) {
          if (!online) { status.textContent = 'Геопозиция работает на опубликованном сайте. Выберите регион из списка.'; return; }
          return run(byGeo);
        }
        const chip = e.target.closest('[data-reg]');
        if (chip) return run(async () => ({ name: chip.dataset.reg, how: 'выбран из списка' }));
        if (e.target.closest('[data-forget]')) { writeSaved(null); out.innerHTML = ''; status.textContent = 'Регион сброшен.'; }
      });

      const saved = readSaved();
      if (saved) show(saved);
    }
  };
})();
