/*
 * Роутер: адреса вида #printables?holiday=titmouse-day&item=p-rocket-coloring.
 * Страницы — App.pages[id] = { title, render(root, params), openItem?(id), destroy?() }.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const view = document.getElementById('view');
  let current = { page: null, params: {}, impl: null };

  function parse(hash) {
    const raw = String(hash || '').replace(/^#\/?/, '');
    const [page, qs] = raw.split('?');
    const params = {};
    new URLSearchParams(qs || '').forEach((v, k) => { params[k] = v; });
    return { page: page && App.pages[page] ? page : 'home', params };
  }

  function hashFor(page, params) {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== '' && v != null) qs.set(k, v); });
    const s = qs.toString();
    return '#' + page + (s ? '?' + s : '');
  }

  function setUrl(hash, replace) {
    try {
      history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    } catch (e) { /* в песочнице артефакта адрес может быть недоступен — состояние живёт в странице */ }
  }

  function render(route) {
    if (App.lightbox.isOpen()) App.lightbox.close();
    App.searchbar.hide();
    if (current.impl && current.impl.destroy) current.impl.destroy();
    const impl = App.pages[route.page];
    current = { page: route.page, params: route.params, impl };
    view.innerHTML = '';
    impl.render(view, route.params);
    document.title = route.page === 'home'
      ? App.config.siteName + ' — праздники, раскраски и конспекты для воспитателей'
      : impl.title + ' · ' + App.config.siteName;
    App.menu.setActive(route.page);
    if (!route.params.h) window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }

  function navigate(page, params, opts) {
    const p = params || {};
    // Тот же раздел и только открыть материал — без перерисовки ленты.
    if (page === current.page && p.item && current.impl && current.impl.openItem) {
      const rest = Object.assign({}, p);
      delete rest.item;
      const cur = Object.assign({}, current.params);
      delete cur.item;
      if (JSON.stringify(rest) === JSON.stringify(cur) || Object.keys(rest).length === 0) {
        App.searchbar.hide();
        return current.impl.openItem(p.item);
      }
    }
    setUrl(hashFor(page, p), opts && opts.replace);
    render({ page, params: p });
  }

  function updateParams(page, params) {
    if (page !== current.page) return;
    current.params = params;
    setUrl(hashFor(page, params), true);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (href === '#view') return;
    e.preventDefault();
    const r = parse(href);
    navigate(r.page, r.params);
  });
  window.addEventListener('popstate', () => render(parse(location.hash)));
  window.addEventListener('hashchange', () => {
    const r = parse(location.hash);
    if (r.page !== current.page || JSON.stringify(r.params) !== JSON.stringify(current.params)) render(r);
  });

  App.router = { navigate, updateParams, parse, current: () => current };

  document.getElementById('brand-mark').innerHTML = App.pixelJellySvg(0);
  render(parse(location.hash));
})();
