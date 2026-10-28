/*
 * Наборы, которые сайт сам собирает из открытых источников при каждом заходе (с кэшем).
 * Чтобы добавить набор — допишите объект. Новые картинки в источниках появятся на сайте автоматически.
 *
 *   provider: 'arasaac'   — карточки из пиктограмм ARASAAC по списку русских слов (words).
 *                           Лицензия CC BY-NC-SA 4.0: свободно для некоммерческого использования с указанием авторства.
 *   provider: 'commons'   — поиск Wikimedia Commons (query в синтаксисе поиска Commons), берутся только файлы с открытой лицензией.
 *   provider: 'openverse' — поиск Openverse (агрегатор Flickr, музеев и др.), только CC и общественное достояние.
 *   groups   — g1 (1–3 года), g2 (3–5 лет), g3 (5–7 лет)
 *   subjects — logo | speech | math | world | art; type — тип материала в ленте.
 */
window.SITE_DATA = window.SITE_DATA || {};
window.SITE_DATA.autoSources = [
  { id: 'sound-r', groups: ['g2','g3'], provider: 'arasaac', subjects: ['logo'], title: 'Звук Р в начале слова', words: ['рыба', 'рак', 'ракета', 'рука', 'роза', 'радуга'], tags: ['звук р', 'звуки', 'автоматизация звуков', 'логопедия'] },
  { id: 'sound-l', groups: ['g2','g3'], provider: 'arasaac', subjects: ['logo'], title: 'Звук Л в начале слова', words: ['лиса', 'лук', 'лодка', 'луна', 'лампа', 'лошадь'], tags: ['звук л', 'звуки', 'автоматизация звуков', 'логопедия'] },
  { id: 'sound-sh', groups: ['g2','g3'], provider: 'arasaac', subjects: ['logo'], title: 'Звук Ш в начале слова', words: ['шапка', 'шар', 'шуба', 'шкаф', 'шоколад', 'шишка'], tags: ['звук ш', 'звуки', 'шипящие', 'логопедия'] },
  { id: 'sound-s', groups: ['g2','g3'], provider: 'arasaac', subjects: ['logo'], title: 'Звук С в начале слова', words: ['собака', 'сок', 'сумка', 'самолёт', 'слон', 'сыр'], tags: ['звук с', 'звуки', 'свистящие', 'логопедия'] },
  { id: 'sound-zh', groups: ['g2','g3'], provider: 'arasaac', subjects: ['logo'], title: 'Звук Ж в начале слова', words: ['жук', 'жираф', 'жёлудь', 'жаба', 'журнал', 'желе'], tags: ['звук ж', 'звуки', 'шипящие', 'логопедия'] },
  { id: 'verbs', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['speech', 'logo'], title: 'Что делает? Глаголы действия', words: ['бежать', 'прыгать', 'есть', 'спать', 'рисовать', 'читать'], tags: ['глаголы', 'действия', 'развитие речи', 'словарь'] },
  { id: 'emotions', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['speech'], title: 'Эмоции', words: ['радость', 'грусть', 'злость', 'страх', 'удивление', 'спокойствие'], tags: ['эмоции', 'чувства', 'развитие речи', 'социализация'] },
  { id: 'vegetables', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['world', 'speech'], title: 'Овощи', words: ['морковь', 'картофель', 'капуста', 'огурец', 'помидор', 'лук'], tags: ['овощи', 'урожай', 'окружающий мир'], seasons: ['autumn', 'summer'] },
  { id: 'fruits', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['world', 'speech'], title: 'Фрукты', words: ['яблоко', 'груша', 'банан', 'апельсин', 'виноград', 'лимон'], tags: ['фрукты', 'урожай', 'окружающий мир'] },
  { id: 'pets', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['world', 'speech'], title: 'Домашние животные', words: ['кошка', 'собака', 'корова', 'лошадь', 'свинья', 'коза'], tags: ['домашние животные', 'животные', 'окружающий мир'] },
  { id: 'wild', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['world', 'speech'], title: 'Дикие животные', words: ['медведь', 'волк', 'лиса', 'заяц', 'ёж', 'белка'], tags: ['дикие животные', 'животные', 'лес', 'окружающий мир'] },
  { id: 'transport', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['world', 'speech'], title: 'Транспорт', words: ['машина', 'автобус', 'поезд', 'самолёт', 'корабль', 'велосипед'], tags: ['транспорт', 'пдд', 'окружающий мир'] },
  { id: 'clothes', groups: ['g1','g2','g3'], provider: 'arasaac', subjects: ['world', 'speech'], title: 'Одежда', words: ['куртка', 'шапка', 'брюки', 'платье', 'ботинки', 'варежки'], tags: ['одежда', 'окружающий мир', 'словарь'] },
  { id: 'jobs', groups: ['g2','g3'], provider: 'arasaac', subjects: ['world', 'speech'], title: 'Профессии', words: ['врач', 'повар', 'пожарный', 'полицейский', 'учитель', 'строитель'], tags: ['профессии', 'окружающий мир', 'труд'] },
  { id: 'compare', groups: ['g1','g2'], provider: 'arasaac', subjects: ['math', 'speech'], title: 'Сравнение: большой — маленький', words: ['большой', 'маленький', 'длинный', 'короткий', 'высокий', 'низкий'], tags: ['сравнение', 'величина', 'математика', 'фэмп'] },
  { id: 'balyakal', groups: ['g3'], provider: 'commons', subjects: ['math'], type: 'worksheet', query: 'Balyakal filetype:bitmap', limit: 16, tags: ['рабочий лист', 'счёт', 'математика', 'логика'] },
  { id: 'coloring', groups: ['g1','g2','g3'], provider: 'commons', subjects: ['art'], type: 'coloring', query: 'incategory:Coloring_pages filetype:bitmap', limit: 14, tags: ['раскраска'] },
  { id: 'nasa-coloring', groups: ['g2','g3'], provider: 'commons', subjects: ['art', 'world'], type: 'coloring', query: 'incategory:"Coloring pages of NASA" filetype:bitmap', limit: 8, tags: ['космос', 'раскраска'], holidays: ['cosmonautics-day'] },
  { id: 'ov-coloring', groups: ['g1','g2','g3'], provider: 'openverse', subjects: ['art'], type: 'coloring', query: 'coloring page for kids', limit: 12, tags: ['раскраска'] },
  { id: 'ov-worksheet', groups: ['g2','g3'], provider: 'openverse', subjects: ['math'], type: 'worksheet', query: 'preschool math worksheet', limit: 8, tags: ['рабочий лист', 'математика'] }
];
