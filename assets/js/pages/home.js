/* Главная: только приветствие, календарь месяца и ближайшие праздники. Остальное — в меню. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  App.pages = App.pages || {};

  function monthGrid(year, month, now) {
    const days = S.inMonth(year, month);
    const byDay = new Map();
    days.forEach((x) => {
      const d = x.date.getDate();
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(x.h);
    });
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // неделя с понедельника
    const total = new Date(year, month + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < offset; i++) cells += '<span class="mc-cell is-empty" aria-hidden="true"></span>';
    for (let d = 1; d <= total; d++) {
      const hs = byDay.get(d) || [];
      const isToday = year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
      const cls = 'mc-cell' + (hs.length ? ' has-h' : '') + (isToday ? ' is-today' : '');
      const label = d + ' ' + U.MONTHS_GEN[month] + (hs.length ? ': ' + hs.map((h) => h.title).join(', ') : '');
      cells += hs.length
        ? '<a class="' + cls + '" href="#calendar?month=' + (month + 1) + '&year=' + year + '&h=' + hs[0].id + '" title="' + U.esc(label) + '" aria-label="' + U.esc(label) + '">' + d + '<i></i></a>'
        : '<span class="' + cls + '"' + (isToday ? ' aria-label="Сегодня, ' + U.esc(label) + '"' : '') + '>' + d + '</span>';
    }
    return '<div class="mc-head">' + ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => '<span>' + w + '</span>').join('') + '</div>' +
      '<div class="mc-grid">' + cells + '</div>';
  }

  App.pages.home = {
    title: 'Главная',
    render(root) {
      const now = U.today();
      let year = now.getFullYear(), month = now.getMonth();
      const soon = S.upcoming(now, App.config.upcomingDays).slice(0, 7);

      root.innerHTML =
        '<section class="hero hero--home">' +
        '<p class="eyebrow">' + U.formatDay(now) + ', ' + U.WEEKDAYS[now.getDay()] + '</p>' +
        '<h1><span class="hl">' + U.esc(App.config.siteName) + '</span> — ' + U.esc(App.config.homeLead) + '</h1>' +
        '</section>' +
        '<div class="home-grid">' +
        '<section class="panel home-cal" aria-labelledby="mc-title">' +
        '<div class="sec-head"><button type="button" class="icon-btn" data-m="-1" aria-label="Предыдущий месяц">' + U.icon('left') + '</button>' +
        '<h2 id="mc-title" aria-live="polite"></h2>' +
        '<button type="button" class="icon-btn" data-m="1" aria-label="Следующий месяц">' + U.icon('right') + '</button></div>' +
        '<div class="mc"></div>' +
        '<a class="linkbtn" href="#calendar">Открыть календарь праздников</a></section>' +
        '<section class="panel home-soon" aria-labelledby="soon-h"><div class="sec-head"><h2 id="soon-h">Ближайшие праздники</h2></div>' +
        '<ol class="soon-list">' + soon.map((x) =>
          '<li class="' + (x.inDays <= App.config.highlightDays ? 'is-soon' : '') + '"><a href="' + S.linkFor('holiday', x.h) + '">' +
          '<span class="soon-date"><b>' + x.date.getDate() + '</b>' + U.MONTHS_SHORT[x.date.getMonth()] + '</span>' +
          '<span class="soon-text"><span class="soon-title">' + U.esc(x.h.title) + '</span><span class="soon-in">' + U.inDaysLabel(x.inDays) + '</span></span></a></li>').join('') +
        '</ol></section></div>';

      const box = root.querySelector('.mc'), title = root.querySelector('#mc-title');
      function draw() {
        title.textContent = U.MONTHS[month] + ' ' + year;
        box.innerHTML = monthGrid(year, month, now);
      }
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-m]');
        if (!b) return;
        month += +b.dataset.m;
        if (month < 0) { month = 11; year--; }
        if (month > 11) { month = 0; year++; }
        draw();
      });
      draw();
    }
  };
})();
