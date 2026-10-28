/*
 * Модальное окно материала. Лента под ним не перерисовывается, поэтому после закрытия
 * человек остаётся на том же месте прокрутки, а фокус возвращается на карточку.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;

  const dlg = document.getElementById('lightbox');
  const body = dlg.querySelector('.lb-body');
  let state = null;

  function seasonsText(item) {
    const s = S.seasonsOf(item);
    return s.length === 4 ? 'Любой сезон' : s.map((x) => U.SEASONS[x].title).join(', ');
  }

  function sourceBlock(item) {
    const e = U.esc;
    const src = item.source
      ? (item.source.url ? '<a href="' + e(item.source.url) + '" target="_blank" rel="noopener">' + e(item.source.title) + U.icon('external', 'i-s') + '</a>' : e(item.source.title))
      : 'не указан';
    const lic = item.license
      ? (item.license.url ? '<a href="' + e(item.license.url) + '" target="_blank" rel="noopener">' + e(item.license.code) + U.icon('external', 'i-s') + '</a>' : e(item.license.code))
      : 'не указана';
    return '<dl class="src">' +
      '<div><dt>Первоисточник</dt><dd>' + src + '</dd></div>' +
      '<div><dt>Автор</dt><dd>' + e(item.author || 'не указан') + '</dd></div>' +
      '<div><dt>Лицензия</dt><dd>' + lic + '</dd></div></dl>';
  }

  function holidayLinks(item) {
    const hs = (item.holidays || []).map((id) => S.holiday(id)).filter(Boolean);
    if (!hs.length) return '';
    const now = U.today();
    return '<div class="lb-row"><span class="lb-label">Праздник</span><span class="lb-links">' + hs.map((h) =>
      '<a href="' + S.linkFor('holiday', h) + '">' + U.esc(h.title) + ' · ' + U.formatDay(S.nextDate(h, now)) + '</a>').join('') + '</span></div>';
  }

  function content(kind, item) {
    const e = U.esc;
    const pv = App.art.preview(kind, item);
    const media = kind === 'plan'
      ? '<div class="lb-doc">' + App.art.planBody(item, { inline: true }) + '</div>'
      : '<div class="lb-media"><img src="' + pv.src + '" width="' + pv.w + '" height="' + pv.h + '" alt="' + e(item.title) + ', крупный просмотр"></div>';
    const eyebrow = kind === 'plan' ? item.kind : S.PRINT_TYPES[item.type];
    const extra = kind === 'plan'
      ? '<div class="lb-row"><span class="lb-label">Возраст</span><span>' + (item.ages || []).map((a) => e(S.AGES[a])).join('<br>') + '</span></div>' +
        '<div class="lb-row"><span class="lb-label">Области</span><span>' + (item.areas || []).map((a) => e(S.AREAS[a])).join('<br>') + '</span></div>'
      : '';
    return '<div class="lb-grid lb-grid--' + kind + '">' + media +
      '<div class="lb-info">' +
      '<p class="eyebrow">' + e(eyebrow) + '</p>' +
      '<h2 id="lb-title">' + e(item.title) + '</h2>' +
      '<p class="lb-desc">' + e(item.description || '') + '</p>' +
      '<div class="lb-rows">' + holidayLinks(item) + extra +
      '<div class="lb-row"><span class="lb-label">Сезон</span><span>' + seasonsText(item) + '</span></div>' +
      '<div class="lb-row"><span class="lb-label">Темы</span><span class="lb-tags">' + (item.tags || []).map((t) => '<span class="tag">' + e(t) + '</span>').join('') + '</span></div>' +
      '<div class="lb-row"><span class="lb-label">Формат</span><span>' + e(App.storage.formatLabel(kind, item)) + '</span></div></div>' +
      '<button type="button" class="btn btn--primary btn--lg" data-lb-download>' + U.icon('download') + '<span class="btn-label">Скачать</span></button>' +
      sourceBlock(item) + '</div></div>';
  }

  function open(kind, item, opts) {
    if (!item) return;
    state = { kind, item, returnFocus: (opts && opts.returnFocus) || document.activeElement, onClose: opts && opts.onClose };
    body.innerHTML = content(kind, item);
    body.scrollTop = 0;
    if (!dlg.open) dlg.showModal();
    const closeBtn = dlg.querySelector('.lb-close');
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (dlg.open) dlg.close();
  }

  dlg.addEventListener('close', () => {
    if (!state) return;
    const s = state;
    state = null;
    if (s.onClose) s.onClose();
    if (s.returnFocus && document.contains(s.returnFocus)) s.returnFocus.focus({ preventScroll: true });
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
    if (e.target.closest('.lb-close')) close();
    const dl = e.target.closest('[data-lb-download]');
    if (dl && state) App.storage.download(state.kind, state.item, dl);
    // Внутренняя ссылка (например, на праздник) — закрываем окно, переход сделает роутер.
    const a = e.target.closest('a[href^="#"]');
    if (a && state) state.returnFocus = null;
  });

  App.lightbox = { open, close, isOpen: () => dlg.open };
})();
