/*
 * Лента материалов в стиле Pinterest: masonry-колонки, ленивая подгрузка, свой поиск и фильтры.
 * App.createFeedPage(cfg) собирает страницу раздела; разделы 5 и 6 отличаются только конфигурацией.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;

  /* ---------- Masonry ---------- */
  class Masonry {
    constructor(root, renderCard, onChange) {
      this.root = root;
      this.renderCard = renderCard;
      this.onChange = onChange;
      this.items = [];
      this.cards = [];
      this.shown = 0;
      this.sentinel = U.h('<div class="feed-sentinel" aria-hidden="true"><span class="loader"></span></div>');
      root.after(this.sentinel);
      this.io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) this.more(); }, { rootMargin: '700px 0px' });
      this.io.observe(this.sentinel);
      this.onResize = U.debounce(() => { if (this.colCount() !== this.cols.length) this.build(); }, 150);
      window.addEventListener('resize', this.onResize);
      this.cols = [];
    }

    colCount() {
      const w = this.root.clientWidth || window.innerWidth;
      return w < 540 ? 2 : w < 860 ? 3 : w < 1160 ? 4 : 5;
    }

    setItems(items) {
      this.items = items;
      this.cards = [];
      this.shown = 0;
      this.build();
      this.more();
    }

    build() {
      const n = this.colCount();
      this.root.innerHTML = '';
      this.cols = Array.from({ length: n }, () => {
        const c = document.createElement('div');
        c.className = 'masonry-col';
        this.root.append(c);
        return c;
      });
      this.cards.forEach((c) => this.place(c));
    }

    place(card) {
      let min = this.cols[0];
      for (const c of this.cols) if (c.offsetHeight < min.offsetHeight) min = c;
      min.append(card);
    }

    more() {
      if (this.shown >= this.items.length) return this.sync();
      const next = this.items.slice(this.shown, this.shown + App.config.feedBatch);
      next.forEach((item) => {
        const card = this.renderCard(item);
        this.cards.push(card);
        this.place(card);
      });
      this.shown += next.length;
      this.sync();
      // Если экран большой и подгруженного не хватило до низа — догружаем ещё.
      requestAnimationFrame(() => {
        if (this.shown < this.items.length && this.sentinel.getBoundingClientRect().top < window.innerHeight + 700) this.more();
      });
    }

    sync() {
      this.sentinel.hidden = this.shown >= this.items.length;
      if (this.onChange) this.onChange(this.shown, this.items.length);
    }

    destroy() {
      this.io.disconnect();
      window.removeEventListener('resize', this.onResize);
    }
  }

  /* ---------- Карточка ---------- */
  function card(kind, item, topic) {
    const pv = App.art.preview(kind, item);
    const label = (kind === 'plan' ? item.kind : S.PRINT_TYPES[item.type]) + (item.provider ? ' · ' + item.provider : '');
    const el = U.h(
      '<article class="pin" data-id="' + U.esc(item.id) + '">' +
      '<button type="button" class="pin-open" aria-label="Открыть: ' + U.esc(item.title) + '">' +
      '<span class="pin-media"><img src="' + pv.src + '" width="' + pv.w + '" height="' + pv.h + '" alt="" loading="lazy" decoding="async"></span>' +
      '<span class="pin-text"><span class="pin-kind">' + U.esc(label) + '</span><span class="pin-title">' + U.esc(item.title) + '</span></span></button>' +
      '<div class="pin-foot"><span class="pin-topic">' + U.esc(topic) + '</span>' +
      '<button type="button" class="btn btn--dl" aria-label="Скачать: ' + U.esc(item.title) + '">' + U.icon('download') + '<span class="btn-label">Скачать</span></button></div>' +
      '</article>'
    );
    return el;
  }

  function topicOf(item, now) {
    const hs = (item.holidays || []).map((id) => S.holiday(id)).filter(Boolean)
      .map((h) => ({ h, n: U.dayDiff(now, S.nextDate(h, now)) })).sort((a, b) => a.n - b.n);
    if (hs.length) return hs[0].h.title;
    return (item.tags || [])[0] ? item.tags[0][0].toUpperCase() + item.tags[0].slice(1) : '';
  }

  /* ---------- Страница ленты ---------- */
  App.createFeedPage = function (cfg) {
    const page = { title: cfg.title };
    let masonry = null, state = null, refs = null, now = null;

    const SEASON_CHIPS = () => [['now', 'Сейчас: ' + U.SEASONS[U.seasonOf(now)].title.toLowerCase()]]
      .concat(U.SEASON_ORDER.map((s) => [s, U.SEASONS[s].title]), [['any', 'Любой сезон']]);

    function defaults() {
      const d = { q: '', season: 'now', holiday: '', group: 'all' };
      cfg.filters.forEach((f) => { d[f.key] = 'all'; });
      return d;
    }

    function paramsOf(st) {
      const d = defaults(), out = {};
      Object.keys(st).forEach((k) => { if (st[k] && st[k] !== d[k]) out[k] = st[k]; });
      return out;
    }

    function filtered(st, ignoreSeason) {
      let list = cfg.items();
      if (st.group && st.group !== 'all') list = list.filter((i) => S.groupsOf(i).includes(st.group));
      if (st.holiday) list = list.filter((i) => (i.holidays || []).includes(st.holiday));
      cfg.filters.forEach((f) => { if (st[f.key] && st[f.key] !== 'all') list = list.filter((i) => f.test(i, st[f.key])); });
      if (!ignoreSeason) {
        if (st.season === 'now') list = list.filter((i) => S.isActual(i, now));
        else if (st.season !== 'any') list = list.filter((i) => S.seasonsOf(i).includes(st.season));
      }
      if (st.q.trim()) return S.search(cfg.kind, list, st.q);
      return st.season === 'now' ? S.byActuality(list, now) : list;
    }

    function chips(group, key, options, value) {
      return '<div class="chip-row" role="group" aria-label="' + U.esc(group) + '"><span class="chip-row-label">' + U.esc(group) + '</span>' + options.map(([v, l]) =>
        '<button type="button" class="chip' + (v === value ? ' is-on' : '') + '" data-key="' + key + '" data-value="' + v + '" aria-pressed="' + (v === value) + '">' + U.esc(l) + '</button>').join('') + '</div>';
    }

    function selects() {
      return cfg.filters.filter((f) => f.ui === 'select').map((f) =>
        '<label class="select"><span class="select-label">' + U.esc(f.label) + '</span><select id="' + cfg.id + '-' + f.key + '" data-key="' + f.key + '">' +
        '<option value="all">' + U.esc(f.allLabel) + '</option>' +
        f.options().map(([v, l]) => '<option value="' + U.esc(v) + '"' + (state[f.key] === v ? ' selected' : '') + '>' + U.esc(l) + '</option>').join('') +
        '</select></label>').join('');
    }

    function renderControls() {
      refs.controls.innerHTML =
        chips('Сезон', 'season', SEASON_CHIPS(), state.season) +
        cfg.filters.filter((f) => f.ui === 'chips').map((f) => chips(f.label, f.key, [['all', f.allLabel]].concat(f.options()), state[f.key])).join('') +
        (cfg.filters.some((f) => f.ui === 'select') ? '<div class="select-row">' + selects() + '</div>' : '');
      const h = state.holiday && S.holiday(state.holiday);
      refs.holiday.hidden = !h;
      if (h) {
        refs.holiday.innerHTML = '<span>Материалы к празднику <b>' + U.esc(h.title) + '</b> · ' + U.formatDay(S.nextDate(h, now)) + '</span>' +
          '<button type="button" class="chip chip--x" data-clear-holiday>' + U.icon('x') + 'Показать все</button>';
      }
    }

    function apply() {
      const list = filtered(state);
      masonry.setItems(list);
      refs.empty.hidden = list.length > 0;
      // Подсказка: по запросу есть совпадения в других сезонах.
      let hint = '';
      if (state.q.trim() && state.season !== 'any') {
        const all = filtered(state, true).length;
        if (all > list.length) hint = '<button type="button" class="linkbtn" data-any-season>Ещё ' + (all - list.length) + ' ' + U.plural(all - list.length, ['материал', 'материала', 'материалов']) + ' в других сезонах — показать</button>';
      }
      const web = cfg.online && state.q.trim().length > 1 && App.sources.enabled()
        ? '<button type="button" class="btn btn--sm" data-web>' + U.icon('search') + 'Найти «' + U.esc(state.q.trim()) + '» в открытых источниках</button>' : '';
      refs.hint.innerHTML = hint + web;
      refs.emptyActions.innerHTML = web +
        (state.season !== 'any' ? '<button type="button" class="btn" data-any-season>Искать во всех сезонах</button>' : '') +
        '<button type="button" class="btn btn--ghost" data-reset>Сбросить фильтры</button>';
      App.router.updateParams(cfg.id, paramsOf(state));
    }

    function status(shown, total) {
      const season = state.season === 'now' ? 'актуально на ' + U.formatDay(now) : state.season === 'any' ? 'все сезоны' : U.SEASONS[state.season].title.toLowerCase();
      let src = '';
      if (cfg.online) {
        const st = App.sources.state();
        if (st.status === 'loading') src = ' · подгружаем материалы из открытых источников…';
        else if (st.status === 'ready' && st.count) src = ' · в разделе ' + st.count + ' ' + U.plural(st.count, ['материал', 'материала', 'материалов']) + ' из открытых источников';
      }
      refs.status.textContent = (total ? 'Показано ' + shown + ' из ' + total + ' · ' + season : '') + src;
    }

    function onSources() {
      if (masonry && refs && document.contains(refs.status)) apply();
    }

    async function searchWeb(btn) {
      btn.disabled = true;
      btn.lastChild.textContent = 'Ищем в открытых источниках…';
      const found = await App.sources.searchAsItems(state.q.trim());
      if (!found.length) {
        btn.disabled = false;
        btn.lastChild.textContent = 'В открытых источниках ничего не нашлось';
        return;
      }
      // Свежие находки показываем первыми, независимо от сезона.
      state.season = 'any';
      renderControls();
      const ids = new Set(found.map((f) => f.id));
      const list = filtered(state);
      masonry.setItems(found.concat(list.filter((i) => !ids.has(i.id))));
      refs.empty.hidden = true;
      refs.hint.textContent = 'Найдено в открытых источниках: ' + found.length + '. Проверьте лицензию в карточке перед печатью.';
    }

    function openItem(id, returnFocus) {
      const item = cfg.find(id);
      if (!item) return U.toast('Материал не найден', 'error');
      App.router.updateParams(cfg.id, Object.assign(paramsOf(state), { item: id }));
      App.lightbox.open(cfg.kind, item, {
        returnFocus,
        onClose: () => App.router.updateParams(cfg.id, paramsOf(state))
      });
    }

    page.render = function (root, params) {
      now = U.today();
      state = Object.assign(defaults(), {
        q: params.q || '',
        season: params.season || (params.holiday ? 'any' : 'now'),
        holiday: params.holiday || '',
        group: params.group || U.getGroup()
      });
      cfg.filters.forEach((f) => { if (params[f.key]) state[f.key] = params[f.key]; });

      const near = S.upcoming(now, App.config.upcomingDays).filter((x) => cfg.items().some((i) => (i.holidays || []).includes(x.h.id))).slice(0, 5);
      root.innerHTML =
        '<div class="group-slot">' + U.groupTabs(state.group) + '</div>' +
        '<section class="page-head">' +
        '<p class="eyebrow">' + U.esc(cfg.eyebrow) + '</p><h1>' + U.esc(cfg.title) + '</h1><p class="lead">' + U.esc(cfg.lead) + '</p>' +
        (near.length ? '<div class="now-strip"><span class="now-label">Ближайшие праздники</span>' + near.map((x) =>
          '<button type="button" class="chip chip--soon" data-holiday="' + x.h.id + '">' + U.esc(x.h.title) + '<small>' + U.inDaysLabel(x.inDays) + '</small></button>').join('') + '</div>' : '') +
        '</section>' +
        '<section class="feed-tools panel" aria-label="Поиск и фильтры">' +
        '<label class="feed-search"><span class="sr-only">Поиск по разделу</span>' + U.icon('search') +
        '<input type="search" id="' + cfg.id + '-q" placeholder="' + U.esc(cfg.placeholder) + '" autocomplete="off" value="' + U.esc(state.q) + '"></label>' +
        '<div class="feed-controls"></div>' +
        '<div class="feed-holiday" hidden></div>' +
        '</section>' +
        '<div class="feed-meta"><p class="feed-status" aria-live="polite"></p><p class="feed-hint"></p></div>' +
        '<div class="masonry"></div>' +
        '<div class="empty panel" hidden><h2>Ничего не нашлось</h2><p>Попробуйте другое слово или снимите часть фильтров.</p><div class="empty-actions"></div></div>';

      refs = {
        controls: root.querySelector('.feed-controls'),
        holiday: root.querySelector('.feed-holiday'),
        status: root.querySelector('.feed-status'),
        hint: root.querySelector('.feed-hint'),
        empty: root.querySelector('.empty'),
        emptyActions: root.querySelector('.empty-actions'),
        q: root.querySelector('#' + cfg.id + '-q')
      };
      masonry = new Masonry(root.querySelector('.masonry'), (item) => card(cfg.kind, item, topicOf(item, now)), status);
      renderControls();
      apply();
      if (cfg.online) {
        document.addEventListener('ols:sources', onSources);
        App.sources.load();
      }

      refs.q.addEventListener('input', U.debounce(() => { state.q = refs.q.value; apply(); }, 200));

      root.addEventListener('click', (e) => {
        const gt = e.target.closest('[data-group]');
        if (gt) {
          state.group = gt.dataset.group;
          U.setGroup(state.group);
          root.querySelector('.group-slot').innerHTML = U.groupTabs(state.group);
          return apply();
        }
        const chip = e.target.closest('.chip[data-key]');
        if (chip) {
          state[chip.dataset.key] = chip.dataset.value;
          if (chip.dataset.key === 'season' && state.holiday && chip.dataset.value !== 'any') state.holiday = '';
          renderControls();
          return apply();
        }
        const hol = e.target.closest('[data-holiday]');
        if (hol) {
          state.holiday = hol.dataset.holiday;
          state.season = 'any';
          renderControls();
          return apply();
        }
        if (e.target.closest('[data-clear-holiday]')) {
          state.holiday = '';
          state.season = 'now';
          renderControls();
          return apply();
        }
        const webBtn = e.target.closest('[data-web]');
        if (webBtn) return searchWeb(webBtn);
        if (e.target.closest('[data-any-season]')) {
          state.season = 'any';
          renderControls();
          return apply();
        }
        if (e.target.closest('[data-reset]')) {
          state = defaults();
          refs.q.value = '';
          renderControls();
          return apply();
        }
        const pin = e.target.closest('.pin');
        if (!pin) return;
        const dl = e.target.closest('.btn--dl');
        if (dl) return App.storage.download(cfg.kind, cfg.find(pin.dataset.id), dl);
        if (e.target.closest('.pin-open')) openItem(pin.dataset.id, pin.querySelector('.pin-open'));
      });
      root.addEventListener('change', (e) => {
        const sel = e.target.closest('select[data-key]');
        if (!sel) return;
        state[sel.dataset.key] = sel.value;
        apply();
      });

      if (params.item) openItem(params.item);
    };

    page.openItem = (id) => openItem(id);
    page.destroy = () => {
      document.removeEventListener('ols:sources', onSources);
      if (masonry) masonry.destroy();
      masonry = null;
    };
    return page;
  };
})();
