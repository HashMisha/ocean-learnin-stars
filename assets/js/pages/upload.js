/*
 * Раздел «Загрузить материал» (для вошедших пользователей).
 * Файл уходит прямо в хранилище по временной ссылке, затем сервер проверяет его (язык, распознавание текста,
 * классификация изображения) и публикует, отправляет на ручную проверку или отклоняет.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  App.pages = App.pages || {};

  const MIMES = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'application/pdf': 'PDF', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX' };
  const KINDS = { coloring: 'Раскраска', cards: 'Карточки', game: 'Развивающая игра', mask: 'Маска для театра', poster: 'Плакат', template: 'Шаблон поделки', worksheet: 'Рабочий лист', picture: 'Картинка' };
  const STATUS = { published: 'Опубликован', pending: 'На проверке у модератора', hidden: 'Скрыт по жалобе' };

  function imageSize(file) {
    return new Promise((res) => {
      if (!/^image\//.test(file.type)) return res([null, null]);
      const i = new Image();
      i.onload = () => { res([i.naturalWidth, i.naturalHeight]); URL.revokeObjectURL(i.src); };
      i.onerror = () => res([null, null]);
      i.src = URL.createObjectURL(file);
    });
  }

  App.pages.upload = {
    title: 'Загрузить материал',
    render(root) {
      if (!App.api.enabled()) {
        root.innerHTML = '<section class="page-head"><h1>Загрузить материал</h1><p class="lead">Загрузка появится после подключения сервера сайта.</p></section>';
        return;
      }
      if (!App.api.user) {
        root.innerHTML = '<section class="page-head"><h1>Загрузить материал</h1><p class="lead">Чтобы делиться своими материалами, войдите через Яндекс ID.</p>' +
          '<button type="button" class="btn btn--primary" data-login>Войти через Яндекс ID</button></section>';
        root.querySelector('[data-login]').onclick = () => App.api.login();
        return;
      }
      const ck = (name, list) => Object.entries(list).map(([v, l]) => '<label class="check"><input type="checkbox" name="' + name + '" value="' + v + '"> ' + l + '</label>').join('');
      root.innerHTML =
        '<section class="page-head"><p class="eyebrow">Поделитесь с коллегами</p><h1>Загрузить материал</h1>' +
        '<p class="lead">Раскраска, карточки, игра, маска, конспект — для детей от 1,5 до 7 лет. Всё на русском языке. После автоматической проверки материал появится в ленте; первые три публикации посмотрит модератор.</p></section>' +
        '<form class="panel up-form" id="up-form">' +
        '<label class="dropzone"><input type="file" id="up-file" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx" required><span>' + U.icon('image') + '<span id="up-file-name">Выберите файл: JPG, PNG, WebP, PDF или DOCX, до 20 МБ</span></span></label>' +
        '<label class="field"><span class="select-label">Название</span><input id="up-title" type="text" maxlength="120" required placeholder="Например: Раскраска «Снегирь на ветке»"></label>' +
        '<label class="field"><span class="select-label">Описание</span><textarea id="up-desc" rows="3" maxlength="600" placeholder="Для чего материал и как с ним работать"></textarea></label>' +
        '<div class="up-grid">' +
        '<fieldset><legend class="select-label">Возрастная группа</legend>' + ck('groups', { g1: '1,5–3 года', g2: '3–5 лет', g3: '5–7 лет' }) + '</fieldset>' +
        '<fieldset><legend class="select-label">Сезон</legend>' + ck('seasons', { all: 'Круглый год', autumn: 'Осень', winter: 'Зима', spring: 'Весна', summer: 'Лето' }) + '</fieldset>' +
        '<fieldset><legend class="select-label">Направление</legend>' + ck('subjects', S.SUBJECTS) + '</fieldset></div>' +
        '<div class="select-row">' +
        '<label class="select"><span class="select-label">Вид материала</span><select id="up-type">' + Object.entries(KINDS).map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('') + '</select></label>' +
        '<label class="select"><span class="select-label">Праздник (если есть)</span><select id="up-holiday"><option value="">Без праздника</option>' + S.holidays.map((h) => '<option value="' + h.id + '">' + U.esc(h.title) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span class="select-label">Темы через запятую</span><input id="up-tags" type="text" placeholder="птицы, зима, кормушка"></label>' +
        '<label class="field"><span class="select-label">Подпись автора</span><input id="up-author" type="text" maxlength="60" value="' + U.esc(App.api.user.name) + '"></label></div>' +
        '<label class="check up-rights"><input type="checkbox" id="up-rights" required> Я автор материала или имею право его распространять, и разрешаю бесплатно скачивать его с сайта</label>' +
        '<div class="editor-row"><button type="submit" class="btn btn--primary btn--lg">' + U.icon('plus') + '<span class="btn-label">Отправить на проверку</span></button></div>' +
        '<p class="up-status" aria-live="polite"></p></form>' +
        '<section class="panel up-mine"><h2 class="sec-title">Мои материалы</h2><ul class="up-list"><li>Загружаем…</li></ul></section>';

      const $ = (s) => root.querySelector(s);
      const status = $('.up-status');
      const vals = (name) => [...root.querySelectorAll('input[name=' + name + ']:checked')].map((i) => i.value);

      async function mine() {
        try {
          const j = await App.api.request('GET', 'me/materials');
          $('.up-list').innerHTML = j.items.length ? j.items.map((m) => '<li><b>' + U.esc(m.title) + '</b> — ' + (STATUS[m.status] || m.status) + (m.reason ? '. ' + U.esc(m.reason) : '') + '</li>').join('') : '<li>Пока ничего не загружено.</li>';
        } catch (e) { $('.up-list').innerHTML = '<li>' + U.esc(e.message) + '</li>'; }
      }

      $('#up-file').addEventListener('change', (e) => { const f = e.target.files[0]; $('#up-file-name').textContent = f ? f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' МБ' : ''; });
      $('#up-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = $('#up-file').files[0];
        const meta = {
          title: $('#up-title').value.trim(), description: $('#up-desc').value.trim(),
          tags: $('#up-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
          groups: vals('groups'), seasons: vals('seasons'), subjects: vals('subjects'),
          type: $('#up-type').value, holidays: $('#up-holiday').value ? [$('#up-holiday').value] : [],
          authorName: $('#up-author').value.trim(), rights: $('#up-rights').checked
        };
        // Предварительная проверка в браузере — те же правила, что на сервере.
        if (!file || !MIMES[file.type]) return (status.textContent = 'Нужен файл JPG, PNG, WebP, PDF или DOCX.');
        if (file.size > 20 * 1048576) return (status.textContent = 'Файл больше 20 МБ.');
        if (!meta.title || !meta.groups.length) return (status.textContent = 'Укажите название и хотя бы одну возрастную группу.');
        if (!S.langOk({ title: meta.title, description: meta.description, tags: meta.tags })) return (status.textContent = 'Название, описание и темы должны быть на русском языке.');
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        try {
          status.textContent = 'Загружаем файл…';
          const [w, h] = await imageSize(file);
          const up = await App.api.request('POST', 'uploads/url', { mime: file.type, size: file.size });
          const put = await fetch(up.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
          if (!put.ok) throw new Error('Хранилище не приняло файл (код ' + put.status + ')');
          status.textContent = 'Проверяем материал: язык, текст на изображении, содержание…';
          const res = await App.api.request('POST', 'materials', Object.assign(meta, { key: up.key, width: w, height: h }));
          status.textContent = res.status === 'published' ? 'Готово! Материал опубликован в ленте.' : res.status === 'pending' ? 'Материал отправлен модератору: ' + res.reason + '.' : 'Материал не прошёл проверку: ' + res.reason + '.';
          if (res.status !== 'rejected') e.target.reset();
          mine();
        } catch (err) {
          status.textContent = err.message;
        } finally { btn.disabled = false; }
      });
      mine();
    }
  };
})();
