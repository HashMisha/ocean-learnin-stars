/*
 * Общие помощники: даты и сезоны, работа с DOM, иконки интерфейса, упрощённый стеммер для поиска.
 */
(function () {
  'use strict';
  const App = (window.App = window.App || {});

  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  const SEASONS = {
    winter: { id: 'winter', title: 'Зима' },
    spring: { id: 'spring', title: 'Весна' },
    summer: { id: 'summer', title: 'Лето' },
    autumn: { id: 'autumn', title: 'Осень' }
  };
  const SEASON_ORDER = ['winter', 'spring', 'summer', 'autumn'];

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function today() {
    let override = App.config.today;
    try {
      override = new URLSearchParams(location.search).get('today') || override;
    } catch (e) { /* нет location.search */ }
    if (override) {
      const d = new Date(override + 'T00:00:00');
      if (!isNaN(d)) return d;
    }
    return startOfDay(new Date());
  }

  function seasonOf(date) {
    const m = date.getMonth();
    if (m === 11 || m <= 1) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 7) return 'summer';
    return 'autumn';
  }

  function dayDiff(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
  }

  function plural(n, forms) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  function formatDay(d) {
    return d.getDate() + ' ' + MONTHS_GEN[d.getMonth()];
  }

  function inDaysLabel(n) {
    if (n === 0) return 'сегодня';
    if (n === 1) return 'завтра';
    if (n === 2) return 'послезавтра';
    return 'через ' + n + ' ' + plural(n, ['день', 'дня', 'дней']);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function slug(s) {
    return String(s).replace(/[«»"']/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'material';
  }

  /* ---------- Иконки интерфейса (24×24, обводка) ---------- */
  const ICONS = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    book: '<path d="M3.5 5.5c3-1.5 6-1.5 8.5.5 2.5-2 5.5-2 8.5-.5v13.5c-3-1.5-6-1.5-8.5.5-2.5-2-5.5-2-8.5-.5z"/><path d="M12 6v13.5"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    slides: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M12 16.5v3.5M8 20h8M7 9h6M7 12h4"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    up: '<path d="M6 14l6-6 6 6"/>',
    down: '<path d="M6 10l6 6 6-6"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    x: '<path d="M7 7l10 10M17 7L7 17"/>'
  };

  function icon(name, cls) {
    return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  function toast(message, kind) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = h('<div class="toast' + (kind ? ' toast--' + kind : '') + '" role="status"></div>');
    t.textContent = message;
    box.append(t);
    setTimeout(() => t.classList.add('is-out'), 3600);
    setTimeout(() => t.remove(), 4100);
  }

  /* ---------- Поиск: слова, упрощённый стеммер для русского ---------- */
  const ENDINGS = ['иями', 'ями', 'ами', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими', 'ией', 'иях', 'иям', 'ах', 'ях', 'ам', 'ям', 'ом', 'ем', 'ой', 'ей', 'ий', 'ый', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ую', 'юю', 'ов', 'ев', 'ия', 'ья', 'ье', 'а', 'я', 'о', 'е', 'ы', 'и', 'у', 'ю', 'ь', 'й'];
  const STOP = new Set(('и в во на по к ко с со о об от до за из у для про как что где когда какой какая какие какое ' +
    'есть мне нам нужен нужна нужно нужны найди найти найдите покажи покажите подбери подберите хочу можно ли или а но не ' +
    'же бы это тот та те этот эта эти все всё весь вся мой моя мои наш наша наши детей дети ребят ребенка ребёнка ' +
    'детский детского саду сад группы группе группа что-нибудь чтонибудь пожалуйста есть-ли тема теме тему ' +
    'день дня дню дни дней днём').split(' '));

  // Однокоренные слова, которые стеммер не сводит вместе.
  const SYNONYMS = [['космич', 'космос'], ['птич', 'птиц'], ['снежн', 'снег'], ['новогод', 'нов'], ['мамочк', 'мам'], ['мамин', 'мам'], ['пап', 'пап'], ['осенн', 'осен'], ['зимн', 'зим'], ['весенн', 'весн'], ['летн', 'лет'], ['морск', 'мор'], ['рыбк', 'рыб'], ['хлебн', 'хлеб']];

  function words(text) {
    return String(text || '').toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я0-9]+/g) || [];
  }

  function stem(w) {
    for (const [from, to] of SYNONYMS) if (w.startsWith(from)) return to;
    if (w.length <= 3) return w;
    for (const e of ENDINGS) {
      if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length);
    }
    return w;
  }

  function stems(text, keepStop) {
    return words(text).filter((w) => keepStop || !STOP.has(w)).map(stem).filter((s) => s.length >= 2);
  }

  // 1 — совпадение, 0.9 — одно слово продолжает другое, 0.6 — общий длинный корень.
  function stemMatch(a, b) {
    if (a === b) return 1;
    const s = a.length < b.length ? a : b;
    const l = a.length < b.length ? b : a;
    if (s.length >= 3 && l.startsWith(s)) return 0.9;
    let i = 0;
    while (i < s.length && s[i] === l[i]) i++;
    if (i >= 5 && i >= s.length * 0.7) return 0.6;
    return 0;
  }

  /* ---------- Возрастная группа: вкладки сверху, выбор запоминается в браузере ---------- */
  const GROUP_KEY = 'ols.group';
  function getGroup() {
    try { return localStorage.getItem(GROUP_KEY) || 'all'; } catch (e) { return 'all'; }
  }
  function setGroup(g) {
    try { localStorage.setItem(GROUP_KEY, g); } catch (e) { /* без запоминания */ }
  }
  function groupTabs(current) {
    const G = App.store.GROUPS;
    return '<nav class="group-tabs" aria-label="Возрастная группа">' +
      '<button type="button" class="group-tab' + (current === 'all' ? ' is-on' : '') + '" data-group="all" aria-pressed="' + (current === 'all') + '"><b>Все возрасты</b><small>от 1 до 7 лет</small></button>' +
      Object.entries(G).map(([k, g]) => '<button type="button" class="group-tab' + (current === k ? ' is-on' : '') + '" data-group="' + k + '" aria-pressed="' + (current === k) + '"><b>' + g.title + '</b><small>' + g.sub + '</small></button>').join('') +
      '</nav>';
  }

  App.util = {
    getGroup, setGroup, groupTabs,
    MONTHS, MONTHS_GEN, MONTHS_SHORT, WEEKDAYS, WD_SHORT, SEASONS, SEASON_ORDER,
    startOfDay, today, seasonOf, dayDiff, plural, formatDay, inDaysLabel,
    esc, h, debounce, slug, icon, toast,
    words, stem, stems, stemMatch, STOP
  };
})();
