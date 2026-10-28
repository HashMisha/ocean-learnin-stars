/*
 * Шаблоны презентаций: готовые (data/templates.js) и свои (хранятся в браузере).
 * Здесь — рисунки фона (SVG), CSS-фон слайда, фон для PowerPoint (PNG) и анализ фото для шаблона «по фото».
 */
(function () {
  'use strict';
  const App = window.App;
  const KEY = 'ols.templates.custom';

  const FONTS = {
    rounded: { label: 'Округлый детский', css: "'Comfortaa', 'Nunito', sans-serif", body: "'Nunito', sans-serif", pptx: 'Arial Rounded MT Bold' },
    display: { label: 'Крупный современный', css: "'Unbounded', 'Trebuchet MS', sans-serif", body: "'Nunito', sans-serif", pptx: 'Arial Black' },
    serif: { label: 'Классический с засечками', css: "'PT Serif', Georgia, serif", body: "'PT Serif', Georgia, serif", pptx: 'Georgia' },
    sans: { label: 'Строгий без засечек', css: "'Nunito', 'Segoe UI', Arial, sans-serif", body: "'Nunito', 'Segoe UI', Arial, sans-serif", pptx: 'Arial' }
  };
  const DECOS = {
    none: 'Без рисунка', bubbles: 'Пузырьки', stars: 'Звёзды', clouds: 'Облака', confetti: 'Конфетти', leaves: 'Листья',
    snow: 'Снежинки', flowers: 'Цветы и трава', rainbow: 'Радуга', grid: 'Клетка', frame: 'Сказочная рамка', waves: 'Волны',
    blobs: 'Цветные пятна', lines: 'Тонкие линии', corners: 'Уголки', dots: 'Точки', bar: 'Полоса', geo: 'Геометрия',
    sprig: 'Веточка', swiss: 'Сетка с акцентом'
  };

  // Предсказуемый «случай»: одинаковый рисунок при каждом показе.
  function rng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  const f = (n) => n.toFixed(1);

  function star(cx, cy, R, r) {
    let p = '';
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r : R;
      p += f(cx + rr * Math.cos(a)) + ',' + f(cy + rr * Math.sin(a)) + ' ';
    }
    return '<polygon points="' + p + '"/>';
  }

  // Рисунок фона 160×90 в цветах шаблона.
  function decoSvg(t) {
    const A = t.accent, S = t.soft, R = rng(7), d = t.deco;
    let g = '';
    if (d === 'bubbles') for (let i = 0; i < 16; i++) { const x = 110 + R() * 48, y = 10 + R() * 78, r = 1.2 + R() * 4.5; g += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="none" stroke="' + S + '" stroke-opacity=".45" stroke-width=".6"/>'; }
    if (d === 'stars') { g += '<g fill="' + A + '">'; for (let i = 0; i < 14; i++) { const x = R() * 160, y = R() * 90; if (x > 20 && x < 140 && y > 18 && y < 80) continue; g += star(x, y, 1 + R() * 2.2, 0.5 + R() * 0.8); } g += '</g>'; for (let i = 0; i < 40; i++) g += '<circle cx="' + f(R() * 160) + '" cy="' + f(R() * 90) + '" r="' + f(0.2 + R() * 0.4) + '" fill="' + S + '" opacity=".7"/>'; }
    if (d === 'clouds') [[18, 12, 1], [128, 10, 1.3], [150, 70, 0.9], [8, 78, 0.8]].forEach(([x, y, k]) => { g += '<g fill="#ffffff" opacity=".85" transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><circle cx="0" cy="0" r="6"/><circle cx="7" cy="-2" r="7.5"/><circle cx="15" cy="0" r="5.5"/><rect x="0" y="0" width="15" height="5.5"/></g>'; });
    if (d === 'confetti') { const C = ['#ff5d8f', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5', '#f15bb5']; for (let i = 0; i < 46; i++) { const x = R() * 160, y = R() * 90; if (x > 22 && x < 138 && y > 16 && y < 80) continue; g += '<rect x="' + f(x) + '" y="' + f(y) + '" width="2.6" height="1.1" rx=".4" fill="' + C[i % C.length] + '" transform="rotate(' + f(R() * 180) + ' ' + f(x) + ' ' + f(y) + ')"/>'; } }
    if (d === 'leaves') { const C = ['#e8590c', '#f59f00', '#c92a2a', '#d9480f']; [[6, 6], [150, 8], [148, 80], [10, 82], [22, 14], [138, 70], [140, 22], [20, 72]].forEach(([x, y], i) => { g += '<g transform="translate(' + x + ' ' + y + ') rotate(' + (i * 47) + ')"><path d="M0 -6C4 -3 4 3 0 7C-4 3 -4 -3 0 -6Z" fill="' + C[i % 4] + '" opacity=".8"/><path d="M0 -5V8" stroke="#7f4f24" stroke-width=".4"/></g>'; }); }
    if (d === 'snow') for (let i = 0; i < 22; i++) { const x = R() * 160, y = R() * 90; if (x > 24 && x < 136 && y > 18 && y < 80) continue; const s = 1.2 + R() * 2; g += '<g stroke="' + A + '" stroke-opacity=".55" stroke-width=".35" transform="translate(' + f(x) + ' ' + f(y) + ')"><path d="M0 -' + s + 'V' + s + 'M-' + f(s * .87) + ' -' + f(s / 2) + 'L' + f(s * .87) + ' ' + f(s / 2) + 'M-' + f(s * .87) + ' ' + f(s / 2) + 'L' + f(s * .87) + ' -' + f(s / 2) + '"/></g>'; }
    if (d === 'flowers') { g += '<path d="M0 84Q10 78 20 84T40 84T60 84T80 84T100 84T120 84T140 84T160 84V90H0Z" fill="#8ccf7e" opacity=".8"/>'; [12, 34, 58, 104, 128, 150].forEach((x, i) => { const c = ['#ff7aa2', '#ffd166', '#c77dff'][i % 3]; g += '<g transform="translate(' + x + ' 80)"><path d="M0 0V8" stroke="#3f8f3a" stroke-width=".6"/>' + [0, 72, 144, 216, 288].map((a) => '<circle cx="' + f(2 * Math.cos(a * Math.PI / 180)) + '" cy="' + f(2 * Math.sin(a * Math.PI / 180)) + '" r="1.4" fill="' + c + '"/>').join('') + '<circle r="1" fill="#ffe066"/></g>'; }); }
    if (d === 'rainbow') ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].forEach((c, i) => { g += '<path d="M' + (112 + i * 4) + ' 90A' + (48 - i * 4) + ' ' + (48 - i * 4) + ' 0 0 1 ' + (208 - i * 4) + ' 90" fill="none" stroke="' + c + '" stroke-width="3.2" opacity=".75"/>'; });
    if (d === 'grid') { for (let x = 0; x <= 160; x += 5) g += '<path d="M' + x + ' 0V90" stroke="#9cc3e6" stroke-width=".2"/>'; for (let y = 0; y <= 90; y += 5) g += '<path d="M0 ' + y + 'H160" stroke="#9cc3e6" stroke-width=".2"/>'; g += '<path d="M14 0V90" stroke="' + A + '" stroke-width=".4" opacity=".7"/>'; }
    if (d === 'frame') { g += '<rect x="4" y="4" width="152" height="82" rx="6" fill="none" stroke="' + A + '" stroke-width=".7" opacity=".8"/><rect x="6.5" y="6.5" width="147" height="77" rx="4.5" fill="none" stroke="' + A + '" stroke-width=".3" opacity=".6"/>'; [[4, 4], [156, 4], [4, 86], [156, 86]].forEach(([x, y]) => { g += '<g fill="' + A + '">' + star(x, y, 3, 1.3) + '</g>'; }); }
    if (d === 'waves') [0, 1, 2].forEach((i) => { g += '<path d="M0 ' + (74 + i * 6) + 'Q20 ' + (68 + i * 6) + ' 40 ' + (74 + i * 6) + 'T80 ' + (74 + i * 6) + 'T120 ' + (74 + i * 6) + 'T160 ' + (74 + i * 6) + 'V90H0Z" fill="' + A + '" opacity="' + (0.18 + i * 0.12) + '"/>'; });
    if (d === 'blobs') [['#ffd6a5', 8, 10, 22], ['#caffbf', 150, 12, 18], ['#bdb2ff', 152, 84, 24], ['#ffadad', 4, 86, 16]].forEach(([c, x, y, r]) => { g += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 0.8) + '" fill="' + c + '" opacity=".85"/>'; });
    if (d === 'lines') { for (let i = 0; i < 9; i++) g += '<path d="M' + (120 + i * 6) + ' 90L' + (160 + i * 6) + ' 50" stroke="' + A + '" stroke-width=".3" opacity=".5"/>'; g += '<rect x="0" y="0" width="2" height="90" fill="' + A + '"/>'; }
    if (d === 'corners') g += '<path d="M6 16V6H16M144 6H154V16M154 74V84H144M16 84H6V74" fill="none" stroke="' + A + '" stroke-width=".8"/>';
    if (d === 'dots') for (let x = 112; x < 158; x += 4) for (let y = 8; y < 86; y += 4) g += '<circle cx="' + x + '" cy="' + y + '" r=".45" fill="' + A + '" opacity="' + f(0.15 + ((x - 112) / 46) * 0.5) + '"/>';
    if (d === 'bar') g += '<rect x="0" y="0" width="160" height="3" fill="' + A + '"/><rect x="0" y="87" width="160" height="3" fill="' + A + '" opacity=".35"/>';
    if (d === 'geo') g += '<polygon points="160,0 160,90 108,90" fill="' + A + '" opacity=".22"/><polygon points="160,0 122,0 160,40" fill="' + A + '" opacity=".4"/><circle cx="138" cy="68" r="10" fill="none" stroke="' + A + '" stroke-width=".6" opacity=".7"/>';
    if (d === 'sprig') g += '<g transform="translate(146 76) rotate(-35)" fill="' + A + '" opacity=".75"><path d="M0 0V-26" stroke="' + A + '" stroke-width=".5"/>' + [-6, -12, -18, -24].map((y, i) => '<ellipse cx="' + (i % 2 ? 3 : -3) + '" cy="' + y + '" rx="2.6" ry="1.3" transform="rotate(' + (i % 2 ? -30 : 30) + ' ' + (i % 2 ? 3 : -3) + ' ' + y + ')"/>').join('') + '</g>';
    if (d === 'swiss') { for (let x = 20; x < 160; x += 20) g += '<path d="M' + x + ' 0V90" stroke="' + t.fg + '" stroke-width=".12" opacity=".25"/>'; g += '<rect x="140" y="0" width="20" height="20" fill="' + A + '"/>'; }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" width="1600" height="900" preserveAspectRatio="xMidYMid slice">' + g + '</svg>';
  }

  const decoCache = new Map();
  function decoUrl(t) {
    if (!t.deco || t.deco === 'none') return '';
    const k = [t.deco, t.accent, t.soft, t.fg].join('|');
    if (!decoCache.has(k)) decoCache.set(k, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(decoSvg(t)));
    return decoCache.get(k);
  }

  function gradient(t) {
    return t.bg2 ? 'linear-gradient(' + (t.angle || 180) + 'deg, ' + t.bg + ', ' + t.bg2 + ')' : t.bg;
  }

  // Фото шаблона храним как object URL, чтобы не размножать большие data:-строки в разметке.
  const photoUrls = new Map();
  function photoUrl(t) {
    if (!t.photo) return '';
    if (!photoUrls.has(t.id)) {
      try {
        const [head, b64] = t.photo.split(',');
        const bin = atob(b64), arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        photoUrls.set(t.id, URL.createObjectURL(new Blob([arr], { type: head.match(/data:([^;]+)/)[1] })));
      } catch (e) { photoUrls.set(t.id, t.photo); }
    }
    return photoUrls.get(t.id);
  }

  // Стиль слайда: CSS-переменные + фон.
  function slideStyle(t) {
    const font = FONTS[t.font] || FONTS.sans;
    const deco = decoUrl(t);
    return '--sl-bg:' + t.bg + ';--sl-fg:' + t.fg + ';--sl-accent:' + t.accent + ';--sl-soft:' + (t.soft || t.fg) +
      ';--sl-font:' + font.css + ';--sl-body:' + font.body + ';background:' + (deco ? 'url(&quot;' + deco + '&quot;) center/cover no-repeat, ' : '') + gradient(t);
  }

  /* ---------- Список ---------- */
  function readCustom() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function writeCustom(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }
  function all() {
    return (window.SITE_DATA.templates || []).concat(readCustom());
  }
  const LEGACY = { ocean: 'pro-brand', paper: 'pro-method', meadow: 'kids-spring', space: 'kids-space' };
  function get(id) {
    const list = all();
    return list.find((t) => t.id === (LEGACY[id] || id)) || list[0];
  }
  function saveCustom(t) {
    const list = readCustom().filter((x) => x.id !== t.id);
    list.push(t);
    try { writeCustom(list); } catch (e) { throw new Error('Не хватает места в браузере — удалите старые свои шаблоны или выберите фото поменьше.'); }
    photoUrls.delete(t.id);
  }
  function removeCustom(id) {
    writeCustom(readCustom().filter((x) => x.id !== id));
  }

  /* ---------- Фон для PowerPoint ---------- */
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  function drawCover(g, img, x, y, w, h) {
    const k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / k, sh = h / k;
    g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // kind: 'title' | 'content'. Возвращает data:image/png.
  async function backgroundPng(t, kind) {
    const W = 1600, H = 900, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (t.bg2) {
      const a = ((t.angle || 180) - 90) * Math.PI / 180;
      const gr = g.createLinearGradient(W / 2 - Math.cos(a) * W / 2, H / 2 - Math.sin(a) * H / 2, W / 2 + Math.cos(a) * W / 2, H / 2 + Math.sin(a) * H / 2);
      gr.addColorStop(0, t.bg); gr.addColorStop(1, t.bg2);
      g.fillStyle = gr;
    } else g.fillStyle = t.bg;
    g.fillRect(0, 0, W, H);
    if (t.photo) {
      const img = await loadImg(t.photo);
      const lay = photoLayout(t, kind);
      if (lay === 'cover') {
        drawCover(g, img, 0, 0, W, H);
        g.fillStyle = hexA(t.bg, 0.55);
        g.fillRect(0, 0, W, H);
      } else if (lay === 'left') drawCover(g, img, 0, 0, W * 0.34, H);
      else if (lay === 'right') drawCover(g, img, W * 0.66, 0, W * 0.34, H);
      else if (lay === 'top') drawCover(g, img, 0, 0, W, H * 0.26);
    }
    const deco = decoUrl(t);
    if (deco) g.drawImage(await loadImg(deco), 0, 0, W, H);
    return c.toDataURL('image/png');
  }

  function photoLayout(t, kind) {
    if (!t.photo) return 'none';
    return kind === 'title' ? (t.photoTitle || 'cover') : (t.photoContent || 'left');
  }

  /* ---------- Анализ фото для своего шаблона ---------- */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hslToHex(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const fn = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
    return '#' + fn(0) + fn(8) + fn(4);
  }
  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  // Сжимает фото (до 1280 px) и разбирает: палитра, светлое/тёмное, где на снимке «спокойная» сторона.
  async function analyzePhoto(file) {
    const src = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
    const img = await loadImg(src);
    const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const big = document.createElement('canvas');
    big.width = Math.round(img.naturalWidth * k); big.height = Math.round(img.naturalHeight * k);
    big.getContext('2d').drawImage(img, 0, 0, big.width, big.height);
    const photo = big.toDataURL('image/jpeg', 0.82);

    const N = 64, c = document.createElement('canvas');
    c.width = N; c.height = N;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, N, N);
    const px = g.getImageData(0, 0, N, N).data;
    const bins = new Map(), gray = new Float32Array(N * N);
    let lumSum = 0;
    for (let i = 0; i < N * N; i++) {
      const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
      const key = (r >> 4) << 8 | (gg >> 4) << 4 | (b >> 4);
      const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += gg; e.b += b;
      bins.set(key, e);
      gray[i] = 0.299 * r + 0.587 * gg + 0.114 * b;
      lumSum += gray[i];
    }
    const colors = [...bins.values()].map((e) => {
      const r = e.r / e.n, gg = e.g / e.n, b = e.b / e.n;
      return { n: e.n, hsl: rgbToHsl(r, gg, b) };
    }).sort((a, b) => b.n - a.n);
    const dominant = colors[0].hsl;
    // Акцент: самый насыщенный из заметных цветов, отличный по тону от основного.
    const accentC = colors.slice(0, 40).filter((c2) => c2.n > 6 && c2.hsl[1] > 0.35 && c2.hsl[2] > 0.25 && c2.hsl[2] < 0.8)
      .sort((a, b) => (b.hsl[1] * Math.min(1, Math.abs(b.hsl[0] - dominant[0]) / 40 + 0.3)) - (a.hsl[1] * Math.min(1, Math.abs(a.hsl[0] - dominant[0]) / 40 + 0.3)))[0];
    const dark = lumSum / (N * N) < 128;

    // «Шумность» половин: где больше перепадов яркости — там главный объект.
    let left = 0, right = 0;
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x, e = Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + N] - gray[i - N]);
      if (x < N / 2) left += e; else right += e;
    }
    const busySide = left > right ? 'left' : 'right';

    const [h, s] = dominant;
    const bg = dark ? hslToHex(h, Math.min(0.55, s), 0.13) : hslToHex(h, Math.min(0.45, s), 0.95);
    const bg2 = dark ? hslToHex((h + 20) % 360, Math.min(0.5, s), 0.2) : hslToHex((h + 20) % 360, Math.min(0.4, s), 0.88);
    const accent = accentC ? hslToHex(accentC.hsl[0], Math.min(0.85, accentC.hsl[1]), dark ? 0.66 : 0.42) : hslToHex((h + 180) % 360, 0.6, dark ? 0.66 : 0.42);
    const fg = luminance(bg) > 0.4 ? '#1f1a2e' : '#ffffff';
    const soft = luminance(bg) > 0.4 ? '#4a4458' : '#d8d4e8';
    const palette = colors.slice(0, 6).map((c2) => hslToHex(c2.hsl[0], c2.hsl[1], c2.hsl[2]));
    return {
      photo, palette, dark, busySide,
      template: { bg, bg2, angle: 160, fg, soft, accent, deco: 'none', font: dark ? 'display' : 'rounded', align: busySide === 'left' ? 'left' : 'left', photoTitle: 'cover', photoContent: busySide },
      notes: [
        'Снимок ' + (dark ? 'тёмный — текст будет светлым.' : 'светлый — текст будет тёмным.'),
        'Основной цвет и фон взяты из преобладающих оттенков фото, акцент — из самого яркого заметного цвета.',
        'Главный объект — ' + (busySide === 'left' ? 'слева' : 'справа') + ': на остальных слайдах фото станет полосой с этой стороны, а текст — с другой.',
        'На титульном слайде фото займёт весь фон под полупрозрачной заливкой.'
      ]
    };
  }

  App.templates = { FONTS, DECOS, all, get, readCustom, saveCustom, removeCustom, slideStyle, photoUrl, photoLayout, backgroundPng, analyzePhoto, gradient, decoUrl };
})();
