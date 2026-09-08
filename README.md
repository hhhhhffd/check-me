# CV Portfolio

React/Vite-сайт-портфолио, который получает весь контент из `public/cv.jsonc`.

Скопируйте `public/cv.example.jsonc` в `public/cv.jsonc`, затем заполните своими данными. Если файл отсутствует или содержит ошибку, сайт покажет страницу конфигурации вместо сломанного интерфейса.

```bash
npm install
npm run dev
```

## GitHub dashboard

Дашборд получает через Cloudflare Worker профиль, публичные репозитории, сумму stars/forks, языки и активность за последние три месяца. GitHub-токен хранится только в секрете Worker и не попадает в браузер.

### Развёртывание Worker

1. В `workers/github-activity/wrangler.jsonc` укажите свой GitHub-логин в `GITHUB_USERNAME` и добавьте продакшен-адрес сайта в `ALLOWED_ORIGINS` через запятую. Например: `http://localhost:5173,https://username.github.io`.
2. Перейдите в каталог Worker и войдите в Cloudflare:

   ```bash
   cd workers/github-activity
   npx wrangler login
   ```

3. Создайте Fine-grained Personal Access Token в GitHub для публичных данных и добавьте его в Cloudflare. Не сохраняйте токен в репозитории или `cv.jsonc`:

   ```bash
   npx wrangler secret put GITHUB_TOKEN
   ```

4. Разверните Worker:

   ```bash
   npx wrangler deploy
   ```

5. В `public/cv.jsonc`, рядом с `profile.github`, добавьте URL Worker с версионированным endpoint:

   ```jsonc
   "github": "https://github.com/your-login",
   "githubActivityApiUrl": "https://github-activity-api.<account>.workers.dev/api/v1/github"
   ```

Worker кэширует данные на один час и обслуживает только `GITHUB_USERNAME`; endpoint вызывается обычным `GET /api/v1/github`, без query-параметра `username`. Для обратной совместимости корневой URL Worker тоже принимается и автоматически дополняется до `/api/v1/github`.

Если Worker или GitHub временно недоступны, сайт пробует последний статический snapshot из `public/github-stats.json`. Обновить snapshot вручную можно так:

```bash
GITHUB_TOKEN=ваш_токен npm run update:github-stats
```

В статистику репозиториев входят публичные оригинальные репозитории владельца; forks исключены. Проценты языков считаются по размеру файлов в байтах, как отдаёт GitHub.
