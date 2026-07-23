import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { GithubIcon } from './icons'
import { resolveAssetUrl } from '../utils/assetUrl'

const STATIC_STATS_URL = resolveAssetUrl('/github-stats.json')
const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const EMPTY_WEEKS = []

function getUsername(githubUrl) {
  try {
    const pathnameParts = new URL(githubUrl).pathname.split('/').filter(Boolean)
    return pathnameParts.at(-1) || ''
  } catch {
    return ''
  }
}

function getStatsUrl(githubActivityApiUrl, username) {
  if (!githubActivityApiUrl || !username) return STATIC_STATS_URL

  try {
    const url = new URL(githubActivityApiUrl)
    url.searchParams.set('username', username)
    return url.toString()
  } catch {
    return STATIC_STATS_URL
  }
}

function getActivityClass(contributionCount) {
  if (!contributionCount) return 'activity-cell activity-cell-empty'
  if (contributionCount < 3) return 'activity-cell activity-cell-low'
  if (contributionCount < 6) return 'activity-cell activity-cell-medium'
  return 'activity-cell activity-cell-high'
}

function getContributionWord(contributionCount) {
  const lastTwoDigits = contributionCount % 100
  const lastDigit = contributionCount % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'вкладов'
  if (lastDigit === 1) return 'вклад'
  if (lastDigit >= 2 && lastDigit <= 4) return 'вклада'
  return 'вкладов'
}

function getMonthLabels(weeks) {
  let previousMonth = null

  return weeks.flatMap((week, weekIndex) => {
    const firstDay = week.find((day) => day.date)
    if (!firstDay) return []

    const month = Number(firstDay.date.slice(5, 7)) - 1
    if (month === previousMonth) return []

    previousMonth = month
    return [{ label: MONTH_NAMES[month], weekIndex }]
  })
}

function getContributionLabel(day) {
  return `${day.date}: ${day.contributionCount} ${getContributionWord(day.contributionCount)}`
}

function GithubActivity({ githubUrl, githubActivityApiUrl }) {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')
  const username = useMemo(() => getUsername(githubUrl), [githubUrl])
  const statsUrl = useMemo(
    () => getStatsUrl(githubActivityApiUrl, username),
    [githubActivityApiUrl, username],
  )
  const weeks = stats?.weeks || EMPTY_WEEKS
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks])

  useEffect(() => {
    if (!username) return undefined

    const controller = new AbortController()

    async function loadStats() {
      try {
        const response = await fetch(statsUrl, { signal: controller.signal })
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
  }, [statsUrl, username])

  if (!username) return null

  const gridStyle = { '--week-count': weeks.length }

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
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <p className="text-sm text-[#8f88a8]">
              <span className="text-xl font-medium text-[#5eead4]">{stats.totalContributions.toLocaleString('ru-RU')}</span>{' '}
              вкладов за последний год
            </p>
            <div className="activity-legend" aria-label="Интенсивность активности">
              <span>Меньше</span>
              <i className="activity-cell activity-cell-empty" />
              <i className="activity-cell activity-cell-low" />
              <i className="activity-cell activity-cell-medium" />
              <i className="activity-cell activity-cell-high" />
              <span>Больше</span>
            </div>
          </div>
          <div className="activity-chart mt-6">
            <div className="activity-months" style={gridStyle} aria-hidden="true">
              {monthLabels.map(({ label, weekIndex }) => (
                <span key={`${label}-${weekIndex}`} className="activity-month" style={{ gridColumnStart: weekIndex + 1 }}>
                  {label}
                </span>
              ))}
            </div>
            <div className="activity-grid" style={gridStyle} aria-label={`GitHub activity: ${stats.totalContributions} вкладов за последний год`}>
              {weeks.map((week, weekIndex) => (
                <div key={`${weekIndex}-${week[0]?.date || 'empty'}`} className="activity-week">
                  {week.map((day) => (
                    <span
                      key={day.date}
                      title={getContributionLabel(day)}
                      aria-label={getContributionLabel(day)}
                      className={getActivityClass(day.contributionCount)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-[#8f88a8]">
          Активность GitHub временно недоступна.
        </p>
      )}
    </section>
  )
}

export default GithubActivity
