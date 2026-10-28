/*
 * Раздел «ИИ-советник»: чат для воспитателей.
 * Нейросеть — та же, что у помощника презентаций (App.textGen: Claude на claude.ai, свой сервер или бесплатный AI Horde).
 * Правила: только русский язык, дружелюбный профессиональный тон, без медицинских и юридических заключений, без политики.
 * К каждому ответу сайт добавляет ссылки на подходящие материалы из своих лент.
 * История хранится в этом браузере (после подключения сервера — в аккаунте).
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;
  App.pages = App.pages || {};

  const KEY = 'ols.advisor';
  const AGE_GROUPS = {
    junior1: 'первая младшая группа (1,5–3 года)', junior: 'младшая группа (3–4 года)', middle: 'средняя группа (4–5 лет)',
    senior: 'старшая группа (5–6 лет)', prep: 'подготовительная группа (6–7 лет)'
  };
  const QUICK = [
    ['Составить конспект занятия', 'Составь конспект занятия на тему «…» для {g}: цель, задачи по ФГОС ДО, материалы, ход занятия, итог.'],
    ['План на неделю', 'Составь тематический план на неделю по теме «…» для {g}: по дням, с занятиями, играми и работой с родителями.'],
    ['Сценарий праздника', 'Напиши сценарий праздника «…» для {g}: ведущий, стихи, песни, игры, длительность 30 минут.'],
    ['Подобрать игры по теме', 'Подбери 5 игр по теме «…» для {g}: подвижные, дидактические и пальчиковые, с кратким описанием.'],
    ['Цели и задачи по ФГОС ДО', 'Сформулируй цель и задачи (обучающие, развивающие, воспитательные) занятия на тему «…» для {g} с опорой на ФГОС ДО и ФОП ДО.'],
    ['Загадки и стихи', 'Подбери загадки, короткие стихи и физминутку по теме «…» для {g}.']
  ];
  const POLITICS = /(политик|президент|выбор[ыа]? в|партии|партия|оппозиц|митинг|санкци|госдум)/i;
  const SPECIAL = /(диагноз|лекарств|таблетк|температур|болезн|болеет|сыпь|аллерги|заикани|аутизм|сдвг|юрист|суд\b|в суд|прокурат|увольн|трудов\w* договор|штраф|законн\w* ли)/i;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(-40))); } catch (e) { /* без истории */ }
  }

  // Подходящие материалы сайта по тексту запроса.
  function siteLinks(text) {
    const topic = (text.match(/«([^»]{2,60})»/) || [])[1];
    const local = App.assistant.localSearch(topic || text);
    return local.results.filter((r) => r.kind !== 'holiday').slice(0, 5).map((r) => ({ href: S.linkFor(r.kind, r.item), title: r.item.title, kind: r.kind === 'plan' ? r.item.kind : S.PRINT_TYPES[r.item.type] }));
  }

  function prompt(history, msg, group) {
    const rules = 'Ты — ИИ-советник сайта «' + App.config.siteName + '» для воспитателей детского сада. Отвечай ТОЛЬКО на русском языке, ' +
      'дружелюбно и профессионально, опирайся на ФГОС ДО и ФОП ДО. Пиши по делу, структурированно: заголовки и списки, без лишних вступлений. ' +
      'Не давай медицинских и юридических заключений — в таких вопросах советуй обратиться к специалисту (медработнику, психологу, логопеду, администрации). ' +
      'Не обсуждай политику. Возраст детей по умолчанию: ' + AGE_GROUPS[group] + '.';
    const past = history.slice(-6).map((m) => (m.role === 'user' ? 'Воспитатель: ' : 'Советник: ') + m.text.slice(0, 1200)).join('\n\n');
    return rules + '\n\n' + (past ? 'Предыдущий диалог:\n' + past + '\n\n' : '') + 'Новый вопрос воспитателя: ' + msg;
  }

  function mdToHtml(text) {
    // Простое оформление: заголовки, списки, жирный текст.
    return U.esc(text).split('\n').map((l) => {
      const t = l.trim();
      if (!t) return '';
      if (/^#{1,4}\s/.test(t)) return '<h4>' + t.replace(/^#+\s*/, '') + '</h4>';
      if (/^([-*•]|\d+[.)])\s/.test(t)) return '<li>' + t.replace(/^([-*•]|\d+[.)])\s*/, '') + '</li>';
      return '<p>' + t + '</p>';
    }).join('').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(<li>[\s\S]*?<\/li>)(?!<li>)/g, '<ul>$1</ul>').replace(/<\/ul><ul>/g, '');
  }

  function docHtml(m) {
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Ответ ИИ-советника</title><style>body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.45;max-width:720px;margin:24px auto}h4{font-size:14pt;margin:14px 0 6px}</style></head><body>' +
      '<p style="color:#666;font-size:10pt">Вопрос: ' + U.esc(m.question || '') + '</p>' + mdToHtml(m.text) +
      '<p style="color:#666;font-size:10pt">Ocean learnin\' stars · ИИ-советник. Проверьте текст перед использованием.</p></body></html>';
  }

  App.pages.advisor = {
    title: 'ИИ-советник',
    render(root) {
      let history = load();
      let group = 'middle';
      root.innerHTML =
        '<section class="page-head"><p class="eyebrow">Консультации для воспитателей</p><h1>ИИ-советник</h1>' +
        '<p class="lead">Поможет составить конспект, план на неделю или сценарий праздника, подобрать игры, загадки и стихи, сформулировать цели и задачи по ФГОС ДО — и подскажет материалы с сайта.</p></section>' +
        '<section class="panel adv">' +
        '<div class="adv-top"><label class="select"><span class="select-label">Возрастная группа</span><select id="adv-group">' +
        Object.entries(AGE_GROUPS).map(([k, v]) => '<option value="' + k + '"' + (k === group ? ' selected' : '') + '>' + v[0].toUpperCase() + v.slice(1) + '</option>').join('') + '</select></label>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-new>Новый диалог</button></div>' +
        '<div class="chip-row">' + QUICK.map(([l], i) => '<button type="button" class="chip" data-quick="' + i + '">' + l + '</button>').join('') + '</div>' +
        '<div class="adv-log" aria-live="polite"></div>' +
        '<form class="adv-form"><label class="field"><span class="sr-only">Вопрос советнику</span><textarea id="adv-q" rows="3" placeholder="Например: составь конспект занятия «Зимующие птицы» для средней группы"></textarea></label>' +
        '<button type="submit" class="btn btn--primary">' + U.icon('chat') + 'Спросить</button></form>' +
        '<p class="reg-note">Советник — нейросеть, она может ошибаться: проверяйте факты перед занятием. Не вводите персональные данные детей. Бесплатный режим отвечает 20–90 секунд. История диалога хранится только в этом браузере.</p>' +
        '</section>';

      const log = root.querySelector('.adv-log'), input = root.querySelector('#adv-q'), form = root.querySelector('.adv-form');

      function msgHtml(m, i) {
        if (m.role === 'user') return '<div class="msg msg--user"><p>' + U.esc(m.text) + '</p></div>';
        return '<div class="msg msg--bot">' + (m.note ? '<p class="msg-note">' + U.esc(m.note) + '</p>' : '') + '<div class="msg-body">' + mdToHtml(m.text) + '</div>' +
          (m.links && m.links.length ? '<div class="msg-links"><span class="select-label">Материалы с сайта</span><ul>' + m.links.map((l) => '<li><a href="' + U.esc(l.href) + '">' + U.esc(l.title) + '</a> <span>' + U.esc(l.kind || '') + '</span></li>').join('') + '</ul></div>' : '') +
          (m.cut ? '<button type="button" class="linkbtn" data-more="' + i + '">Ответ оборвался — продолжить</button>' : '') +
          '<div class="editor-row msg-actions"><button type="button" class="btn btn--sm" data-copy="' + i + '">' + U.icon('copy') + 'Копировать</button>' +
          '<button type="button" class="btn btn--sm" data-doc="' + i + '">' + U.icon('download') + 'Word</button>' +
          '<button type="button" class="btn btn--sm" data-pdf="' + i + '">' + U.icon('print') + 'PDF / печать</button></div></div>';
      }
      function draw() {
        log.innerHTML = history.length ? history.map(msgHtml).join('') : '<p class="adv-empty">Задайте вопрос или выберите подсказку выше.</p>';
        log.scrollTop = log.scrollHeight;
      }

      async function ask(text, opts) {
        const o = opts || {};
        if (!o.silent) history.push({ role: 'user', text });
        save(history);
        draw();
        const pending = U.h('<div class="msg msg--bot"><p class="ai-thinking" role="status">Советник думает…</p></div>');
        log.append(pending);
        log.scrollTop = log.scrollHeight;
        form.querySelector('button').disabled = true;
        const question = o.question || text;
        let answer;
        if (POLITICS.test(text)) {
          answer = { role: 'bot', question, text: 'Я помогаю с вопросами дошкольного образования и не обсуждаю политические темы. Могу подсказать занятие, игру или сценарий праздника — например, ко Дню России или Дню народного единства.' };
        } else {
          try {
            const reply = await App.textGen.ask(prompt(o.silent ? history : history.slice(0, -1), text, group), {
              maxTokens: 512,
              onProgress: (m) => { const p = pending.querySelector('.ai-thinking'); if (p) p.textContent = m; }
            });
            answer = { role: 'bot', question, text: reply, cut: !/[.!?…)»]\s*$/.test(reply) && reply.length > 600, links: siteLinks(question) };
            if (SPECIAL.test(text)) answer.note = 'Это вопрос для специалиста: обратитесь к медработнику, психологу, логопеду или администрации детского сада. Ниже — только общие педагогические советы.';
          } catch (e) {
            answer = { role: 'bot', question, text: e.message || 'Советник сейчас не отвечает. Попробуйте ещё раз через минуту.' };
          }
        }
        if (o.append != null) {
          const prev = history[o.append];
          prev.text += '\n' + answer.text;
          prev.cut = answer.cut;
        } else history.push(answer);
        save(history);
        form.querySelector('button').disabled = false;
        draw();
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const t = input.value.trim();
        if (t.length < 3) return input.focus();
        input.value = '';
        ask(t);
      });
      root.querySelector('#adv-group').addEventListener('change', (e) => { group = e.target.value; });
      root.addEventListener('click', async (e) => {
        const q = e.target.closest('[data-quick]');
        if (q) {
          input.value = QUICK[+q.dataset.quick][1].replace('{g}', AGE_GROUPS[group]);
          input.focus();
          const pos = input.value.indexOf('«…»');
          if (pos >= 0) input.setSelectionRange(pos + 1, pos + 2);
          return;
        }
        if (e.target.closest('[data-new]')) { history = []; save(history); return draw(); }
        const more = e.target.closest('[data-more]');
        if (more) { const i = +more.dataset.more; return ask('Продолжи предыдущий ответ с того места, где он оборвался.', { silent: true, append: i, question: history[i].question }); }
        const cp = e.target.closest('[data-copy]');
        if (cp) {
          const text = history[+cp.dataset.copy].text;
          try { await navigator.clipboard.writeText(text); U.toast('Ответ скопирован'); } catch (err) { U.toast('Не удалось скопировать — выделите текст вручную', 'error'); }
          return;
        }
        const dc = e.target.closest('[data-doc]');
        if (dc) {
          const m = history[+dc.dataset.doc];
          try { await App.storage.saveFile(new Blob(['﻿', docHtml(m)], { type: 'application/msword' }), 'Ответ-советника-' + U.slug((m.question || '').slice(0, 40)) + (App.storage.inArtifact() ? '.html' : '.doc')); U.toast('Документ сохранён'); } catch (err) { U.toast('Не удалось сохранить', 'error'); }
          return;
        }
        const pd = e.target.closest('[data-pdf]');
        if (pd) {
          const f = document.createElement('iframe');
          f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
          f.srcdoc = docHtml(history[+pd.dataset.pdf]).replace('</style>', '@page{size:A4;margin:16mm}</style>');
          f.onload = () => { try { f.contentWindow.print(); } catch (err) { U.toast('Печать недоступна в этом окне', 'error'); } setTimeout(() => f.remove(), 60000); };
          document.body.append(f);
          U.toast('В окне печати выберите «Сохранить как PDF»');
        }
      });
      draw();
    }
  };
})();
