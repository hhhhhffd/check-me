import { useEffect, useMemo, useState } from 'react'
import { getWorkerApiUrl } from '../utils/apiUrl'

const SESSION_KEY = 'portfolio:view-counted'
const VIEWS_API_PATH = '/api/v1/views'

function hasCountedThisSession() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function setCountedThisSession(value) {
  try {
    if (value) window.sessionStorage.setItem(SESSION_KEY, '1')
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage can be disabled; the API response is still useful without deduplication.
  }
}

function formatNumber(value) {
  return value.toLocaleString('ru-RU')
}

export default function ViewCount({ githubActivityApiUrl }) {
  const endpoint = useMemo(
    () => getWorkerApiUrl(githubActivityApiUrl, VIEWS_API_PATH),
    [githubActivityApiUrl],
  )
  const [count, setCount] = useState(null)

  useEffect(() => {
    if (!endpoint) return undefined

    const controller = new AbortController()
    const alreadyCounted = hasCountedThisSession()
    const url = new URL(endpoint)

    if (alreadyCounted) {
      url.searchParams.set('increment', '0')
    } else {
      // Mark before the request so React StrictMode cannot increment twice in development.
      setCountedThisSession(true)
    }

    async function loadViewCount() {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(`Views request failed: ${response.status}`)

        const payload = await response.json()
        const nextCount = Number(payload.views)
        if (!Number.isFinite(nextCount) || nextCount < 0) throw new Error('Invalid views response')

        setCount(Math.floor(nextCount))
      } catch (error) {
        if (error.name !== 'AbortError' && !alreadyCounted) setCountedThisSession(false)
      }
    }

    loadViewCount()
    return () => controller.abort()
  }, [endpoint])

  if (count === null) return null

  return (
    <span className="view-count-badge" aria-label={`Просмотров портфолио: ${formatNumber(count)}`}>
      <span className="view-count-label">~/cv $ cat ./views.log</span>
      <strong className="view-count-value">{formatNumber(count)}</strong>
    </span>
  )
}
