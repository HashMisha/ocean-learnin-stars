/*
 * Выдвижная панель меню справа. Пункты строятся из App.config.menu.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const drawer = document.getElementById('drawer');
  const scrim = document.getElementById('scrim');
  const button = document.getElementById('menu-btn');
  const shell = document.querySelectorAll('[data-inert-with-menu]');

  let items = [];
  // Пункты меню строятся из App.config.menu.
  function build() {
    items = [{ id: 'home', title: 'Главная', description: 'Календарь и ближайшие праздники', icon: 'home' }].concat(App.config.menu);
    drawer.querySelector('.drawer-nav').innerHTML = items.map((m) =>
      '<a class="drawer-link" href="#' + U.esc(m.id) + '" data-page="' + U.esc(m.id) + '">' +
      '<span class="drawer-ico">' + U.icon(m.icon) + '</span>' +
      '<span><span class="drawer-title">' + U.esc(m.title) + '</span><span class="drawer-desc">' + U.esc(m.description || '') + '</span></span></a>'
    ).join('');
  }
  build();

  function open() {
    drawer.classList.add('is-open');
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('is-on'));
    drawer.setAttribute('aria-hidden', 'false');
    drawer.inert = false;
    button.setAttribute('aria-expanded', 'true');
    shell.forEach((el) => { el.inert = true; });
    const active = drawer.querySelector('.is-active') || drawer.querySelector('a');
    if (active) active.focus();
  }

  function close(restoreFocus) {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    scrim.classList.remove('is-on');
    setTimeout(() => { scrim.hidden = true; }, 250);
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    button.setAttribute('aria-expanded', 'false');
    shell.forEach((el) => { el.inert = false; });
    if (restoreFocus !== false) button.focus();
  }

  button.addEventListener('click', open);
  scrim.addEventListener('click', () => close());
  drawer.querySelector('.drawer-close').addEventListener('click', () => close());
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  drawer.inert = true;

  function setActive(page) {
    drawer.querySelectorAll('.drawer-link').forEach((a) => {
      const on = a.dataset.page === page;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  App.menu = { open, close, setActive, build, get items() { return items; } };
})();
