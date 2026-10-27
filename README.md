<div align="center">

<h1>check-me</h1>
<hr>

**Bio page and CV in one place: bilingual content, live GitHub stats, one JSONC file**

![React](https://img.shields.io/badge/REACT-18.3-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/VITE-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/CLOUDFLARE-WORKERS-F38020?style=flat-square&logo=cloudflare&logoColor=white)
[![Deploy](https://img.shields.io/github/actions/workflow/status/hhhhhffd/check-me/deploy-pages.yml?style=flat-square&label=PAGES)](https://github.com/hhhhhffd/check-me/actions/workflows/deploy-pages.yml)
[![License](https://img.shields.io/github/license/hhhhhffd/check-me?style=flat-square)](LICENSE)

[Website](https://datanomads.cc) · [Stack](#technical-stack) · [Quick start](#quick-start)

</div>

## What it is

Personal bio and CV site of Fyodor Vinokurov. A single-screen bento layout: profile card, a music player and tiles for the CV sections (projects, awards, GitHub activity). Each tile opens as a modal with a deep-linkable URL (`#projects`, `#projects/ratscan`, `#github`).

All content lives in `public/cv.jsonc` and is available in English and Russian. GitHub statistics come from a small Cloudflare Worker, so the GitHub token never reaches the browser.

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, plain CSS |
| Content | `public/cv.jsonc` parsed and validated by `src/data/loadCvData.js` |
| API | Cloudflare Worker (`workers/github-activity`), GitHub GraphQL API, Cache API (1 h) |
| Storage | Cloudflare KV namespace `PORTFOLIO_VIEWS` (view counter) |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # runs the GitHub snapshot script first, then vite build
```

Edit `public/cv.jsonc` to change the content. Text that differs by language is an object `{ "en": "...", "ru": "..." }`, dates are `"YYYY-MM"`. The PDF version of the CV is `public/Fyodor-Vinokurov-CV.pdf` and must be replaced separately.

<details>
<summary>GitHub activity Worker</summary>

The Worker serves `GET /api/v1/github` (profile, contributions, repositories, languages) and `GET /api/v1/views` (view counter). If it is unreachable, the site falls back to `public/github-snapshot.json`, which `npm run build` or `npm run snapshot` refreshes.

1. In `workers/github-activity/wrangler.jsonc` set `GITHUB_USERNAME` and add the site origin to `ALLOWED_ORIGINS`.
2. Create the KV namespace and put its id into `kv_namespaces`:

   ```bash
   cd workers/github-activity
   npx wrangler login
   npx wrangler kv namespace create PORTFOLIO_VIEWS
   ```

3. Store a fine-grained GitHub token (public data only) as a Worker secret, then deploy:

   ```bash
   npx wrangler secret put GITHUB_TOKEN
   npx wrangler deploy
   ```

4. Point `github-api.<site domain>` at the Worker. For local development set `githubActivityApiUrl` in `public/cv.jsonc`.

> [!WARNING]
> Never commit `GITHUB_TOKEN`; it must exist only as a Worker secret.

</details>

## License

Source code is licensed under [AGPL-3.0](LICENSE). The audio track, photos and personal content in `public/` are not covered by a separate grant.
