import { useEffect, useState } from 'react'
import { getWorkerApiUrl } from '../utils/apiUrl'

const GITHUB_API_PATH = '/api/v1/github'
const TOP_LANGUAGE_COUNT = 5

const TEXT = {
  en: {
    contributions: 'contributions in the last year',
    repositories: 'public repositories',
    activity: 'Commits, PRs and issues per day, last 3 months',
    other: 'Other',
    loading: 'Loading GitHub stats…',
    error: 'GitHub stats are unavailable right now.',
    openProfile: 'Open GitHub profile',
    dayLabel: (date, count) => `${date}: ${count} contributions`,
  },
  ru: {
    contributions: 'контрибьютов за последний год',
    repositories: 'публичных репозиториев',
    activity: 'Коммиты, PR и issues по дням, последние 3 месяца',
    other: 'Другие',
    loading: 'Загружаю статистику GitHub…',
    error: 'Статистика GitHub сейчас недоступна.',
    openProfile: 'Открыть профиль GitHub',
    dayLabel: (date, count) => `${date}: контрибьютов — ${count}`,
  },
}

function getLevel(count, max) {
  if (count === 0 || max === 0) return 0
  return Math.min(4, Math.ceil((count / max) * 4))
}

function buildWeeks(months) {
  const days = months.flatMap((month) => month.days)
  if (days.length === 0) return []

  // Колонки — недели с понедельника; пустые ячейки выравнивают первый день.
  const firstWeekday = (new Date(days[0].date + 'T00:00:00Z').getUTCDay() + 6) % 7
  const cells = [...Array(firstWeekday).fill(null), ...days]
  const weeks = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

function GithubActivity({ username, apiBaseUrl, lang }) {
  const [state, setState] = useState({ status: 'loading' })
  const text = TEXT[lang]
  const profileUrl = 'https://github.com/' + username

  useEffect(() => {
    const url = getWorkerApiUrl(apiBaseUrl, GITHUB_API_PATH)
    if (!url) {
      setState({ status: 'error' })
      return undefined
    }

    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('GitHub worker returned HTTP ' + response.status)
        return response.json()
      })
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        console.error('GitHub stats failed to load:', error)
        setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [apiBaseUrl])

  if (state.status === 'loading') return <p className="gh-note" aria-busy="true">{text.loading}</p>

  if (state.status === 'error') {
    return (
      <p className="gh-note">
        {text.error}{' '}
        <a href={profileUrl} target="_blank" rel="noopener noreferrer">{text.openProfile} <span aria-hidden="true">↗</span></a>
      </p>
    )
  }

  const { stats, languages = [], activity } = state.data
  const numberFormat = new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US')
  const topLanguages = languages.slice(0, TOP_LANGUAGE_COUNT)
  const otherShare = Math.max(0, 100 - topLanguages.reduce((sum, item) => sum + item.percentage, 0))
  const weeks = buildWeeks(activity?.months || [])
  const maxCount = Math.max(0, ...weeks.flat().filter(Boolean).map((day) => day.count))

  return (
    <div className="gh">
      <div className="gh-stats">
        <p><b>{numberFormat.format(stats.contributionsLastYear)}</b> {text.contributions}</p>
        <p><b>{numberFormat.format(stats.repositories)}</b> {text.repositories}</p>
        <a className="gh-profile" href={profileUrl} target="_blank" rel="noopener noreferrer">github.com/{username} <span aria-hidden="true">↗</span></a>
      </div>

      {topLanguages.length > 0 && (
        <div className="gh-langs">
          <div className="gh-lang-bar" aria-hidden="true">
            {topLanguages.map((item) => <span key={item.name} style={{ width: item.percentage + '%', background: item.color || 'var(--faint)' }} />)}
            {otherShare > 0 && <span style={{ width: otherShare + '%', background: 'var(--line)' }} />}
          </div>
          <ul className="gh-lang-list">
            {topLanguages.map((item) => (
              <li key={item.name}><i style={{ background: item.color || 'var(--faint)' }} />{item.name} <span>{item.percentage}%</span></li>
            ))}
            {otherShare > 0 && <li><i style={{ background: 'var(--line)' }} />{text.other} <span>{otherShare.toFixed(1)}%</span></li>}
          </ul>
        </div>
      )}

      {weeks.length > 0 && (
        <figure className="gh-activity">
          <div className="gh-grid">
            {weeks.map((week, weekIndex) => (
              <div className="gh-week" key={weekIndex}>
                {week.map((day, dayIndex) => (
                  day
                    ? <span key={day.date} className={'gh-day l' + getLevel(day.count, maxCount)} title={text.dayLabel(day.date, day.count)} />
                    : <span key={'pad' + dayIndex} className="gh-day gh-pad" />
                ))}
              </div>
            ))}
          </div>
          <figcaption>{text.activity}</figcaption>
        </figure>
      )}
    </div>
  )
}

export default GithubActivity
