/*
 * «Пожаловаться» и печать А4.
 * Жалоба скрывает материал в этом браузере и записывается в журнал. Когда у сайта появится сервер,
 * жалобы будут уходить в общую очередь модерации (точка подключения — App.config.moderation.endpoint).
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;

  const REASONS = [
    'Текст не на русском языке или иностранный логотип',
    'Неподходящее для детей: пугающее, агрессивное, неприличное',
    'Карикатура, мем, политика или реклама',
    'Плохое качество: размыто, обрезано',
    'Нарушены авторские права',
    'Другое'
  ];

  const dlg = U.h('<dialog class="complaint" aria-labelledby="cmp-h"><form method="dialog" class="complaint-in">' +
    '<h2 id="cmp-h">Пожаловаться на материал</h2><p class="cmp-title"></p>' +
    '<fieldset><legend class="select-label">Причина</legend>' + REASONS.map((r, i) =>
      '<label class="check"><input type="radio" name="cmp" value="' + i + '"' + (i === 0 ? ' checked' : '') + '> ' + r + '</label>').join('') + '</fieldset>' +
    '<p class="reg-note">Материал сразу скроется у вас и попадёт на проверку.</p>' +
    '<div class="editor-row"><button type="submit" class="btn btn--primary" value="send">Отправить жалобу</button><button type="submit" class="btn btn--ghost" value="cancel">Отмена</button></div>' +
    '</form></dialog>');
  document.body.append(dlg);
  let current = null;

  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'send' || !current) return;
    const reason = REASONS[+dlg.querySelector('input[name=cmp]:checked').value];
    S.complain(current.item.id, reason);
    const ep = App.config.moderation && App.config.moderation.endpoint;
    if (ep) fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: current.item.id, title: current.item.title, reason }) }).catch(() => {});
    U.toast('Спасибо! Материал скрыт и отправлен на проверку');
    if (current.done) current.done();
  });

  function open(item, done) {
    if (!item) return;
    current = { item, done };
    dlg.querySelector('.cmp-title').textContent = item.title;
    dlg.returnValue = '';
    dlg.showModal();
  }

  // Предпросмотр и печать на листе А4: картинка вписывается в страницу.
  async function print(kind, item) {
    let src;
    if (item.remote) src = item.preview;
    else if (kind === 'plan') return U.toast('Разработку удобнее скачать документом и распечатать из Word');
    else src = App.art.dataUrl(App.art.printableSvg(item));
    const land = App.art.aspect(kind, item) < 1;
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 ' + (land ? 'landscape' : 'portrait') + ';margin:8mm}html,body{margin:0;height:100%}' +
      'body{display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100%}</style></head><body><img src="' + U.esc(src) + '"></body></html>';
    f.onload = () => {
      const img = f.contentDocument.querySelector('img');
      const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { U.toast('Печать недоступна в этом окне', 'error'); } setTimeout(() => f.remove(), 60000); };
      if (img.complete) go(); else img.onload = go;
    };
    document.body.append(f);
  }

  App.complaint = { open, print };
})();
