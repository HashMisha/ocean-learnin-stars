/* Раздел «Календарь праздников»: вкладки по типу, переключение месяцев, подсветка ближайших дат. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  App.pages = App.pages || {};

  const TABS = [
    ['all', 'Все'],
    ['international', 'Международные'],
    ['russian', 'Всероссийские'],
    ['thematic', 'Для тематической работы']
  ];

  function materialLinks(h) {
    const m = S.materialsFor(h);
    const pr = m.printables.direct.length ? m.printables.direct : m.printables.related;
    const pl = m.plans.direct.length ? m.plans.direct : m.plans.related;
    const related = !m.printables.direct.length && !m.plans.direct.length;
    if (!pr.length && !pl.length) return '<p class="hol-none">Материалов к этой дате пока нет. Спросите ассистента вверху страницы — он подскажет близкие темы.</p>';
    const list = pr.slice(0, 3).map((p) => ['printable', p]).concat(pl.slice(0, 2).map((p) => ['plan', p]));
    return '<div class="hol-mats">' +
      '<span class="hol-mats-label">' + (related ? 'Подойдёт по теме' : 'Материалы и разработки') + '</span>' +
      '<ul>' + list.map(([k, it]) => '<li><a href="' + S.linkFor(k, it) + '">' + U.icon(k === 'plan' ? 'book' : 'print') + U.esc(it.title) + '</a></li>').join('') + '</ul>' +
      '<div class="hol-more">' +
      (m.printables.direct.length ? '<a class="linkbtn" href="#printables?holiday=' + h.id + '">Все печатные материалы · ' + m.printables.direct.length + '</a>' : '') +
      (m.plans.direct.length ? '<a class="linkbtn" href="#plans?holiday=' + h.id + '">Все разработки · ' + m.plans.direct.length + '</a>' : '') +
      '</div></div>';
  }

  function holidayItem(x, now) {
    const { h, date } = x;
    const n = U.dayDiff(now, date);
    const soon = n >= 0 && n <= App.config.highlightDays;
    const cls = 'hol panel' + (n === 0 ? ' is-today' : soon ? ' is-soon' : '') + (n < 0 ? ' is-past' : '');
    const badge = n === 0 ? '<span class="soon-badge is-today">Сегодня</span>' : soon ? '<span class="soon-badge">' + U.inDaysLabel(n) + '</span>' : '';
    return '<li class="' + cls + '" id="h-' + h.id + '">' +
      '<div class="hol-date" aria-hidden="true"><span class="hol-d">' + date.getDate() + '</span><span class="hol-m">' + U.MONTHS_SHORT[date.getMonth()] + '</span><span class="hol-wd">' + U.WD_SHORT[date.getDay()] + '</span></div>' +
      '<div class="hol-body">' +
      '<div class="hol-top">' + h.types.map((t) => '<span class="tag tag--' + t + '">' + S.HOLIDAY_TYPES[t] + '</span>').join('') + badge + '</div>' +
      '<h3><span class="sr-only">' + U.formatDay(date) + ', ' + U.WEEKDAYS[date.getDay()] + '. </span>' + U.esc(h.title) + '</h3>' +
      '<p class="hol-desc">' + U.esc(h.description) + (h.rule ? ' <span class="hol-rule">Дата меняется каждый год.</span>' : '') + '</p>' +
      materialLinks(h) + '</div></li>';
  }

  App.pages.calendar = {
    title: 'Календарь праздников',
    render(root, params) {
      const now = U.today();
      const st = {
        year: +params.year || now.getFullYear(),
        month: params.month ? Math.min(12, Math.max(1, +params.month)) - 1 : now.getMonth(),
        type: TABS.some((t) => t[0] === params.type) ? params.type : 'all'
      };
      const soon = S.upcoming(now, App.config.highlightDays);

      root.innerHTML =
        '<section class="page-head">' +
        '<p class="eyebrow">Сегодня ' + U.formatDay(now) + ', ' + U.WEEKDAYS[now.getDay()] + '</p>' +
        '<h1>Календарь праздников</h1>' +
        '<p class="lead">Международные и всероссийские праздники, а также даты для тематической работы с детьми. У каждой даты — подходящие материалы и разработки с сайта.</p>' +
        (soon.length ? '<div class="now-strip"><span class="now-label">В ближайшие ' + App.config.highlightDays + ' дней</span>' + soon.map((x) =>
          '<a class="chip chip--soon" href="#calendar?month=' + (x.date.getMonth() + 1) + '&year=' + x.date.getFullYear() + '&h=' + x.h.id + '">' + U.esc(x.h.title) + '<small>' + U.inDaysLabel(x.inDays) + '</small></a>').join('') + '</div>' : '') +
        '</section>' +
        '<section class="cal-tools panel">' +
        '<div class="tabs" role="tablist" aria-label="Тип праздника">' + TABS.map(([id, label]) =>
          '<button type="button" role="tab" class="tab" id="tab-' + id + '" data-type="' + id + '" aria-controls="hol-list">' + label + '</button>').join('') + '</div>' +
        '<div class="month-nav">' +
        '<button type="button" class="icon-btn" data-step="-1" aria-label="Предыдущий месяц">' + U.icon('left') + '</button>' +
        '<h2 class="month-title" aria-live="polite"></h2>' +
        '<button type="button" class="icon-btn" data-step="1" aria-label="Следующий месяц">' + U.icon('right') + '</button>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-today>Текущий месяц</button>' +
        '</div></section>' +
        '<ol class="hol-list" id="hol-list" role="tabpanel"></ol>';

      const list = root.querySelector('#hol-list');
      const title = root.querySelector('.month-title');

      function draw() {
        root.querySelectorAll('.tab').forEach((t) => {
          const on = t.dataset.type === st.type;
          t.setAttribute('aria-selected', on);
          t.tabIndex = on ? 0 : -1;
        });
        list.setAttribute('aria-labelledby', 'tab-' + st.type);
        title.textContent = U.MONTHS[st.month] + ' ' + st.year;
        const items = S.inMonth(st.year, st.month).filter((x) => st.type === 'all' || x.h.types.includes(st.type));
        list.innerHTML = items.length
          ? items.map((x) => holidayItem(x, now)).join('')
          : '<li class="empty panel"><h3>В этом месяце нет дат в выбранной категории</h3><p>Переключите вкладку или месяц.</p></li>';
        App.router.updateParams('calendar', Object.assign(
          st.type !== 'all' ? { type: st.type } : {},
          st.month !== now.getMonth() || st.year !== now.getFullYear() ? { month: st.month + 1, year: st.year } : {}
        ));
      }

      root.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (tab) { st.type = tab.dataset.type; return draw(); }
        const step = e.target.closest('[data-step]');
        if (step) {
          st.month += +step.dataset.step;
          if (st.month < 0) { st.month = 11; st.year--; }
          if (st.month > 11) { st.month = 0; st.year++; }
          return draw();
        }
        if (e.target.closest('[data-today]')) {
          st.month = now.getMonth();
          st.year = now.getFullYear();
          draw();
        }
      });
      root.querySelector('.tabs').addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = TABS.findIndex((t) => t[0] === st.type);
        st.type = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
        draw();
        root.querySelector('#tab-' + st.type).focus();
      });

      draw();
      if (params.h) {
        const el = document.getElementById('h-' + params.h);
        if (el) {
          el.classList.add('is-focus');
          requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
        }
      }
    }
  };
})();
