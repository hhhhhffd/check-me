import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { GithubIcon } from './icons'
import ViewCount from './ViewCount'
import { resolveAssetUrl } from '../utils/assetUrl'

const STATIC_STATS_URL = resolveAssetUrl('/github-stats.json')
const GITHUB_API_PATH = '/api/v1/github'
const MONTH_NAMES = [
  'ЯНВАРЬ',
  'ФЕВРАЛЬ',
  'МАРТ',
  'АПРЕЛЬ',
  'МАЙ',
  'ИЮНЬ',
  'ИЮЛЬ',
  'АВГУСТ',
  'СЕНТЯБРЬ',
  'ОКТЯБРЬ',
  'НОЯБРЬ',
  'ДЕКАБРЬ',
]
const WEEKDAY_NAMES = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']
const WEEKDAY_TOOLTIP_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const LANGUAGE_COLORS = ['#5eead4', '#a78bfa', '#f0abfc', '#7dd3fc', '#fbbf24']

function getUsername(githubUrl) {
  try {
    const pathnameParts = new URL(githubUrl).pathname.split('/').filter(Boolean)
    return pathnameParts.at(-1) || ''
  } catch {
    return ''
  }
}

function getStatsUrl(githubActivityApiUrl) {
  if (!githubActivityApiUrl) return STATIC_STATS_URL

  try {
    const url = new URL(githubActivityApiUrl)
    if (url.pathname === '/' || !url.pathname) url.pathname = GITHUB_API_PATH
    return url.toString()
  } catch {
    return STATIC_STATS_URL
  }
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function getMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function normalizeMonths(months) {
  if (!Array.isArray(months)) return []

  return months
    .map((month) => ({
      year: toNullableNumber(month?.year),
      month: toNullableNumber(month?.month),
      days: Array.isArray(month?.days)
        ? month.days
          .map((day) => ({
            date: typeof day?.date === 'string' ? day.date : '',
            count: toNullableNumber(day?.count) ?? toNullableNumber(day?.contributionCount) ?? 0,
          }))
          .filter((day) => day.date)
          .sort((first, second) => first.date.localeCompare(second.date))
        : [],
    }))
    .filter((month) => month.year && month.month >= 1 && month.month <= 12)
    .sort((first, second) => {
      if (first.year !== second.year) return first.year - second.year
      return first.month - second.month
    })
}

function buildMonthsFromWeeks(weeks) {
  const days = (Array.isArray(weeks) ? weeks : [])
    .flatMap((week) => Array.isArray(week) ? week : [])
    .filter((day) => day?.date)
    .sort((first, second) => first.date.localeCompare(second.date))
  const latestDate = days.at(-1)?.date || toDateOnly(new Date())
  const latest = new Date(`${latestDate}T00:00:00Z`)
  const from = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - 2, 1))
  const fromDate = toDateOnly(from)
  const months = []

  for (let index = 0; index < 3; index += 1) {
    const monthDate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1))
    months.push({
      year: monthDate.getUTCFullYear(),
      month: monthDate.getUTCMonth() + 1,
      days: [],
    })
  }

  const monthsByKey = new Map(months.map((month) => [getMonthKey(month.year, month.month), month]))
  for (const day of days) {
    if (day.date < fromDate || day.date > latestDate) continue
    const date = new Date(`${day.date}T00:00:00Z`)
    const month = monthsByKey.get(getMonthKey(date.getUTCFullYear(), date.getUTCMonth() + 1))
    if (month) {
      month.days.push({ date: day.date, count: Number(day.contributionCount) || 0 })
    }
  }

  return months
}

