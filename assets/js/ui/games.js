/*
 * Генератор развивающих листов по правилам data/games.js.
 * Каждый лист строится из рисунков сайта, поэтому на нём нет посторонних надписей —
 * только короткое задание на русском. Материалы добавляются в общий список печатных материалов.
 */
(function () {
  'use strict';
  const App = window.App;
  const A = App.art;
  const G = window.SITE_DATA.games;
  if (!G) return;
  const INK = A.INK;
  const W = 210, H = 297;

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(list, r) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Общая «шапка» листа: задание крупно и рамка.
  function sheet(item, task, body, css) {
    const lines = A.wrap(task, 34);
    let head = '<rect x="7" y="7" width="196" height="283" rx="10" fill="none" stroke="' + INK + '" stroke-width="0.7"/>';
    lines.forEach((l, i) => { head += A.T(105, 22 + i * 10, l, 9.5); });
    return A.svgDoc(W, H, head + body + A.footer(item, W, H), css);
  }
  function add(acc, g) { acc.css += g.css; acc.body += g.svg; }

  /* ---------- Лабиринт ---------- */
  function maze(item) {
    const a = item.art, r = rng(a.seed);
    const cols = a.cols, rows = a.rows;
    const cell = Math.min(160 / cols, 200 / rows);
    const x0 = (W - cell * cols) / 2, y0 = 62;
    // Стены: right[i], down[i]; прокладываем ходы «рекурсивным возвратом».
    const right = new Array(cols * rows).fill(true), down = new Array(cols * rows).fill(true), seen = new Array(cols * rows).fill(false);
    const stack = [0];
    seen[0] = true;
    while (stack.length) {
      const c = stack[stack.length - 1], x = c % cols, y = Math.floor(c / cols);
      const nb = [];
      if (x > 0 && !seen[c - 1]) nb.push(['l', c - 1]);
      if (x < cols - 1 && !seen[c + 1]) nb.push(['r', c + 1]);
      if (y > 0 && !seen[c - cols]) nb.push(['u', c - cols]);
      if (y < rows - 1 && !seen[c + cols]) nb.push(['d', c + cols]);
      if (!nb.length) { stack.pop(); continue; }
      const [dir, n] = nb[Math.floor(r() * nb.length)];
      if (dir === 'r') right[c] = false;
      if (dir === 'l') right[n] = false;
      if (dir === 'd') down[c] = false;
      if (dir === 'u') down[n] = false;
      seen[n] = true;
      stack.push(n);
    }
    let d = 'M' + (x0 + cell) + ' ' + y0 + 'H' + (x0 + cols * cell) + 'M' + x0 + ' ' + y0 + 'V' + (y0 + rows * cell) + 'M' + x0 + ' ' + (y0 + rows * cell) + 'H' + (x0 + (cols - 1) * cell);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const c = y * cols + x, X = x0 + (x + 1) * cell, Y = y0 + (y + 1) * cell;
      if (right[c] && !(x === cols - 1 && y === rows - 1 && false)) d += 'M' + X.toFixed(1) + ' ' + (Y - cell).toFixed(1) + 'V' + Y.toFixed(1);
      if (down[c]) d += 'M' + (X - cell).toFixed(1) + ' ' + Y.toFixed(1) + 'H' + X.toFixed(1);
    }
    const acc = { body: '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="' + (cols > 9 ? 1 : 1.4) + '" stroke-linecap="round"/>', css: '' };
    add(acc, A.placeIcon(a.from, x0 - 4, y0 - 30, 26, { mode: 'color', stroke: 0.7 }));
    add(acc, A.placeIcon(a.to, x0 + cols * cell - 22, y0 + rows * cell + 4, 26, { mode: 'color', stroke: 0.7 }));
    acc.body += '<path d="M' + (x0 + cell / 2) + ' ' + (y0 - 3) + 'v-2" stroke="#e8590c" stroke-width="1.6"/>';
    return sheet(item, a.task, acc.body, acc.css);
  }

  /* ---------- Чья тень? ---------- */
  function shadow(item) {
    const a = item.art, r = rng(a.seed), n = a.icons.length;
    const step = Math.min(52, 210 / n), y0 = 50 + (210 - step * n) / 2, s = step * 0.8;
    const order = shuffle(a.icons.map((_, i) => i), r);
    const acc = { body: '', css: '' };
    a.icons.forEach((ic, i) => {
      add(acc, A.placeIcon(ic, 28, y0 + i * step, s, { mode: 'color', stroke: 0.8 }));
      acc.body += '<circle cx="' + (34 + s) + '" cy="' + (y0 + i * step + s / 2) + '" r="1.8" fill="' + INK + '"/>';
    });
    order.forEach((idx, i) => {
      add(acc, A.placeIcon(a.icons[idx], 182 - s, y0 + i * step, s, { mode: 'shadow', stroke: 0.8 }));
      acc.body += '<circle cx="' + (176 - s) + '" cy="' + (y0 + i * step + s / 2) + '" r="1.8" fill="' + INK + '"/>';
    });
    return sheet(item, 'Чья тень? Соедини картинку с её тенью', acc.body, acc.css);
  }

  /* ---------- Что лишнее? ---------- */
  function odd(item) {
    const a = item.art;
    const acc = { body: '', css: '' };
    const rowH = Math.min(56, 220 / a.rows.length), y0 = 46;
    a.rows.forEach((row, i) => {
      const y = y0 + i * rowH;
      acc.body += '<rect x="14" y="' + (y + 2) + '" width="182" height="' + (rowH - 6) + '" rx="6" fill="none" stroke="#c9c3dc" stroke-width="0.6"/>';
      row.forEach((ic, j) => add(acc, A.placeIcon(ic, 22 + j * 44, y + 6, rowH - 14, { mode: 'color', stroke: 0.8 })));
    });
    return sheet(item, 'Что лишнее? Обведи лишнюю картинку в каждом ряду', acc.body, acc.css);
  }

  /* ---------- Найди пару ---------- */
  function pairs(item) {
    const a = item.art, r = rng(a.seed);
    const cards = shuffle(a.icons.concat(a.icons), r);
    const cols = cards.length <= 6 ? 2 : cards.length <= 8 ? 2 : 3;
    const rows = Math.ceil(cards.length / cols);
    const cw = 170 / cols, ch = Math.min(56, 215 / rows);
    const acc = { body: '', css: '' };
    cards.forEach((ic, i) => {
      const x = 20 + (i % cols) * cw, y = 48 + Math.floor(i / cols) * ch;
      acc.body += '<rect x="' + (x + 3) + '" y="' + (y + 3) + '" width="' + (cw - 6) + '" height="' + (ch - 6) + '" rx="5" fill="#fff" stroke="' + INK + '" stroke-width="0.6"/>';
      const s = Math.min(cw, ch) - 18;
      add(acc, A.placeIcon(ic, x + (cw - s) / 2, y + (ch - s) / 2, s, { mode: 'color', stroke: 0.8 }));
    });
    return sheet(item, 'Найди одинаковые картинки и соедини их линией', acc.body, acc.css);
  }

  /* ---------- Собери в корзинку ---------- */
  function basket(item) {
    const a = item.art, r = rng(a.seed);
    const pool = shuffle(a.icons, r);
    const acc = { body: '', css: '' };
    pool.forEach((ic, i) => add(acc, A.placeIcon(ic, 18 + (i % 4) * 45, 48 + Math.floor(i / 4) * 48, 38, { mode: 'color', stroke: 0.8 })));
    // Корзинка
    acc.body += '<path d="M40 200H170L158 268H52Z" fill="#f3d9b1" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M50 200Q105 140 160 200" fill="none" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M46 222H164M49 244H161M80 200L84 268M105 200V268M130 200L126 268" stroke="#b07d62" stroke-width="0.7"/>';
    return sheet(item, 'Собери урожай: соедини с корзинкой то, что растёт на грядке и в лесу', acc.body, acc.css);
  }

  /* ---------- Маска для театра ---------- */
  function mask(item) {
    const a = item.art;
    const acc = { body: '', css: '' };
    acc.body += '<circle cx="105" cy="112" r="62" fill="#fff" stroke="' + INK + '" stroke-width="0.9" stroke-dasharray="3.5 2.6"/>';
    add(acc, A.placeIcon(a.icon, 60, 67, 90, { mode: a.color ? 'color' : 'line', stroke: 1.1 }));
    [196, 230].forEach((y) => { acc.body += '<rect x="15" y="' + y + '" width="180" height="22" rx="3" fill="#fff" stroke="' + INK + '" stroke-width="0.7" stroke-dasharray="3.5 2.6"/>'; });
    acc.body += A.T(105, 266, 'Склей полоски в ободок по размеру головы и приклей картинку спереди', 5.4, { weight: 600, fill: '#6b6580' });
    return sheet(item, (a.color ? 'Вырежи' : 'Раскрась и вырежи') + ' по пунктиру маску «' + G.names[a.icon] + '»', acc.body, acc.css);
  }

  const BUILD = { maze, shadow, odd, pairs, basket, mask };
  // Тип материала «game» — общий для всех игр; конкретный рисунок выбирается по art.kind.
  A.registerBuilder('game', (item) => BUILD[item.art.kind](item));
  A.registerBuilder('mask', mask);

  /* ---------- Набор материалов ---------- */
  const base = (o) => Object.assign({ demo: true, holidays: [], seasons: ['all'], tags: [] }, o);
  const seasonOf = (ic) => G.seasons[ic] || 'all';
  const items = [];
  const GROUP_LABEL = { g1: '1,5–3 года', g2: '3–5 лет', g3: '5–7 лет' };

  // Лабиринты: три уровня сложности.
  const MAZE_SIZE = { g1: [4, 5], g2: [7, 9], g3: [11, 14] };
  G.mazes.forEach((m) => ['g1', 'g2', 'g3'].forEach((g) => [1, 2].forEach((v) => {
    if (g === 'g1' && v === 2) return;
    items.push(base({
      id: 'g-maze-' + m.from + '-' + m.to + '-' + g + '-' + v, type: 'game', subjects: ['math', 'art'], groups: [g],
      seasons: [m.season], holidays: m.holidays || [],
      title: 'Лабиринт «' + G.names[m.from] + ' и ' + G.names[m.to].toLowerCase() + '»' + (v === 2 ? ', вариант 2' : ''),
      tags: ['лабиринт', 'логика', 'мелкая моторика'],
      description: 'Лабиринт для детей ' + GROUP_LABEL[g] + '. Ребёнок ведёт карандашом путь от старта до цели.',
      art: { kind: 'maze', from: m.from, to: m.to, task: m.task, cols: MAZE_SIZE[g][0], rows: MAZE_SIZE[g][1], seed: hash(m.from + m.to + g + v) }
    }));
  })));

  // Чья тень? и Найди пару — по категориям.
  Object.entries(G.categories).forEach(([cat, icons]) => [1, 2].forEach((v) => {
    const r = rng(hash(cat + v));
    ['g1', 'g2', 'g3'].forEach((g) => {
      const n = g === 'g1' ? 3 : g === 'g2' ? 4 : 5;
      const set = shuffle(icons, r).slice(0, n);
      items.push(base({
        id: 'g-shadow-' + hash(cat) + '-' + g + '-' + v, type: 'game', subjects: ['world', 'math'], groups: [g],
        title: 'Чья тень? ' + cat[0].toUpperCase() + cat.slice(1) + (v === 2 ? ', вариант 2' : ''),
        tags: ['тени', 'внимание', cat], description: 'Найди тень для каждой картинки (' + set.map((i) => G.names[i].toLowerCase()).join(', ') + ').',
        art: { kind: 'shadow', icons: set, seed: hash(cat + g + v) }
      }));
      const np = g === 'g1' ? 3 : g === 'g2' ? 4 : 6;
      items.push(base({
        id: 'g-pairs-' + hash(cat) + '-' + g + '-' + v, type: 'game', subjects: ['math', 'speech'], groups: [g],
        title: 'Найди пару: ' + cat + (v === 2 ? ', вариант 2' : ''),
        tags: ['найди пару', 'внимание', cat], description: 'Найди одинаковые картинки и соедини их линией.',
        art: { kind: 'pairs', icons: shuffle(icons, r).slice(0, Math.min(np, icons.length)), seed: hash('p' + cat + g + v) }
      }));
    });
  }));

  // Что лишнее?
  const cats = Object.entries(G.categories);
  for (let v = 1; v <= 6; v++) ['g2', 'g3'].forEach((g) => {
    const r = rng(hash('odd' + v + g));
    const rows = Array.from({ length: g === 'g2' ? 3 : 4 }, () => {
      const [ci, oi] = shuffle(cats.map((_, i) => i), r).slice(0, 2);
      return shuffle(shuffle(cats[ci][1], r).slice(0, 3).concat(shuffle(cats[oi][1], r)[0]), r);
    });
    items.push(base({
      id: 'g-odd-' + g + '-' + v, type: 'game', subjects: ['math', 'speech'], groups: [g],
      title: 'Что лишнее? Вариант ' + v, tags: ['что лишнее', 'логика', 'классификация'],
      description: 'В каждом ряду одна картинка не подходит к остальным. Ребёнок находит её и объясняет почему.',
      art: { kind: 'odd', rows }
    }));
  });

  // Собери в корзинку.
  for (let v = 1; v <= 4; v++) {
    const r = rng(hash('basket' + v));
    items.push(base({
      id: 'g-basket-' + v, type: 'game', subjects: ['world', 'math'], groups: v <= 2 ? ['g1', 'g2'] : ['g2', 'g3'], seasons: ['autumn'], holidays: ['bread-day'],
      title: 'Собери урожай в корзинку, вариант ' + v, tags: ['урожай', 'овощи', 'фрукты', 'классификация'],
      description: 'Ребёнок соединяет с корзинкой то, что растёт на грядке и в лесу.',
      art: { kind: 'basket', icons: shuffle(G.basket.yes, r).slice(0, v <= 2 ? 3 : 4).concat(shuffle(G.basket.no, r).slice(0, v <= 2 ? 3 : 4)), seed: hash('b' + v) }
    }));
  }

  // Маски: цветная и для раскрашивания.
  G.masks.forEach((ic) => [true, false].forEach((color) => items.push(base({
    id: 'g-mask-' + ic + (color ? '-c' : '-l'), type: 'mask', subjects: ['art', 'speech'], groups: ['g1', 'g2', 'g3'], seasons: [seasonOf(ic)],
    title: 'Маска «' + G.names[ic] + '»' + (color ? ' (цветная)' : ' (раскрась сам)'), tags: ['маска', 'театр', 'сказки', G.names[ic].toLowerCase()],
    description: 'Маска-ободок для детского театра и игр-драматизаций. Вырежьте по пунктиру и склейте полоски по размеру головы.',
    art: { icon: ic, color }
  }))));

  // Раскраски по всем рисункам.
  Object.entries(G.names).forEach(([ic, name]) => items.push(base({
    id: 'g-color-' + ic, type: 'coloring', subjects: ['art'], groups: ['g1', 'g2', 'g3'], seasons: [seasonOf(ic)],
    title: 'Раскраска «' + name + '»', tags: ['раскраска', name.toLowerCase()],
    description: 'Крупный контур для раскрашивания карандашами, мелками или красками.',
    art: { icon: ic, extras: shuffle(Object.keys(G.names).filter((k) => k !== ic), rng(hash(ic))).slice(0, 3) }
  })));

  // Карточки-счёт.
  G.counting.forEach((ic) => items.push(base({
    id: 'g-count-' + ic, type: 'cards', subjects: ['math'], groups: ['g2', 'g3'], seasons: [seasonOf(ic)],
    title: 'Карточки-счёт «' + G.names[ic] + '»', tags: ['счёт', 'математика', 'цифры'],
    description: 'Карточки от 1 до 6: считаем картинки и соотносим с цифрой.',
    art: { icon: ic, counting: 6 }
  })));

  // Патриотическая тематика.
  items.push(base({
    id: 'g-poster-flag', type: 'poster', subjects: ['world'], groups: ['g2', 'g3'], holidays: ['flag-day', 'russia-day', 'unity-day'],
    title: 'Плакат «Флаг России»', tags: ['флаг', 'россия', 'символы', 'родина'],
    description: 'Плакат о государственном флаге для патриотического уголка.',
    art: { icon: 'flag', band: '#2f4f9f', facts: ['У флага России три полосы: белая, синяя и красная.', 'День Государственного флага — 22 августа.', 'Флаг поднимают в торжественные дни.'] }
  }));

  const added = App.store.addPrintables(items);
  App.games = { count: added };
})();
