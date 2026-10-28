/* Раздел «Тематические планы и разработки». */
(function () {
  'use strict';
  const App = window.App;
  const S = App.store;
  App.pages = App.pages || {};

  // Темы для фильтра — самые частые теги разработок.
  function topics() {
    const count = new Map();
    S.plans.forEach((p) => (p.tags || []).forEach((t) => count.set(t, (count.get(t) || 0) + 1)));
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
      .slice(0, 24)
      .map(([t]) => [t, t[0].toUpperCase() + t.slice(1)])
      .sort((a, b) => a[1].localeCompare(b[1], 'ru'));
  }

  App.pages.plans = App.createFeedPage({
    id: 'plans',
    kind: 'plan',
    eyebrow: 'Конспекты · планы недели · сценарии · проекты',
    title: 'Тематические планы и разработки',
    lead: 'Разработки воспитателей с открытых порталов и демо-конспекты. Фильтруйте по возрасту, образовательной области, теме и сезону. Каждая разработка скачивается готовым документом.',
    placeholder: 'Поиск по теме: снег, хлеб, светофор, мама…',
    items: () => S.plans,
    find: (id) => S.plan(id),
    filters: [
      { key: 'area', ui: 'select', label: 'Образовательная область', allLabel: 'Все области', options: () => Object.entries(S.AREAS), test: (p, v) => (p.areas || []).includes(v) },
      { key: 'topic', ui: 'select', label: 'Тема', allLabel: 'Все темы', options: topics, test: (p, v) => (p.tags || []).includes(v) }
    ]
  });
})();
