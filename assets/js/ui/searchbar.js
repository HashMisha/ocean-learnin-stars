/*
 * Верхняя строка ИИ-поиска. Пока человек печатает — мгновенные результаты локального поиска;
 * по Enter или кнопке «Спросить» — ответ языковой модели по тем же найденным материалам (если подключена).
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  const A = App.assistant;

  const form = document.getElementById('ai-form');
  const input = document.getElementById('ai-q');
  const panel = document.getElementById('ai-panel');
  let ctl = null;
  let lastLocal = null;

  const KIND_ICON = { holiday: 'calendar', printable: 'print', plan: 'book' };

  function metaFor(kind, item, now) {
    if (kind === 'holiday') {
      const d = S.nextDate(item, now), n = U.dayDiff(now, d);
      return U.formatDay(d) + (n <= 30 ? ' · ' + U.inDaysLabel(n) : '');
    }
    const seasons = S.seasonsOf(item).length === 4 ? 'любой сезон' : S.seasonsOf(item).map((s) => U.SEASONS[s].title.toLowerCase()).join(', ');
    if (kind === 'printable') return S.PRINT_TYPES[item.type] + ' · ' + seasons;
    return item.kind + ' · ' + (item.ages || []).map((a) => S.AGES_SHORT[a]).join(', ') + ' лет';
  }

  function row(r, now) {
    return '<li><a class="ai-link" href="' + S.linkFor(r.kind, r.item) + '">' +
      '<span class="ai-link-ico">' + U.icon(KIND_ICON[r.kind]) + '</span>' +
      '<span class="ai-link-text"><span class="ai-link-title">' + U.esc(r.item.title) + '</span>' +
      '<span class="ai-link-meta">' + U.esc(metaFor(r.kind, r.item, now)) + '</span></span></a></li>';
  }

  function render(local, answer) {
    const view = A.compose(local);
    const ai = answer && answer.answer;
    let html = '<div class="ai-answer">' +
      '<span class="ai-badge' + (ai ? ' is-ai' : '') + '">' + U.icon('spark') + (ai ? 'Ответ ассистента по материалам сайта' : 'Поиск по сайту') + '</span>' +
      '<p class="ai-text" data-ai-text>' + U.esc(ai || view.text) + '</p></div>';
    if (answer === 'pending') html = html.replace('</div>', '<p class="ai-thinking" role="status">Ассистент формулирует ответ…</p></div>');
    if (ai && answer.picked.length) {
      html += '<section class="ai-group"><h3>Ассистент советует</h3><ul>' + answer.picked.map((r) => row(r, local.now)).join('') + '</ul></section>';
    }
    html += view.groups.map((g) => '<section class="ai-group"><h3>' + g.title + '</h3><ul>' + g.items.map((r) => row(r, local.now)).join('') + '</ul></section>').join('');
    if (view.suggest.length) {
      html += '<div class="ai-suggest">' + view.suggest.map((s) => '<button type="button" class="chip" data-suggest="' + U.esc(s) + '">' + U.esc(s) + '</button>').join('') + '</div>';
    }
    panel.innerHTML = '<div class="ai-panel-in">' + html + '</div>';
    show();
  }

  function show() {
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function hide() {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    if (ctl) ctl.abort();
  }

  const live = U.debounce(() => {
    const q = input.value.trim();
    if (q.length < 2) return hide();
    lastLocal = A.localSearch(q);
    render(lastLocal);
  }, 220);

  input.addEventListener('input', live);
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2 && panel.innerHTML) show(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return input.focus();
    if (ctl) ctl.abort();
    const local = A.localSearch(q);
    lastLocal = local;
    const provider = await A.resolveProvider();
    if (!provider || !local.results.length) return render(local);
    render(local, 'pending');
    ctl = new AbortController();
    const mine = ctl;
    try {
      const answer = await A.askModel(local, mine.signal);
      if (lastLocal === local) render(local, answer);
    } catch (err) {
      if (lastLocal === local && !(err && err.code === 'cancelled') && !mine.signal.aborted) render(local);
    }
  });

  panel.addEventListener('click', (e) => {
    const s = e.target.closest('[data-suggest]');
    if (s) {
      input.value = s.dataset.suggest;
      form.requestSubmit();
      return;
    }
    if (e.target.closest('a')) hide();
  });

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.target.closest('#ai-panel') && !e.target.closest('#ai-form')) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      hide();
      input.focus();
    }
    if (e.key === '/' && document.activeElement === document.body) {
      e.preventDefault();
      input.focus();
    }
  });

  App.searchbar = { hide };
})();
