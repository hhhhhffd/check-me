import { useEffect, useState } from 'react'
import { getWorkerApiUrl } from '../utils/apiUrl'

const GITHUB_API_PATH = '/api/v1/github'
const SNAPSHOT_URL = import.meta.env.BASE_URL + 'github-snapshot.json'
const TOP_LANGUAGE_COUNT = 5
const LEVELS = [0, 1, 2, 3, 4]
const YEAR_WINDOW_DAYS = 330

const TEXT = {
  en: {
    locale: 'en-US',
    window: (days) => (days >= YEAR_WINDOW_DAYS ? 'Last 12 months' : `Last ${days} days`),
    contributions: 'contributions',
    activeDays: (active, total) => `active on ${active} of ${total} days`,
    currentStreak: 'current streak',
    longestStreak: 'longest streak',
    repositories: 'public repositories',
    days: (count) => `${count} ${count === 1 ? 'day' : 'days'}`,
    activityNote: 'Commits, pull requests, issues and reviews per day',
    less: 'less',
    more: 'more',
    languages: 'Languages',
    languagesNote: 'Public repositories only · the core Rust projects are private',
    other: 'Other',
    loading: 'Loading GitHub stats…',
    openProfile: 'Open GitHub profile',
    updated: 'updated',
    cell: (date, count) => `${date}: ${count} ${count === 1 ? 'contribution' : 'contributions'}`,
  },
  ru: {
    locale: 'ru-RU',
    window: (days) => (days >= YEAR_WINDOW_DAYS ? 'Последние 12 месяцев' : `Последние ${days} ${pluralDays(days)}`),
    contributions: 'контрибьютов',
    activeDays: (active, total) => `активен ${active} из ${total} дней`,
    currentStreak: 'текущий стрик',
    longestStreak: 'самый длинный стрик',
    repositories: 'публичных репозиториев',
    days: (count) => `${count} ${pluralDays(count)}`,
    activityNote: 'Коммиты, пулл-реквесты, issues и ревью по дням',
    less: 'меньше',
    more: 'больше',
    languages: 'Языки',
    languagesNote: 'Только публичные репозитории · основные Rust-проекты закрытые',
    other: 'Другие',
    loading: 'Загружаю статистику GitHub…',
    openProfile: 'Открыть профиль GitHub',
    updated: 'обновлено',
    cell: (date, count) => `${date}: контрибьютов — ${count}`,
  },
}

function pluralDays(count) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня'
  return 'дней'
}

function parseDate(date) {
  return new Date(date + 'T00:00:00Z')
}

function formatAgo(isoDate, locale) {
  const seconds = (new Date(isoDate).getTime() - Date.now()) / 1000
  if (!Number.isFinite(seconds)) return ''
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const minutes = seconds / 60
  if (Math.abs(minutes) < 60) return format.format(Math.round(minutes), 'minute')
  const hours = minutes / 60
  if (Math.abs(hours) < 24) return format.format(Math.round(hours), 'hour')
  return format.format(Math.round(hours / 24), 'day')
}

// Всё об активности считаем из подневного календаря, который отдаёт Worker.
function summarize(days, lastDate) {
  const total = days.reduce((sum, day) => sum + day.count, 0)
  const active = days.filter((day) => day.count > 0).length

  let longest = 0
  let run = 0
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }

  // Сегодняшний день ещё не закончился: ноль сегодня не обрывает стрик.
  let current = 0
  let index = days.length - 1
  if (index >= 0 && days[index].date === lastDate && days[index].count === 0) index -= 1
  while (index >= 0 && days[index].count > 0) {
    current += 1
    index -= 1
  }

  const max = Math.max(...days.map((day) => day.count))
  return { total, active, longest, current, max }
}

