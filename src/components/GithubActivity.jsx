import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { GithubIcon } from './icons'
import { resolveAssetUrl } from '../utils/assetUrl'

const STATS_URL = resolveAssetUrl('/github-stats.json')

function getUsername(githubUrl) {
  try {
    const pathnameParts = new URL(githubUrl).pathname.split('/').filter(Boolean)
    return pathnameParts.at(-1) || ''
  } catch {
    return ''
  }
}

function getActivityClass(contributionCount) {
  if (!contributionCount) return 'activity-cell activity-cell-empty'
  if (contributionCount < 3) return 'activity-cell activity-cell-low'
  if (contributionCount < 6) return 'activity-cell activity-cell-medium'
  return 'activity-cell activity-cell-high'
}

function GithubActivity({ githubUrl }) {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')
  const username = useMemo(() => getUsername(githubUrl), [githubUrl])

  useEffect(() => {
    if (!username) return undefined

    const controller = new AbortController()

    async function loadStats() {
      try {
        const response = await fetch(STATS_URL, { signal: controller.signal })
        if (!response.ok) throw new Error(`GitHub activity request failed: ${response.status}`)

        const data = await response.json()
        if (data.username?.toLowerCase() !== username.toLowerCase()) {
          throw new Error('GitHub activity data is for another account')
        }

        setStats(data)
        setStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('unavailable')
      }
    }

    loadStats()
    return () => controller.abort()
  }, [username])

  if (!username) return null

  const weeks = stats?.weeks || []

  return (
    <section className="terminal-card terminal-github-card lg:col-span-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="terminal-prompt">~/cv $ git log --contributions</p>
        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="terminal-inline-link">
          <GithubIcon className="h-4 w-4" />
          github.com/{username}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {status === 'ready' ? (
        <>
          <p className="mt-2 text-sm text-[#8f88a8]">
            <span className="text-[#5eead4]">{stats.totalContributions.toLocaleString('ru-RU')}</span> contributions за последний год
          </p>
          <div className="activity-grid mt-6" aria-label={`GitHub activity: ${stats.totalContributions} contributions за последний год`}>
            {weeks.map((week, weekIndex) => (
              <div key={`${weekIndex}-${week[0]?.date || 'empty'}`} className="activity-week">
                {week.map((day) => (
                  <span
                    key={day.date}
                    title={`${day.date}: ${day.contributionCount} contributions`}
                    className={getActivityClass(day.contributionCount)}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-[#8f88a8]">
          Активность появится после первого обновления GitHub Actions.
        </p>
      )}
    </section>
  )
}

export default GithubActivity
