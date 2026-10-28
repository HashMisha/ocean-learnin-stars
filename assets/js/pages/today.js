/*
 * Раздел «Материалы на сегодня»: план на каждый рабочий день (пн–пт) для трёх возрастных групп.
 * Собирается из банка data/daily.js, материалов сайта, литературы и календаря.
 * Выбор зависит от даты: весь день план один и тот же у всех посетителей, назавтра — новый.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  App.pages = App.pages || {};

  const D = window.SITE_DATA.daily;
  const BOOKS = window.SITE_DATA.books || [];
  const GROUP_AGE = { g1: '1,5–3 года', g2: '3–5 лет', g3: '5–7 лет' };

  // Детерминированный «случай» от даты и группы.
  function seedOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function picker(key) {
    let s = seedOf(key) || 1;
    const next = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
    return {
      one: (list) => list[Math.floor(next() * list.length)],
      some: (list, n) => { const a = list.slice(), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(next() * a.length), 1)[0]); return out; }
    };
  }
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fill = (tpl, o) => tpl.replace(/\{(\w+)\}/g, (m, k) => o[k] || m);
  const forGroup = (list, g) => list.filter((x) => !x.groups || x.groups.includes(g));
  const forSeason = (list, season) => list.filter((x) => !x.season || x.season === 'all' || x.season === season);

  // Рабочие дни недели, в которую входит дата (в выходные — следующая неделя).
  function workWeek(today) {
    const d = U.startOfDay(today);
    const wd = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() + (wd === 0 ? 1 : wd === 6 ? 2 : 1 - wd));
    return Array.from({ length: 5 }, (_, i) => { const x = new Date(monday); x.setDate(monday.getDate() + i); return x; });
  }

  // План дня для группы.
  function buildPlan(date, g) {
    const wd = date.getDay();
    const day = D.weekdays[wd];
    const season = U.seasonOf(date);
    const p = picker(iso(date) + g);
    const obj = p.one(D.objects[season]);
    const plan = { date, wd, day, season, group: g };

    plan.holidays = S.upcoming(date, 2).map((x) => x.h);
    const talks = forSeason(D.talks, season).filter((t) => !t.weekday || t.weekday === wd);
    plan.talk = wd === 1 ? D.talks.find((t) => t.weekday === 1) : p.one(talks.filter((t) => !t.weekday));
    plan.riddle = g === 'g1' ? p.one(D.sounds) : p.one(forSeason(D.riddles, season));
    // Внутри одной недели творчество, пальчиковые игры и физминутки не повторяются:
    // список перемешивается один раз на неделю, и каждый день берёт свой элемент.
    const monday = new Date(date);
    monday.setDate(date.getDate() - (wd - 1));
    const wp = picker(iso(monday) + g);
    const weekly = (list) => { const order = wp.some(list, list.length); return order[(wd - 1) % order.length]; };
    plan.finger = weekly(forGroup(D.finger, g));
    plan.move = weekly(forSeason(forGroup(D.moves, g), season));
    plan.creative = weekly(forGroup(forSeason(D.creative, season), g));
    plan.games = [p.one(forGroup(D.games, g).filter((x) => x.place === 'в группе')), p.one(forGroup(D.games, g).filter((x) => x.place === 'на прогулке'))].filter(Boolean);
    plan.math = fill(p.one(D.math[g]), obj);
    plan.speech = fill(p.one(D.speech[g]), obj);
    plan.book = p.one(BOOKS.filter((b) => b.group === g));
    if (wd === 5 || g !== 'g1') {
      plan.articulation = p.some(D.articulation, g === 'g1' ? 2 : 3);
      plan.breathing = forSeason(D.breathing, season)[0];
    }
    // Конспект: подходящий по группе и сезону, предпочтительно по направлению дня.
    const areaByDay = { 1: 'speech', 2: 'cognitive', 3: 'cognitive', 4: 'art', 5: 'speech' };
    const plans = S.plans.filter((x) => S.groupsOf(x).includes(g) && S.seasonsOf(x).includes(season));
    plan.lesson = p.one(plans.filter((x) => (x.areas || []).includes(areaByDay[wd])).concat(plans.filter((x) => (x.holidays || []).some((h) => plan.holidays.some((hh) => hh.id === h))))) || p.one(plans);
    // Печатные материалы по направлению дня.
    const prints = S.printables.filter((x) => S.groupsOf(x).includes(g) && S.isActual(x, date));
    const bySubject = prints.filter((x) => (x.subjects || []).some((s) => day.subjects.includes(s)));
    const byHoliday = prints.filter((x) => (x.holidays || []).some((h) => plan.holidays.some((hh) => hh.id === h)));
    plan.prints = [...new Set(byHoliday.concat(p.some(bySubject, 3), p.some(prints, 2)))].slice(0, 4);
    return plan;
  }

  function block(icon, title, body, cls) {
    return '<section class="panel day-card' + (cls ? ' ' + cls : '') + '"><h3>' + U.icon(icon) + title + '</h3>' + body + '</section>';
  }

  function planHtml(pl) {
    const e = U.esc;
    const hol = pl.holidays.length
      ? block('calendar', 'Праздник', pl.holidays.map((h) => '<p><a href="' + S.linkFor('holiday', h) + '"><b>' + e(h.title) + '</b></a> — ' + U.formatDay(S.nextDate(h, pl.date)) + '. ' + e(h.description) + '</p>').join(''), 'day-card--hol')
      : '';
    const prints = pl.prints.length
      ? '<div class="day-prints">' + pl.prints.map((it) => {
        const pv = App.art.preview('printable', it);
        return '<div class="day-print"><a href="' + S.linkFor('printable', it) + '" class="day-print-img"><img src="' + e(pv.src) + '" alt="" loading="lazy"></a>' +
          '<span>' + e(it.title) + '</span><button type="button" class="btn btn--dl btn--sm" data-dl="' + e(it.id) + '">' + U.icon('download') + '<span class="btn-label">Скачать</span></button></div>';
      }).join('') + '</div>'
      : '<p>Подходящие листы откроются в разделе «Печатные материалы».</p>';
    return hol +
      '<div class="day-grid">' +
      block('spark', 'Утренний круг', '<p>' + e(pl.talk.text) + '</p>') +
      block('book', 'Занятие дня: ' + e(pl.day.focus.toLowerCase()),
        (pl.lesson ? '<p><a href="' + S.linkFor('plan', pl.lesson) + '"><b>' + e(pl.lesson.title) + '</b></a> — ' + e(pl.lesson.kind.toLowerCase()) + ', ' + e(pl.lesson.duration || '') + '</p>' : '') +
        '<p><b>Математика:</b> ' + e(pl.math) + '</p><p><b>Речь:</b> ' + e(pl.speech) + '</p>') +
      block('image', 'Творчество: ' + e(pl.creative.kind), '<p><b>' + e(pl.creative.title) + '</b></p><p>' + e(pl.creative.how) + '</p><p class="day-muted">Понадобится: ' + e(pl.creative.materials) + '</p>') +
      block('spark', pl.group === 'g1' ? 'Кто так говорит?' : 'Загадка дня', '<p>' + e(pl.riddle.q) + '</p><details><summary>Отгадка</summary><p>' + e(pl.riddle.a) + '</p></details>') +
      block('home', 'Пальчиковая игра «' + e(pl.finger.title) + '»', '<p class="day-verse">' + e(pl.finger.text) + '</p><p class="day-muted">' + e(pl.finger.how) + '</p>') +
      block('play', 'Физминутка «' + e(pl.move.title) + '»', '<p class="day-verse">' + e(pl.move.text) + '</p>') +
      (pl.articulation ? block('spark', 'Логопедическая минутка', '<ul>' + pl.articulation.map((a) => '<li><b>' + e(a.title) + '.</b> ' + e(a.how) + '</li>').join('') + '</ul>' +
        (pl.breathing ? '<p><b>Дыхание — «' + e(pl.breathing.title) + '».</b> ' + e(pl.breathing.how) + '</p>' : '')) : '') +
      block('play', 'Игры', '<ul>' + pl.games.map((gm) => '<li><b>' + e(gm.title) + '</b> (' + gm.place + '). ' + e(gm.how) + '</li>').join('') + '</ul>') +
      (pl.book ? block('book', 'Читаем', '<p><b>' + e(pl.book.author) + ' «' + e(pl.book.title.replace(/[«»]/g, '')) + '»</b></p><p>' + e(pl.book.about) + '</p><p><a href="#books?q=' + encodeURIComponent(pl.book.title.replace(/[«»]/g, '').split(' ')[0]) + '">В раздел литературы</a></p>') : '') +
      '</div>' +
      block('print', 'Печатные материалы на сегодня', prints, 'day-card--wide');
  }

  // Документ для скачивания (открывается в Word).
  function planDoc(pl) {
    const e = U.esc;
    const li = (arr) => '<ul>' + arr.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>План дня</title><style>body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.4;max-width:720px;margin:24px auto}h1{font-size:17pt}h2{font-size:13pt;margin:14px 0 4px}</style></head><body>' +
      '<h1>План дня: ' + U.WEEKDAYS[pl.date.getDay()] + ', ' + U.formatDay(pl.date) + '</h1>' +
      '<p>Возраст: ' + GROUP_AGE[pl.group] + ' (' + S.GROUPS[pl.group].sub + '). Направление дня: ' + e(pl.day.focus) + '.</p>' +
      (pl.holidays.length ? '<h2>Праздник</h2><p>' + pl.holidays.map((h) => e(h.title) + ' — ' + U.formatDay(S.nextDate(h, pl.date))).join('; ') + '</p>' : '') +
      '<h2>Утренний круг</h2><p>' + e(pl.talk.text) + '</p>' +
      '<h2>Занятие</h2>' + (pl.lesson ? '<p>' + e(pl.lesson.title) + ' (' + e(pl.lesson.kind) + ')</p>' : '') + li([' Математика: ' + e(pl.math), 'Речь: ' + e(pl.speech)]) +
      '<h2>Творчество: ' + e(pl.creative.kind) + ' — «' + e(pl.creative.title) + '»</h2><p>' + e(pl.creative.how) + '</p><p>Материалы: ' + e(pl.creative.materials) + '</p>' +
      '<h2>' + (pl.group === 'g1' ? 'Кто так говорит?' : 'Загадка') + '</h2><p>' + e(pl.riddle.q) + ' (Отгадка: ' + e(pl.riddle.a) + ')</p>' +
      '<h2>Пальчиковая игра «' + e(pl.finger.title) + '»</h2><p>' + e(pl.finger.text) + '</p><p>' + e(pl.finger.how) + '</p>' +
      '<h2>Физминутка «' + e(pl.move.title) + '»</h2><p>' + e(pl.move.text) + '</p>' +
      (pl.articulation ? '<h2>Логопедическая минутка</h2>' + li(pl.articulation.map((a) => e(a.title) + ': ' + e(a.how))) : '') +
      '<h2>Игры</h2>' + li(pl.games.map((gm) => e(gm.title) + ' (' + gm.place + '): ' + e(gm.how))) +
      (pl.book ? '<h2>Чтение</h2><p>' + e(pl.book.author) + ' «' + e(pl.book.title.replace(/[«»]/g, '')) + '»</p>' : '') +
      '<p style="font-size:10pt;color:#666">Ocean learnin\' stars — план собран автоматически.</p></body></html>';
  }

  App.pages.today = {
    title: 'Материалы на сегодня',
    render(root, params) {
      const now = U.today();
      const week = workWeek(now);
      let g = params.group || (U.getGroup() === 'all' ? 'g2' : U.getGroup());
      let di = week.findIndex((d) => iso(d) === (params.day || iso(now)));
      if (di < 0) di = 0;
      const weekend = now.getDay() === 0 || now.getDay() === 6;

      root.innerHTML =
        '<div class="group-slot"></div>' +
        '<section class="page-head"><p class="eyebrow">План на каждый рабочий день</p><h1>Материалы на сегодня</h1>' +
        '<p class="lead">Готовый день для каждой возрастной группы: утренний круг, занятие, творчество, загадка, пальчиковая игра, физминутка, игры, чтение и листы для печати. Каждый будний день — новый набор.</p>' +
        (weekend ? '<p class="notice panel">Сегодня выходной — показан план на ближайшую рабочую неделю.</p>' : '') + '</section>' +
        '<div class="tabs day-tabs" role="tablist" aria-label="День недели"></div>' +
        '<div class="day-head"><h2 class="day-title"></h2><button type="button" class="btn btn--primary" data-doc>' + U.icon('download') + '<span class="btn-label">Скачать план дня</span></button></div>' +
        '<div class="day-out"></div>';

      const out = root.querySelector('.day-out');
      let current = null;
      function draw() {
        root.querySelector('.group-slot').innerHTML = U.groupTabs(g).replace(/<button[^>]*data-group="all"[\s\S]*?<\/button>/, '');
        root.querySelector('.day-tabs').innerHTML = week.map((d, i) =>
          '<button type="button" role="tab" class="tab" data-day="' + i + '" aria-selected="' + (i === di) + '">' + U.WD_SHORT[d.getDay()].toUpperCase() + ' · ' + d.getDate() + ' ' + U.MONTHS_SHORT[d.getMonth()] + (iso(d) === iso(now) ? ' · сегодня' : '') + '</button>').join('');
        current = buildPlan(week[di], g);
        root.querySelector('.day-title').textContent = current.day.title + ', ' + U.formatDay(week[di]) + ' — ' + current.day.focus;
        out.innerHTML = planHtml(current);
        App.router.updateParams('today', Object.assign({ group: g }, di !== week.findIndex((d) => iso(d) === iso(now)) ? { day: iso(week[di]) } : {}));
      }
      root.addEventListener('click', async (e) => {
        const gt = e.target.closest('[data-group]');
        if (gt) { g = gt.dataset.group; U.setGroup(g); return draw(); }
        const dt = e.target.closest('[data-day]');
        if (dt) { di = +dt.dataset.day; return draw(); }
        const dl = e.target.closest('[data-dl]');
        if (dl) return App.storage.download('printable', S.printable(dl.dataset.dl), dl);
        if (e.target.closest('[data-doc]')) {
          const name = 'План-дня-' + iso(current.date) + '-' + GROUP_AGE[g].replace(/[ ,]/g, '') + (App.storage.inArtifact() ? '.html' : '.doc');
          try {
            await App.storage.saveFile(new Blob(['﻿', planDoc(current)], { type: 'application/msword' }), name);
            U.toast('План дня сохранён');
          } catch (err) { U.toast('Не удалось сохранить план', 'error'); }
        }
      });
      draw();
      // Подгружаем карточки ARASAAC и перерисовываем, если что-то добавилось.
      if (App.sources.enabled()) App.sources.load().then(() => { if (document.contains(out)) draw(); });
    }
  };
})();
