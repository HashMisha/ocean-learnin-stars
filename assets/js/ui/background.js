/*
 * Фон «глубокое море = звёздное небо»: пиксельные светящиеся медузы всплывают снизу вверх.
 * Холст рисуется в низком разрешении и растягивается с image-rendering: pixelated — отсюда пиксель-арт.
 * Медуза строится процедурно: полупрозрачный купол с бликом и гонадами, волнистые «рюши» по краю,
 * гофрированные ротовые лопасти и длинные извивающиеся щупальца. Купол сжимается толчками — так медуза плывёт.
 * Холст не перехватывает клики (pointer-events: none). При prefers-reduced-motion рисуется один неподвижный кадр.
 */
(function () {
  'use strict';
  const App = window.App;

  // b — тело, e — край и щупальца, h — блик, f — рюши и лопасти, g — гонады.
  const PALETTE = [
    { b: '#c9a2f0', e: '#9a6cc8', h: '#f6ecff', f: '#e8c6ff', g: '#ffd0f0', glow: '201,162,240' },
    { b: '#7fe0cf', e: '#45a898', h: '#e6fffa', f: '#b8fff2', g: '#d6fff8', glow: '127,224,207' },
    { b: '#90d49c', e: '#56975f', h: '#eaffed', f: '#c4f5cc', g: '#f4ffd6', glow: '144,212,156' },
    { b: '#f0a8d8', e: '#b35f97', h: '#ffeef8', f: '#ffd0ec', g: '#fff0c8', glow: '240,168,216' }
  ];

  // Пиксельная медуза для логотипа (маленький спрайт).
  const LOGO = ['....eeeee....', '..eebbbbbee..', '.ebhhbbbbbbe.', 'ebhbbbbbbbbbe', 'ebbbbbbbbbbbe', 'ebbbbbbbbbbbe', 'efefefefefefe', '.f.f.f.f.f.f.'];
  App.pixelJellySvg = function (color) {
    const p = PALETTE[color || 0];
    let r = '';
    LOGO.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') r += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + p[c] + '"/>'; }));
    [2, 6, 10].forEach((x, i) => { for (let y = 8; y < 13; y++) r += '<rect x="' + (x + ((y + i) % 3 === 0 ? 1 : 0)) + '" y="' + y + '" width="1" height="1" fill="' + p.e + '" opacity="' + (1 - (y - 8) * 0.15) + '"/>'; });
    return '<svg class="brand-mark" viewBox="-1 -1 15 15" aria-hidden="true" shape-rendering="crispEdges">' + r + '</svg>';
  };

  const canvas = document.getElementById('sea');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let W = 0, H = 0, PX = 4, jellies = [], stars = [], bubbles = [], raf = 0, last = 0, t = 0;

  const rand = (a, b) => a + Math.random() * (b - a);

  function makeJelly(initial) {
    const maxR = Math.max(7, Math.min(16, W / 9));
    const R = rand(6, maxR);
    const depth = (R - 6) / Math.max(1, maxR - 6); // 0 — далеко, 1 — близко
    const count = Math.round(rand(7, 11));
    return {
      R,
      x: rand(R + 2, W - R - 2),
      y: initial ? rand(-R, H) : H + rand(R, R * 3),
      speed: 1.2 + depth * 1.8,
      freq: rand(1.1, 1.6),
      phase: rand(0, Math.PI * 2),
      pal: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      alpha: 0.32 + depth * 0.32,
      arms: 4,
      tentacles: Array.from({ length: count }, (_, i) => ({
        pos: count === 1 ? 0 : -1 + (2 * i) / (count - 1),
        len: Math.round(R * rand(3.2, 5.2)),
        ph: rand(0, Math.PI * 2),
        w: rand(1.4, 2.4)
      }))
    };
  }

  function resize() {
    PX = window.innerWidth < 700 ? 3 : 4;
    W = Math.ceil(window.innerWidth / PX);
    H = Math.ceil(window.innerHeight / PX);
    canvas.width = W;
    canvas.height = H;
    const count = Math.max(4, Math.min(9, Math.round((W * H) / 14000)));
    jellies = Array.from({ length: count }, () => makeJelly(true));
    stars = Array.from({ length: Math.round((W * H) / 700) }, () => ({
      x: Math.floor(rand(0, W)), y: Math.floor(rand(0, H)), p: rand(0, 6.28), s: rand(0.4, 1.4),
      c: Math.random() < 0.7 ? '255,255,255' : Math.random() < 0.5 ? '127,224,207' : '214,196,242'
    }));
    bubbles = Array.from({ length: Math.round(W / 40) }, () => ({ x: rand(0, W), y: rand(0, H), v: rand(3, 7), p: rand(0, 6.28) }));
    draw(0);
  }

  function px(x, y, color, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  // Насколько медуза сейчас сжата: 0 — расслаблена, 1 — толчок.
  function pulseOf(j) {
    const s = Math.sin(t * j.freq + j.phase);
    return s > 0 ? Math.pow(s, 1.6) : 0;
  }

  function drawJelly(j) {
    const p = j.pal, A = j.alpha, pulse = pulseOf(j);
    const R = j.R * (1 - 0.14 * pulse);          // при толчке купол уже…
    const bellH = j.R * (0.72 + 0.2 * pulse);     // …и выше
    const cx = j.x, top = j.y, rim = top + bellH;

    // Свечение
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    const gr = ctx.createRadialGradient(cx, top + bellH * 0.6, 0, cx, top + bellH * 0.6, j.R * 2.4);
    gr.addColorStop(0, 'rgba(' + p.glow + ',' + (0.2 * A).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + p.glow + ',0)');
    ctx.fillStyle = gr;
    ctx.fillRect(cx - j.R * 2.4, top + bellH * 0.6 - j.R * 2.4, j.R * 4.8, j.R * 4.8);
    ctx.globalCompositeOperation = 'source-over';

    // Длинные щупальца: извиваются бегущей волной, амплитуда растёт к кончику.
    j.tentacles.forEach((tn) => {
      const baseX = cx + tn.pos * (R - 1) * (1 - 0.18 * pulse);
      const len = tn.len * (1 + 0.12 * pulse);
      let prevX = baseX;
      for (let k = 0; k < len; k++) {
        const amp = 0.3 + k * 0.075 * tn.w / 2;
        const x = baseX
          + Math.sin(t * 2.1 - k * 0.24 + tn.ph) * amp
          + Math.sin(t * 1.3 - k * 0.11 + tn.ph * 1.7) * amp * 0.6
          + tn.pos * k * 0.06; // слегка расходятся веером
        const y = rim + 1 + k;
        const fade = A * 0.85 * Math.pow(1 - k / len, 0.9);
        px(x, y, p.e, fade);
        // Заполняем разрыв, если соседние точки разошлись больше чем на пиксель.
        if (Math.abs(x - prevX) > 1.2) px((x + prevX) / 2, y - 0.5, p.e, fade);
        prevX = x;
      }
    });

    // Ротовые лопасти: широкие гофрированные ленты из центра.
    for (let i = 0; i < j.arms; i++) {
      const ox = (i - (j.arms - 1) / 2) * R * 0.2;
      const len = j.R * (1.7 + (i % 2) * 0.4);
      for (let k = 0; k < len; k++) {
        const x = cx + ox + Math.sin(t * 1.5 - k * 0.32 + i * 1.9 + j.phase) * (0.6 + k * 0.1);
        const y = rim + k;
        const w = Math.max(1, Math.round(2.4 - (k / len) * 1.6));
        const fade = A * 0.9 * (1 - k / (len + 2));
        for (let d = 0; d < w; d++) px(x - Math.floor(w / 2) + d, y, p.f, fade);
        // Гофре: пиксель-«оборка» попеременно слева и справа.
        if ((k + i) % 2 === 0) px(x + ((k >> 1) % 2 ? w : -w), y, p.b, fade * 0.8);
      }
    }

    // Купол: полупрозрачное тело, тёмный край, блик слева сверху, гонады внутри.
    const rows = Math.ceil(bellH);
    const gonadY = rim - bellH * 0.38, gonadR = R * 0.2;
    for (let yy = 0; yy <= rows; yy++) {
      const v = (bellH - yy) / bellH; // 1 — макушка, 0 — край
      const hw = R * Math.sqrt(Math.max(0, 1 - v * v));
      const y = top + yy;
      for (let x = Math.round(-hw); x <= Math.round(hw); x++) {
        const edge = Math.abs(x) > hw - 1.1 || yy < 1;
        let color = p.b, a = A * 0.5;
        if (edge) { color = p.e; a = A * 0.95; }
        else if (x < -hw * 0.25 && x > -hw * 0.75 && yy > 1 && yy < bellH * 0.5 && (x + yy) % 3 !== 0) { color = p.h; a = A * 0.85; }
        else {
          // Четыре кольца гонад (видно два-три сбоку) — как у медузы-аурелии.
          for (const gx of [-0.42, 0, 0.42]) {
            const d = Math.hypot(x - gx * R, y - gonadY);
            if (Math.abs(d - gonadR) < 0.7 && y < gonadY + 0.5) { color = p.g; a = A * 0.8; }
          }
        }
        px(cx + x, y, color, a);
      }
    }

    // Рюши: волнистая оборка по краю купола, гребешки бегут по кругу.
    const skirt = R + 1;
    for (let x = Math.round(-skirt); x <= Math.round(skirt); x++) {
      const wave = Math.sin(x * 0.9 - t * 3 + j.phase);
      const lift = Math.round(Math.sin(x * 0.45 + t * 2.2 + j.phase) * 0.8);
      const depth = 1 + Math.round(Math.abs(wave) * 1.6 + pulse);
      const sideDrop = Math.max(0, Math.abs(x) - R + 2); // оборка заворачивает вниз по бокам
      for (let k = 0; k < depth; k++) {
        const y = rim + lift + k + sideDrop * 0.5;
        const c = k === 0 ? p.e : (x + k) % 2 === 0 ? p.f : p.b;
        px(cx + x, y, c, A * (k === 0 ? 0.95 : 0.8 - k * 0.12));
      }
    }
    ctx.globalAlpha = 1;
    return bellH;
  }

  function draw(dt) {
    t += dt;
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    stars.forEach((st) => {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * st.s + st.p));
      ctx.fillStyle = 'rgba(' + st.c + ',' + a.toFixed(2) + ')';
      ctx.fillRect(st.x, st.y, 1, 1);
    });
    bubbles.forEach((b) => {
      b.y -= b.v * dt;
      if (b.y < -4) { b.y = H + 4; b.x = rand(0, W); }
      ctx.fillStyle = 'rgba(180,240,232,0.28)';
      ctx.fillRect(Math.round(b.x + Math.sin(t + b.p) * 1.5), Math.round(b.y), 1, 1);
    });
    // Дальние (мелкие) медузы рисуются первыми.
    jellies.sort((a, b) => a.R - b.R).forEach((j) => {
      const push = 0.35 + 2.2 * pulseOf(j);
      j.y -= j.speed * push * dt;
      j.x += Math.sin(t * 0.2 + j.phase) * 0.5 * dt;
      if (j.y < -j.R * 7) Object.assign(j, makeJelly(false));
      drawJelly(j);
    });
  }

  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    if (dt >= 1 / 30) {
      last = now;
      draw(dt);
    }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(raf);
    if (motion.matches || document.hidden) {
      draw(0);
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', App.util.debounce(resize, 200));
  document.addEventListener('visibilitychange', start);
  if (motion.addEventListener) motion.addEventListener('change', start);
  resize();
  start();
})();
