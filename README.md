# CV Portfolio

React/Vite-сайт-портфолио, который получает весь контент из `public/cv.jsonc`.

Скопируйте `public/cv.example.jsonc` в `public/cv.jsonc`, затем заполните своими данными. Если файл отсутствует или содержит ошибку, сайт покажет страницу конфигурации вместо сломанного интерфейса.

```bash
npm install
npm run dev
```

## GitHub activity

Плитка активности получает contribution graph через Cloudflare Worker. GitHub-токен хранится только в секрете Worker и не попадает в браузер.

### Развёртывание Worker

1. В `workers/github-activity/wrangler.jsonc` добавьте продакшен-адрес сайта в `ALLOWED_ORIGINS` через запятую. Например: `http://localhost:5173,https://username.github.io`.
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

5. В `public/cv.jsonc`, рядом с `profile.github`, добавьте URL Worker, который вернула команда deploy:

   ```jsonc
   "github": "https://github.com/your-login",
   "githubActivityApiUrl": "https://github-activity-api.<account>.workers.dev"
   ```

Worker кэширует данные на 60 секунд. Если `githubActivityApiUrl` не задан, сайт сохраняет совместимость со старым статическим `public/github-stats.json`.
