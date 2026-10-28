/*
 * Связь с сервером в Yandex Cloud (server/): вход через Яндекс ID, избранное и история советника в аккаунте,
 * жалобы, материалы пользователей, настройки меню. Если сервер не подключён (App.config.api.base пуст),
 * сайт работает как раньше — всё хранится в браузере.
 */
(function () {
  'use strict';
  const App = window.App;
  const CFG = App.config.api;
  const TOKEN = 'ols.token', USER = 'ols.user';

  const enabled = () => !!CFG.base && !App.storage.inArtifact();
  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* без хранения */ } };

  let user = null;
  try { user = JSON.parse(read(USER) || 'null'); } catch (e) { user = null; }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = read(TOKEN);
    if (t) headers.Authorization = 'Bearer ' + t;
    const r = await fetch(CFG.base.replace(/\/$/, '') + '/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && t) logout(true);
    if (!r.ok) throw new Error(j.error || 'Сервер не ответил (код ' + r.status + ')');
    return j;
  }

  const emit = () => document.dispatchEvent(new CustomEvent('ols:auth', { detail: user }));

  /* ---------- Вход через Яндекс ID (OAuth, токен возвращается в адресе после #) ---------- */
  function login() {
    if (!CFG.yandexClientId) return App.util.toast('Вход ещё не настроен: нужен ID приложения Яндекс ID', 'error');
    const back = location.origin + location.pathname;
    const state = encodeURIComponent(location.hash.replace(/^#/, '') || 'home');
    location.href = 'https://oauth.yandex.ru/authorize?response_type=token&client_id=' + encodeURIComponent(CFG.yandexClientId) +
      '&redirect_uri=' + encodeURIComponent(back) + '&state=' + state;
  }
  function logout(silent) {
    user = null;
    write(TOKEN, null);
    write(USER, null);
    emit();
    if (!silent) App.util.toast('Вы вышли из аккаунта');
  }

  // Ответ Яндекса: #access_token=…&state=… — убираем из адреса до запуска роутера.
  const m = location.hash.match(/access_token=([^&]+)/);
  if (m) {
    const st = (location.hash.match(/state=([^&]+)/) || [])[1];
    try { history.replaceState(null, '', location.pathname + '#' + decodeURIComponent(st || 'home')); } catch (e) { location.hash = decodeURIComponent(st || 'home'); }
    if (enabled()) {
      request('POST', 'auth/yandex', { token: decodeURIComponent(m[1]) }).then((j) => {
        write(TOKEN, j.token);
        user = j.user;
        write(USER, JSON.stringify(user));
        emit();
        App.util.toast('Здравствуйте, ' + user.name + '!');
        syncFavorites();
      }).catch((e) => App.util.toast(e.message, 'error'));
    }
  }

  /* ---------- Избранное и история в аккаунте ---------- */
  async function syncFavorites() {
    if (!user || !enabled()) return;
    try {
      const data = await request('GET', 'me/data');
      const local = App.store.favorites();
      (data.favorites || []).forEach((id) => local.add(id));
      write('ols.favorites', JSON.stringify([...local]));
      await request('PUT', 'me/data', { favorites: [...local] });
      if (!read('ols.advisor') && data.history && data.history.length) write('ols.advisor', JSON.stringify(data.history));
    } catch (e) { /* останется локальная копия */ }
  }
  const pushFavorites = App.util.debounce(() => { if (user && enabled()) request('PUT', 'me/data', { favorites: [...App.store.favorites()] }).catch(() => {}); }, 800);
  const pushHistory = App.util.debounce((list) => { if (user && enabled()) request('PUT', 'me/data', { history: list }).catch(() => {}); }, 1500);
  const origToggle = App.store.toggleFavorite;
  App.store.toggleFavorite = (id) => { const on = origToggle(id); pushFavorites(); return on; };

  /* ---------- Материалы пользователей в ленте ---------- */
  function docCover(title, ext) {
    const lines = App.art.wrap(title, 18).slice(0, 4);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="480" height="640"><rect width="120" height="160" fill="#fbf8ff"/>' +
      '<rect width="120" height="34" fill="#498757"/><text x="10" y="22" font-size="11" font-weight="800" fill="#fff" font-family="Nunito,Arial">' + ext.toUpperCase() + '</text>' +
      lines.map((l, i) => '<text x="10" y="' + (60 + i * 13) + '" font-size="10" font-weight="700" fill="#2b2540" font-family="Nunito,Arial">' + App.util.esc(l) + '</text>').join('') + '</svg>';
    return App.art.dataUrl(svg);
  }
  let materialsLoaded = null;
  function loadMaterials() {
    if (!enabled()) return Promise.resolve([]);
    if (!materialsLoaded) {
      materialsLoaded = request('GET', 'materials').then((j) => {
        const items = (j.items || []).map((m) => {
          const ext = m.kind === 'image' ? (m.mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg') : m.kind;
          return {
            id: 'u-' + m.id, serverId: m.id, title: m.title, description: m.description || 'Материал загружен автором сайта.',
            type: m.type || 'picture', subjects: m.subjects || [], groups: m.groups, seasons: m.seasons && m.seasons.length ? m.seasons : ['all'],
            tags: m.tags || [], holidays: m.holidays || [], author: m.author,
            license: { code: 'Разрешение автора на распространение', url: '' }, source: { title: 'Загружено автором на сайт', url: null },
            provider: 'Автор: ' + m.author,
            preview: m.kind === 'image' ? m.url : docCover(m.title, ext),
            previewSize: m.kind === 'image' && m.width ? [m.width, m.height] : [3, 4],
            remote: { kind: 'image', full: m.url, ext }
          };
        });
        App.store.addPrintables(items);
        document.dispatchEvent(new CustomEvent('ols:sources'));
        return items;
      }).catch(() => []);
    }
    return materialsLoaded;
  }

  // Настройки меню с сервера (исходный список из config.js сохраняем для кнопки «Вернуть»).
  App.config.menuDefault = App.config.menu.slice();
  if (enabled()) {
    request('GET', 'settings/menu').then((j) => {
      if (Array.isArray(j.value) && j.value.length) { App.config.menu = j.value; if (App.menu) App.menu.build(); }
    }).catch(() => {});
  }

  App.api = {
    enabled, request, login, logout, loadMaterials, pushHistory,
    get user() { return user; },
    isAdmin: () => !!(user && user.admin)
  };
})();
