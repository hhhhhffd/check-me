// Сохраняет ответ GitHub Worker в public/github-snapshot.json.
// Сайт показывает этот снапшот, если Worker недоступен. Запускается перед каждой сборкой (prebuild).
// Если Worker не ответил, остаётся предыдущий снапшот, сборка не падает.
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseJsonc } from '../src/data/loadCvData.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cvPath = resolve(root, 'public/cv.jsonc')
const snapshotPath = resolve(root, 'public/github-snapshot.json')

const cv = parseJsonc(await readFile(cvPath, 'utf8'))
const apiBase = cv.profile?.githubActivityApiUrl

if (!apiBase) {
  console.log('github-snapshot: profile.githubActivityApiUrl не задан, пропускаю.')
} else {
  const url = new URL('/api/v1/github', apiBase)
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const data = await response.json()
    if (!data?.stats || !data?.activity) throw new Error('ответ без stats/activity')
    await writeFile(snapshotPath, JSON.stringify(data) + '\n')
    console.log(`github-snapshot: сохранён ${snapshotPath} (updatedAt ${data.updatedAt}).`)
  } catch (error) {
    console.warn(`github-snapshot: не удалось обновить снапшот из ${url}: ${error.message}. Оставляю предыдущий.`)
  }
}
