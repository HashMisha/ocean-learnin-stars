/*
 * Литература для дошкольников.
 *   group — g1 (1,5–3 года, первая младшая), g2 (3–5 лет, средняя), g3 (5–7 лет, старшая)
 *   genre — folk (фольклор), tale (сказка), poem (стихи), story (рассказ), fable (басня)
 *   pd    — true, если произведение в общественном достоянии: текст можно искать в Викитеке и свободно распечатывать.
 *           Остальные книги охраняются авторским правом — читайте по бумажным и библиотечным изданиям.
 */
window.SITE_DATA = window.SITE_DATA || {};
window.SITE_DATA.books = [
  { id: 'b-ladushki', group: 'g1', genre: 'folk', author: 'Русский фольклор', title: 'Потешки «Ладушки», «Сорока-белобока», «Идёт коза рогатая»', about: 'Игровые потешки с движениями пальчиков и рук.', tags: ['потешки', 'пальчиковые игры'], pd: true },
  { id: 'b-ryaba', group: 'g1', genre: 'folk', author: 'Русская народная сказка', title: 'Курочка Ряба', about: 'Короткая сказка с повторами — первое знакомство с сюжетом.', tags: ['сказки', 'животные'], pd: true },
  { id: 'b-repka', group: 'g1', genre: 'folk', author: 'Русская народная сказка', title: 'Репка', about: 'Цепочка героев и счёт: кто за кем тянет репку.', tags: ['сказки', 'счёт'], pd: true },
  { id: 'b-kolobok', group: 'g1', genre: 'folk', author: 'Русская народная сказка', title: 'Колобок', about: 'Песенка Колобка и встречи с лесными зверями.', tags: ['сказки', 'животные', 'лес'], pd: true },
  { id: 'b-teremok', group: 'g1', genre: 'folk', author: 'Русская народная сказка', title: 'Теремок', about: 'Звери поселяются в теремке — подходит для театрализации.', tags: ['сказки', 'животные', 'театр'], pd: true },
  { id: 'b-tri-medvedya', group: 'g1', genre: 'tale', author: 'Л. Н. Толстой', title: 'Три медведя', about: 'Большой, средний и маленький: сравнение по величине.', tags: ['сказки', 'величина'], pd: true },
  { id: 'b-petushok', group: 'g1', genre: 'story', author: 'К. Д. Ушинский', title: 'Петушок с семьёй', about: 'Маленький рассказ о домашней птице и заботе.', tags: ['домашние животные', 'семья'], pd: true },
  { id: 'b-kotik-kozlik', group: 'g1', genre: 'poem', author: 'В. А. Жуковский', title: 'Котик и козлик', about: 'Короткое стихотворение о домашних животных.', tags: ['стихи', 'домашние животные'], pd: true },
  { id: 'b-pleshcheev', group: 'g1', genre: 'poem', author: 'А. Н. Плещеев', title: 'Сельская песенка («Травка зеленеет…»)', about: 'Весенние стихи для заучивания.', tags: ['весна', 'стихи', 'птицы'], pd: true },
  { id: 'b-igrushki', group: 'g1', genre: 'poem', author: 'А. Л. Барто', title: 'Игрушки', about: 'Цикл коротких стихов: «Мишка», «Мячик», «Бычок».', tags: ['стихи', 'игрушки'], pd: false },
  { id: 'b-detki-kletke', group: 'g1', genre: 'poem', author: 'С. Я. Маршак', title: 'Детки в клетке', about: 'Стихи о животных зоопарка.', tags: ['стихи', 'животные'], pd: false },
  { id: 'b-glupyi-myshonok', group: 'g1', genre: 'tale', author: 'С. Я. Маршак', title: 'Сказка о глупом мышонке', about: 'Колыбельная сказка с повторяющимися куплетами.', tags: ['сказки', 'животные'], pd: false },
  { id: 'b-tsyplenok', group: 'g1', genre: 'story', author: 'К. И. Чуковский', title: 'Цыплёнок', about: 'Короткая история о хвастливом цыплёнке.', tags: ['домашние животные'], pd: false },
  { id: 'b-pod-gribom', group: 'g1', genre: 'tale', author: 'В. Г. Сутеев', title: 'Под грибом', about: 'Как под маленьким грибом поместились все звери.', tags: ['сказки', 'дождь', 'дружба'], pd: false },
  { id: 'b-kurochka-charushin', group: 'g1', genre: 'story', author: 'Е. И. Чарушин', title: 'Курочка', about: 'Рассказ о курочке и цыплятах с иллюстрациями автора.', tags: ['домашние животные'], pd: false },

  { id: 'b-rybak', group: 'g2', genre: 'tale', author: 'А. С. Пушкин', title: 'Сказка о рыбаке и рыбке', about: 'Стихотворная сказка о жадности и скромности.', tags: ['сказки', 'море', 'пушкин'], pd: true },
  { id: 'b-zayushkina', group: 'g2', genre: 'folk', author: 'Русская народная сказка', title: 'Заюшкина избушка', about: 'Лубяная и ледяная избушки, смелый петух.', tags: ['сказки', 'весна', 'животные'], pd: true },
  { id: 'b-masha', group: 'g2', genre: 'folk', author: 'Русская народная сказка', title: 'Маша и медведь', about: 'Как находчивая Маша вернулась домой.', tags: ['сказки', 'лес'], pd: true },
  { id: 'b-gusi', group: 'g2', genre: 'folk', author: 'Русская народная сказка', title: 'Гуси-лебеди', about: 'Сказка о сестре, которая спасла братца.', tags: ['сказки', 'птицы', 'семья'], pd: true },
  { id: 'b-hrabryi-zayac', group: 'g2', genre: 'tale', author: 'Д. Н. Мамин-Сибиряк', title: 'Сказка про храброго Зайца — длинные уши, косые глаза, короткий хвост', about: 'Из «Алёнушкиных сказок»: о хвастовстве и смелости.', tags: ['сказки', 'животные', 'лес'], pd: true },
  { id: 'b-vaska', group: 'g2', genre: 'story', author: 'К. Д. Ушинский', title: 'Васька', about: 'Описание кота — образец для описательного рассказа.', tags: ['домашние животные', 'кошки'], pd: true },
  { id: 'b-slon-tigr', group: 'g2', genre: 'story', author: 'Б. С. Житков', title: 'Как слон спас хозяина от тигра', about: 'Рассказ о дружбе человека и слона.', tags: ['животные', 'дружба'], pd: true },
  { id: 'b-moidodyr', group: 'g2', genre: 'poem', author: 'К. И. Чуковский', title: 'Мойдодыр', about: 'Стихотворная сказка о чистоте и умывании.', tags: ['гигиена', 'здоровье'], pd: false },
  { id: 'b-muha', group: 'g2', genre: 'poem', author: 'К. И. Чуковский', title: 'Муха-Цокотуха', about: 'Праздник Мухи и смелый Комарик.', tags: ['насекомые', 'праздник'], pd: false },
  { id: 'b-aibolit', group: 'g2', genre: 'poem', author: 'К. И. Чуковский', title: 'Айболит', about: 'Добрый доктор спешит в Африку лечить зверей.', tags: ['профессии', 'здоровье', 'животные'], pd: false },
  { id: 'b-usatyi', group: 'g2', genre: 'poem', author: 'С. Я. Маршак', title: 'Усатый-полосатый', about: 'Девочка учит котёнка говорить.', tags: ['кошки', 'развитие речи'], pd: false },
  { id: 'b-dyadya-styopa', group: 'g2', genre: 'poem', author: 'С. В. Михалков', title: 'Дядя Стёпа', about: 'Добрый великан-милиционер помогает людям.', tags: ['профессии', 'город'], pd: false },
  { id: 'b-myau', group: 'g2', genre: 'tale', author: 'В. Г. Сутеев', title: 'Кто сказал «мяу»?', about: 'Щенок ищет, кто сказал «мяу», — звукоподражания.', tags: ['домашние животные', 'звуки'], pd: false },
  { id: 'b-zhivaya-shlyapa', group: 'g2', genre: 'story', author: 'Н. Н. Носов', title: 'Живая шляпа', about: 'Смешная история о шляпе, которая ползала по комнате.', tags: ['юмор', 'кошки'], pd: false },
  { id: 'b-pervaya-ohota', group: 'g2', genre: 'story', author: 'В. В. Бианки', title: 'Первая охота', about: 'Щенок учится у лесных жителей прятаться.', tags: ['животные', 'лес', 'насекомые'], pd: false },

  { id: 'b-saltan', group: 'g3', genre: 'tale', author: 'А. С. Пушкин', title: 'Сказка о царе Салтане', about: 'Волшебная белка, тридцать три богатыря и Царевна Лебедь.', tags: ['сказки', 'море', 'пушкин'], pd: true },
  { id: 'b-konyok', group: 'g3', genre: 'tale', author: 'П. П. Ершов', title: 'Конёк-Горбунок', about: 'Стихотворная сказка об Иване и верном коньке.', tags: ['сказки'], pd: true },
  { id: 'b-alenkiy', group: 'g3', genre: 'tale', author: 'С. Т. Аксаков', title: 'Аленький цветочек', about: 'Сказка о доброте и верности слову.', tags: ['сказки', 'цветы'], pd: true },
  { id: 'b-lyagushka', group: 'g3', genre: 'tale', author: 'В. М. Гаршин', title: 'Лягушка-путешественница', about: 'Лягушка летит на юг с утками — и хвастается.', tags: ['птицы', 'перелётные птицы', 'осень'], pd: true },
  { id: 'b-gorodok', group: 'g3', genre: 'tale', author: 'В. Ф. Одоевский', title: 'Городок в табакерке', about: 'Как устроена музыкальная шкатулка — сказка-познание.', tags: ['музыка', 'техника'], pd: true },
  { id: 'b-seraya-sheika', group: 'g3', genre: 'tale', author: 'Д. Н. Мамин-Сибиряк', title: 'Серая Шейка', about: 'Уточка с перебитым крылом остаётся зимовать.', tags: ['птицы', 'зима', 'осень'], pd: true },
  { id: 'b-chetyre-zhelaniya', group: 'g3', genre: 'story', author: 'К. Д. Ушинский', title: 'Четыре желания', about: 'Митя выбирает любимое время года.', tags: ['времена года'], pd: true },
  { id: 'b-kostochka', group: 'g3', genre: 'story', author: 'Л. Н. Толстой', title: 'Косточка', about: 'Короткий рассказ о честности.', tags: ['честность', 'семья'], pd: true },
  { id: 'b-kashtanka', group: 'g3', genre: 'story', author: 'А. П. Чехов', title: 'Каштанка', about: 'История собаки, которая потерялась и попала в цирк.', tags: ['домашние животные', 'собаки'], pd: true },
  { id: 'b-chto-ya-videl', group: 'g3', genre: 'story', author: 'Б. С. Житков', title: 'Что я видел', about: 'Энциклопедия для почемучек: город, транспорт, путешествия.', tags: ['город', 'транспорт'], pd: true },
  { id: 'b-strekoza', group: 'g3', genre: 'fable', author: 'И. А. Крылов', title: 'Стрекоза и Муравей', about: 'Басня о труде и беспечности.', tags: ['басни', 'насекомые', 'труд'], pd: true },
  { id: 'b-tsarevna', group: 'g3', genre: 'folk', author: 'Русская народная сказка', title: 'Царевна-лягушка', about: 'Волшебная сказка об Иване-царевиче и Василисе Премудрой.', tags: ['сказки'], pd: true },
  { id: 'b-utenok', group: 'g3', genre: 'tale', author: 'Х. К. Андерсен', title: 'Гадкий утёнок', about: 'О том, как непохожий на других утёнок стал лебедем.', tags: ['птицы', 'доброта'], pd: true },
  { id: 'b-tsvetik', group: 'g3', genre: 'tale', author: 'В. П. Катаев', title: 'Цветик-семицветик', about: 'Женя тратит лепестки и находит главное желание.', tags: ['доброта', 'цветы'], pd: false },
  { id: 'b-denis', group: 'g3', genre: 'story', author: 'В. Ю. Драгунский', title: 'Денискины рассказы', about: 'Смешные и добрые истории о мальчике Дениске.', tags: ['юмор', 'дружба'], pd: false },
  { id: 'b-misha-kasha', group: 'g3', genre: 'story', author: 'Н. Н. Носов', title: 'Мишкина каша', about: 'Как два друга варили кашу без взрослых.', tags: ['юмор', 'дружба'], pd: false },
  { id: 'b-teplyi-hleb', group: 'g3', genre: 'tale', author: 'К. Г. Паустовский', title: 'Тёплый хлеб', about: 'Сказка о бережном отношении к хлебу и животным.', tags: ['хлеб', 'зима', 'доброта'], pd: false },
  { id: 'b-lisichkin', group: 'g3', genre: 'story', author: 'М. М. Пришвин', title: 'Лисичкин хлеб', about: 'Рассказ о лесе и хлебе, который «прислала лисичка».', tags: ['лес', 'хлеб', 'природа'], pd: false },
  { id: 'b-lesnaya-gazeta', group: 'g3', genre: 'story', author: 'В. В. Бианки', title: 'Лесная газета (отрывки)', about: 'Новости леса по месяцам — для календаря природы.', tags: ['природа', 'времена года', 'птицы'], pd: false }
];
