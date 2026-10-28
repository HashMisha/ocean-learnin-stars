/*
 * Скачивание материалов.
 * Источник файла:  облако (App.config.storage.cloudBaseUrl + item.file.path)  или  демо-генерация в браузере.
 * Способ сохранения: обычная загрузка браузера, а внутри артефакта claude.ai — его capability «downloads».
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;

  const inArtifact = () => !!(window.claude && typeof window.claude.use === 'function');
  let downloadsApi;

  function getDownloadsApi() {
    if (!inArtifact()) return Promise.resolve(null);
    if (!downloadsApi) downloadsApi = window.claude.use('downloads').catch(() => null);
    return downloadsApi;
  }

  function cloudUrl(item) {
    const cfg = App.config.storage;
    if (!item.file || !cfg.cloudBaseUrl || cfg.provider === 'demo') return null;
    return cfg.cloudBaseUrl.replace(/\/?$/, '/') + item.file.path.replace(/^\//, '');
  }

  async function buildFile(kind, item) {
    if (item.remote) return App.sources.buildFile(item);
    const url = cloudUrl(item);
    if (url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Файл не найден в хранилище (код ' + res.status + ').');
      return { blob: await res.blob(), filename: item.file.name || decodeURIComponent(url.split('/').pop()) };
    }
    if (App.config.storage.provider === 'cloud') throw new Error('Для этого материала в хранилище нет файла.');
    if (kind === 'printable') {
      const blob = await App.art.svgToPng(App.art.printableSvg(item));
      return { blob, filename: U.slug(item.title) + '.png' };
    }
    // .doc с HTML внутри открывается в Word и LibreOffice; артефакт принимает только .html.
    const html = App.art.planDocument(item);
    const ext = inArtifact() ? 'html' : 'doc';
    return { blob: new Blob(['﻿', html], { type: ext === 'doc' ? 'application/msword' : 'text/html' }), filename: U.slug(item.title) + '.' + ext };
  }

  function browserSave(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function download(kind, item, button) {
    const label = button && button.querySelector('.btn-label');
    const restore = label && label.textContent;
    if (button) {
      button.disabled = true;
      if (label) label.textContent = 'Готовим…';
    }
    try {
      const { blob, filename } = await buildFile(kind, item);
      const api = await getDownloadsApi();
      if (api) {
        await api.save({ filename, data: blob });
      } else if (inArtifact()) {
        throw { code: 'unavailable' };
      } else {
        browserSave(blob, filename);
      }
      U.toast('Файл «' + filename + '» сохранён');
    } catch (e) {
      if (e && e.code === 'declined') U.toast('Скачивание отменено');
      else if (e && e.code) U.toast('Здесь скачивание недоступно. Откройте сайт в браузере.', 'error');
      else U.toast((e && e.message) || 'Не удалось скачать файл', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        if (label) label.textContent = restore;
      }
    }
  }

  function formatLabel(kind, item) {
    if (item.remote) return item.remote.kind === 'arasaac-sheet' ? 'PNG, A4 альбомный' : (item.remote.ext || 'jpg').toUpperCase() + ', оригинал из источника';
    if (item.file && item.file.path) return (item.file.path.split('.').pop() || '').toUpperCase();
    if (kind === 'printable') return 'PNG, A4';
    return inArtifact() ? 'HTML' : 'DOC (Word)';
  }

  App.storage = { download, formatLabel, inArtifact };
})();