function normalizeStats(data, username, source) {
  const dataUsername = data?.profile?.username || data?.username
  if (!dataUsername || dataUsername.toLowerCase() !== username.toLowerCase()) {
    throw new Error('GitHub activity data is for another account')
  }

  const isCurrentFormat = data.profile && data.stats && data.activity
  const activityMonths = isCurrentFormat
    ? normalizeMonths(data.activity.months)
    : buildMonthsFromWeeks(data.weeks)

  return {
    username: dataUsername,
    source,
    profile: {
      username: data.profile?.username || dataUsername,
      avatarUrl: data.profile?.avatarUrl || '',
      url: data.profile?.url || `https://github.com/${dataUsername}`,
      followers: toNullableNumber(data.profile?.followers),
    },
    stats: {
      repositories: toNullableNumber(data.stats?.repositories),
      stars: toNullableNumber(data.stats?.stars),
      forks: toNullableNumber(data.stats?.forks),
      contributionsLastYear: toNullableNumber(
        data.stats?.contributionsLastYear ?? data.totalContributions,
      ),
    },
    languages: Array.isArray(data.languages)
      ? data.languages
        .map((language) => ({
          name: language?.name,
          bytes: toNullableNumber(language?.bytes) || 0,
          percentage: toNullableNumber(language?.percentage) || 0,
          color: language?.color || null,
        }))
        .filter((language) => language.name && language.bytes > 0)
      : [],
    activity: {
      from: data.activity?.from || activityMonths[0]?.days[0]?.date || '',
      to: data.activity?.to || activityMonths.at(-1)?.days.at(-1)?.date || '',
      months: activityMonths,
    },
    updatedAt: data.updatedAt || null,
  }
}

function getContributionWord(contributionCount) {
  const lastTwoDigits = contributionCount % 100
  const lastDigit = contributionCount % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'вкладов'
  if (lastDigit === 1) return 'вклад'
  if (lastDigit >= 2 && lastDigit <= 4) return 'вклада'
  return 'вкладов'
}

function getActivityClass(contributionCount, isFuture) {
  if (isFuture) return 'github-day github-day-future'
  if (!contributionCount) return 'github-day github-day-empty'
  if (contributionCount < 3) return 'github-day github-day-low'
  if (contributionCount < 6) return 'github-day github-day-medium'
  return 'github-day github-day-high'
}

