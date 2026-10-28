/* Раздел «Создай сам»: нейросеть рисует картинку по описанию. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const G = App.imageGen;
  App.pages = App.pages || {};

  const HISTORY_KEY = 'ols.create.history';
  const IDEAS = [
    'Ёжик несёт на спине осенние листья',
    'Синичка на ветке рябины зимой',
    'Ракета летит к Луне среди звёзд',
    'Светящаяся медуза в тёмном море',
    'Дети лепят снеговика во дворе',
    'Весёлые цифры от одного до пяти'
  ];

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 12))); } catch (e) { /* без истории */ }
  }

  function chips(name, options, value) {
    return '<div class="chip-row" role="group" aria-label="' + name + '"><span class="chip-row-label">' + name + '</span>' +
      Object.entries(options).map(([k, o]) => '<button type="button" class="chip' + (k === value ? ' is-on' : '') + '" data-' + (name === 'Стиль' ? 'style' : 'size') + '="' + k + '" aria-pressed="' + (k === value) + '">' + o.label + '</button>').join('') + '</div>';
  }

  App.pages.create = {
    title: 'Создай сам',
    render(root) {
      const st = { style: 'cartoon', size: 'square', count: 2 };
      root.innerHTML =
        '<section class="page-head"><p class="eyebrow">Нейросеть · бесплатно, без регистрации</p><h1>Создай сам</h1>' +
        '<p class="lead">Опишите картинку своими словами — нейросеть нарисует её примерно за минуту. Подходит для раскрасок, иллюстраций к занятиям и слайдов.</p></section>' +
        (G.available() ? '' : '<div class="notice panel">В предпросмотре claude.ai внешние сервисы недоступны. Нейросеть работает на опубликованном сайте (GitHub Pages) и при локальном запуске.</div>') +
        '<form class="panel create-form" id="create-form">' +
        '<label class="field"><span class="select-label">Что нарисовать</span>' +
        '<textarea id="create-prompt" rows="3" maxlength="400" placeholder="Например: зайчик в шарфе катается на санках" required></textarea></label>' +
        '<div class="chip-row ideas"><span class="chip-row-label">Идеи</span>' + IDEAS.map((i) => '<button type="button" class="chip chip--idea" data-idea="' + U.esc(i) + '">' + U.esc(i) + '</button>').join('') + '</div>' +
        '<div class="create-opts"></div>' +
        '<div class="create-actions"><label class="select"><span class="select-label">Вариантов</span><select id="create-count"><option value="1">1</option><option value="2" selected>2</option><option value="4">4</option></select></label>' +
        '<button type="submit" class="btn btn--primary btn--lg create-go">' + U.icon('spark') + '<span class="btn-label">Нарисовать</span></button></div>' +
        '<p class="create-note">Рисует AI Horde — бесплатная сеть нейросетей Stable Diffusion XL с фильтром безопасности. Запрос автоматически переводится на английский (MyMemory), так нейросеть понимает его точнее. Обычно картинка готова за 15–60 секунд, в часы нагрузки — дольше. Текст запроса уходит во внешние сервисы — не пишите имена и личные данные детей.</p>' +
        '</form>' +
        '<section class="create-results" aria-live="polite"></section>' +
        '<section class="create-history"></section>';

      const form = root.querySelector('#create-form');
      const prompt = root.querySelector('#create-prompt');
      const results = root.querySelector('.create-results');
      const history = root.querySelector('.create-history');
      const opts = root.querySelector('.create-opts');

      function drawOpts() { opts.innerHTML = chips('Стиль', G.STYLES, st.style) + chips('Формат', G.SIZES, st.size); }

      function drawHistory() {
        const list = readHistory();
        history.innerHTML = list.length
          ? '<h2 class="sec-title">Недавние картинки</h2><div class="gen-grid gen-grid--small">' + list.map((h, i) =>
            '<button type="button" class="gen-thumb" data-hist="' + i + '" title="' + U.esc(h.prompt) + '"><img src="' + U.esc(h.url) + '" alt="' + U.esc(h.prompt) + '" loading="lazy" onerror="this.parentNode.hidden=true"></button>').join('') + '</div>'
          : '';
      }

      function cardHtml(r, i) {
        return '<figure class="gen-card panel" data-i="' + i + '"><div class="gen-media" style="aspect-ratio:' + r.w + '/' + r.h + '"><img src="' + U.esc(r.url) + '" alt="' + U.esc(r.prompt) + '"></div>' +
          '<figcaption><span class="gen-cap">' + U.esc(r.prompt) + ' · ' + U.esc(G.STYLES[r.style].label.toLowerCase()) + '</span>' +
          '<span class="gen-actions"><button type="button" class="btn btn--dl btn--sm" data-act="dl">' + U.icon('download') + '<span class="btn-label">Скачать</span></button>' +
          '<button type="button" class="btn btn--sm" data-act="slide">' + U.icon('slides') + 'В презентацию</button></span></figcaption></figure>';
      }

      let current = [];
      async function run(text) {
        if (!G.available()) return U.toast('Нейросеть доступна на опубликованном сайте', 'error');
        const n = +root.querySelector('#create-count').value;
        const go = form.querySelector('.create-go');
        go.disabled = true;
        go.querySelector('.btn-label').textContent = 'Рисуем…';
        current = [];
        const s = G.SIZES[st.size];
        results.innerHTML = '<h2 class="sec-title">Результат</h2><div class="gen-grid">' +
          Array.from({ length: n }, () => '<div class="gen-card panel is-loading"><div class="gen-media" style="aspect-ratio:' + s.w + '/' + s.h + '"><span class="loader"></span><span class="gen-wait">Нейросеть рисует…</span></div></div>').join('') + '</div>';
        const grid = results.querySelector('.gen-grid');
        await Promise.all(Array.from({ length: n }, async (_, i) => {
          try {
            const wait = grid.children[i].querySelector('.gen-wait');
            const r = await G.generate(text, { style: st.style, size: st.size, onProgress: (msg) => { if (wait) wait.textContent = msg; } });
            current[i] = r;
            grid.children[i].outerHTML = cardHtml(r, i);
            const list = readHistory();
            list.unshift({ url: r.url, prompt: r.prompt, style: r.style, w: r.w, h: r.h, credit: r.credit });
            writeHistory(list);
          } catch (e) {
            grid.children[i].innerHTML = '<div class="gen-error">' + U.esc(e.message) + '</div>';
          }
        }));
        drawHistory();
        go.disabled = false;
        go.querySelector('.btn-label').textContent = 'Нарисовать';
      }

      async function save(r, btn) {
        btn.disabled = true;
        const res = await G.save(r.url, U.slug(r.prompt).slice(0, 50));
        U.toast(res === 'saved' ? 'Картинка сохранена' : 'Картинка открыта в новой вкладке: нажмите на неё правой кнопкой → «Сохранить изображение»');
        btn.disabled = false;
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (prompt.value.trim().length < 3) return prompt.focus();
        run(prompt.value);
      });
      root.addEventListener('click', (e) => {
        const idea = e.target.closest('[data-idea]');
        if (idea) { prompt.value = idea.dataset.idea; prompt.focus(); return; }
        const sty = e.target.closest('[data-style]');
        if (sty) { st.style = sty.dataset.style; return drawOpts(); }
        const siz = e.target.closest('[data-size]');
        if (siz) { st.size = siz.dataset.size; return drawOpts(); }
        const hist = e.target.closest('[data-hist]');
        if (hist) {
          const h = readHistory()[+hist.dataset.hist];
          current = [h];
          results.innerHTML = '<h2 class="sec-title">Из истории</h2><div class="gen-grid">' + cardHtml(h, 0) + '</div>';
          results.scrollIntoView({ block: 'start' });
          return;
        }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const r = current[+act.closest('.gen-card').dataset.i];
        if (!r) return;
        if (act.dataset.act === 'dl') save(r, act);
        if (act.dataset.act === 'slide') {
          act.disabled = true;
          G.toDataUrl(r.url).then((url) => {
            App.slides.addImageSlide({ url, credit: r.credit, w: r.w, h: r.h }, r.prompt);
            U.toast('Картинка добавлена новым слайдом в «Конструктор презентаций»');
            act.disabled = false;
          });
        }
      });
      drawOpts();
      drawHistory();
    }
  };
})();
