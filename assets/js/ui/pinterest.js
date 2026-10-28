/* Блок «Идеи с Pinterest» в разделе «Печатные материалы» (пины из data/pinterest.js). */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  const PINS = (window.SITE_DATA.pinterest || []).filter((p) => S.langOk({ title: p.title, description: '', tags: p.tags }));
  let scriptLoaded = false;

  function loadScript() {
    if (scriptLoaded) return window.PinUtils && window.PinUtils.build();
    scriptLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://assets.pinterest.com/js/pinit.js';
    document.body.append(s);
  }

  function render(box, state) {
    if (!box) return;
    const list = PINS.filter((p) => (state.group === 'all' || !p.groups || p.groups.includes(state.group)) &&
      (!state.q || U.stems(p.title + ' ' + (p.tags || []).join(' ')).some((s) => U.stems(state.q).some((q) => U.stemMatch(q, s) > 0)))).slice(0, 8);
    box.hidden = !list.length || App.storage.inArtifact();
    if (box.hidden) return;
    box.innerHTML = '<h2 class="sec-title">Идеи с Pinterest</h2><div class="pins-grid">' + list.map((p) =>
      '<figure class="pin-embed panel"><a data-pin-do="embedPin" data-pin-width="medium" href="' + U.esc(p.url) + '"></a>' +
      '<figcaption><b>' + U.esc(p.title) + '</b><span>Источник: Pinterest · <a href="' + U.esc(p.url) + '" target="_blank" rel="noopener">оригинальный пин' + U.icon('external', 'i-s') + '</a></span>' +
      (p.source ? '<span>Первоисточник: <a href="' + U.esc(p.source) + '" target="_blank" rel="noopener">открыть</a></span>' : '') + '</figcaption></figure>').join('') + '</div>';
    loadScript();
  }

  App.pinterest = { render, count: PINS.length };
})();
