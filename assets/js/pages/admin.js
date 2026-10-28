/*
 * Панель администратора: очередь модерации, журнал отклонений, жалобы, все материалы, разделы меню.
 * Доступна только пользователям из ADMIN_LOGINS на сервере (проверка — на сервере, не только здесь).
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  App.pages = App.pages || {};

  const TABS = [['queue', 'Очередь проверки'], ['rejections', 'Журнал отклонений'], ['complaints', 'Жалобы'], ['all', 'Все материалы'], ['menu', 'Разделы меню']];
  const fmt = (d) => new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  App.pages.admin = {
    title: 'Панель администратора',
    render(root) {
      if (!App.api.enabled() || !App.api.isAdmin()) {
        root.innerHTML = '<section class="page-head"><h1>Панель администратора</h1><p class="lead">Раздел доступен администраторам сайта после входа через Яндекс ID.</p></section>';
        return;
      }
      let tab = 'queue';
      let menu = null;
      root.innerHTML = '<section class="page-head"><p class="eyebrow">Только для администраторов</p><h1>Панель администратора</h1>' +
        '<p class="lead">Проверка загруженных материалов, жалобы, журнал отклонений и разделы меню. Новый материал от себя — через <a href="#upload">загрузку</a>: материалы администратора публикуются сразу после автоматической проверки.</p></section>' +
        '<div class="tabs adm-tabs" role="tablist"></div><section class="panel adm-out" aria-live="polite"></section>';
      const out = root.querySelector('.adm-out');

      async function draw() {
        root.querySelector('.adm-tabs').innerHTML = TABS.map(([k, l]) => '<button type="button" role="tab" class="tab" data-tab="' + k + '" aria-selected="' + (k === tab) + '">' + l + '</button>').join('');
        out.innerHTML = '<p>Загружаем…</p>';
        try {
          if (tab === 'queue') {
            const j = await App.api.request('GET', 'admin/queue');
            out.innerHTML = j.items.length ? '<div class="adm-grid">' + j.items.map((m) =>
              '<article class="adm-card" data-id="' + U.esc(m.id) + '">' +
              (m.kind === 'image' ? '<a href="' + U.esc(m.url) + '" target="_blank" rel="noopener"><img src="' + U.esc(m.url) + '" alt="" loading="lazy"></a>' : '<a class="btn btn--sm" href="' + U.esc(m.url) + '" target="_blank" rel="noopener">Открыть ' + U.esc(m.kind.toUpperCase()) + '</a>') +
              '<h3>' + U.esc(m.title) + '</h3><p>' + U.esc(m.description || '') + '</p>' +
              '<p class="day-muted">Автор: ' + U.esc(m.author) + ' · ' + fmt(m.date) + ' · ' + (m.status === 'hidden' ? 'скрыт по жалобе' : 'на проверке') + (m.reason ? '<br>' + U.esc(m.reason) : '') + '</p>' +
              '<label class="field"><span class="sr-only">Причина отказа</span><input type="text" class="adm-reason" placeholder="Причина отказа (для журнала)"></label>' +
              '<div class="editor-row"><button type="button" class="btn btn--primary btn--sm" data-act="approve">Опубликовать</button><button type="button" class="btn btn--sm" data-act="reject">Отклонить и удалить</button></div></article>').join('') + '</div>'
              : '<p>Очередь пуста.</p>';
          } else if (tab === 'rejections' || tab === 'complaints') {
            const j = await App.api.request('GET', 'admin/events?type=' + (tab === 'complaints' ? 'complaint' : 'rejection'));
            out.innerHTML = j.items.length ? '<div class="adm-table"><table><thead><tr><th>Дата</th><th>Материал</th><th>' + (tab === 'complaints' ? 'Причина жалобы' : 'Причина') + '</th><th>' + (tab === 'complaints' ? 'Кто' : 'Автор') + '</th></tr></thead><tbody>' +
              j.items.map((e) => '<tr><td>' + fmt(e.date) + '</td><td>' + U.esc(e.materialTitle || e.materialId || '') + '</td><td>' + U.esc(e.reason || '') + '</td><td>' + U.esc(e.authorName || e.by || '') + '</td></tr>').join('') + '</tbody></table></div>'
              : '<p>Записей нет.</p>';
          } else if (tab === 'all') {
            const j = await App.api.request('GET', 'admin/all');
            out.innerHTML = j.items.length ? '<div class="adm-table"><table><thead><tr><th>Название</th><th>Статус</th><th>Автор</th><th>Дата</th><th></th></tr></thead><tbody>' +
              j.items.map((m) => '<tr data-id="' + U.esc(m.id) + '"><td>' + U.esc(m.title) + '</td><td>' + U.esc(m.status) + '</td><td>' + U.esc(m.author || '') + '</td><td>' + fmt(m.date) + '</td><td><button type="button" class="btn btn--sm btn--ghost" data-act="delete">Удалить</button></td></tr>').join('') + '</tbody></table></div>'
              : '<p>Загруженных пользователями материалов пока нет.</p>';
          } else {
            menu = menu || JSON.parse(JSON.stringify(App.config.menu));
            out.innerHTML = '<p class="reg-note">Порядок, названия и описания разделов. Id раздела должен совпадать со страницей сайта (например, printables, calendar).</p><ol class="adm-menu">' +
              menu.map((m, i) => '<li data-i="' + i + '"><input type="text" class="adm-mt" value="' + U.esc(m.title) + '" aria-label="Название"><input type="text" class="adm-md" value="' + U.esc(m.description || '') + '" aria-label="Описание">' +
                '<code>#' + U.esc(m.id) + '</code><button type="button" class="icon-btn" data-mv="-1" aria-label="Выше">' + U.icon('up') + '</button><button type="button" class="icon-btn" data-mv="1" aria-label="Ниже">' + U.icon('down') + '</button>' +
                '<button type="button" class="icon-btn" data-rm aria-label="Скрыть раздел">' + U.icon('trash') + '</button></li>').join('') + '</ol>' +
              '<div class="editor-row"><button type="button" class="btn btn--primary" data-save-menu>Сохранить меню</button><button type="button" class="btn btn--ghost" data-reset-menu>Вернуть как в config.js</button></div>';
          }
        } catch (e) { out.innerHTML = '<p>' + U.esc(e.message) + '</p>'; }
      }

      function readMenu() {
        out.querySelectorAll('.adm-menu li').forEach((li) => {
          const m = menu[+li.dataset.i];
          m.title = li.querySelector('.adm-mt').value.trim() || m.title;
          m.description = li.querySelector('.adm-md').value.trim();
        });
      }

      root.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-tab]');
        if (t) { tab = t.dataset.tab; return draw(); }
        const act = e.target.closest('[data-act]');
        if (act) {
          const holder = act.closest('[data-id]');
          const reason = (holder.querySelector('.adm-reason') || {}).value || '';
          act.disabled = true;
          try {
            await App.api.request('POST', 'admin/decide', { id: holder.dataset.id, action: act.dataset.act, reason });
            U.toast(act.dataset.act === 'approve' ? 'Опубликовано' : 'Удалено и записано в журнал');
            draw();
          } catch (err) { U.toast(err.message, 'error'); act.disabled = false; }
          return;
        }
        if (tab !== 'menu') return;
        const li = e.target.closest('li[data-i]');
        if (li && (e.target.closest('[data-mv]') || e.target.closest('[data-rm]'))) {
          readMenu();
          const i = +li.dataset.i;
          if (e.target.closest('[data-rm]')) menu.splice(i, 1);
          else { const j = i + +e.target.closest('[data-mv]').dataset.mv; if (j >= 0 && j < menu.length) [menu[i], menu[j]] = [menu[j], menu[i]]; }
          return draw();
        }
        if (e.target.closest('[data-save-menu]')) {
          readMenu();
          try {
            await App.api.request('PUT', 'settings/menu', { value: menu });
            App.config.menu = menu.slice();
            App.menu.build();
            U.toast('Меню сохранено — его увидят все посетители');
          } catch (err) { U.toast(err.message, 'error'); }
        }
        if (e.target.closest('[data-reset-menu]')) {
          menu = JSON.parse(JSON.stringify(App.config.menuDefault));
          draw();
          U.toast('Список как в config.js — нажмите «Сохранить меню», чтобы применить');
        }
      });
      draw();
    }
  };
})();
