/*
 * Автопополнение из открытых источников: ARASAAC, Wikimedia Commons, Openverse.
 * Наборы описаны в data/sources.js. Найденное превращается в обычные материалы ленты (auto: true)
 * с автором, лицензией и ссылкой на первоисточник; кэшируется в браузере на App.config.sources.cacheHours.
 * Здесь же — searchImages(): быстрый поиск картинок для конструктора презентаций и раздела «Печатные материалы».
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  const CFG = App.config.sources;
  const CACHE_KEY = 'ols.sources.v3';

  const ARASAAC_LICENSE = { code: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ru' };
  const ARASAAC_AUTHOR = 'Sergio Palao; собственность Правительства Арагона (Испания)';
  const ARASAAC_CREDIT = 'Пиктограммы: Sergio Palao. Источник: ARASAAC (arasaac.org). Лицензия CC BY-NC-SA 4.0. Собственность: Правительство Арагона (Испания).';

  // Короткий словарь: русские темы → английские запросы для Commons и Openverse.
  const RU_EN = {
    'осень': 'autumn', 'зима': 'winter', 'весна': 'spring', 'лето': 'summer', 'птиц': 'birds', 'птица': 'bird', 'космос': 'space',
    'ракета': 'rocket', 'планет': 'planets', 'звезд': 'stars', 'солнце': 'sun', 'луна': 'moon', 'животн': 'animals', 'кошк': 'cat',
    'собак': 'dog', 'рыб': 'fish', 'море': 'sea', 'океан': 'ocean', 'медуз': 'jellyfish', 'лес': 'forest', 'дерев': 'tree',
    'лист': 'leaves', 'цвет': 'flowers', 'гриб': 'mushrooms', 'овощ': 'vegetables', 'фрукт': 'fruits', 'яблок': 'apple',
    'хлеб': 'bread', 'снег': 'snow', 'снеговик': 'snowman', 'ёлк': 'christmas tree', 'елк': 'christmas tree', 'новый год': 'new year',
    'мама': 'mother', 'семья': 'family', 'дом': 'house', 'транспорт': 'transport', 'машин': 'car', 'поезд': 'train',
    'светофор': 'traffic light', 'пдд': 'road safety', 'вода': 'water', 'земл': 'earth', 'глобус': 'globe', 'насеком': 'insects',
    'пчел': 'bee', 'бабочк': 'butterfly', 'динозавр': 'dinosaur', 'раскраск': 'coloring page', 'цифр': 'numbers', 'счет': 'counting',
    'фигур': 'shapes', 'букв': 'alphabet', 'азбук': 'alphabet', 'профес': 'professions', 'одежд': 'clothes', 'спорт': 'sport',
    'зуб': 'teeth', 'здоров': 'health', 'музык': 'music', 'театр': 'theatre', 'книг': 'books', 'медвед': 'bear', 'заяц': 'hare',
    'лис': 'fox', 'волк': 'wolf', 'ёж': 'hedgehog', 'еж': 'hedgehog', 'белк': 'squirrel', 'корова': 'cow', 'лошад': 'horse'
  };

  function toEnglish(q) {
    const low = q.toLowerCase().replace(/ё/g, 'е');
    if (/^[a-z0-9\s'-]+$/.test(low)) return q;
    const out = [];
    Object.keys(RU_EN).forEach((k) => { if (low.includes(k.replace(/ё/g, 'е'))) out.push(RU_EN[k]); });
    return [...new Set(out)].join(' ');
  }

  // Перевод запроса на английский бесплатным сервисом MyMemory (без ключа, лимит ~5000 символов в день).
  // Если сервис недоступен — словарь выше или исходный текст.
  const trCache = new Map();
  async function translate(q) {
    const text = String(q || '').trim();
    if (!text || /^[\x00-\x7f]*$/.test(text)) return text;
    if (trCache.has(text)) return trCache.get(text);
    let out = '';
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch('https://api.mymemory.translated.net/get?langpair=ru|en&q=' + encodeURIComponent(text.slice(0, 450)), { signal: ctl.signal });
      clearTimeout(timer);
      const j = await r.json();
      if (j.responseStatus === 200 && j.responseData && !/MYMEMORY WARNING/i.test(j.responseData.translatedText)) out = j.responseData.translatedText;
    } catch (e) { /* без перевода */ }
    out = out || toEnglish(text) || text;
    trCache.set(text, out);
    return out;
  }

  const enabled = () => CFG.enabled && !App.storage.inArtifact();

  function timeoutFetch(url, opts) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CFG.timeoutMs);
    return fetch(url, Object.assign({ signal: ctl.signal }, opts || {})).finally(() => clearTimeout(timer));
  }

  async function getJson(url) {
    const r = await timeoutFetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  function stripHtml(s) {
    const d = document.createElement('div');
    d.innerHTML = String(s || '');
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Картинка не загрузилась'));
      img.src = src;
    });
  }

  /* ---------- ARASAAC ---------- */
  const arasaacImg = (id, size) => 'https://static.arasaac.org/pictograms/' + id + '/' + id + '_' + (size || 300) + '.png';

  async function arasaacFind(word) {
    try {
      const list = await getJson('https://api.arasaac.org/v1/pictograms/ru/search/' + encodeURIComponent(word));
      return list && list[0] ? list[0]._id : null;
    } catch (e) { return null; }
  }

  // Лист карточек 3×2 (A4 альбомный) из пиктограмм.
  async function composeSheet(title, pictos, longSide) {
    const W = longSide || 1754, H = Math.round(W / 1.414), k = W / 297;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b2540'; g.textAlign = 'center';
    g.font = '800 ' + Math.round(10 * k) + 'px Nunito, "Segoe UI", Arial, sans-serif';
    g.fillText(title, W / 2, 17 * k);
    const cols = 3, rows = 2, x0 = 12 * k, y0 = 26 * k, gap = 6 * k;
    const cw = (W - 24 * k - gap * 2) / cols, ch = (H - y0 - 16 * k - gap) / rows;
    const imgs = await Promise.all(pictos.map((p) => loadImage(arasaacImg(p.id, 500)).catch(() => null)));
    pictos.forEach((p, i) => {
      const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      g.setLineDash([3 * k, 2 * k]); g.strokeStyle = '#2b2540'; g.lineWidth = 0.6 * k;
      g.strokeRect(x, y, cw, ch); g.setLineDash([]);
      const s = Math.min(cw - 16 * k, ch - 26 * k);
      if (imgs[i]) g.drawImage(imgs[i], x + (cw - s) / 2, y + 6 * k, s, s);
      g.font = '700 ' + Math.round(9 * k) + 'px Nunito, "Segoe UI", Arial, sans-serif';
      g.fillText(p.word[0].toUpperCase() + p.word.slice(1), x + cw / 2, y + ch - 7 * k);
    });
    g.fillStyle = '#8a84a0'; g.font = '400 ' + Math.round(3.6 * k) + 'px Nunito, "Segoe UI", Arial, sans-serif';
    g.fillText(ARASAAC_CREDIT, W / 2, H - 6 * k);
    return c;
  }

  async function loadArasaacSet(set) {
    const found = await Promise.all(set.words.map(async (w) => ({ word: w, id: await arasaacFind(w) })));
    const pictos = found.filter((p) => p.id);
    if (pictos.length < 4) return [];
    return [{
      id: 'auto-arasaac-' + set.id, auto: true, provider: 'ARASAAC',
      title: 'Карточки «' + set.title + '»', type: 'cards', subjects: set.subjects, groups: set.groups || ['g1', 'g2', 'g3'], seasons: set.seasons || ['all'],
      holidays: set.holidays || [], tags: set.tags || [],
      description: 'Набор собран автоматически из пиктограмм ARASAAC — открытой библиотеки для логопедов и педагогов. Слова: ' + pictos.map((p) => p.word).join(', ') + '.',
      author: ARASAAC_AUTHOR, license: ARASAAC_LICENSE,
      source: { title: 'ARASAAC — Арагонский портал альтернативной коммуникации', url: 'https://arasaac.org/pictograms/search' },
      remote: { kind: 'arasaac-sheet', pictos }
    }];
  }

  /* ---------- Wikimedia Commons ---------- */
  function commonsItem(page, set) {
    const ii = page.imageinfo && page.imageinfo[0];
    if (!ii) return null;
    const m = ii.extmetadata || {};
    const lic = m.LicenseShortName ? stripHtml(m.LicenseShortName.value) : '';
    if (!/cc|public domain|pd/i.test(lic)) return null; // только открытые лицензии
    const name = stripHtml((m.ObjectName && m.ObjectName.value) || page.title.replace(/^File:|\.[a-z]+$/gi, '')).replace(/[_-]+/g, ' ');
    return {
      id: 'auto-commons-' + page.pageid, auto: true, provider: 'Wikimedia Commons',
      title: name.slice(0, 90), type: set.type || 'coloring', subjects: set.subjects || ['art'], groups: set.groups || ['g1', 'g2', 'g3'], seasons: set.seasons || ['all'],
      holidays: set.holidays || [], tags: set.tags || [],
      description: (stripHtml(m.ImageDescription && m.ImageDescription.value) || 'Изображение из Wikimedia Commons.').slice(0, 280),
      author: stripHtml(m.Artist && m.Artist.value) || 'см. страницу файла',
      license: { code: lic, url: (m.LicenseUrl && m.LicenseUrl.value) || ii.descriptionurl },
      source: { title: 'Wikimedia Commons', url: ii.descriptionurl },
      preview: ii.thumburl, previewSize: [ii.thumbwidth || 3, ii.thumbheight || 4],
      remote: { kind: 'image', full: ii.url, ext: (ii.url.split('.').pop() || 'png').toLowerCase().slice(0, 4) }
    };
  }

  async function searchCommons(query, set, limit) {
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6' +
      '&gsrlimit=' + (limit || 12) + '&gsrsearch=' + encodeURIComponent(query) +
      '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=900';
    const j = await getJson(url);
    return Object.values((j.query && j.query.pages) || {})
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((p) => commonsItem(p, set || {}))
      .filter((x) => x && !/\.(pdf|djvu|tif)$/i.test(x.remote.full));
  }

  /* ---------- Openverse ---------- */
  function licenseCode(r) {
    if (r.license === 'cc0') return 'CC0 1.0';
    if (r.license === 'pdm') return 'Public Domain Mark';
    return 'CC ' + String(r.license).toUpperCase() + ' ' + (r.license_version || '');
  }

  async function searchOpenverse(query, set, limit) {
    const j = await getJson('https://api.openverse.org/v1/images/?mature=false&page_size=' + (limit || 12) + '&q=' + encodeURIComponent(query));
    return (j.results || []).map((r) => ({
      id: 'auto-ov-' + r.id, auto: true, provider: 'Openverse',
      title: (r.title || 'Изображение').slice(0, 90), type: (set && set.type) || 'coloring', subjects: (set && set.subjects) || ['art'], groups: (set && set.groups) || ['g1', 'g2', 'g3'],
      seasons: (set && set.seasons) || ['all'], holidays: (set && set.holidays) || [], tags: (set && set.tags) || [],
      description: 'Найдено через Openverse в коллекции ' + (r.source || r.provider) + '.',
      author: r.creator || 'не указан', license: { code: licenseCode(r).trim(), url: r.license_url },
      source: { title: (r.source || 'Openverse') + ' через Openverse', url: r.foreign_landing_url },
      preview: r.thumbnail || r.url, previewSize: [r.width || 3, r.height || 4],
      remote: { kind: 'image', full: r.url, ext: (String(r.filetype || r.url.split('.').pop() || 'jpg')).toLowerCase().slice(0, 4) }
    }));
  }

  /* ---------- Загрузка наборов ---------- */
  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.time < CFG.cacheHours * 3600e3) return c.items;
    } catch (e) { /* нет доступа к хранилищу */ }
    return null;
  }

  function writeCache(items) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), items })); } catch (e) { /* без кэша */ }
  }

  // Превью листов ARASAAC рисуются в браузере (их не кэшируем — это картинки).
  async function hydrate(items) {
    await Promise.all(items.filter((it) => it.remote && it.remote.kind === 'arasaac-sheet' && !it.preview).map(async (it) => {
      try {
        const c = await composeSheet(it.title.replace(/^Карточки /, '').replace(/[«»]/g, ''), it.remote.pictos, 900);
        it.preview = c.toDataURL('image/jpeg', 0.86);
        it.previewSize = [c.width, c.height];
      } catch (e) { it.preview = null; }
    }));
    return items.filter((it) => it.preview);
  }

  let state = { status: 'idle', count: 0, failed: [] };
  let loading = null;

  function load() {
    if (!enabled()) { state.status = 'off'; return Promise.resolve([]); }
    if (loading) return loading;
    state.status = 'loading';
    loading = (async () => {
      let items = readCache();
      if (!items) {
        const sets = (window.SITE_DATA.autoSources || []).filter((s) => CFG.providers.includes(s.provider));
        const results = await Promise.all(sets.map(async (set) => {
          try {
            if (set.provider === 'arasaac') return await loadArasaacSet(set);
            if (set.provider === 'commons') return await searchCommons(set.query, set, set.limit);
            if (set.provider === 'openverse') return await searchOpenverse(set.query, set, set.limit);
          } catch (e) { state.failed.push(set.provider); }
          return [];
        }));
        items = [].concat(...results);
        if (items.length) writeCache(items);
      }
      items = await hydrate(items);
      state.count = S.addPrintables(items);
      state.status = 'ready';
      document.dispatchEvent(new CustomEvent('ols:sources'));
      return items;
    })();
    return loading;
  }

  /* ---------- Поиск по запросу ---------- */
  // Материалы для ленты: найденное в Commons и Openverse по теме запроса.
  async function searchAsItems(query) {
    if (!enabled()) return [];
    const en = await translate(query);
    const tasks = [];
    if (CFG.providers.includes('commons')) tasks.push(searchCommons((en || query) + ' filetype:bitmap', { subjects: ['art', 'world'], type: 'picture', tags: [query] }, 12).catch(() => []));
    if (CFG.providers.includes('openverse') && en) tasks.push(searchOpenverse(en + ' illustration', { subjects: ['art', 'world'], type: 'picture', tags: [query] }, 10).catch(() => []));
    const items = [].concat(...(await Promise.all(tasks)));
    S.addPrintables(items);
    return items;
  }

  // Картинки для презентаций: { id, thumb, full, w, h, title, credit, provider }.
  async function searchImages(query) {
    if (!enabled()) return [];
    const en = await translate(query);
    const out = [];
    const tasks = [];
    if (CFG.providers.includes('arasaac')) {
      tasks.push(getJson('https://api.arasaac.org/v1/pictograms/ru/search/' + encodeURIComponent(query)).then((list) => {
        (list || []).slice(0, 8).forEach((p) => out.push({ id: 'ara-' + p._id, thumb: arasaacImg(p._id, 300), full: arasaacImg(p._id, 500), w: 500, h: 500, title: query, credit: 'ARASAAC, Sergio Palao, CC BY-NC-SA', provider: 'ARASAAC' }));
      }).catch(() => {}));
    }
    const mapItem = (it) => ({ id: it.id, thumb: it.preview, full: it.preview, w: it.previewSize[0], h: it.previewSize[1], title: it.title, credit: it.author.slice(0, 60) + ', ' + it.license.code + ', ' + it.provider, provider: it.provider });
    if (CFG.providers.includes('commons')) tasks.push(searchCommons((en || query) + ' filetype:bitmap', {}, 14).then((r) => r.forEach((it) => out.push(mapItem(it)))).catch(() => {}));
    if (CFG.providers.includes('openverse') && en) tasks.push(searchOpenverse(en, {}, 12).then((r) => r.forEach((it) => out.push(mapItem(it)))).catch(() => {}));
    await Promise.all(tasks);
    return out;
  }

  /* ---------- Файлы ---------- */
  async function buildFile(item) {
    if (item.remote.kind === 'arasaac-sheet') {
      const c = await composeSheet(item.title.replace(/^Карточки /, '').replace(/[«»]/g, ''), item.remote.pictos, 1754);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
      return { blob, filename: U.slug(item.title) + '.png' };
    }
    const r = await timeoutFetch(item.remote.full);
    if (!r.ok) throw new Error('Источник не отдал файл (код ' + r.status + ').');
    return { blob: await r.blob(), filename: U.slug(item.title) + '.' + (item.remote.ext || 'jpg') };
  }

  App.sources = { load, searchAsItems, searchImages, searchCommons, buildFile, toEnglish, translate, enabled, state: () => state, ARASAAC_CREDIT };
})();
