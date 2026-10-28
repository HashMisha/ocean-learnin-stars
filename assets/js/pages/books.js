/* Раздел «Литература для дошкольников»: книги по трём возрастным группам, тексты из Викитеки для общественного достояния. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  App.pages = App.pages || {};

  const BOOKS = window.SITE_DATA.books || [];
  const GENRES = { folk: 'Фольклор', tale: 'Сказки', poem: 'Стихи', story: 'Рассказы', fable: 'Басни' };
  const WS = 'https://ru.wikisource.org';
  const searchUrl = (base, q) => base + '/w/index.php?search=' + encodeURIComponent(q);

  async function wikisource(q, limit) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch(WS + '/w/api.php?action=query&format=json&origin=*&list=search&srnamespace=0&srlimit=' + (limit || 4) + '&srsearch=' + encodeURIComponent(q), { signal: ctl.signal });
      const j = await r.json();
      return (j.query && j.query.search) || [];
    } finally { clearTimeout(t); }
  }

  function bookCard(b) {
    const author = b.author.replace(/^Русск(ий|ая) (фольклор|народная сказка)$/, '');
    return '<article class="book panel" data-id="' + b.id + '">' +
      '<div class="book-cover book-cover--' + b.genre + '" aria-hidden="true"><span>' + U.esc(b.title.replace(/^[«"]/, '')[0]) + '</span></div>' +
      '<div class="book-body"><p class="book-kind">' + GENRES[b.genre] + ' · ' + S.GROUPS[b.group].title + '</p>' +
      '<h3>' + U.esc(b.title) + '</h3><p class="book-author">' + U.esc(b.author) + '</p>' +
      '<p class="book-about">' + U.esc(b.about) + '</p>' +
      '<div class="book-tags">' + (b.tags || []).map((t) => '<a class="tag" href="#printables?q=' + encodeURIComponent(t) + '&season=any" title="Материалы сайта по теме">' + U.esc(t) + '</a>').join('') + '</div>' +
      '<p class="book-rights">' + (b.pd ? 'Общественное достояние — текст можно свободно читать и распечатывать' : 'Охраняется авторским правом — читайте по изданиям из библиотеки') + '</p>' +
      '<div class="editor-row">' +
      (b.pd ? '<button type="button" class="btn btn--sm btn--dl" data-ws="' + b.id + '">' + U.icon('book') + 'Найти текст в Викитеке</button>' : '') +
      '<a class="btn btn--sm btn--ghost" href="' + searchUrl('https://ru.wikipedia.org', b.title + ' ' + author) + '" target="_blank" rel="noopener">О книге в Википедии' + U.icon('external', 'i-s') + '</a></div>' +
      '<ul class="ws-results"></ul></div></article>';
  }

  App.pages.books = {
    title: 'Литература для дошкольников',
    render(root, params) {
      const st = { group: params.group || U.getGroup(), genre: 'all', q: params.q || '' };
      const online = App.sources.enabled();
      root.innerHTML =
        '<div class="group-slot">' + U.groupTabs(st.group) + '</div>' +
        '<section class="page-head"><p class="eyebrow">Что читать детям</p><h1>Литература для дошкольников</h1>' +
        '<p class="lead">Сказки, потешки, стихи и рассказы по возрастам: 1–3 года — первая младшая группа, 3–5 лет — средняя, 5–7 лет — старшая. Тексты из общественного достояния можно найти в Викитеке и распечатать.</p></section>' +
        '<section class="feed-tools panel"><label class="feed-search">' + U.icon('search') + '<span class="sr-only">Поиск книги</span>' +
        '<input id="books-q" type="search" placeholder="Поиск: Чуковский, зима, птицы…" autocomplete="off" value="' + U.esc(st.q) + '"></label>' +
        '<div class="chip-row genres" role="group" aria-label="Жанр"></div></section>' +
        '<div class="feed-meta"><p class="feed-status" aria-live="polite"></p><p class="feed-hint"></p></div>' +
        '<div class="books"></div>' +
        '<section class="panel ws-open" hidden><h2 class="sec-title">Найдено в Викитеке</h2><ul class="ws-results"></ul>' +
        '<p class="reg-note">Викитека — свободная библиотека текстов в общественном достоянии (лицензия CC BY-SA на оформление).</p></section>';

      const $ = (s) => root.querySelector(s);
      function draw() {
        root.querySelector('.genres').innerHTML = '<span class="chip-row-label">Жанр</span>' + [['all', 'Все']].concat(Object.entries(GENRES)).map(([k, l]) =>
          '<button type="button" class="chip' + (k === st.genre ? ' is-on' : '') + '" data-genre="' + k + '" aria-pressed="' + (k === st.genre) + '">' + l + '</button>').join('');
        let list = BOOKS.filter((b) => (st.group === 'all' || b.group === st.group) && (st.genre === 'all' || b.genre === st.genre));
        if (st.q.trim()) {
          const qs = U.stems(st.q);
          list = list.filter((b) => {
            const hay = U.stems([b.title, b.author, b.about, (b.tags || []).join(' ')].join(' '));
            return qs.every((q) => hay.some((h) => U.stemMatch(q, h) > 0));
          });
        }
        $('.books').innerHTML = list.map(bookCard).join('') || '<div class="empty panel"><h2>Таких книг в списке нет</h2><p>Попробуйте другое слово или поищите в Викитеке.</p></div>';
        $('.feed-status').textContent = 'Книг: ' + list.length + (st.group !== 'all' ? ' · ' + S.GROUPS[st.group].title + ', ' + S.GROUPS[st.group].sub : '');
        $('.feed-hint').innerHTML = st.q.trim().length > 2 && online ? '<button type="button" class="btn btn--sm" data-wsq>' + U.icon('search') + 'Искать «' + U.esc(st.q.trim()) + '» в Викитеке</button>' : '';
        App.router.updateParams('books', Object.assign(st.group !== 'all' ? { group: st.group } : {}, st.q ? { q: st.q } : {}));
      }
      function wsList(items) {
        return items.length ? items.map((x) => '<li><a href="' + WS + '/wiki/' + encodeURIComponent(x.title.replace(/ /g, '_')) + '" target="_blank" rel="noopener">' + U.esc(x.title) + U.icon('external', 'i-s') + '</a></li>').join('') : '<li>В Викитеке не нашлось</li>';
      }

      $('#books-q').addEventListener('input', U.debounce((e) => { st.q = e.target.value; draw(); }, 200));
      root.addEventListener('click', async (e) => {
        const gt = e.target.closest('[data-group]');
        if (gt) { st.group = gt.dataset.group; U.setGroup(st.group); $('.group-slot').innerHTML = U.groupTabs(st.group); return draw(); }
        const g = e.target.closest('[data-genre]');
        if (g) { st.genre = g.dataset.genre; return draw(); }
        const ws = e.target.closest('[data-ws]');
        if (ws) {
          if (!online) return U.toast('Поиск в Викитеке работает на опубликованном сайте');
          const b = BOOKS.find((x) => x.id === ws.dataset.ws);
          const ul = ws.closest('.book').querySelector('.ws-results');
          ul.innerHTML = '<li>Ищем…</li>';
          const author = b.author.split(' ').pop();
          try {
            let r = await wikisource(b.title.replace(/[«»]/g, '') + (/народн|фольклор/i.test(b.author) ? '' : ' ' + author), 3);
            if (!r.length) r = await wikisource(b.title.replace(/[«»]/g, ''), 3);
            ul.innerHTML = wsList(r);
          } catch (err) { ul.innerHTML = '<li>Викитека не ответила</li>'; }
          return;
        }
        if (e.target.closest('[data-wsq]')) {
          const box = $('.ws-open');
          box.hidden = false;
          box.querySelector('.ws-results').innerHTML = '<li>Ищем…</li>';
          try { box.querySelector('.ws-results').innerHTML = wsList(await wikisource(st.q.trim(), 8)); } catch (err) { box.querySelector('.ws-results').innerHTML = '<li>Викитека не ответила</li>'; }
          box.scrollIntoView({ block: 'nearest' });
        }
      });
      draw();
    }
  };
})();
