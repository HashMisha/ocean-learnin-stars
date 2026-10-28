/*
 * Доступ к данным: праздники, материалы, разработки. Вычисление дат, сезонности, связей и поиск по тексту.
 * Страницы обращаются к данным только через App.store — так источник (JS-файлы, JSON, база) легко заменить.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const D = window.SITE_DATA || {};

  const demoMeta = D.demoMeta || {};
  const withMeta = (item) => (item.demo ? Object.assign({}, demoMeta, item) : item);

  const holidays = (D.holidays || []).slice();
  const printables = (D.printables || []).map(withMeta);
  const plans = (D.plans || []).map(withMeta);

  const holidayById = new Map(holidays.map((h) => [h.id, h]));
  const printableById = new Map(printables.map((p) => [p.id, p]));
  const planById = new Map(plans.map((p) => [p.id, p]));

  const HOLIDAY_TYPES = {
    international: 'Международный',
    russian: 'Всероссийский',
    thematic: 'Тематический'
  };
  const PRINT_TYPES = {
    coloring: 'Раскраска',
    cards: 'Карточки',
    poster: 'Плакат',
    template: 'Шаблон поделки',
    worksheet: 'Рабочий лист',
    picture: 'Картинка'
  };
  const SUBJECTS = {
    logo: 'Логопедия',
    speech: 'Развитие речи',
    math: 'Математика',
    world: 'Окружающий мир',
    art: 'Творчество'
  };
  // Три возрастные группы для фильтра сверху на страницах материалов и литературы.
  const GROUPS = {
    g1: { title: '1,5–3 года', sub: 'первая младшая группа' },
    g2: { title: '3–5 лет', sub: 'средняя группа' },
    g3: { title: '5–7 лет', sub: 'старшая группа' }
  };
  const AGE_TO_GROUP = { early: 'g1', junior: 'g2', middle: 'g2', senior: 'g3', prep: 'g3' };
  function groupsOf(item) {
    if (item.groups && item.groups.length) return item.groups;
    if (item.ages && item.ages.length) return [...new Set(item.ages.map((a) => AGE_TO_GROUP[a]))];
    return Object.keys(GROUPS);
  }
  const AGES = {
    early: 'Ранний возраст, 2–3 года',
    junior: 'Младшая группа, 3–4 года',
    middle: 'Средняя группа, 4–5 лет',
    senior: 'Старшая группа, 5–6 лет',
    prep: 'Подготовительная группа, 6–7 лет'
  };
  const AGES_SHORT = { early: '2–3', junior: '3–4', middle: '4–5', senior: '5–6', prep: '6–7' };
  const AREAS = {
    social: 'Социально-коммуникативное развитие',
    cognitive: 'Познавательное развитие',
    speech: 'Речевое развитие',
    art: 'Художественно-эстетическое развитие',
    physical: 'Физическое развитие'
  };

  /* ---------- Даты ---------- */
  function dateIn(h, year) {
    if (h.date) {
      const [m, d] = h.date.split('-').map(Number);
      return new Date(year, m - 1, d);
    }
    const r = h.rule;
    if (r.nth > 0) {
      const first = new Date(year, r.month - 1, 1);
      const shift = (r.weekday - first.getDay() + 7) % 7;
      return new Date(year, r.month - 1, 1 + shift + (r.nth - 1) * 7);
    }
    const last = new Date(year, r.month, 0);
    const shift = (last.getDay() - r.weekday + 7) % 7;
    return new Date(year, r.month - 1, last.getDate() - shift);
  }

  function nextDate(h, from) {
    let d = dateIn(h, from.getFullYear());
    if (d < U.startOfDay(from)) d = dateIn(h, from.getFullYear() + 1);
    return d;
  }

  function upcoming(from, days, filter) {
    return holidays
      .filter((h) => !filter || filter(h))
      .map((h) => {
        const date = nextDate(h, from);
        return { h, date, inDays: U.dayDiff(from, date) };
      })
      .filter((x) => x.inDays <= days)
      .sort((a, b) => a.inDays - b.inDays || a.h.title.localeCompare(b.h.title, 'ru'));
  }

  function inMonth(year, month) {
    return holidays
      .map((h) => ({ h, date: dateIn(h, year) }))
      .filter((x) => x.date.getMonth() === month)
      .sort((a, b) => a.date - b.date || a.h.title.localeCompare(b.h.title, 'ru'));
  }

  /* ---------- Сезоны и актуальность ---------- */
  function seasonsOf(item) {
    const s = item.seasons && item.seasons.length ? item.seasons : ['all'];
    return s.includes('all') ? U.SEASON_ORDER.slice() : s;
  }

  // Сколько дней до ближайшего праздника, к которому привязан материал (Infinity — не привязан).
  function daysToHoliday(item, now) {
    let best = Infinity;
    for (const id of item.holidays || []) {
      const h = holidayById.get(id);
      if (h) best = Math.min(best, U.dayDiff(now, nextDate(h, now)));
    }
    return best;
  }

  // «Актуально сейчас»: материал текущего сезона или привязанный к празднику в ближайшие N дней.
  function isActual(item, now) {
    return seasonsOf(item).includes(U.seasonOf(now)) || daysToHoliday(item, now) <= App.config.upcomingDays;
  }

  function byActuality(list, now) {
    const limit = App.config.upcomingDays;
    return list
      .map((item, i) => ({ item, i, d: daysToHoliday(item, now) }))
      .sort((a, b) => (a.d <= limit ? a.d : 999) - (b.d <= limit ? b.d : 999) || a.i - b.i)
      .map((x) => x.item);
  }

  /* ---------- Связи праздник ↔ материалы ---------- */
  const GENERIC_TAGS = new Set(['осень', 'зима', 'весна', 'лето']);

  function linkedTo(list, h) {
    const tags = new Set((h.tags || []).filter((t) => !GENERIC_TAGS.has(t)));
    const direct = list.filter((i) => (i.holidays || []).includes(h.id));
    const related = list.filter((i) => !direct.includes(i) && (i.tags || []).some((t) => tags.has(t)));
    return { direct, related };
  }

  function materialsFor(h) {
    return { printables: linkedTo(printables, h), plans: linkedTo(plans, h) };
  }

  /* ---------- Полнотекстовый поиск ---------- */
  const docCache = new WeakMap();

  function docOf(kind, item) {
    if (docCache.has(item)) return docCache.get(item);
    const holidayTitles = (item.holidays || []).map((id) => (holidayById.get(id) || {}).title || '').join(' ');
    let typeLabel = '', text = item.description || '';
    if (kind === 'printable') typeLabel = (PRINT_TYPES[item.type] || '') + ' ' + (item.subjects || []).map((s) => SUBJECTS[s] || '').join(' ');
    if (kind === 'plan') {
      typeLabel = item.kind + ' ' + (item.areas || []).map((a) => AREAS[a]).join(' ');
      text += ' ' + item.goal + ' ' + (item.tasks || []).join(' ');
    }
    if (kind === 'holiday') typeLabel = 'праздник';
    const doc = {
      title: U.stems(item.title),
      tags: U.stems((item.tags || []).join(' ') + ' ' + holidayTitles + ' ' + typeLabel),
      text: U.stems(text)
    };
    docCache.set(item, doc);
    return doc;
  }

  // Оценка совпадения: заголовок весит больше тегов, теги — больше описания.
  function score(kind, item, queryStems) {
    if (!queryStems.length) return 0;
    const doc = docOf(kind, item);
    let total = 0, hits = 0;
    for (const q of queryStems) {
      let best = 0;
      for (const t of doc.title) best = Math.max(best, U.stemMatch(q, t) * 3);
      for (const t of doc.tags) best = Math.max(best, U.stemMatch(q, t) * 2.2);
      if (best < 1) for (const t of doc.text) best = Math.max(best, U.stemMatch(q, t));
      if (best > 0) hits++;
      total += best;
    }
    const coverage = hits / queryStems.length;
    return coverage < 0.5 ? 0 : total * coverage;
  }

  function search(kind, list, query) {
    const q = Array.isArray(query) ? query : U.stems(query);
    return list
      .map((item) => ({ item, s: score(kind, item, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.item);
  }

  function allTags() {
    const set = new Set();
    [printables, plans, holidays].forEach((list) => list.forEach((i) => (i.tags || []).forEach((t) => set.add(t))));
    return [...set];
  }

  /* ---------- Ссылки ---------- */
  function linkFor(kind, item) {
    if (kind === 'printable') return '#printables?item=' + encodeURIComponent(item.id);
    if (kind === 'plan') return '#plans?item=' + encodeURIComponent(item.id);
    const d = nextDate(item, U.today());
    return '#calendar?month=' + (d.getMonth() + 1) + '&year=' + d.getFullYear() + '&h=' + encodeURIComponent(item.id);
  }

  // Материалы, найденные в открытых источниках (assets/js/core/sources.js), добавляются в общий список.
  function addPrintables(items) {
    let added = 0;
    items.forEach((it) => {
      if (printableById.has(it.id)) return;
      printables.push(it);
      printableById.set(it.id, it);
      added++;
    });
    return added;
  }

  App.store = {
    holidays, printables, plans,
    HOLIDAY_TYPES, PRINT_TYPES, AGES, AGES_SHORT, AREAS, SUBJECTS, GROUPS, groupsOf, addPrintables,
    holiday: (id) => holidayById.get(id),
    printable: (id) => printableById.get(id),
    plan: (id) => planById.get(id),
    dateIn, nextDate, upcoming, inMonth,
    seasonsOf, isActual, byActuality, daysToHoliday,
    materialsFor, search, score, allTags, linkFor
  };
})();
