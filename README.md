# Fyodor Vinokurov — CV

Сайт-резюме на React + Vite в стиле bio-страниц: [datanomads.cc](https://datanomads.cc). Экран «click to enter» запускает музыку, фиолетовая WebGL-аура на тёмном фоне разгорается в такт её громкости (без WebGL остаётся CSS-градиент). Один экран: bento-сетка из карточки профиля, плеера и плиток-разделов резюме с превью (GitHub, проекты, награды) — каждая плитка «перетекает» в модальное окно с содержимым (View Transitions API; без его поддержки окно просто всплывает). У модалок есть адреса: `#projects`, `#projects/ratscan`, `#github` — ссылку можно отправить напрямую. Два языка (EN по умолчанию, RU переключателем).

Весь контент лежит в `public/cv.jsonc`: профиль, проекты, опыт, награды, стек, образование и языки. Текст, который отличается по языкам, задаётся объектом `{ "en": "...", "ru": "..." }`, даты — строкой `"YYYY-MM"`. Цифры в буллетах проектов и опыта (237, 83K, 1,000+) подсвечиваются автоматически. PDF-версия резюме — `public/Fyodor-Vinokurov-CV.pdf`; при обновлении CV замените и её.

На главной карточке:
- `profile.avatar` — путь к фото (например, `/images/avatar.jpg`); если пусто, показываются инициалы;
- `profile.headline` — строка под именем, `profile.badge` — плашка с главной наградой;
- счётчик просмотров берётся из того же Worker (`/api/v1/views`).

Трек задаётся в блоке `music` (`title`, `artist`, `src`). Текущий — [Meditating Beat из FreePD](https://github.com/0lhi/FreePD/blob/stream/Electronic/Meditating%20Beat.mp3), лицензия [CC0](https://github.com/0lhi/FreePD/blob/stream/LICENSE). Если поставить свой трек, у него должна быть лицензия на публичное использование.

```bash
npm install
npm run dev
```

## GitHub dashboard

Блок GitHub получает через Cloudflare Worker число контрибьютов за год, публичные репозитории, языки и активность за последние три месяца. GitHub-токен хранится только в секрете Worker и не попадает в браузер.

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

5. Настройте DNS `github-api.<домен сайта>` на Worker. Для локальной разработки укажите рабочий адрес API в `public/cv.jsonc`:

   ```jsonc
   "githubUsername": "your-login",
   "githubActivityApiUrl": "https://github-api.datanomads.cc"
   ```

На опубликованном сайте адрес API автоматически строится как `https://github-api.<домен открытой страницы>/api/v1/github` (префикс `www.` отбрасывается). На `localhost` используется адрес из `cv.jsonc`. Worker кэширует данные на один час и обслуживает только `GITHUB_USERNAME`; endpoint вызывается обычным `GET /api/v1/github`, без query-параметра `username`. Добавьте каждый домен сайта в `ALLOWED_ORIGINS` Worker.

Если Worker недоступен, показывается снапшот `public/github-snapshot.json` с пометкой, когда он обновлён. Снапшот обновляется автоматически перед каждой сборкой (`prebuild`) или вручную через `npm run snapshot`; если Worker не ответил, остаётся предыдущий файл.

Worker отдаёт подневный календарь за 12 месяцев. Вся статистика активности в модалке (стрики, активные дни, тепловая карта) считается из этого календаря на клиенте.

В статистику репозиториев входят публичные оригинальные репозитории владельца; forks исключены. Проценты языков считаются по размеру файлов в байтах, как отдаёт GitHub.

### Счётчик просмотров

Тот же Worker обслуживает `GET /api/v1/views`. Первый запрос из браузерной сессии увеличивает ключ `views:total` в KV namespace `PORTFOLIO_VIEWS`; последующие запросы этой сессии только читают текущее значение.

Создайте KV namespace один раз:

```bash
cd workers/github-activity
npx wrangler kv namespace create PORTFOLIO_VIEWS
```

Скопируйте выданный ID в `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "PORTFOLIO_VIEWS", "id": "your-namespace-id" }
]
```

После этого задеплойте Worker:

```bash
npx wrangler deploy
```
