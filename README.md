# CV Portfolio

React/Vite-сайт-портфолио, который получает весь контент из `public/cv.jsonc`.

Скопируйте `public/cv.example.jsonc` в `public/cv.jsonc`, затем заполните своими данными. Если файл отсутствует или содержит ошибку, сайт покажет страницу конфигурации вместо сломанного интерфейса.

```bash
npm install
npm run dev
```

## GitHub activity

Плитка активности берёт contribution graph из `public/github-stats.json`. Файл обновляет workflow `Update GitHub contribution data` каждую неделю и по ручному запуску. После заполнения `profile.github` запустите workflow один раз через GitHub Actions — токен остаётся внутри Actions и не попадает в клиентский код.
