/*
 * Демо-графика: сайт сам рисует печатные листы (SVG) и обложки разработок.
 * Нужна, пока материалы не загружены в облако. У реального материала вместо art будут preview и file.
 * Координаты листов — в миллиметрах (A4: 210×297), иконки — в квадрате 100×100.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const INK = '#2b2540';

  function starPts(cx, cy, R, r) {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r : R;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return p.join(' ');
  }

  function rays(cx, cy, r1, r2, n) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n;
      d += 'M' + (cx + r1 * Math.cos(a)).toFixed(1) + ' ' + (cy + r1 * Math.sin(a)).toFixed(1) +
        'L' + (cx + r2 * Math.cos(a)).toFixed(1) + ' ' + (cy + r2 * Math.sin(a)).toFixed(1);
    }
    return '<path d="' + d + '"/>';
  }

  /* Классы заливки: f1–f4 — основные области, k — тёмные детали, tr/ty/tg — сигналы светофора, fs1–fs3 — полосы флага. */
  const ICONS = {
    rocket: () => '<path class="f1" d="M50 6C63 18 68 38 66 66H34C32 38 37 18 50 6Z"/><circle class="f2" cx="50" cy="36" r="8"/><path class="f3" d="M34 48L20 68L34 66Z"/><path class="f3" d="M66 48L80 68L66 66Z"/><path class="f4" d="M43 66Q50 96 57 66Z"/><path d="M40 22Q50 16 60 22"/>',
    star: () => '<polygon class="f1" points="' + starPts(50, 54, 44, 19) + '"/><circle class="k" cx="42" cy="52" r="2.6"/><circle class="k" cx="58" cy="52" r="2.6"/><path d="M43 61Q50 67 57 61"/>',
    planet: () => '<g transform="rotate(-20 50 50)"><ellipse cx="50" cy="50" rx="44" ry="12"/></g><circle class="f1" cx="50" cy="50" r="25"/><path d="M28 42Q50 36 72 42M26 56Q50 50 74 56"/><g transform="rotate(-20 50 50)"><path class="f2" d="M6 50A44 12 0 0 0 94 50L86 50A36 7 0 0 1 14 50Z"/></g>',
    moon: () => '<path class="f1" d="M64 10A40 40 0 1 0 64 90A44 44 0 0 1 64 10Z"/><circle cx="32" cy="40" r="3"/><circle cx="33" cy="62" r="3.4"/><circle cx="30" cy="51" r="1.8"/>',
    sun: () => rays(50, 50, 28, 42, 12) + '<circle class="f1" cx="50" cy="50" r="22"/><circle class="k" cx="42" cy="46" r="2.6"/><circle class="k" cx="58" cy="46" r="2.6"/><path d="M41 56Q50 64 59 56"/>',
    globe: () => '<circle class="f2" cx="50" cy="50" r="38"/><path class="f3" d="M27 28Q39 19 48 30Q46 44 34 46Q22 42 27 28Z"/><path class="f3" d="M56 54Q70 47 78 60Q72 77 60 74Q51 66 56 54Z"/><path class="f3" d="M60 19Q71 21 73 30Q64 32 60 19Z"/><ellipse cx="50" cy="50" rx="16" ry="38"/><path d="M12 50H88"/>',
    bird: () => '<path class="f3" d="M25 60L6 70L10 77L27 68Z"/><path class="f1" d="M22 58C22 40 38 32 54 36C66 39 72 50 70 60C67 74 50 80 36 76C27 73 22 66 22 58Z"/><path class="f3" d="M30 56C40 50 54 52 60 60C50 66 38 66 30 56Z"/><circle class="f2" cx="68" cy="38" r="14"/><path class="f1" d="M60 40Q68 50 77 42Q70 46 60 40Z"/><path class="f4" d="M81 35L93 39L81 43Z"/><circle class="k" cx="72" cy="34" r="2.4"/><path d="M60 50Q57 62 50 72M44 77V88M54 76V88M40 88H48M50 88H58"/>',
    birdhouse: () => '<path d="M50 84V98"/><rect class="f1" x="28" y="40" width="44" height="46"/><path class="f2" d="M20 44L50 14L80 44Z"/><circle class="k" cx="50" cy="58" r="8"/><path d="M42 74H58"/>',
    leaf: () => '<path d="M50 80V97"/><path class="f1" d="M50 6C77 24 82 58 50 86C18 58 23 24 50 6Z"/><path d="M50 18V86M50 38L36 28M50 38L64 28M50 54L31 44M50 54L69 44M50 70L36 61M50 70L64 61"/>',
    tree: () => '<path class="f3" d="M44 60H56V94H44Z"/><path class="f1" d="M50 6C64 6 72 16 72 24C84 28 87 44 79 52C81 64 67 71 56 65C50 71 38 71 34 63C20 65 13 53 20 45C12 35 20 22 30 22C30 12 40 6 50 6Z"/><path d="M50 65V52M50 56L42 48M50 54L58 46M36 94H64"/>',
    snowflake: () => {
      let s = '';
      for (let k = 0; k < 6; k++) s += '<g transform="rotate(' + k * 60 + ' 50 50)"><path d="M50 50V8M50 20L42 12M50 20L58 12M50 33L40 25M50 33L60 25"/></g>';
      return s + '<circle class="f1" cx="50" cy="50" r="7"/>';
    },
    snowman: () => '<path d="M37 46L18 34M18 34L13 36M18 34L17 28M63 46L82 34M82 34L87 36M82 34L83 28"/><circle class="f1" cx="50" cy="78" r="20"/><circle class="f1" cx="50" cy="48" r="15"/><circle class="f1" cx="50" cy="24" r="11"/><rect class="f3" x="43" y="1" width="14" height="11"/><rect class="f3" x="38" y="11" width="24" height="3.5"/><path class="f4" d="M50 23L63 27L50 29Z"/><circle class="k" cx="46" cy="21" r="1.8"/><circle class="k" cx="55" cy="21" r="1.8"/><path class="f2" d="M39 34Q50 39 61 34L61 39Q50 44 39 39Z"/><path class="f2" d="M56 39L60 52L54 52Z"/><circle class="k" cx="50" cy="49" r="1.8"/><circle class="k" cx="50" cy="56" r="1.8"/><circle class="k" cx="50" cy="72" r="2"/>',
    fir: () => '<rect class="f3" x="44" y="84" width="12" height="11"/><path class="f1" d="M50 12L28 40H38L20 63H34L13 85H87L66 63H80L62 40H72Z"/><polygon class="f4" points="' + starPts(50, 11, 9, 4) + '"/><circle class="f2" cx="42" cy="50" r="3.5"/><circle class="f4" cx="58" cy="58" r="3.5"/><circle class="f2" cx="38" cy="75" r="3.5"/><circle class="f4" cx="62" cy="77" r="3.5"/><path d="M36 44Q50 52 64 44M30 68Q50 76 70 68"/>',
    flower: () => {
      let s = '<path d="M50 50Q46 74 50 96"/><path class="f3" d="M49 80C40 72 30 72 25 76C32 84 42 86 49 80Z"/><path class="f3" d="M51 70C60 62 70 62 75 66C68 74 58 76 51 70Z"/>';
      for (let k = 0; k < 6; k++) s += '<ellipse class="f1" cx="50" cy="20" rx="9" ry="14" transform="rotate(' + k * 60 + ' 50 36)"/>';
      return s + '<circle class="f2" cx="50" cy="36" r="9"/>';
    },
    mushroom: () => '<path d="M14 90H86"/><path class="f1" d="M40 52C38 70 36 82 38 90H62C64 82 62 70 60 52Z"/><path class="f2" d="M12 54C12 26 88 26 88 54Z"/><circle class="f1" cx="32" cy="42" r="4.5"/><circle class="f1" cx="52" cy="34" r="5"/><circle class="f1" cx="70" cy="44" r="4"/>',
    apple: () => '<path class="f2" d="M50 30C38 20 16 24 16 50C16 76 36 92 50 84C64 92 84 76 84 50C84 24 62 20 50 30Z"/><path d="M50 30Q50 18 56 9M26 46Q26 36 34 32"/><path class="f3" d="M54 22C60 10 74 10 79 14C72 24 62 26 54 22Z"/>',
    pumpkin: () => '<path class="f3" d="M47 30Q45 19 51 11L58 14Q52 22 55 30Z"/><ellipse class="f2" cx="30" cy="60" rx="20" ry="28"/><ellipse class="f2" cx="70" cy="60" rx="20" ry="28"/><ellipse class="f2" cx="50" cy="60" rx="19" ry="30"/><path d="M58 18Q72 9 75 22"/>',
    wheat: () => {
      let s = '<path d="M50 97Q48 64 50 22"/>';
      for (let i = 0; i < 5; i++) {
        const y = 28 + i * 11;
        s += '<ellipse class="f1" cx="42" cy="' + y + '" rx="5" ry="9" transform="rotate(-35 42 ' + y + ')"/><ellipse class="f1" cx="58" cy="' + y + '" rx="5" ry="9" transform="rotate(35 58 ' + y + ')"/>';
      }
      return s + '<ellipse class="f1" cx="50" cy="17" rx="5" ry="9"/><path d="M50 8V2M39 20L33 12M61 20L67 12"/>';
    },
    heart: () => '<path class="f2" d="M50 88C20 66 9 47 13 32C17 17 38 13 50 30C62 13 83 17 87 32C91 47 80 66 50 88Z"/><path d="M27 34Q30 26 38 26"/>',
    house: () => '<rect class="f1" x="62" y="18" width="10" height="20"/><rect class="f1" x="20" y="48" width="60" height="44"/><path class="f2" d="M12 50L50 16L88 50Z"/><rect class="f3" x="42" y="64" width="16" height="28"/><rect class="f4" x="25" y="58" width="12" height="12"/><rect class="f4" x="63" y="58" width="12" height="12"/>',
    cat: () => '<path d="M70 88Q95 82 86 60"/><path class="f1" d="M30 94C22 72 30 54 50 54C70 54 78 72 70 94Z"/><path class="f1" d="M32 34L30 4L53 22Z"/><path class="f1" d="M68 34L70 4L47 22Z"/><circle class="f1" cx="50" cy="38" r="20"/><path class="f2" d="M34 20L33 10L42 18Z"/><path class="f2" d="M66 20L67 10L58 18Z"/><ellipse class="k" cx="42" cy="36" rx="2.6" ry="3.6"/><ellipse class="k" cx="58" cy="36" rx="2.6" ry="3.6"/><path class="f2" d="M47 44H53L50 48Z"/><path d="M50 48Q46 53 42 51M50 48Q54 53 58 51M38 46L22 43M38 49L22 52M62 46L78 43M62 49L78 52M42 94V80M58 94V80"/>',
    bee: () => '<ellipse class="f1" cx="40" cy="30" rx="11" ry="17" transform="rotate(-25 40 30)"/><ellipse class="f1" cx="58" cy="30" rx="11" ry="17" transform="rotate(25 58 30)"/><path d="M20 58L8 60"/><ellipse class="f2" cx="46" cy="58" rx="28" ry="19"/><path class="f3" d="M34 41Q28 58 34 75L42 77Q36 58 42 40Z"/><path class="f3" d="M50 39Q44 58 50 77L58 76Q52 58 58 40Z"/><path d="M78 45Q80 33 89 30M73 45Q70 33 63 30"/><circle class="f1" cx="78" cy="55" r="11"/><circle class="k" cx="81" cy="52" r="2.2"/><path d="M75 60Q79 63 84 60"/>',
    butterfly: () => '<ellipse class="f1" cx="30" cy="36" rx="20" ry="16" transform="rotate(-25 30 36)"/><ellipse class="f1" cx="70" cy="36" rx="20" ry="16" transform="rotate(25 70 36)"/><ellipse class="f2" cx="34" cy="64" rx="15" ry="12" transform="rotate(25 34 64)"/><ellipse class="f2" cx="66" cy="64" rx="15" ry="12" transform="rotate(-25 66 64)"/><circle class="f3" cx="28" cy="36" r="6"/><circle class="f3" cx="72" cy="36" r="6"/><rect class="f4" x="46" y="28" width="8" height="48" rx="4"/><path d="M48 28Q42 14 36 12M52 28Q58 14 64 12"/>',
    ladybug: () => '<path d="M24 52L10 46M24 66L10 70M76 52L90 46M76 66L90 70M30 82L20 92M70 82L80 92M44 17Q40 8 34 8M56 17Q60 8 66 8"/><circle class="f3" cx="50" cy="28" r="13"/><circle class="f2" cx="50" cy="58" r="30"/><path d="M50 30V88"/><circle class="k" cx="38" cy="48" r="5"/><circle class="k" cx="62" cy="48" r="5"/><circle class="k" cx="36" cy="70" r="4"/><circle class="k" cx="64" cy="70" r="4"/>',
    fish: () => '<path class="f2" d="M74 50L94 32V68Z"/><path class="f1" d="M14 50C28 26 62 24 78 50C62 76 28 74 14 50Z"/><path class="f2" d="M42 31Q50 16 62 30Z"/><circle class="f1" cx="30" cy="46" r="5"/><circle class="k" cx="31" cy="46" r="2.2"/><path d="M40 36Q47 50 40 64M50 42q5 4 0 8M58 42q5 4 0 8M54 51q5 4 0 8M62 51q5 4 0 8M20 56Q24 58 28 56"/>',
    jellyfish: () => '<path d="M30 50Q22 64 30 76Q37 86 29 97M44 50Q38 66 45 78Q51 88 44 98M58 50Q64 66 57 78Q51 88 58 98M71 50Q79 64 71 76Q64 86 72 96"/><path class="f1" d="M18 52C18 26 33 12 50 12C67 12 82 26 82 52Q74 46 66 52Q58 46 50 52Q42 46 34 52Q26 46 18 52Z"/><circle class="f2" cx="38" cy="32" r="4"/><circle class="f2" cx="56" cy="26" r="3"/><circle class="f2" cx="64" cy="38" r="3.5"/>',
    umbrella: () => '<path d="M50 12V7M50 50V84Q50 92 42 92Q35 92 35 85"/><path class="f2" d="M8 50C12 26 30 12 50 12C70 12 88 26 92 50Q81 42 71 50Q61 42 50 50Q39 42 29 50Q19 42 8 50Z"/><path d="M29 50Q37 30 50 12M71 50Q63 30 50 12"/><path class="f4" d="M16 62C19 67 21 70 21 72A5 5 0 0 1 11 72C11 70 13 67 16 62Z"/><path class="f4" d="M82 66C85 71 87 74 87 76A5 5 0 0 1 77 76C77 74 79 71 82 66Z"/>',
    drop: () => '<path class="f2" d="M50 6C62 30 80 46 80 64C80 81 67 94 50 94C33 94 20 81 20 64C20 46 38 30 50 6Z"/><path d="M30 62Q30 76 40 82"/><circle class="k" cx="42" cy="60" r="2.8"/><circle class="k" cx="58" cy="60" r="2.8"/><path d="M42 70Q50 77 58 70"/>',
    flag: () => '<path d="M16 8V96M10 96H24"/><circle class="f4" cx="16" cy="7" r="4"/><rect class="fs1" x="16" y="14" width="72" height="16"/><rect class="fs2" x="16" y="30" width="72" height="16"/><rect class="fs3" x="16" y="46" width="72" height="16"/>',
    gift: () => '<rect class="f1" x="18" y="42" width="64" height="48"/><rect class="f2" x="14" y="32" width="72" height="12"/><rect class="f3" x="45" y="32" width="10" height="58"/><path class="f3" d="M50 32C38 12 22 20 34 32Z"/><path class="f3" d="M50 32C62 12 78 20 66 32Z"/>',
    book: () => '<path class="f1" d="M50 26C38 18 22 18 8 22V82C22 78 38 78 50 86Z"/><path class="f2" d="M50 26C62 18 78 18 92 22V82C78 78 62 78 50 86Z"/><path d="M16 34Q28 31 42 35M16 46Q28 43 42 47M16 58Q28 55 42 59M58 35Q72 31 84 34M58 47Q72 43 84 46M58 59Q72 55 84 58"/>',
    ball: () => '<circle class="f1" cx="50" cy="50" r="32"/><path class="f2" d="M50 18C37 31 37 69 50 82C63 69 63 31 50 18Z"/><path d="M18 50H82"/>',
    trafficlight: () => '<rect class="f3" x="46" y="80" width="8" height="17"/><rect class="f4" x="31" y="5" width="38" height="77" rx="10"/><circle class="tr" cx="50" cy="21" r="9.5"/><circle class="ty" cx="50" cy="43" r="9.5"/><circle class="tg" cx="50" cy="65" r="9.5"/>',
    circle: () => '<circle class="f2" cx="50" cy="50" r="40"/>',
    square: () => '<rect class="f3" x="12" y="12" width="76" height="76"/>',
    triangle: () => '<path class="f4" d="M50 10L92 88H8Z"/>',
    rect: () => '<rect class="f1" x="6" y="24" width="88" height="52"/>',
    oval: () => '<ellipse class="f2" cx="50" cy="50" rx="44" ry="28"/>',
    note: () =>'<path d="M44 74V24M82 64V14"/><path class="k" d="M44 19L82 9V17L44 27Z"/><ellipse class="f2" cx="34" cy="76" rx="11.5" ry="8.5" transform="rotate(-20 34 76)"/><ellipse class="f2" cx="72" cy="66" rx="11.5" ry="8.5" transform="rotate(-20 72 66)"/>'
  };

  const BASE_COLORS = { f1: '#fff1b8', f2: '#d9c3f2', f3: '#a8dcb6', f4: '#ffbe98', tr: '#ff8a8a', ty: '#ffe083', tg: '#8fdc9b', fs1: '#ffffff', fs2: '#5b8be0', fs3: '#e25c5c' };
  const ICON_COLORS = {
    apple: { f2: '#ff9f9f' }, pumpkin: { f2: '#ffbb7a' }, globe: { f2: '#a9d8ff' }, drop: { f2: '#a9d8ff' },
    leaf: { f1: '#ffc46b' }, tree: { f1: '#a8dcb6', f3: '#d2a77d' }, sun: { f1: '#ffe27a' }, heart: { f2: '#ff9fb5' },
    ladybug: { f2: '#ff8a80', f3: '#4a4458' }, bee: { f2: '#ffd966', f3: '#4a4458', f1: '#e9f6ff' },
    fish: { f1: '#ffc98a', f2: '#ffa36b' }, jellyfish: { f1: '#e2c8ff', f2: '#b8f0e6' },
    rocket: { f1: '#f4f4ff', f2: '#a9d8ff', f3: '#ff9f9f', f4: '#ffd27a' },
    snowman: { f1: '#ffffff', f2: '#ff9f9f', f3: '#4a4458', f4: '#ffb27a' },
    fir: { f1: '#9fd8a8', f3: '#c8a27a', f4: '#ffe27a' }, bird: { f1: '#fff3a6', f2: '#4a4458', f3: '#a9c8e8', f4: '#4a4458' },
    birdhouse: { f1: '#e6c29a', f2: '#b07d62' }, mushroom: { f2: '#ff8f7a' }, wheat: { f1: '#ffd77a' },
    trafficlight: { f4: '#6a6680', f3: '#9a96ae' }, ball: { f1: '#ffe27a', f2: '#ff9fb5' }, moon: { f1: '#fff1b8' }, planet: { f1: '#ffd9a0', f2: '#d9c3f2' }
  };

  const FILL_CLASSES = Object.keys(BASE_COLORS);
  let uid = 0;

  // Возвращает { svg, css }: иконку в квадрате size×size с левым верхним углом (x, y).
  function placeIcon(name, x, y, size, opts) {
    const o = opts || {};
    const fn = ICONS[name] || ICONS.star;
    const s = size / 100;
    const id = 'ic' + (++uid);
    const pal = Object.assign({}, BASE_COLORS, ICON_COLORS[name] || {}, o.colors || {});
    // mode: line — белые заливки (раскраска), color — цветные, shadow — силуэт-тень.
    const css = FILL_CLASSES.map((c) => '.' + id + ' .' + c + '{fill:' + (o.mode === 'color' ? pal[c] : o.mode === 'shadow' ? '#3a3550' : '#fff') + '}').join('') +
      (o.mode === 'shadow' ? '.' + id + ' *{stroke:#3a3550}' : '');
    const svg = '<g class="ic ' + id + (o.dashed ? ' dash' : '') + '" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + s.toFixed(4) + ')" style="stroke-width:' + ((o.stroke || 1.2) / s).toFixed(3) + '">' + fn() + '</g>';
    return { svg, css };
  }

  function T(x, y, str, size, o) {
    o = o || {};
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + size + '" font-weight="' + (o.weight || 700) + '" text-anchor="' + (o.anchor || 'middle') + '"' + (o.fill ? ' fill="' + o.fill + '"' : '') + '>' + U.esc(str) + '</text>';
  }

  function wrap(text, max) {
    const lines = [];
    let line = '';
    String(text).split(/\s+/).forEach((w) => {
      if ((line + ' ' + w).trim().length > max && line) {
        lines.push(line);
        line = w;
      } else line = (line + ' ' + w).trim();
    });
    if (line) lines.push(line);
    return lines;
  }

  function svgDoc(w, h, body, css) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w * 4 + '" height="' + h * 4 + '">' +
      '<style>.ic *{stroke:' + INK + ';stroke-linecap:round;stroke-linejoin:round;fill:none}.ic .k{fill:' + INK + '}.dash *{stroke-dasharray:3.5 2.6}' +
      'text{font-family:Nunito,"Segoe UI",Arial,sans-serif;fill:' + INK + '}' + css + '</style>' +
      '<rect width="' + w + '" height="' + h + '" fill="#fff"/>' + body + '</svg>';
  }

  function footer(item, W, H) {
    const lic = item.license ? item.license.code : '';
    return T(W / 2, H - 9, [item.author, lic].filter(Boolean).join(' · '), 4, { weight: 400, fill: '#8a84a0' });
  }

  function titleText(item) {
    return item.title.replace(/^(Раскраска|Карточки|Плакат|Шаблон)\s+/, '').replace(/[«»]/g, '');
  }

  /* ---------- Типы листов ---------- */
  function coloring(item) {
    const a = item.art, W = 210, H = 297;
    let css = '', body = '';
    const add = (g) => { css += g.css; body += g.svg; };
    body += '<rect x="7" y="7" width="196" height="283" rx="10" fill="none" stroke="' + INK + '" stroke-width="0.7"/>';
    body += T(105, 25, titleText(item), 11);
    body += T(105, 34, 'Раскрась картинку', 5.5, { weight: 400, fill: '#6b6580' });
    add(placeIcon(a.icon, 25, 46, 160, { stroke: 1.3 }));
    if (a.note) {
      wrap(a.note, 46).forEach((l, i) => { body += T(105, 232 + i * 9, l, 6.5, { weight: 600 }); });
    } else {
      const ex = a.extras || [], size = 38, gap = (196 - ex.length * size) / (ex.length + 1);
      ex.forEach((n, i) => add(placeIcon(n, 7 + gap + (size + gap) * i, 220, size, { stroke: 1 })));
    }
    return svgDoc(W, H, body + footer(item, W, H), css);
  }

  function cards(item) {
    const a = item.art, W = 297, H = 210;
    let list = a.items || [];
    if (a.counting) list = Array.from({ length: a.counting }, (_, i) => ({ icon: a.icon, count: i + 1, label: String(i + 1) }));
    let css = '', body = '';
    const add = (g) => { css += g.css; body += g.svg; };
    const n = list.length, cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const x0 = 12, y0 = 26, gap = 6, gw = W - 24, gh = H - y0 - 14;
    const cw = (gw - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
    body += T(W / 2, 17, titleText(item), 10);
    list.forEach((it, i) => {
      const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      const areaH = ch - 20;
      body += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1) + '" rx="5" fill="#fff" stroke="' + INK + '" stroke-width="0.6" stroke-dasharray="3 2"/>';
      if (it.count) {
        const perRow = Math.min(3, it.count), rowsN = Math.ceil(it.count / 3);
        const s = Math.min((cw - 12) / 3.2, (areaH - 4) / rowsN * 0.92);
        for (let k = 0; k < it.count; k++) {
          const r = Math.floor(k / 3), inRow = r === rowsN - 1 ? it.count - r * 3 : perRow;
          const cx = x + cw / 2 + ((k % 3) - (inRow - 1) / 2) * s * 1.05;
          const cy = y + 4 + (areaH - rowsN * s * 1.05) / 2 + r * s * 1.05;
          add(placeIcon(it.icon, cx - s / 2, cy, s, { mode: 'color', stroke: 0.7 }));
        }
        body += T(x + cw / 2, y + ch - 6, it.label, 11);
      } else if (it.big) {
        body += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (y + areaH * 0.78).toFixed(1) + '" font-size="' + (areaH * 0.8).toFixed(1) + '" font-weight="800" text-anchor="middle" fill="#693c85">' + U.esc(it.big) + '</text>';
        body += T(x + cw / 2, y + ch - 6, it.label, 8);
      } else {
        const small = it.dy != null;
        const s = (Math.min(cw - 16, areaH) - 4) * (small ? 0.5 : 1);
        const yy = y + 5 + (small ? it.dy * (areaH - 6 - s) : (areaH - 6 - s) / 2);
        add(placeIcon(it.icon, x + (cw - s) / 2, yy, s, { mode: 'color', stroke: 0.9 }));
        if (small) body += '<path d="M' + (x + 8).toFixed(1) + ' ' + (y + areaH).toFixed(1) + 'H' + (x + cw - 8).toFixed(1) + '" stroke="' + INK + '" stroke-width="0.6"/>';
        body += T(x + cw / 2, y + ch - 6, it.label, 8);
        if (it.letter) body += '<circle cx="' + (x + 11).toFixed(1) + '" cy="' + (y + 11).toFixed(1) + '" r="7.5" fill="#693c85"/>' + T(x + 11, y + 14.6, it.letter, 10, { fill: '#ffffff' });
      }
    });
    return svgDoc(W, H, body + footer(item, W, H), css);
  }

  function poster(item) {
    const a = item.art, W = 210, H = 297, band = a.band || '#693c85';
    let css = '', body = '';
    const add = (g) => { css += g.css; body += g.svg; };
    body += '<rect width="' + W + '" height="' + H + '" fill="#f7f3fd"/><rect width="' + W + '" height="48" fill="' + band + '"/>';
    const lines = wrap(titleText(item), 24);
    lines.forEach((l, i) => { body += T(105, (lines.length > 1 ? 21 : 29) + i * 14, l, 13, { fill: '#ffffff' }); });
    body += '<circle cx="105" cy="118" r="62" fill="#ffffff"/>';
    add(placeIcon(a.icon, 55, 68, 100, { mode: 'color', stroke: 1.2 }));
    let y = 196;
    (a.facts || []).forEach((f) => {
      const fl = wrap(f, 40), hgt = 8 + fl.length * 9;
      body += '<rect x="18" y="' + y + '" width="174" height="' + hgt + '" rx="6" fill="#ffffff" stroke="' + band + '" stroke-width="0.8"/>';
      body += '<circle cx="29" cy="' + (y + hgt / 2) + '" r="3" fill="' + band + '"/>';
      fl.forEach((l, i) => { body += T(38, y + 10.5 + i * 9, l, 7, { anchor: 'start', weight: 600 }); });
      y += hgt + 5;
    });
    return svgDoc(W, H, body + footer(item, W, H), css);
  }

  function template(item) {
    const a = item.art, W = 210, H = 297;
    let css = '', body = '';
    const add = (g) => { css += g.css; body += g.svg; };
    body += T(105, 22, titleText(item), 11);
    body += T(105, 31, 'Вырежи по пунктирной линии', 5.5, { weight: 400, fill: '#6b6580' });
    add(placeIcon(a.icon, 30, 40, 150, { dashed: true, stroke: 1.1 }));
    body += '<path d="M14 200H196" stroke="#b9b3cc" stroke-width="0.5"/>';
    (a.steps || []).forEach((s, i) => {
      const y = 214 + i * 20;
      body += '<circle cx="24" cy="' + (y - 2) + '" r="5" fill="#ffffff" stroke="' + INK + '" stroke-width="0.6"/>' + T(24, y, String(i + 1), 5.5);
      wrap(s, 56).forEach((l, j) => { body += T(34, y + j * 8, l, 6.5, { anchor: 'start', weight: 600 }); });
    });
    return svgDoc(W, H, body + footer(item, W, H), css);
  }

  const BUILDERS = { coloring, cards, poster, template };

  function printableSvg(item) {
    return (BUILDERS[item.type] || coloring)(item);
  }

  /* ---------- Обложки разработок ---------- */
  const AREA_COLORS = { cognitive: '#3d5f9f', social: '#498757', speech: '#2f7f86', art: '#693c85', physical: '#a05a3c' };
  const KIND_HEIGHT = { 'Конспект занятия': 158, 'Тематический план': 128, 'Проект': 146, 'Сценарий праздника': 172, 'Досуг': 138 };

  function planCover(plan) {
    const W = 120, H = KIND_HEIGHT[plan.kind] || 150;
    const band = AREA_COLORS[(plan.areas || [])[0]] || '#693c85';
    const S = App.store;
    let css = '', body = '';
    body += '<rect width="' + W + '" height="' + H + '" fill="#fbf8ff"/><rect width="' + W + '" height="40" fill="' + band + '"/>';
    body += T(9, 14, plan.kind.toUpperCase(), 5.2, { anchor: 'start', fill: '#ffffff' });
    body += T(9, 24, (plan.ages || []).map((a) => S.AGES_SHORT[a]).join(', ') + ' лет', 5.2, { anchor: 'start', weight: 600, fill: '#ffffff' });
    body += '<circle cx="96" cy="40" r="17" fill="#ffffff" stroke="' + band + '" stroke-width="1"/>';
    const g = placeIcon(plan.icon, 82, 26, 28, { mode: 'color', stroke: 0.7 });
    css += g.css; body += g.svg;
    const lines = wrap(plan.title.replace(/[«»]/g, ''), 19).slice(0, 5);
    lines.forEach((l, i) => { body += T(9, 70 + i * 11, l, 8.6, { anchor: 'start', weight: 800 }); });
    let y = 70 + lines.length * 11 + 4;
    (plan.areas || []).slice(0, 2).forEach((a) => {
      if (y > H - 10) return;
      body += T(9, y, S.AREAS[a].replace(' развитие', ''), 5, { anchor: 'start', weight: 600, fill: '#6b6580' });
      y += 7;
    });
    if (plan.duration && y < H - 6) body += T(9, H - 8, plan.duration, 5, { anchor: 'start', weight: 400, fill: '#6b6580' });
    return svgDoc(W, H, body, css);
  }

  /* ---------- Конвертация ---------- */
  function dataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function svgSize(svg) {
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    return { w: +m[1], h: +m[2] };
  }

  // PNG для печати: длинная сторона 1754 px — это A4 при 150 dpi.
  function svgToPng(svg, longSide) {
    const { w, h } = svgSize(svg);
    const k = (longSide || 1754) / Math.max(w, h);
    const W = Math.round(w * k), H = Math.round(h * k);
    const sized = svg.replace(/width="[\d.]+" height="[\d.]+"/, 'width="' + W + '" height="' + H + '"');
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось подготовить PNG'))), 'image/png');
      };
      img.onerror = () => reject(new Error('Не удалось подготовить изображение'));
      img.src = dataUrl(sized);
    });
  }

  /* ---------- Документ разработки ---------- */
  function planBody(p, opts) {
    const S = App.store, e = U.esc, hTag = opts && opts.inline ? 'h3' : 'h2';
    const stepsTitle = p.kind === 'Тематический план' || p.kind === 'Проект' ? 'План работы' : 'Ход ' + (p.kind === 'Сценарий праздника' ? 'праздника' : p.kind === 'Досуг' ? 'досуга' : 'занятия');
    return (opts && opts.inline ? '' : '<h1>' + e(p.title) + '</h1>') +
      '<table class="doc-meta"><tr><td>Вид</td><td>' + e(p.kind) + '</td></tr>' +
      '<tr><td>Возраст</td><td>' + (p.ages || []).map((a) => e(S.AGES[a])).join('<br>') + '</td></tr>' +
      '<tr><td>Образовательные области</td><td>' + (p.areas || []).map((a) => e(S.AREAS[a])).join('<br>') + '</td></tr>' +
      (p.duration ? '<tr><td>Продолжительность</td><td>' + e(p.duration) + '</td></tr>' : '') + '</table>' +
      '<' + hTag + '>Цель</' + hTag + '><p>' + e(p.goal) + '</p>' +
      '<' + hTag + '>Задачи</' + hTag + '><ul>' + (p.tasks || []).map((t) => '<li>' + e(t) + '</li>').join('') + '</ul>' +
      '<' + hTag + '>Материалы и оборудование</' + hTag + '><p>' + e(p.materials) + '</p>' +
      '<' + hTag + '>' + stepsTitle + '</' + hTag + '><ol>' + (p.steps || []).map((t) => '<li>' + e(t) + '</li>').join('') + '</ol>' +
      '<' + hTag + '>Ожидаемый результат</' + hTag + '><p>' + e(p.result) + '</p>';
  }

  function planDocument(p) {
    const e = U.esc;
    const src = p.source ? (p.source.url ? '<a href="' + e(p.source.url) + '">' + e(p.source.title) + '</a>' : e(p.source.title)) : '';
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>' + e(p.title) + '</title><style>' +
      'body{font-family:"Times New Roman",serif;font-size:14pt;line-height:1.45;max-width:720px;margin:24px auto;color:#222}' +
      'h1{font-size:18pt;margin:0 0 12px}h2{font-size:14pt;margin:18px 0 6px}.doc-meta{border-collapse:collapse;margin-bottom:8px}' +
      '.doc-meta td{padding:3px 10px 3px 0;vertical-align:top}.doc-meta td:first-child{font-weight:bold;white-space:nowrap}' +
      '.src{font-size:10pt;color:#555;border-top:1px solid #ccc;margin-top:28px;padding-top:8px}</style></head><body>' +
      planBody(p) + '<p class="src">Источник: ' + src + '<br>Автор: ' + e(p.author || 'не указан') + '<br>Лицензия: ' +
      (p.license ? '<a href="' + e(p.license.url) + '">' + e(p.license.code) + '</a>' : 'не указана') + '</p></body></html>';
  }

  /* ---------- Превью с кэшем ---------- */
  const previewCache = new Map();

  // { src, w, h } — картинка для карточки. Реальный материал может задать preview: 'путь' и previewSize: [w, h].
  function preview(kind, item) {
    if (previewCache.has(item.id)) return previewCache.get(item.id);
    let res;
    if (item.preview) {
      const size = item.previewSize || [3, 4];
      res = { src: item.preview, w: size[0], h: size[1] };
    } else {
      const svg = kind === 'plan' ? planCover(item) : printableSvg(item);
      const s = svgSize(svg);
      res = { src: dataUrl(svg), w: s.w * 4, h: s.h * 4 };
    }
    previewCache.set(item.id, res);
    return res;
  }

  // Пропорции превью без построения картинки — нужны ленте, чтобы заранее рассчитать раскладку.
  const LANDSCAPE = new Set(['cards']);
  function aspect(kind, item) {
    if (item.previewSize) return item.previewSize[1] / item.previewSize[0];
    if (kind === 'plan') return (KIND_HEIGHT[item.kind] || 150) / 120;
    if (item.art && item.art.landscape) return 210 / 297;
    return LANDSCAPE.has(item.type) ? 210 / 297 : 297 / 210;
  }
  function registerBuilder(type, fn) { BUILDERS[type] = fn; }

  App.art = { ICONS, placeIcon, printableSvg, planCover, planBody, planDocument, svgToPng, dataUrl, preview, aspect, registerBuilder, T, wrap, svgDoc, footer, INK };
})();
