/*
 * Настройки сайта. Всё, что меняется без правки вёрстки, — здесь.
 */
window.App = window.App || {};

App.config = {
  siteName: "Ocean learnin' stars",
  tagline: 'рабочий стол воспитателя',
  // Основной текст главной страницы (идёт после названия сайта).
  homeLead: 'легкая жизнь для ленивой студенточки, только окончившей пед',

  /*
   * Разделы выдвижного меню. Чтобы добавить раздел:
   *   1) допишите сюда объект { id, title, description, icon };
   *   2) зарегистрируйте страницу App.pages[id] = { title, render(root, params) } в assets/js/pages/;
   *   3) подключите файл страницы в index.html.
   * icon — имя иконки из App.util.icon (calendar, print, book, home, spark …).
   */
  menu: [
    { id: 'today', title: 'Материалы на сегодня', description: 'Готовый план на каждый будний день для трёх возрастов', icon: 'sun' },
    { id: 'calendar', title: 'Календарь праздников', description: 'Международные, всероссийские и тематические даты', icon: 'calendar' },
    { id: 'printables', title: 'Печатные материалы', description: 'Раскраски, карточки, плакаты, шаблоны поделок', icon: 'print' },
    { id: 'plans', title: 'Тематические планы и разработки', description: 'Конспекты, планы недели, сценарии, проекты', icon: 'book' },
    { id: 'books', title: 'Литература для дошкольников', description: 'Что читать детям 1,5–3, 3–5 и 5–7 лет', icon: 'book' },
    { id: 'region', title: 'Региональный компонент', description: 'Природа, промыслы и традиции родного края', icon: 'pin' },
    { id: 'advisor', title: 'ИИ-советник', description: 'Конспекты, планы, сценарии и игры — по вашему запросу', icon: 'chat' },
    { id: 'create', title: 'Создай сам', description: 'Нейросеть рисует картинку по вашему описанию', icon: 'spark' },
    { id: 'slides', title: 'Конструктор презентаций', description: 'Шаблоны, помощник-нейросеть, картинки из интернета', icon: 'slides' }
  ],

  /*
   * Автопополнение печатных материалов из открытых источников (assets/js/core/sources.js, наборы — data/sources.js).
   *   arasaac   — пиктограммы ARASAAC (CC BY-NC-SA), ищутся по-русски: логопедия, речь, окружающий мир;
   *   commons   — Wikimedia Commons (CC и общественное достояние): раскраски, рабочие листы;
   *   openverse — агрегатор открытых изображений (Flickr, музеи и др.); по умолчанию выключен, нужен прокси.
   * cacheHours — сколько часов хранить найденное в браузере, чтобы не обращаться к источникам на каждом заходе.
   */
  sources: {
    enabled: true,
    // openverse не отдаёт CORS-заголовки браузеру — включайте его, только если запросы идут через свой прокси.
    providers: ['arasaac', 'commons'],
    cacheHours: 12,
    timeoutMs: 9000
  },

  /*
   * Нейросеть для «Создай сам» и конструктора презентаций — ТОЧКА ПОДКЛЮЧЕНИЯ.
   *   provider: 'horde'        — AI Horde (https://aihorde.net): бесплатно, модели SDXL, очередь 10–60 секунд.
   *                              hordeKey: '0000000000' — анонимный ключ; личный бесплатный ключ с aihorde.net
   *                              (регистрация за минуту) даёт приоритет в очереди. Ключ не секретный.
   *             'pollinations' — https://pollinations.ai, бесплатно, но в часы нагрузки отдаёт заглушку вместо картинки;
   *             'http'         — свой сервер: POST endpoint { prompt, width, height, seed } → картинка (image/*) или { url }.
   *   Через свой сервер можно подключить недорогие модели (Stability, Replicate, fal.ai и др.) — ключ хранится на сервере.
   */
  /*
   * Текстовый помощник конструктора презентаций — ТОЧКА ПОДКЛЮЧЕНИЯ.
   *   Бесплатно: AI Horde, модель Gemma (hordeModels). Свой сервер: endpoint — POST { prompt } → { text }.
   *   На claude.ai (артефакт) помощник сам использует Claude с разрешения посетителя.
   */
  /*
   * Сервер в Yandex Cloud — ТОЧКА ПОДКЛЮЧЕНИЯ (server/deploy.sh вписывает адрес сам).
   *   base — адрес API Gateway, yandexClientId — ID приложения Яндекс ID (oauth.yandex.ru) для входа.
   */
  api: { base: '', yandexClientId: '' },

  textAI: {
    endpoint: '',
    headers: {},
    hordeKey: '0000000000',
    hordeModels: ['google/gemma-4-31b']
  },

  imageAI: {
    provider: 'horde',
    hordeKey: '0000000000',
    model: 'flux',
    endpoint: '',
    headers: {}
  },

  // Сколько дней вперёд считать праздник «ближайшим» для подбора материалов и для подсветки в календаре.
  upcomingDays: 30,
  highlightDays: 14,

  // Сколько карточек подгружать за раз в ленте.
  feedBatch: 40,

  // Для проверки сезонности можно подставить дату: today: '2027-04-05' (или ?today=2027-04-05 в адресе).
  today: null,

  /*
   * Облачное хранилище материалов — ТОЧКА ПОДКЛЮЧЕНИЯ.
   *   provider: 'auto'  — если у материала есть file и задан cloudBaseUrl, файл берётся из облака, иначе — демо;
   *             'cloud' — только облако; 'demo' — сайт сам генерирует файлы (PNG для печати, DOC для разработок).
   *   cloudBaseUrl — публичный адрес бакета, например
   *     'https://storage.yandexcloud.net/zvezdny-rif/'  или  'https://<project>.supabase.co/storage/v1/object/public/materials/'
   *   Бакет должен отдавать заголовок CORS (Access-Control-Allow-Origin), чтобы файл скачивался одним кликом.
   */
  storage: {
    provider: 'auto',
    cloudBaseUrl: ''
  },

  /*
   * ИИ-ассистент — ТОЧКА ПОДКЛЮЧЕНИЯ.
   * Поиск по сайту всегда работает локально. Языковая модель (если подключена) только формулирует
   * ответ по найденным материалам сайта и не может сослаться на то, чего на сайте нет.
   *   provider: 'auto'  — использовать Claude, если сайт открыт как артефакт claude.ai, иначе endpoint, иначе локально;
   *             'http'  — свой сервер: POST endpoint, тело { query, context, prompt }, ответ { answer, ids };
   *             'local' — без языковой модели.
   *   Ключ API держите на своём сервере (endpoint), а не в этом файле: файл виден всем посетителям.
   */
  ai: {
    provider: 'auto',
    endpoint: '',
    headers: {}
  }
};
