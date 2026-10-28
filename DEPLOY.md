# Публикация Ocean learnin' stars на GitHub Pages

Результат: сайт по адресу `https://ваш-логин.github.io/ocean-learnin-stars/` (https включается автоматически),
который находят в Google и Яндексе по запросу «Ocean learnin' stars». Всё бесплатно.

## 1. Создать репозиторий

1. Зарегистрируйтесь на https://github.com (если аккаунта ещё нет). Логин станет частью адреса.
2. Нажмите **New repository**. Название: `ocean-learnin-stars`. Видимость: **Public**. Создайте репозиторий.

## 2. Подставить адрес сайта

В папке сайта выполните (замените `ваш-логин`):

```
node set-site-url.js https://ваш-логин.github.io/ocean-learnin-stars/
```

Команда пропишет адрес в `index.html` (canonical, Open Graph, разметка Schema.org), `robots.txt` и `sitemap.xml`.
Если Node.js не установлен, замените вручную `https://YOUR-NAME.github.io/ocean-learnin-stars/` в этих трёх файлах.

## 3. Загрузить файлы

**Через браузер (проще всего).** На странице репозитория нажмите **Add file → Upload files** и перетащите
всё содержимое папки сайта: `index.html`, `404.html`, `robots.txt`, `sitemap.xml`, `.nojekyll`, папки `assets` и `data`.
Файлы `artifact.html`, `serve.js`, `build-artifact.js`, `set-site-url.js` и папку `.claude` загружать не нужно.
Нажмите **Commit changes**.

> Файл `.nojekyll` скрытый (начинается с точки). Если проводник его не показывает, создайте на GitHub
> пустой файл с этим именем через **Add file → Create new file**.

**Через git:**

```
git init
git add .
git commit -m "Ocean learnin' stars"
git branch -M main
git remote add origin https://github.com/ваш-логин/ocean-learnin-stars.git
git push -u origin main
```

## 4. Включить GitHub Pages

**Settings → Pages → Build and deployment → Source: Deploy from a branch**, ветка `main`, папка `/ (root)`, **Save**.
Через 1–2 минуты сайт откроется по адресу `https://ваш-логин.github.io/ocean-learnin-stars/`.
Галочка **Enforce HTTPS** там же должна быть включена.

## 5. Чтобы сайт находили по названию

Поисковики находят новый сайт сами, но это может занять недели. Быстрее — сообщить им о сайте:

- **Google:** https://search.google.com/search-console → добавить ресурс «Префикс URL» с адресом сайта →
  подтверждение через HTML-тег: скопируйте значение `content` в строку `google-site-verification` в `index.html`,
  раскомментируйте её, загрузите файл заново, нажмите «Подтвердить». Затем **Файлы Sitemap** → `sitemap.xml`.
- **Яндекс:** https://webmaster.yandex.ru → добавить сайт → подтверждение мета-тегом (`yandex-verification`) →
  **Индексирование → Файлы Sitemap** → адрес `sitemap.xml`.

Обычно сайт появляется в поиске по запросу «Ocean learnin' stars» через несколько дней после подтверждения.
Название уникальное, поэтому конкуренции в выдаче почти не будет.
Ускоряют дело ссылки на сайт с других страниц: сообщества воспитателей, методические объединения, соцсети.

## Свой домен (по желанию)

Можно купить домен, например `ocean-learnin-stars.ru`, и указать его в **Settings → Pages → Custom domain**.
После этого запустите `node set-site-url.js https://ocean-learnin-stars.ru/` и загрузите обновлённые файлы.
