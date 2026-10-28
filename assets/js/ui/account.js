/* Блок аккаунта в выдвижном меню: вход через Яндекс ID, загрузка материалов, панель администратора, выход. */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const box = document.querySelector('.drawer-account');
  if (!box) return;

  function draw() {
    if (!App.api.enabled()) {
      box.innerHTML = '<p class="drawer-note">Вход и загрузка материалов появятся после подключения сервера.</p>';
      return;
    }
    const u = App.api.user;
    box.innerHTML = u
      ? '<p class="acc-name">' + U.icon('home') + U.esc(u.name) + '</p>' +
        '<a class="drawer-link drawer-link--sm" href="#upload">' + U.icon('plus') + 'Загрузить материал</a>' +
        (u.admin ? '<a class="drawer-link drawer-link--sm" href="#admin">' + U.icon('flag') + 'Панель администратора</a>' : '') +
        '<button type="button" class="btn btn--ghost btn--sm" data-logout>Выйти</button>'
      : '<button type="button" class="btn btn--primary" data-login>Войти через Яндекс ID</button>' +
        '<p class="drawer-note">Вход нужен, чтобы загружать свои материалы и хранить избранное и историю советника в аккаунте.</p>';
  }
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-login]')) App.api.login();
    if (e.target.closest('[data-logout]')) App.api.logout();
  });
  document.addEventListener('ols:auth', draw);
  draw();
})();
