/*
 * ИИ-ассистент поиска по сайту.
 * 1) Локальный поиск (всегда): разбирает запрос (тип материала, месяц, сезон, возраст, «ближайшие»),
 *    находит праздники, материалы и разработки, собирает короткий ответ со ссылками.
 * 2) Языковая модель (если подключена): получает только найденные материалы сайта и формулирует ответ.
 *    Ссылки в ответе — только на id из переданного списка, поэтому ассистент не выдумывает материалы.
 */
(function () {
  'use strict';
  const App = window.App;
  const U = App.util;
  const S = App.store;

  const KIND_WORDS = {
    printable: ['раскрас', 'карточ', 'плакат', 'шаблон', 'распечат', 'печатн', 'поделк', 'картинк'],
    plan: ['конспект', 'заняти', 'план', 'разработ', 'сценар', 'проект', 'методич', 'досуг', 'утренник'],
    holiday: ['праздник', 'календар', 'когда', 'отмеча', 'дат', 'памятн']
  };
  const PRINT_TYPE_WORDS = { coloring: 'раскрас', cards: 'карточ', poster: 'плакат', template: 'шаблон' };
  const MONTH_RE = [/^январ/, /^феврал/, /^март/, /^апрел/, /^(май|мая|мае)$/, /^июн/, /^июл/, /^август/, /^сентябр/, /^октябр/, /^ноябр/, /^декабр/];
  const SEASON_RE = { winter: /^зим/, spring: /^весн/, summer: /^(лето|летн|летом|лета)/, autumn: /^осен/ };
  const AGE_RE = { early: /^(ранн|ясел)/, junior: /^младш/, middle: /^средн/, senior: /^старш/, prep: /^подготов/ };
  const UPCOMING_RE = /^(ближайш|скоро|сейчас|следующ|предстоящ|грядущ)/;

  function isKindWord(w) {
    return Object.values(KIND_WORDS).some((list) => list.some((k) => w.startsWith(k)));
  }

  function parse(query) {
    const raw = U.words(query);
    const hints = { kinds: new Set(), printType: null, month: null, season: null, age: null, upcoming: false };
    const content = [];
    raw.forEach((w) => {
      let used = false;
      for (const [kind, list] of Object.entries(KIND_WORDS)) if (list.some((k) => w.startsWith(k))) { hints.kinds.add(kind); used = true; }
      for (const [t, k] of Object.entries(PRINT_TYPE_WORDS)) if (w.startsWith(k)) hints.printType = t;
      MONTH_RE.forEach((re, i) => { if (re.test(w)) { hints.month = i; used = true; } });
      for (const [s, re] of Object.entries(SEASON_RE)) if (re.test(w)) { hints.season = s; used = true; }
      for (const [a, re] of Object.entries(AGE_RE)) if (re.test(w)) { hints.age = a; used = true; }
      if (UPCOMING_RE.test(w)) { hints.upcoming = true; used = true; }
      if (/^\d$/.test(w) && raw.some((x) => /^(лет|год)/.test(x))) {
        const n = +w;
        hints.age = n <= 2 ? 'early' : n === 3 ? 'junior' : n === 4 ? 'middle' : n === 5 ? 'senior' : 'prep';
        used = true;
      }
      if (/^(лет|год|года)$/.test(w) || /^\d+$/.test(w) || /^групп/.test(w)) used = true;
      if (!used && !U.STOP.has(w)) content.push(U.stem(w));
    });
    return { hints, content: content.filter((s) => s.length >= 2 && !isKindWord(s)) };
  }

  function matchesHints(kind, item, hints, now) {
    if (hints.season && kind !== 'holiday' && !S.seasonsOf(item).includes(hints.season)) return false;
    if (hints.age && kind === 'plan' && !(item.ages || []).includes(hints.age)) return false;
    if (hints.printType && kind === 'printable' && item.type !== hints.printType) return false;
    if (hints.month != null) {
      if (kind === 'holiday') return S.nextDate(item, now).getMonth() === hints.month;
      if (!(item.holidays || []).some((id) => { const h = S.holiday(id); return h && S.nextDate(h, now).getMonth() === hints.month; })) return false;
    }
    return true;
  }

  function localSearch(query) {
    const now = U.today();
    const { hints, content } = parse(query);
    const res = new Map();
    const add = (kind, item, score) => {
      const key = kind + ':' + item.id;
      const prev = res.get(key);
      if (!prev || prev.score < score) res.set(key, { kind, item, score });
    };
    const sources = [['holiday', S.holidays], ['printable', S.printables], ['plan', S.plans]];

    if (content.length) {
      sources.forEach(([kind, list]) => list.forEach((item) => {
        const s = S.score(kind, item, content);
        if (s > 0) add(kind, item, s);
      }));
      // Найденный праздник подтягивает свои материалы.
      [...res.values()].filter((r) => r.kind === 'holiday').forEach((r) => {
        const m = S.materialsFor(r.item);
        m.printables.direct.forEach((p) => add('printable', p, r.score * 0.7));
        m.plans.direct.forEach((p) => add('plan', p, r.score * 0.7));
      });
    } else {
      // Запрос без темы: «ближайшие праздники», «раскраски на зиму», «конспекты для старшей группы».
      const byMonth = hints.month != null;
      const near = byMonth ? S.upcoming(now, 366) : S.upcoming(now, hints.upcoming ? App.config.upcomingDays : 45);
      near.forEach((x, i) => add('holiday', x.h, 10 - i * 0.05));
      const season = hints.season;
      const fits = (p) => byMonth || (season ? S.seasonsOf(p).includes(season) : S.isActual(p, now));
      S.printables.forEach((p) => { if (fits(p)) add('printable', p, 5 - Math.min(S.daysToHoliday(p, now), 90) / 30); });
      S.plans.forEach((p) => { if (fits(p)) add('plan', p, 5 - Math.min(S.daysToHoliday(p, now), 90) / 30); });
      if (!hints.upcoming && !hints.month && !hints.kinds.has('holiday') && (hints.kinds.size || hints.season || hints.age)) {
        [...res.keys()].forEach((k) => { if (k.startsWith('holiday:')) res.delete(k); });
      }
    }

    let results = [...res.values()].filter((r) => matchesHints(r.kind, r.item, hints, now));
    const kinds = hints.kinds;
    const onlyHoliday = kinds.size === 1 && kinds.has('holiday');
    if (onlyHoliday && !content.length) {
      results = results.filter((r) => r.kind === 'holiday');
    } else if (kinds.size && !onlyHoliday) {
      // Просили конкретный тип материала: праздники остаются как контекст, если запрос про тему.
      results = results.filter((r) => kinds.has(r.kind) || (r.kind === 'holiday' && content.length));
    }
    results.sort((a, b) => b.score - a.score);
    return { query, hints, content, results, now };
  }

  /* ---------- Ответ ---------- */
  const KIND_FORMS = {
    holiday: ['праздник', 'праздника', 'праздников'],
    printable: ['печатный материал', 'печатных материала', 'печатных материалов'],
    plan: ['разработка', 'разработки', 'разработок']
  };

  function suggestions(query, now) {
    const qs = U.stems(query);
    const tags = S.allTags();
    const close = tags.filter((t) => U.stems(t).some((ts) => qs.some((q) => {
      let i = 0;
      while (i < q.length && i < ts.length && q[i] === ts[i]) i++;
      return i >= 3;
    })));
    const near = S.upcoming(now, 40).slice(0, 4).map((x) => x.h.title);
    return [...new Set([...close, ...near])].slice(0, 6);
  }

  function compose(local) {
    const { results, now, query } = local;
    if (!results.length) {
      return {
        text: 'По запросу «' + query.trim() + '» на сайте пока ничего нет. Попробуйте близкие темы:',
        groups: [],
        suggest: suggestions(query, now),
        empty: true
      };
    }
    const groups = { holiday: [], printable: [], plan: [] };
    results.forEach((r) => groups[r.kind].push(r));
    const parts = [];
    const firstHoliday = groups.holiday[0];
    if (firstHoliday) {
      const d = S.nextDate(firstHoliday.item, now), n = U.dayDiff(now, d);
      parts.push('«' + firstHoliday.item.title + '» — ' + U.formatDay(d) + (n <= 60 ? ', ' + U.inDaysLabel(n) : '') + '.');
    }
    const counts = ['printable', 'plan', 'holiday']
      .filter((k) => groups[k].length && !(k === 'holiday' && groups[k].length === 1 && firstHoliday))
      .map((k) => groups[k].length + ' ' + U.plural(groups[k].length, KIND_FORMS[k]));
    if (counts.length) parts.push('Нашлось: ' + counts.join(', ') + '.');
    else if (firstHoliday) parts.push('Материалов к этому празднику пока нет — посмотрите похожие темы в разделах.');
    return {
      text: parts.join(' '),
      groups: [
        { kind: 'holiday', title: 'Праздники', items: groups.holiday.slice(0, 4) },
        { kind: 'printable', title: 'Печатные материалы', items: groups.printable.slice(0, 6) },
        { kind: 'plan', title: 'Разработки', items: groups.plan.slice(0, 5) }
      ].filter((g) => g.items.length),
      suggest: [],
      empty: false
    };
  }

  /* ---------- Языковая модель ---------- */
  let sampleApi;

  function resolveProvider() {
    const p = App.config.ai.provider;
    if (p === 'local') return Promise.resolve(null);
    if ((p === 'http' || p === 'auto') && App.config.ai.endpoint) return Promise.resolve('http');
    if ((p === 'auto' || p === 'claude-artifact') && window.claude && typeof window.claude.use === 'function') {
      if (!sampleApi) sampleApi = window.claude.use('sample').catch(() => null);
      return sampleApi.then((api) => (api ? 'claude' : null));
    }
    return Promise.resolve(null);
  }

  function contextOf(local) {
    return local.results.slice(0, 14).map((r) => {
      const it = r.item;
      const base = { id: r.kind + ':' + it.id, type: { holiday: 'праздник', printable: S.PRINT_TYPES[it.type] || 'материал', plan: it.kind }[r.kind], title: it.title };
      if (r.kind === 'holiday') base.date = U.formatDay(S.nextDate(it, local.now));
      else base.seasons = S.seasonsOf(it).map((s) => U.SEASONS[s].title).join(', ');
      if (r.kind === 'plan') base.ages = (it.ages || []).map((a) => S.AGES[a]).join('; ');
      base.about = (it.description || '').slice(0, 220);
      return base;
    });
  }

  function buildPrompt(query, context, now) {
    return 'Ты — ассистент сайта «' + App.config.siteName + '» для воспитателей детского сада. Сегодня ' + U.formatDay(now) + ' ' + now.getFullYear() + ' года.\n' +
      'Отвечай ТОЛЬКО по списку материалов сайта ниже. Не придумывай материалов, дат и ссылок, которых нет в списке. ' +
      'Если в списке нет подходящего, так и скажи.\n\n' +
      'Вопрос воспитателя: ' + query + '\n\nМатериалы сайта (JSON):\n' + JSON.stringify(context) + '\n\n' +
      'Ответь одним JSON-объектом без пояснений: {"answer": "1–3 коротких предложения по-русски", "ids": ["id самых подходящих материалов из списка, до 6"]}';
  }

  async function askModel(local, signal) {
    const provider = await resolveProvider();
    if (!provider || !local.results.length) return null;
    const context = contextOf(local);
    const prompt = buildPrompt(local.query, context, local.now);
    let out;
    if (provider === 'claude') {
      const api = await sampleApi;
      out = await api.json(prompt, { modelTier: 'quick', signal });
    } else {
      const res = await fetch(App.config.ai.endpoint, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, App.config.ai.headers),
        body: JSON.stringify({ query: local.query, context, prompt }),
        signal
      });
      if (!res.ok) throw new Error('Ассистент недоступен (код ' + res.status + ')');
      out = await res.json();
    }
    if (!out || typeof out.answer !== 'string') return null;
    const allowed = new Map(local.results.map((r) => [r.kind + ':' + r.item.id, r]));
    const picked = (Array.isArray(out.ids) ? out.ids : []).map(String).filter((id) => allowed.has(id)).map((id) => allowed.get(id));
    return { answer: out.answer.trim(), picked };
  }

  App.assistant = { localSearch, compose, askModel, resolveProvider };
})();