function buildWeeks(days) {
  // Колонки — недели с понедельника; пустые ячейки выравнивают первый день.
  const firstWeekday = (parseDate(days[0].date).getUTCDay() + 6) % 7
  const cells = [...Array(firstWeekday).fill(null), ...days]
  const weeks = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

// Корень вместо линейной шкалы: один выбросной день не должен гасить все остальные.
function getLevel(count, max) {
  if (count === 0 || max === 0) return 0
  return Math.min(4, Math.ceil(Math.sqrt(count / max) * 4))
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(url + ' returned HTTP ' + response.status)
  return response.json()
}

function GithubActivity({ username, apiBaseUrl, lang }) {
  const [state, setState] = useState({ status: 'loading' })
  const [hovered, setHovered] = useState(null)
  const text = TEXT[lang]
  const profileUrl = 'https://github.com/' + username

  useEffect(() => {
    const controller = new AbortController()
    const workerUrl = getWorkerApiUrl(apiBaseUrl, GITHUB_API_PATH)

    async function load() {
      try {
        if (!workerUrl) throw new Error('GitHub worker URL is not configured')
        return await fetchJson(workerUrl, controller.signal)
      } catch (error) {
        if (error.name === 'AbortError') throw error
        // Worker недоступен — показываем снапшот, сохранённый при последней сборке.
        console.warn('GitHub worker failed, falling back to snapshot:', error)
        return fetchJson(SNAPSHOT_URL, controller.signal)
      }
    }

    load()
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        if (error.name === 'AbortError') return
        console.error('GitHub stats and snapshot both failed:', error)
        setState({ status: 'failed' })
      })
    return () => controller.abort()
  }, [apiBaseUrl])

  if (state.status === 'loading') return <p className="muted" aria-busy="true">{text.loading}</p>

  if (state.status === 'failed') {
    return (
      <a className="gh-fallback" href={profileUrl} target="_blank" rel="noopener noreferrer">
        github.com/{username} <span aria-hidden="true">↗</span>
      </a>
    )
  }

  const { stats, languages = [], activity, updatedAt } = state.data
  const number = new Intl.NumberFormat(text.locale)
  const shortDate = new Intl.DateTimeFormat(text.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const monthName = new Intl.DateTimeFormat(text.locale, { month: 'short', timeZone: 'UTC' })
  const weekdayShort = new Intl.DateTimeFormat(text.locale, { weekday: 'short', timeZone: 'UTC' })

  const days = (activity?.months || []).flatMap((month) => month.days)
  const summary = days.length > 0 ? summarize(days, activity.to) : null
  const weeks = days.length > 0 ? buildWeeks(days) : []
  // 5 янв 2026 — понедельник: от него берём подписи дней недели в нужной локали.
  const weekdayLabels = [0, 2, 4].map((offset) => ({ row: offset, label: weekdayShort.format(new Date(Date.UTC(2026, 0, 5 + offset))) }))

  const topLanguages = languages.slice(0, TOP_LANGUAGE_COUNT)
  const otherShare = Math.max(0, 100 - topLanguages.reduce((sum, item) => sum + item.percentage, 0))

  return (
    <div className="gh">
      {summary && (
        <section className="gh-window" aria-label={text.window(days.length)}>
          <header className="gh-window-head">
            <h3>{text.window(days.length)}</h3>
            {updatedAt && <span className="mono-faint">{text.updated} {formatAgo(updatedAt, text.locale)}</span>}
          </header>

          <p className="gh-hero">
            <b>{number.format(summary.total)}</b>
            <span>{text.contributions} · {text.activeDays(summary.active, days.length)}</span>
          </p>

          <ul className="gh-tiles">
            <li><b>{text.days(summary.current)}</b><span>{text.currentStreak}</span></li>
            <li><b>{text.days(summary.longest)}</b><span>{text.longestStreak}</span></li>
            <li><b>{number.format(stats.repositories)}</b><span>{text.repositories}</span></li>
          </ul>

          <figure className="gh-activity" style={{ '--weeks': weeks.length }}>
            <div className="gh-heatmap" aria-hidden="true" onMouseLeave={() => setHovered(null)}>
              {weekdayLabels.map(({ row, label }) => (
                <span key={row} className="gh-weekday" style={{ gridColumn: 1, gridRow: row + 2 }}>{label}</span>
              ))}
              {weeks.map((week, weekIndex) => {
                const monthStart = weekIndex === 0 ? week.find(Boolean) : week.find((day) => day?.date.endsWith('-01'))
                return [
                  monthStart && (
                    <span key={'m' + weekIndex} className="gh-month" style={{ gridColumn: weekIndex + 2, gridRow: 1 }}>
                      {monthName.format(parseDate(monthStart.date))}
                    </span>
                  ),
                  ...week.map((day, dayIndex) => day && (
                    <span
                      key={day.date}
                      className={'gh-day l' + getLevel(day.count, summary.max) + (hovered?.date === day.date ? ' is-hovered' : '')}
                      style={{ gridColumn: weekIndex + 2, gridRow: dayIndex + 2 }}
                      onMouseEnter={() => setHovered(day)}
                    />
                  )),
                ]
              })}
            </div>
            <figcaption className="gh-caption">
              <span className="gh-hover" aria-live="polite">
                {hovered ? text.cell(shortDate.format(parseDate(hovered.date)), hovered.count) : text.activityNote}
              </span>
              <span className="gh-legend" aria-hidden="true">
                {text.less}
                {LEVELS.map((level) => <i key={level} className={'gh-day l' + level} />)}
                {text.more}
              </span>
            </figcaption>
          </figure>
        </section>
      )}

      {topLanguages.length > 0 && (
        <section className="gh-langs" aria-label={text.languages}>
          <h3>{text.languages}</h3>
          <div className="gh-lang-bar" aria-hidden="true">
            {topLanguages.map((item) => <span key={item.name} style={{ width: item.percentage + '%', background: item.color || 'var(--faint)' }} />)}
            {otherShare > 0 && <span style={{ width: otherShare + '%', background: 'rgb(255 255 255 / 0.3)' }} />}
          </div>
          <ul className="gh-lang-list">
            {topLanguages.map((item) => (
              <li key={item.name}><i style={{ background: item.color || 'var(--faint)' }} />{item.name} <span>{item.percentage}%</span></li>
            ))}
            {otherShare > 0 && <li><i style={{ background: 'rgb(255 255 255 / 0.3)' }} />{text.other} <span>{otherShare.toFixed(1)}%</span></li>}
          </ul>
          <p className="mono-faint">{text.languagesNote}</p>
        </section>
      )}

      <a className="gh-profile" href={profileUrl} target="_blank" rel="noopener noreferrer">{text.openProfile} <span aria-hidden="true">↗</span></a>
    </div>
  )
}

export default GithubActivity