function getDateLabel(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`))
}

function getTooltipDate(date) {
  const parsedDate = new Date(`${date}T00:00:00Z`)
  const weekday = WEEKDAY_TOOLTIP_NAMES[parsedDate.getUTCDay()]
  const day = String(parsedDate.getUTCDate()).padStart(2, '0')
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0')
  return `${weekday}, ${day}.${month}.${parsedDate.getUTCFullYear()}`
}

function getCalendarCells(month, activityTo) {
  const monthIndex = month.month - 1
  const todayDate = toDateOnly(new Date())
  const firstDay = new Date(Date.UTC(month.year, monthIndex, 1))
  const firstDayOffset = (firstDay.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate()
  const daysByDate = new Map(month.days.map((day) => [day.date, day]))
  const cells = Array.from({ length: firstDayOffset }, (_, index) => ({
    key: `empty-${index}`,
    empty: true,
  }))

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = `${month.year}-${String(month.month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
    const day = daysByDate.get(date)
    const isFuture = Boolean(activityTo && date > activityTo)
    const isToday = date === todayDate
    const count = day?.count || 0
    const label = `${getTooltipDate(date)}\n${isFuture ? 0 : count} contributions`

    cells.push({ key: date, date, count, label, isFuture, isToday, empty: false })
  }

  return cells
}

function formatNumber(value) {
  return value === null || value === undefined ? '—' : value.toLocaleString('ru-RU')
}

function formatPercentage(value) {
  return `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`
}

function formatUpdatedAt(value) {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function getActiveDays(months) {
  return months.reduce(
    (total, month) => total + month.days.filter((day) => day.count > 0).length,
    0,
  )
}

function getLanguageRows(languages) {
  const totalBytes = languages.reduce((total, language) => total + language.bytes, 0)
  const topLanguages = languages.slice(0, 5).map((language, index) => ({
    ...language,
    color: language.color || LANGUAGE_COLORS[index % LANGUAGE_COLORS.length],
  }))
  const otherBytes = languages.slice(5).reduce((total, language) => total + language.bytes, 0)

  if (otherBytes > 0) {
    topLanguages.push({
      name: 'Остальное',
      bytes: otherBytes,
      percentage: totalBytes ? Number(((otherBytes / totalBytes) * 100).toFixed(1)) : 0,
      color: '#635c76',
    })
  }

  return { rows: topLanguages, totalBytes }
}

function StatCard({ label, hint, value }) {
  return (
    <div className="github-stat-card">
      <span className="github-stat-value">{formatNumber(value)}</span>
      <span className="github-stat-label">{label}</span>
      <span className="github-stat-hint">{hint}</span>
    </div>
  )
}

function GithubMonth({ month, activityTo }) {
  const cells = getCalendarCells(month, activityTo)
  const total = month.days.reduce((sum, day) => sum + day.count, 0)

  return (
    <article className="github-month-card">
      <div className="github-month-heading">
        <h3>{MONTH_NAMES[month.month - 1]}</h3>
        <span>{month.year}</span>
      </div>
      <div className="github-weekdays" aria-hidden="true">
        {WEEKDAY_NAMES.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="github-calendar-grid" aria-label={`${MONTH_NAMES[month.month - 1]} ${month.year}`}>
        {cells.map((cell) => cell.empty ? (
          <span key={cell.key} className="github-day github-day-blank" aria-hidden="true" />
        ) : (
          <span
            key={cell.key}
            aria-label={cell.label}
            className={`${getActivityClass(cell.count, cell.isFuture)}${cell.isToday ? ' github-day-today' : ''} github-day-tooltip`}
            data-tooltip={cell.label}
          >
            {Number(cell.date.slice(-2))}
          </span>
        ))}
      </div>
      <p className="github-month-total">{formatNumber(total)} {getContributionWord(total)}</p>
    </article>
  )
}

function GithubLanguages({ languages }) {
  const { rows, totalBytes } = getLanguageRows(languages)

  return (
    <aside className="github-panel github-languages-panel">
      <div className="github-panel-heading">
        <div>
          <p className="github-panel-title">GITHUB LANGUAGES</p>
          <p className="github-panel-subtitle">по байтам кода</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="github-language-bar" aria-hidden="true">
            {rows.map((language) => (
              <span
                key={language.name}
                className="github-language-segment"
                style={{ '--language-share': `${totalBytes ? (language.bytes / totalBytes) * 100 : 0}%`, '--language-color': language.color }}
              />
            ))}
          </div>
          <div className="github-language-list">
            {rows.map((language) => (
              <div key={language.name} className="github-language-row">
                <span className="github-language-name">
                  <i style={{ backgroundColor: language.color }} />
                  {language.name}
                </span>
                <span className="github-language-percentage">
                  {formatPercentage(totalBytes ? (language.bytes / totalBytes) * 100 : language.percentage)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="github-empty-copy">Языки пока не определены.</p>
      )}
    </aside>
  )
}

function GithubSkeleton() {
  return (
    <div className="github-skeleton" aria-hidden="true">
      <div className="github-skeleton-stats">
        {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
      </div>
      <div className="github-skeleton-body">
        <span />
        <span />
      </div>
    </div>
  )
}

function GithubOverview({ githubUrl, githubActivityApiUrl }) {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')
  const username = useMemo(() => getUsername(githubUrl), [githubUrl])
  const statsUrl = useMemo(
    () => getStatsUrl(githubActivityApiUrl),
    [githubActivityApiUrl],
  )

  useEffect(() => {
    if (!username) return undefined

    const controller = new AbortController()
    const hasLiveEndpoint = Boolean(githubActivityApiUrl)

    async function fetchStats(url, source) {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`GitHub activity request failed: ${response.status}`)
      return normalizeStats(await response.json(), username, source)
    }

    async function loadStats() {
      setStatus('loading')
      setStats(null)

      try {
        let nextStats
        if (hasLiveEndpoint && statsUrl !== STATIC_STATS_URL) {
          try {
            nextStats = await fetchStats(statsUrl, 'live')
          } catch (liveError) {
            if (liveError.name === 'AbortError') throw liveError
            nextStats = await fetchStats(STATIC_STATS_URL, 'snapshot')
          }
        } else {
          nextStats = await fetchStats(STATIC_STATS_URL, 'snapshot')
        }

        setStats(nextStats)
        setStatus('ready')
      } catch (error) {
        if (error.name !== 'AbortError') setStatus('unavailable')
      }
    }

    loadStats()
    return () => controller.abort()
  }, [githubActivityApiUrl, statsUrl, username])

  if (!username) return null

  const months = stats?.activity?.months || []
  const languageData = stats?.languages || []
  const updatedAt = formatUpdatedAt(stats?.updatedAt)
  const activeDays = getActiveDays(months)

  return (
    <section className="terminal-card terminal-github-card lg:col-span-12" aria-busy={status === 'loading'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {stats?.profile?.avatarUrl && (
            <img className="github-avatar" src={stats.profile.avatarUrl} alt="" />
          )}
        <p className="terminal-prompt">~/system $ github --stats</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <ViewCount githubActivityApiUrl={githubActivityApiUrl} />
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="terminal-inline-link">
            <GithubIcon className="h-4 w-4" />
            github.com/{username}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {status === 'loading' && <GithubSkeleton />}

      {status === 'ready' && stats && (
        <>
          <div className="github-stat-grid">
            <StatCard label="CONTRIBUTIONS" hint="за 12 месяцев" value={stats.stats.contributionsLastYear} />
            <StatCard label="REPOSITORIES" hint="публичные" value={stats.stats.repositories} />
            <StatCard label="ACTIVE DAYS" hint="за 3 месяца" value={activeDays} />
            <StatCard label="FOLLOWERS" hint="в профиле" value={stats.profile.followers} />
          </div>

          <div className="github-overview-grid">
            <div className="github-panel github-activity-panel">
              <div className="github-panel-heading">
                <div>
                  <p className="github-panel-title">RECENT ACTIVITY</p>
                  <p className="github-panel-subtitle">последние 3 месяца</p>
                </div>
                {stats.activity.from && stats.activity.to && (
                  <span className="github-date-range">{stats.activity.from} → {stats.activity.to}</span>
                )}
              </div>

              {months.length > 0 ? (
                <div className="github-months" aria-label="GitHub activity за последние три месяца">
                  {months.map((month) => (
                    <GithubMonth key={`${month.year}-${month.month}`} month={month} activityTo={stats.activity.to} />
                  ))}
                </div>
              ) : (
                <p className="github-empty-copy">Календарь активности пока пуст.</p>
              )}

              <div className="github-activity-legend" aria-label="Интенсивность активности">
                <span>меньше</span>
                <i className="github-day github-day-empty" />
                <i className="github-day github-day-low" />
                <i className="github-day github-day-medium" />
                <i className="github-day github-day-high" />
                <span>больше</span>
              </div>
            </div>

            <GithubLanguages languages={languageData} />
          </div>

          <div className="github-meta-line">
            {stats.source === 'snapshot' && <span className="github-source-badge">SNAPSHOT</span>}
            {stats.stats.stars > 0 && <span>stars {formatNumber(stats.stats.stars)}</span>}
            {stats.stats.forks > 0 && <span>forks {formatNumber(stats.stats.forks)}</span>}
            {updatedAt && <span>обновлено {updatedAt}</span>}
          </div>
        </>
      )}

      {status === 'unavailable' && (
        <p className="github-unavailable" role="status">
          GitHub activity temporarily unavailable.
        </p>
      )}
    </section>
  )
}

export default GithubOverview
