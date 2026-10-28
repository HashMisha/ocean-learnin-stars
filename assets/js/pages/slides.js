/*
 * Конструктор презентаций.
 *   — 20 готовых шаблонов (детские и для коллег/выставок) с предпросмотром; свой шаблон вручную или по фото;
 *   — нейросеть-помощник: план презентации, упрощение текста, вопросы, загадки;
 *   — быстрый черновик по теме, подбор картинок (интернет, материалы сайта, нейросеть), показ и выгрузка в PowerPoint.
 * Презентация и свои шаблоны хранятся в браузере посетителя (localStorage).
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  const T = App.templates;
  App.pages = App.pages || {};

  const KEY = 'ols.slides.v1';
  const PPTX_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
  const LAYOUTS = { title: 'Титульный', 'image-text': 'Картинка и текст', image: 'Большая картинка', text: 'Только текст' };

  const uid = () => Math.random().toString(36).slice(2, 9);
  const blank = (over) => Object.assign({ id: uid(), layout: 'image-text', title: 'Новый слайд', text: '', image: null }, over || {});
  const newDeck = (theme) => ({ title: 'Моя презентация', theme: theme || 'kids-ocean', slides: [blank({ layout: 'title', title: 'Моя презентация', text: 'Занятие для детей' })] });

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && Array.isArray(d.slides) && d.slides.length) return d;
    } catch (e) { /* пустая презентация */ }
    return newDeck();
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { U.toast('Браузер не дал сохранить презентацию: мало места. Уберите часть картинок.', 'error'); }
  }

  App.slides = {
    addImageSlide(image, title) {
      const d = load();
      d.slides.push(blank({ layout: 'image', title: (title || '').slice(0, 80), image }));
      save(d);
    }
  };

  /* ---------- Отрисовка слайда ---------- */
  function slideHtml(s, tpl, cls) {
    const lines = String(s.text || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const img = s.image ? '<div class="sl-img"><img src="' + U.esc(s.image.url) + '" alt="" loading="lazy"></div>' : '';
    const lay = T.photoLayout(tpl, s.layout === 'title' ? 'title' : 'content');
    const photo = lay === 'none' ? '' : '<div class="sl-photo sl-photo--' + lay + '" style="background-image:url(&quot;' + T.photoUrl(tpl) + '&quot;)"></div>' +
      (lay === 'cover' ? '<div class="sl-shade" style="background:' + tpl.bg + '"></div>' : '');
    const body = s.layout === 'title'
      ? '<div class="sl-titlebox"><h3 class="sl-title">' + U.esc(s.title) + '</h3>' + (lines.length ? '<p class="sl-sub">' + U.esc(lines.join(' · ')) + '</p>' : '') + '</div>' + img
      : '<h3 class="sl-title">' + U.esc(s.title) + '</h3>' +
        (s.layout !== 'image' && lines.length ? '<ul class="sl-text">' + lines.map((l) => '<li>' + U.esc(l) + '</li>').join('') + '</ul>' : '') +
        (s.layout !== 'text' ? img : '');
    return '<div class="sl sl--' + s.layout + ' sl--ph-' + lay + ' sl--al-' + (tpl.align || 'left') + (cls ? ' ' + cls : '') + '" style="' + T.slideStyle(tpl) + '">' +
      photo + body + (s.image && s.image.credit ? '<span class="sl-credit">' + U.esc(s.image.credit) + '</span>' : '') + '</div>';
  }

  const SAMPLE = [
    blank({ layout: 'title', title: 'Название презентации', text: 'Подзаголовок' }),
    blank({ layout: 'text', title: 'Заголовок слайда', text: 'Первый пункт\nВторой пункт\nТретий пункт' })
  ];

  /* ---------- Быстрый черновик по теме ---------- */
  async function quickDeck(topic) {
    const Tp = topic.trim();
    const Title = Tp[0].toUpperCase() + Tp.slice(1);
    const holiday = S.search('holiday', S.holidays, Tp)[0];
    const plan = S.search('plan', S.plans, Tp)[0];
    const slides = [blank({ layout: 'title', title: Title, text: holiday ? holiday.title + ' · ' + U.formatDay(S.nextDate(holiday, U.today())) : 'Презентация для занятия' })];
    if (holiday) slides.push(blank({ layout: 'text', title: 'О празднике', text: holiday.description }));
    if (plan) slides.push(blank({ layout: 'text', title: 'Что мы узнаем', text: (plan.tasks || []).join('\n') }));
    const queries = [...new Set([Tp].concat((holiday && holiday.tags) || [], (plan && plan.tags) || []))].slice(0, 5);
    const pics = [];
    for (const q of queries) {
      if (pics.length >= 8) break;
      pics.push(...(await App.sources.searchImages(q).catch(() => [])));
    }
    const questions = ['Что вы видите на картинке?', 'Как это называется?', 'Расскажите, какое оно?', 'Где это можно встретить?'];
    const used = new Set();
    pics.filter((p) => p.provider !== 'ARASAAC').concat(pics.filter((p) => p.provider === 'ARASAAC')).forEach((p) => {
      if (used.size >= 4 || used.has(p.full)) return;
      used.add(p.full);
      slides.push(blank({ layout: 'image-text', title: questions[used.size - 1], image: { url: p.full, credit: p.credit } }));
    });
    if (!used.size) slides.push(blank({ layout: 'text', title: 'Рассмотрим тему', text: 'Добавьте картинки кнопкой «Подобрать картинку»' }));
    slides.push(blank({ layout: 'title', title: 'Молодцы!', text: 'Спасибо за внимание' }));
    return slides;
  }

  /* ---------- Помощник ---------- */
  function audience(tpl) {
    const g = U.getGroup();
    if (tpl.audience === 'pro') return 'педагогов-коллег (педсовет, методическое объединение, выставка)';
    return 'детей ' + (g === 'g1' ? '1,5–3 лет' : g === 'g2' ? '3–5 лет' : '5–7 лет') + ' в детском саду';
  }
  const clean = (l) => l.replace(/^\s*(\d+[.)]|[-*•–])\s*/, '').replace(/\*\*/g, '').trim();

  function helperPrompt(kind, d, s, tpl, free) {
    const ctx = 'Тема презентации: «' + d.title + '». Слайд: «' + s.title + '»' + (s.text ? '. Текст слайда: ' + s.text.replace(/\n/g, '; ') : '') + '.';
    const base = 'Ты помощник воспитателя детского сада. Пиши по-русски, коротко и грамотно. Аудитория: ' + audience(tpl) + '.\n';
    if (kind === 'plan') return base + 'Составь план презентации из 6 слайдов на тему «' + d.title + '». Формат строго такой: каждая строка — один слайд в виде «Заголовок | пункт; пункт; пункт». Без нумерации, без пояснений, без пустых строк.';
    if (kind === 'simple') return base + ctx + '\nПерепиши текст этого слайда проще и короче: 2–4 пункта, каждый с новой строки, без нумерации и пояснений.';
    if (kind === 'pro') return base.replace(/Аудитория: .*\n/, 'Аудитория: коллеги-педагоги.\n') + ctx + '\nПерепиши текст слайда в деловом стиле для выступления перед коллегами: 3–4 пункта, каждый с новой строки, без нумерации.';
    if (kind === 'questions') return base + ctx + '\nПридумай 3 вопроса к детям по этому слайду. Каждый вопрос с новой строки, без нумерации.';
    if (kind === 'riddle') return base + ctx + '\nПридумай короткую загадку для детей по теме слайда. Сначала загадка (2–4 строки), последней строкой — отгадка в скобках.';
    return base + ctx + '\nЗадание воспитателя: ' + free + '\nОтветь только готовым текстом для слайда, каждый пункт с новой строки.';
  }

  /* ---------- PowerPoint ---------- */
  let pptxLoading = null;
  function loadPptx() {
    if (window.PptxGenJS) return Promise.resolve();
    if (!pptxLoading) {
      pptxLoading = new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = PPTX_URL;
        sc.onload = res;
        sc.onerror = () => { pptxLoading = null; rej(new Error('Не удалось загрузить модуль PowerPoint')); };
        document.head.append(sc);
      });
    }
    return pptxLoading;
  }
  function blobToData(blob) {
    return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  }
  async function imageData(url) {
    if (url.startsWith('data:image/svg')) return blobToData(await App.art.svgToPng(decodeURIComponent(url.split(',')[1]), 1400));
    if (url.startsWith('data:')) return url;
    const r = await fetch(url);
    if (!r.ok) throw new Error('img');
    return blobToData(await r.blob());
  }
  function imgSize(src) {
    return new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res([4, 3]); i.src = src; });
  }

  async function exportPptx(d) {
    await loadPptx();
    const tpl = T.get(d.theme);
    const pptx = new window.PptxGenJS();
    pptx.layout = 'LAYOUT_16x9'; // 10 × 5.625 дюйма
    pptx.title = d.title;
    const hex = (c) => c.replace('#', '');
    const face = (T.FONTS[tpl.font] || T.FONTS.sans).pptx;
    const bgs = { title: await T.backgroundPng(tpl, 'title'), content: await T.backgroundPng(tpl, 'content') };
    let skipped = 0;
    for (const s of d.slides) {
      const kind = s.layout === 'title' ? 'title' : 'content';
      const lay = T.photoLayout(tpl, kind);
      const sl = pptx.addSlide();
      sl.background = { data: bgs[kind] };
      // Рабочая область с учётом фото-полосы.
      let X = 0.5, Y = 0.3, Wd = 9, Hb = 5.0;
      if (lay === 'left') { X = 3.75; Wd = 5.75; }
      if (lay === 'right') { Wd = 5.75; }
      if (lay === 'top') { Y = 1.65; Hb = 3.7; }
      const lines = String(s.text || '').split('\n').map((l) => l.trim()).filter(Boolean);
      let img = null;
      if (s.image && s.layout !== 'text') {
        try {
          const data = await imageData(s.image.url);
          img = { data, size: await imgSize(data) };
        } catch (e) { skipped++; }
      }
      const place = (x, y, w, h) => {
        if (!img) return;
        const k = Math.min(w / img.size[0], h / img.size[1]);
        const iw = img.size[0] * k, ih = img.size[1] * k;
        sl.addImage({ data: img.data, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
      };
      if (s.layout === 'title') {
        const w = img ? Wd * 0.55 : Wd;
        if (img) place(X + w + 0.2, Y + 0.4, Wd - w - 0.2, Hb - 0.6);
        const center = tpl.align === 'center' && !img;
        sl.addText(s.title, { x: X, y: Y + 1.1, w, h: 1.5, fontSize: 36, bold: true, color: hex(tpl.fg), fontFace: face, valign: 'bottom', align: center ? 'center' : 'left' });
        if (lines.length) sl.addText(lines.join(' · '), { x: X, y: Y + 2.7, w, h: 0.8, fontSize: 18, color: hex(tpl.accent), fontFace: face, valign: 'top', align: center ? 'center' : 'left' });
      } else {
        sl.addText(s.title, { x: X, y: Y, w: Wd, h: 0.8, fontSize: 26, bold: true, color: hex(tpl.fg), fontFace: face });
        const top = Y + 0.95, h = Hb - 1.1;
        const textW = s.layout === 'text' || !img ? Wd : Wd * 0.47;
        if (s.layout === 'image') place(X, top, Wd, h);
        if (s.layout === 'image-text') place(lines.length ? X + textW + 0.2 : X, top, lines.length ? Wd - textW - 0.2 : Wd, h);
        if (lines.length && s.layout !== 'image') {
          sl.addText(lines.map((l) => ({ text: l, options: { bullet: true } })), { x: X, y: top, w: textW, h, fontSize: 19, color: hex(tpl.fg), fontFace: face, valign: 'top', paraSpaceAfter: 8 });
        }
      }
      if (s.image && s.image.credit && s.layout !== 'text') sl.addText(s.image.credit, { x: X, y: 5.25, w: Wd, h: 0.3, fontSize: 8, color: hex(tpl.soft || tpl.fg), fontFace: 'Arial' });
    }
    await pptx.writeFile({ fileName: U.slug(d.title || 'Презентация') + '.pptx' });
    return skipped;
  }

  /* ---------- Страница ---------- */
  App.pages.slides = {
    title: 'Конструктор презентаций',
    render(root) {
      let d = load();
      let cur = 0, pickTab = 'web', tplTab = T.get(d.theme).audience === 'pro' ? 'pro' : 'kids', resetArmed = false;
      let builder = null; // черновик своего шаблона
      let helperOut = null;

      const online = App.sources.enabled();
      root.innerHTML =
        '<section class="page-head"><p class="eyebrow">Шаблоны · помощник · картинки · PowerPoint</p><h1>Конструктор презентаций</h1>' +
        '<p class="lead">Выберите шаблон — детский или для коллег и выставок — или сделайте свой, в том числе по фотографии. Введите тему: сайт соберёт черновик с картинками, а нейросеть-помощник подскажет план и тексты.</p></section>' +
        (online ? '' : '<div class="notice panel">В предпросмотре claude.ai недоступны поиск картинок, нейросеть-художник и выгрузка файла. Шаблоны, редактор, показ и помощник работают.</div>') +
        '<form class="panel quick" id="quick-form"><label class="feed-search"><span class="sr-only">Тема презентации</span>' + U.icon('spark') +
        '<input id="quick-topic" type="search" placeholder="Тема: птицы зимой, космос, овощи, светофор…" autocomplete="off"></label>' +
        '<button type="submit" class="btn btn--primary">Собрать презентацию</button></form>' +

        '<section class="panel tpl-panel" aria-labelledby="tpl-h"><div class="sec-head"><h2 id="tpl-h">Шаблоны</h2>' +
        '<button type="button" class="btn btn--sm" data-a="builder">' + U.icon('plus') + 'Создать свой шаблон</button></div>' +
        '<div class="tabs" role="tablist" aria-label="Набор шаблонов">' +
        '<button type="button" role="tab" class="tab" data-tt="kids">Детские</button>' +
        '<button type="button" role="tab" class="tab" data-tt="pro">Для коллег и выставок</button>' +
        '<button type="button" role="tab" class="tab" data-tt="my">Мои шаблоны</button></div>' +
        '<div class="tpl-grid"></div></section>' +

        '<section class="panel builder" hidden aria-labelledby="b-h"><div class="sec-head"><h2 id="b-h">Свой шаблон</h2>' +
        '<button type="button" class="icon-btn" data-a="b-close" aria-label="Закрыть конструктор шаблона">' + U.icon('close') + '</button></div>' +
        '<div class="tabs" role="tablist" aria-label="Способ"><button type="button" role="tab" class="tab" data-bt="manual">Вручную</button><button type="button" role="tab" class="tab" data-bt="photo">По фото</button></div>' +
        '<div class="b-photo" hidden><label class="dropzone"><input type="file" id="b-file" accept="image/*"><span>' + U.icon('image') + 'Выберите или перетащите фото — например, оформление группы, открытку или пейзаж.</span></label>' +
        '<div class="b-analysis" aria-live="polite"></div></div>' +
        '<div class="b-grid"><div class="b-form">' +
        '<label class="field"><span class="select-label">Название</span><input id="b-name" type="text" maxlength="40"></label>' +
        '<div class="b-colors">' +
        '<label class="color"><input type="color" id="b-bg"><span>Фон</span></label>' +
        '<label class="color"><input type="color" id="b-bg2"><span>Второй цвет</span></label>' +
        '<label class="color"><input type="color" id="b-fg"><span>Текст</span></label>' +
        '<label class="color"><input type="color" id="b-accent"><span>Акцент</span></label></div>' +
        '<label class="check"><input type="checkbox" id="b-grad"> Градиент из двух цветов</label>' +
        '<label class="select"><span class="select-label">Шрифт</span><select id="b-font">' + Object.entries(T.FONTS).map(([k, v]) => '<option value="' + k + '">' + v.label + '</option>').join('') + '</select></label>' +
        '<label class="select"><span class="select-label">Рисунок на фоне</span><select id="b-deco">' + Object.entries(T.DECOS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select></label>' +
        '<label class="select"><span class="select-label">Титульный слайд</span><select id="b-align"><option value="center">Текст по центру</option><option value="left">Текст слева</option></select></label>' +
        '<label class="select b-ph"><span class="select-label">Фото на слайдах</span><select id="b-phc"><option value="left">Полоса слева</option><option value="right">Полоса справа</option><option value="top">Полоса сверху</option><option value="none">Только на титульном</option></select></label>' +
        '<label class="select"><span class="select-label">Для кого</span><select id="b-aud"><option value="kids">Детям</option><option value="pro">Коллегам</option></select></label>' +
        '</div><div class="b-preview"></div></div>' +
        '<div class="editor-row"><button type="button" class="btn btn--primary" data-a="b-save">Сохранить и применить</button><button type="button" class="btn btn--ghost" data-a="b-close">Отмена</button></div></section>' +

        '<div class="deck-bar panel">' +
        '<label class="select deck-name"><span class="select-label">Название презентации</span><input id="deck-title" type="text" maxlength="80"></label>' +
        '<span class="deck-tpl"></span>' +
        '<div class="deck-actions"><button type="button" class="btn" data-a="present">' + U.icon('play') + 'Показ</button>' +
        '<button type="button" class="btn btn--dl" data-a="pptx">' + U.icon('download') + '<span class="btn-label">Скачать PowerPoint</span></button>' +
        '<button type="button" class="btn btn--ghost" data-a="reset">Новая</button></div></div>' +

        '<div class="deck">' +
        '<aside class="deck-list panel" aria-label="Слайды"><ol class="thumbs"></ol>' +
        '<button type="button" class="btn btn--sm deck-add" data-a="add">' + U.icon('plus') + 'Слайд</button></aside>' +
        '<section class="deck-main">' +
        '<div class="stage"></div>' +
        '<div class="editor panel">' +
        '<div class="chip-row layouts" role="group" aria-label="Макет"></div>' +
        '<label class="field"><span class="select-label">Заголовок</span><input id="sl-title" type="text" maxlength="120"></label>' +
        '<label class="field"><span class="select-label">Текст (каждая строка — пункт списка)</span><textarea id="sl-text" rows="4"></textarea></label>' +
        '<div class="editor-row"><button type="button" class="btn" data-a="pick">' + U.icon('image') + 'Подобрать картинку</button>' +
        '<button type="button" class="btn btn--ghost" data-a="noimg">Убрать картинку</button><span class="spacer"></span>' +
        '<button type="button" class="icon-btn" data-a="up" aria-label="Переместить слайд выше">' + U.icon('up') + '</button>' +
        '<button type="button" class="icon-btn" data-a="down" aria-label="Переместить слайд ниже">' + U.icon('down') + '</button>' +
        '<button type="button" class="icon-btn" data-a="dup" aria-label="Копировать слайд">' + U.icon('copy') + '</button>' +
        '<button type="button" class="icon-btn" data-a="del" aria-label="Удалить слайд">' + U.icon('trash') + '</button></div></div>' +

        '<section class="panel helper" aria-labelledby="h-h"><div class="sec-head"><h2 id="h-h">' + U.icon('spark') + ' Помощник</h2><span class="helper-src">нейросеть, бесплатно</span></div>' +
        '<div class="chip-row"><button type="button" class="chip" data-h="plan">План презентации по теме</button>' +
        '<button type="button" class="chip" data-h="simple">Проще — для детей</button>' +
        '<button type="button" class="chip" data-h="pro">Деловой стиль — для коллег</button>' +
        '<button type="button" class="chip" data-h="questions">Вопросы детям</button>' +
        '<button type="button" class="chip" data-h="riddle">Загадка</button></div>' +
        '<form class="helper-form"><label class="field"><span class="sr-only">Своя просьба помощнику</span><textarea id="h-free" rows="2" placeholder="Своя просьба: например, «добавь интересный факт про снегиря»"></textarea></label>' +
        '<button type="submit" class="btn">Спросить</button></form>' +
        '<div class="helper-out" aria-live="polite"></div></section>' +

        '<div class="picker panel" hidden>' +
        '<div class="tabs" role="tablist" aria-label="Откуда взять картинку">' +
        '<button type="button" role="tab" class="tab" data-tab="web">Интернет</button>' +
        '<button type="button" role="tab" class="tab" data-tab="site">Материалы сайта</button>' +
        '<button type="button" role="tab" class="tab" data-tab="ai">Нейросеть</button></div>' +
        '<form class="picker-form"><label class="feed-search">' + U.icon('search') + '<input id="pick-q" type="search" autocomplete="off" placeholder="Что найти: белка, осенний лес…"></label>' +
        '<button type="submit" class="btn btn--primary">Найти</button></form>' +
        '<p class="picker-status" aria-live="polite"></p><div class="picker-grid"></div></div>' +
        '</section></div>';

      const $ = (s) => root.querySelector(s);
      const thumbs = $('.thumbs'), stage = $('.stage'), picker = $('.picker'), bPanel = $('.builder');
      const fTitle = $('#sl-title'), fText = $('#sl-text');
      $('#deck-title').value = d.title;
      const tpl = () => T.get(d.theme);
      const commit = () => save(d);

      /* --- отрисовка --- */
      function drawThumbs() {
        const t = tpl();
        thumbs.innerHTML = d.slides.map((s, i) => '<li><button type="button" class="thumb' + (i === cur ? ' is-on' : '') + '" data-i="' + i + '" aria-label="Слайд ' + (i + 1) + ': ' + U.esc(s.title) + '"' + (i === cur ? ' aria-current="true"' : '') + '>' +
          '<span class="thumb-n">' + (i + 1) + '</span>' + slideHtml(s, t, 'sl--mini') + '</button></li>').join('');
      }
      function drawStage() { stage.innerHTML = slideHtml(d.slides[cur], tpl()); }
      function drawEditor() {
        const s = d.slides[cur];
        fTitle.value = s.title;
        fText.value = s.text || '';
        $('.layouts').innerHTML = '<span class="chip-row-label">Макет</span>' + Object.entries(LAYOUTS).map(([k, l]) =>
          '<button type="button" class="chip' + (k === s.layout ? ' is-on' : '') + '" data-layout="' + k + '" aria-pressed="' + (k === s.layout) + '">' + l + '</button>').join('');
        $('.deck-tpl').innerHTML = 'Шаблон: <b>' + U.esc(tpl().name) + '</b>';
      }
      function drawTemplates() {
        root.querySelectorAll('[data-tt]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tt === tplTab));
        const list = tplTab === 'my' ? T.readCustom() : T.all().filter((t) => t.audience === tplTab && !t.custom);
        const grid = $('.tpl-grid');
        if (!list.length) {
          grid.innerHTML = '<p class="picker-status">Своих шаблонов пока нет. Нажмите «Создать свой шаблон» — вручную или по фото.</p>';
          return;
        }
        grid.innerHTML = list.map((t) => '<div class="tpl-card' + (t.id === tpl().id ? ' is-on' : '') + '">' +
          '<button type="button" class="tpl-pick" data-tpl="' + t.id + '" aria-label="Применить шаблон «' + U.esc(t.name) + '»"' + (t.id === tpl().id ? ' aria-current="true"' : '') + '>' +
          slideHtml(blank({ layout: 'title', title: t.name, text: t.audience === 'pro' ? 'Для коллег' : 'Для детей' }), t, 'sl--mini') + '</button>' +
          '<span class="tpl-name">' + U.esc(t.name) + (t.custom ? ' <button type="button" class="linkbtn" data-tdel="' + t.id + '">удалить</button>' : '') + '</span></div>').join('');
      }
      function drawAll() { drawThumbs(); drawStage(); drawEditor(); }

      /* --- свой шаблон --- */
      function openBuilder(mode, base) {
        const b = base || tpl();
        builder = Object.assign({}, b, { id: 'my-' + uid(), custom: true, name: b.custom ? b.name : 'Мой шаблон', photo: b.photo || null });
        if (!builder.bg2) builder.bg2 = null;
        bPanel.hidden = false;
        setBuilderMode(mode || 'manual');
        fillBuilderForm();
        drawBuilderPreview();
        bPanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      function setBuilderMode(mode) {
        root.querySelectorAll('[data-bt]').forEach((b) => b.setAttribute('aria-selected', b.dataset.bt === mode));
        $('.b-photo').hidden = mode !== 'photo';
        $('.b-ph').hidden = !builder.photo;
      }
      function fillBuilderForm() {
        $('#b-name').value = builder.name;
        $('#b-bg').value = builder.bg;
        $('#b-bg2').value = builder.bg2 || builder.bg;
        $('#b-grad').checked = !!builder.bg2;
        $('#b-fg').value = builder.fg;
        $('#b-accent').value = builder.accent;
        $('#b-font').value = builder.font;
        $('#b-deco').value = builder.deco || 'none';
        $('#b-align').value = builder.align || 'left';
        $('#b-phc').value = builder.photoContent || 'left';
        $('#b-aud').value = builder.audience || 'kids';
      }
      function readBuilderForm() {
        builder.name = $('#b-name').value.trim() || 'Мой шаблон';
        builder.bg = $('#b-bg').value;
        builder.bg2 = $('#b-grad').checked ? $('#b-bg2').value : null;
        builder.fg = $('#b-fg').value;
        builder.accent = $('#b-accent').value;
        builder.soft = builder.fg;
        builder.font = $('#b-font').value;
        builder.deco = $('#b-deco').value;
        builder.align = $('#b-align').value;
        builder.photoContent = $('#b-phc').value;
        builder.audience = $('#b-aud').value;
        drawBuilderPreview();
      }
      function drawBuilderPreview() {
        $('.b-preview').innerHTML = '<span class="select-label">Так будут выглядеть слайды</span>' +
          slideHtml(Object.assign({}, SAMPLE[0], { title: builder.name }), builder) + slideHtml(SAMPLE[1], builder);
      }
      bPanel.addEventListener('input', (e) => { if (e.target.closest('.b-form')) readBuilderForm(); });
      bPanel.addEventListener('change', (e) => { if (e.target.closest('.b-form')) readBuilderForm(); });

      async function onPhoto(file) {
        if (!file || !/^image\//.test(file.type)) return U.toast('Нужен файл с картинкой', 'error');
        const box = $('.b-analysis');
        box.innerHTML = '<p class="picker-status">Разбираем фото…</p>';
        try {
          const a = await T.analyzePhoto(file);
          Object.assign(builder, a.template, { photo: a.photo, name: builder.name === 'Мой шаблон' ? 'Шаблон по фото' : builder.name });
          box.innerHTML = '<div class="swatches">' + a.palette.map((c) => '<span style="background:' + c + '" title="' + c + '"></span>').join('') + '</div>' +
            '<ul class="b-notes">' + a.notes.map((n) => '<li>' + U.esc(n) + '</li>').join('') + '</ul>' +
            '<p class="picker-status">Фото обрабатывается прямо в браузере и никуда не отправляется. Всё можно поправить в настройках ниже.</p>';
          setBuilderMode('photo');
          fillBuilderForm();
          drawBuilderPreview();
        } catch (e) {
          box.innerHTML = '<p class="picker-status">Не удалось прочитать фото. Попробуйте другой файл (JPG или PNG).</p>';
        }
      }
      $('#b-file').addEventListener('change', (e) => onPhoto(e.target.files[0]));
      const dz = $('.dropzone');
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('is-over'));
      dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('is-over'); onPhoto(e.dataTransfer.files[0]); });

      /* --- подбор картинок --- */
      async function runPick(q) {
        const grid = $('.picker-grid'), status = $('.picker-status');
        grid.innerHTML = '';
        if (pickTab === 'site') {
          const list = (q ? S.search('printable', S.printables, q) : S.printables).slice(0, 24);
          status.textContent = list.length ? 'Материалы сайта: ' + list.length : 'На сайте ничего не нашлось';
          grid.innerHTML = list.map((p) => {
            const pv = App.art.preview('printable', p);
            return '<button type="button" class="pick" data-url="' + U.esc(pv.src) + '" data-credit="' + U.esc((p.author || '') + ', ' + (p.license ? p.license.code : '')) + '"><img src="' + U.esc(pv.src) + '" alt="' + U.esc(p.title) + '" loading="lazy"></button>';
          }).join('');
          return;
        }
        if (!q) { status.textContent = 'Введите, что найти'; return; }
        if (pickTab === 'ai') {
          if (!App.imageGen.available()) { status.textContent = 'Нейросеть доступна на опубликованном сайте'; return; }
          status.textContent = 'Нейросеть рисует два варианта, обычно 15–60 секунд…';
          const res = await Promise.all([1, 2].map(() => App.imageGen.generate(q, { style: tpl().audience === 'pro' ? 'poster' : 'cartoon', size: 'landscape', onProgress: (m) => { status.textContent = m; } })
            .then(async (r) => Object.assign(r, { url: await App.imageGen.toDataUrl(r.url) })).catch(() => null)));
          const ok = res.filter(Boolean);
          status.textContent = ok.length ? 'Готово. Нажмите на картинку, чтобы поставить её на слайд.' : 'Нейросеть не ответила, попробуйте ещё раз.';
          grid.innerHTML = ok.map((r) => '<button type="button" class="pick" data-url="' + U.esc(r.url) + '" data-credit="' + U.esc(r.credit) + '"><img src="' + U.esc(r.url) + '" alt="' + U.esc(q) + '"></button>').join('');
          return;
        }
        status.textContent = 'Ищем в ARASAAC и Wikimedia Commons…';
        const pics = await App.sources.searchImages(q);
        status.textContent = pics.length ? 'Найдено: ' + pics.length + '. Лицензия и автор подпишутся на слайде.' : 'Ничего не нашлось. Попробуйте другое слово.';
        grid.innerHTML = pics.map((p) => '<button type="button" class="pick" data-url="' + U.esc(p.full) + '" data-credit="' + U.esc(p.credit) + '" title="' + U.esc(p.title + ' — ' + p.credit) + '"><img src="' + U.esc(p.thumb) + '" alt="' + U.esc(p.title) + '" loading="lazy"><span class="pick-src">' + U.esc(p.provider) + '</span></button>').join('');
      }
      const drawPickTabs = () => picker.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === pickTab));

      /* --- помощник --- */
      async function runHelper(kind, free) {
        const out = $('.helper-out');
        const s = d.slides[cur];
        out.innerHTML = '<p class="ai-thinking" role="status">Помощник думает… обычно 20–60 секунд</p>';
        root.querySelectorAll('[data-h], .helper-form button').forEach((b) => { b.disabled = true; });
        try {
          const text = await App.textGen.ask(helperPrompt(kind, d, s, tpl(), free), {
            maxTokens: kind === 'plan' ? 512 : 300,
            validate: kind === 'plan' ? (t) => t.split('\n').filter((l) => l.includes('|')).length >= 3 : null,
            onProgress: (m) => { const p = out.querySelector('.ai-thinking'); if (p) p.textContent = m; }
          });
          const lines = text.split('\n').map(clean).filter(Boolean);
          helperOut = { kind, lines };
          let actions;
          if (kind === 'plan') {
            const plan = lines.filter((l) => l.includes('|')).map((l) => { const [t, b] = l.split('|'); return { title: clean(t), text: (b || '').split(/;\s*/).map(clean).filter(Boolean).join('\n') }; });
            helperOut.plan = plan;
            actions = plan.length
              ? '<label class="check"><input type="checkbox" id="h-pics"' + (online ? ' checked' : ' disabled') + '> Подобрать картинки к каждому слайду</label><button type="button" class="btn btn--primary" data-ha="plan">Создать ' + plan.length + ' ' + U.plural(plan.length, ['слайд', 'слайда', 'слайдов']) + '</button>'
              : '';
          } else {
            actions = '<button type="button" class="btn btn--primary" data-ha="replace">Заменить текст слайда</button><button type="button" class="btn" data-ha="append">Добавить к тексту</button>';
          }
          out.innerHTML = '<div class="helper-answer">' + lines.map((l) => '<p>' + U.esc(l) + '</p>').join('') + '</div><div class="editor-row">' + actions + '</div>';
        } catch (e) {
          out.innerHTML = '<p class="picker-status">' + U.esc(e.message || 'Помощник не ответил') + '</p>';
        } finally {
          root.querySelectorAll('[data-h], .helper-form button').forEach((b) => { b.disabled = false; });
        }
      }

      async function applyPlan(withPics) {
        const plan = helperOut.plan;
        const first = d.slides[0] && d.slides[0].layout === 'title' ? d.slides[0] : blank({ layout: 'title', title: d.title });
        const slides = [first].concat(plan.map((p) => blank({ layout: 'image-text', title: p.title, text: p.text })));
        d.slides = slides;
        cur = 0;
        commit();
        drawAll();
        $('.helper-out').innerHTML = '<p class="picker-status">Слайды созданы' + (withPics ? '. Подбираем картинки…' : '.') + '</p>';
        if (!withPics) return;
        // Если по заголовку слайда ничего нет, берём следующую картинку по теме всей презентации.
        const spare = (await App.sources.searchImages(d.title).catch(() => [])).filter((x) => x.provider !== 'ARASAAC');
        const used = new Set();
        for (let i = 1; i < d.slides.length; i++) {
          const pics = (await App.sources.searchImages(d.slides[i].title).catch(() => [])).filter((x) => !used.has(x.full));
          const p = pics.find((x) => x.provider !== 'ARASAAC') || pics[0] || spare.find((x) => !used.has(x.full));
          if (p) used.add(p.full);
          if (p) { d.slides[i].image = { url: p.full, credit: p.credit }; commit(); drawThumbs(); if (i === cur) drawStage(); }
        }
        $('.helper-out').innerHTML = '<p class="picker-status">Готово. Картинки можно заменить кнопкой «Подобрать картинку».</p>';
      }

      /* --- события --- */
      fTitle.addEventListener('input', () => { d.slides[cur].title = fTitle.value; commit(); drawStage(); drawThumbs(); });
      fText.addEventListener('input', () => { d.slides[cur].text = fText.value; commit(); drawStage(); drawThumbs(); });
      $('#deck-title').addEventListener('input', (e) => { d.title = e.target.value; commit(); });

      $('#quick-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const topic = $('#quick-topic').value.trim();
        if (topic.length < 2) return $('#quick-topic').focus();
        const btn = e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Собираем…';
        d = { title: topic[0].toUpperCase() + topic.slice(1), theme: d.theme, slides: await quickDeck(topic) };
        cur = 0;
        $('#deck-title').value = d.title;
        commit();
        drawAll();
        btn.disabled = false;
        btn.textContent = 'Собрать презентацию';
        U.toast('Черновик готов: ' + d.slides.length + ' ' + U.plural(d.slides.length, ['слайд', 'слайда', 'слайдов']));
      });
      picker.querySelector('.picker-form').addEventListener('submit', (e) => { e.preventDefault(); runPick($('#pick-q').value.trim()); });
      $('.helper-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = $('#h-free').value.trim();
        if (q.length < 3) return $('#h-free').focus();
        runHelper('free', q);
      });

      root.addEventListener('click', async (e) => {
        const th = e.target.closest('.thumb');
        if (th) { cur = +th.dataset.i; return drawAll(); }
        const lay = e.target.closest('[data-layout]');
        if (lay) { d.slides[cur].layout = lay.dataset.layout; commit(); return drawAll(); }
        const tt = e.target.closest('[data-tt]');
        if (tt) { tplTab = tt.dataset.tt; return drawTemplates(); }
        const tdel = e.target.closest('[data-tdel]');
        if (tdel) {
          T.removeCustom(tdel.dataset.tdel);
          if (d.theme === tdel.dataset.tdel) { d.theme = 'kids-ocean'; commit(); drawAll(); }
          return drawTemplates();
        }
        const tp = e.target.closest('[data-tpl]');
        if (tp) { d.theme = tp.dataset.tpl; commit(); drawAll(); drawTemplates(); return U.toast('Шаблон «' + tpl().name + '» применён ко всем слайдам'); }
        const bt = e.target.closest('[data-bt]');
        if (bt) return setBuilderMode(bt.dataset.bt);
        const tab = e.target.closest('.picker [data-tab]');
        if (tab) { pickTab = tab.dataset.tab; drawPickTabs(); return runPick($('#pick-q').value.trim()); }
        const pick = e.target.closest('.pick');
        if (pick) {
          const s = d.slides[cur];
          s.image = { url: pick.dataset.url, credit: pick.dataset.credit };
          if (s.layout === 'text') s.layout = 'image-text';
          commit();
          drawAll();
          return U.toast('Картинка поставлена на слайд ' + (cur + 1));
        }
        const h = e.target.closest('[data-h]');
        if (h) return runHelper(h.dataset.h);
        const ha = e.target.closest('[data-ha]');
        if (ha && helperOut) {
          if (ha.dataset.ha === 'plan') return applyPlan(!!(root.querySelector('#h-pics') || {}).checked);
          const s = d.slides[cur];
          s.text = ha.dataset.ha === 'replace' ? helperOut.lines.join('\n') : [s.text, helperOut.lines.join('\n')].filter(Boolean).join('\n');
          if (s.layout === 'title' || s.layout === 'image') s.layout = s.image ? 'image-text' : 'text';
          commit();
          drawAll();
          return U.toast('Текст слайда обновлён');
        }
        const a = e.target.closest('[data-a]');
        if (!a) return;
        const act = a.dataset.a;
        if (act !== 'reset' && resetArmed) { resetArmed = false; root.querySelector('[data-a=reset]').textContent = 'Новая'; }
        if (act === 'builder') return openBuilder(T.readCustom().length ? 'manual' : 'photo');
        if (act === 'b-close') { bPanel.hidden = true; builder = null; return; }
        if (act === 'b-save') {
          readBuilderForm();
          try {
            T.saveCustom(builder);
          } catch (err) { return U.toast(err.message, 'error'); }
          d.theme = builder.id;
          tplTab = 'my';
          bPanel.hidden = true;
          commit();
          drawAll();
          drawTemplates();
          return U.toast('Шаблон «' + builder.name + '» сохранён и применён');
        }
        if (act === 'add') { d.slides.splice(cur + 1, 0, blank()); cur++; }
        if (act === 'dup') { d.slides.splice(cur + 1, 0, Object.assign(JSON.parse(JSON.stringify(d.slides[cur])), { id: uid() })); cur++; }
        if (act === 'del') {
          if (d.slides.length === 1) return U.toast('В презентации должен остаться хотя бы один слайд');
          d.slides.splice(cur, 1);
          cur = Math.min(cur, d.slides.length - 1);
        }
        if (act === 'up' && cur > 0) { [d.slides[cur - 1], d.slides[cur]] = [d.slides[cur], d.slides[cur - 1]]; cur--; }
        if (act === 'down' && cur < d.slides.length - 1) { [d.slides[cur + 1], d.slides[cur]] = [d.slides[cur], d.slides[cur + 1]]; cur++; }
        if (act === 'noimg') d.slides[cur].image = null;
        if (act === 'pick') {
          picker.hidden = false;
          drawPickTabs();
          const q = $('#pick-q');
          if (!q.value) q.value = /\?/.test(d.slides[cur].title) ? d.title : d.slides[cur].title;
          picker.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return runPick(q.value.trim());
        }
        if (act === 'reset') {
          if (!resetArmed) { resetArmed = true; a.textContent = 'Нажмите ещё раз — всё сотрётся'; return; }
          d = newDeck(d.theme);
          cur = 0;
          resetArmed = false;
          a.textContent = 'Новая';
          $('#deck-title').value = d.title;
        }
        if (act === 'present') return present(d, cur);
        if (act === 'pptx') {
          a.disabled = true;
          a.querySelector('.btn-label').textContent = 'Готовим файл…';
          try {
            const skipped = await exportPptx(d);
            U.toast(skipped ? 'Презентация сохранена. ' + skipped + ' ' + U.plural(skipped, ['картинку', 'картинки', 'картинок']) + ' источник не дал вложить — вставьте вручную.' : 'Презентация сохранена');
          } catch (err) {
            U.toast(err.message || 'Не удалось сохранить презентацию', 'error');
          }
          a.disabled = false;
          a.querySelector('.btn-label').textContent = 'Скачать PowerPoint';
          return;
        }
        commit();
        drawAll();
      });

      drawAll();
      drawTemplates();
    }
  };

  /* ---------- Режим показа ---------- */
  function present(d, start) {
    let i = start;
    const t = T.get(d.theme);
    const box = U.h('<div class="show" role="dialog" aria-modal="true" aria-label="Показ презентации" tabindex="-1"><div class="show-stage"></div>' +
      '<div class="show-bar"><button type="button" class="icon-btn" data-s="-1" aria-label="Назад">' + U.icon('left') + '</button><span class="show-n"></span>' +
      '<button type="button" class="icon-btn" data-s="1" aria-label="Вперёд">' + U.icon('right') + '</button>' +
      '<button type="button" class="icon-btn" data-s="x" aria-label="Закрыть показ">' + U.icon('close') + '</button></div></div>');
    const stage = box.querySelector('.show-stage');
    const draw = () => {
      stage.innerHTML = slideHtml(d.slides[i], t, 'sl--show');
      box.querySelector('.show-n').textContent = (i + 1) + ' / ' + d.slides.length;
    };
    const go = (n) => { i = Math.max(0, Math.min(d.slides.length - 1, i + n)); draw(); };
    const close = () => {
      document.removeEventListener('keydown', key);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      box.remove();
    };
    const key = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      if (e.key === 'Escape') close();
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]');
      if (b) return b.dataset.s === 'x' ? close() : go(+b.dataset.s);
      if (e.target.closest('.show-stage')) go(1);
    });
    document.addEventListener('keydown', key);
    document.body.append(box);
    draw();
    box.focus();
    if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
  }
})();
