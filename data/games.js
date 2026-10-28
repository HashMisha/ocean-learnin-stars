/*
 * Настройки генератора развивающих листов (assets/js/ui/games.js).
 * Сайт сам рисует из этих правил лабиринты, «Чья тень?», «Что лишнее?», «Найди пару», «Собери в корзинку»,
 * маски для театра, раскраски и карточки-счёт. Все листы — на русском, без лишних надписей, лицензия CC0.
 *   names      — русские названия рисунков (ключи — рисунки из assets/js/ui/art.js)
 *   categories — группы рисунков для игр «Что лишнее?» и «Чья тень?»
 *   seasons    — сезон рисунка (остальные — круглый год)
 */
window.SITE_DATA = window.SITE_DATA || {};
window.SITE_DATA.games = {
  names: {
    rocket: 'Ракета', star: 'Звезда', planet: 'Планета', moon: 'Луна', sun: 'Солнце', globe: 'Земля',
    bird: 'Птичка', birdhouse: 'Скворечник', leaf: 'Листок', tree: 'Дерево', snowflake: 'Снежинка', snowman: 'Снеговик',
    fir: 'Ёлка', flower: 'Цветок', mushroom: 'Гриб', apple: 'Яблоко', pumpkin: 'Тыква', wheat: 'Колосок', heart: 'Сердечко',
    house: 'Домик', cat: 'Котик', bee: 'Пчёлка', butterfly: 'Бабочка', ladybug: 'Божья коровка', fish: 'Рыбка',
    jellyfish: 'Медуза', umbrella: 'Зонтик', drop: 'Капелька', gift: 'Подарок', book: 'Книжка', ball: 'Мячик',
    trafficlight: 'Светофор', note: 'Нотки'
  },
  seasons: {
    snowflake: 'winter', snowman: 'winter', fir: 'winter', gift: 'winter',
    leaf: 'autumn', mushroom: 'autumn', pumpkin: 'autumn', wheat: 'autumn', apple: 'autumn', umbrella: 'autumn',
    flower: 'spring', birdhouse: 'spring', bee: 'spring', drop: 'spring',
    butterfly: 'summer', ladybug: 'summer', fish: 'summer', jellyfish: 'summer', sun: 'summer'
  },
  categories: {
    'животные': ['cat', 'bird', 'fish', 'bee', 'butterfly', 'ladybug', 'jellyfish'],
    'природа и урожай': ['flower', 'tree', 'leaf', 'mushroom', 'apple', 'pumpkin', 'wheat'],
    'космос': ['rocket', 'planet', 'moon', 'star', 'sun', 'globe'],
    'вещи': ['ball', 'umbrella', 'gift', 'book', 'house', 'trafficlight']
  },
  // Лабиринты: кто — куда — задание.
  mazes: [
    { from: 'bee', to: 'flower', task: 'Помоги пчёлке долететь до цветка', season: 'summer' },
    { from: 'cat', to: 'ball', task: 'Помоги котику добраться до мячика', season: 'all' },
    { from: 'rocket', to: 'moon', task: 'Помоги ракете долететь до Луны', season: 'all', holidays: ['cosmonautics-day'] },
    { from: 'bird', to: 'birdhouse', task: 'Помоги птичке долететь до скворечника', season: 'spring', holidays: ['birds-day'] },
    { from: 'ladybug', to: 'leaf', task: 'Помоги божьей коровке доползти до листика', season: 'summer' },
    { from: 'snowman', to: 'fir', task: 'Помоги снеговику дойти до ёлочки', season: 'winter', holidays: ['new-year'] },
    { from: 'fish', to: 'jellyfish', task: 'Помоги рыбке доплыть до медузы', season: 'summer', holidays: ['oceans-day'] },
    { from: 'cat', to: 'house', task: 'Помоги котёнку вернуться домой', season: 'all' }
  ],
  // Что можно положить в корзинку с урожаем — и что нельзя.
  basket: { yes: ['apple', 'pumpkin', 'mushroom', 'wheat'], no: ['ball', 'umbrella', 'book', 'gift', 'star', 'rocket'] },
  // Маски для детского театра.
  masks: ['cat', 'bird', 'bee', 'fish', 'ladybug', 'butterfly', 'jellyfish', 'apple', 'pumpkin', 'mushroom', 'sun', 'flower'],
  // Карточки-счёт от 1 до 6.
  counting: ['flower', 'leaf', 'mushroom', 'fish', 'star', 'snowflake', 'ball', 'bee', 'butterfly', 'ladybug', 'pumpkin', 'heart']
};
