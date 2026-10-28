/* Раздел «Печатные материалы»: свои материалы + автоматически найденные в открытых источниках. */
(function () {
  'use strict';
  const App = window.App;
  const S = App.store;
  App.pages = App.pages || {};

  App.pages.printables = App.createFeedPage({
    id: 'printables',
    kind: 'printable',
    online: true,
    eyebrow: 'Логопедия · математика · развитие речи · окружающий мир · творчество',
    title: 'Печатные материалы',
    lead: 'Раскраски, карточки, плакаты и рабочие листы. Раздел сам пополняется из открытых источников — ARASAAC, Wikimedia Commons, Openverse; берутся только материалы с открытыми лицензиями, у каждого указаны автор и первоисточник. Сначала показано то, что пригодится в ближайшие недели.',
    placeholder: 'Поиск по теме: звук Р, счёт, овощи, птицы, космос…',
    items: () => S.printables,
    find: (id) => S.printable(id),
    filters: [
      {
        key: 'subject', ui: 'chips', label: 'Направление', allLabel: 'Все',
        options: () => Object.entries(S.SUBJECTS),
        test: (item, v) => (item.subjects || []).includes(v)
      },
      {
        key: 'type', ui: 'chips', label: 'Вид', allLabel: 'Все виды',
        options: () => Object.entries(S.PRINT_TYPES).filter(([k]) => S.printables.some((p) => p.type === k)),
        test: (item, v) => item.type === v
      },
      {
        key: 'origin', ui: 'chips', label: 'Откуда', allLabel: 'Все',
        options: () => [['site', 'Материалы сайта'], ['auto', 'Из открытых источников']],
        test: (item, v) => (v === 'auto' ? !!item.auto : !item.auto)
      }
    ]
  });
})();
