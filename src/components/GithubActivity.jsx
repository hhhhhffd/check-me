import { useEffect, useState } from 'react'
import { getWorkerApiUrl } from '../utils/apiUrl'

const GITHUB_API_PATH = '/api/v1/github'
const TOP_LANGUAGE_COUNT = 5
const LEVELS = [0, 1, 2, 3, 4]

const TEXT = {
  en: {
    locale: 'en-US',
    yearTotal: 'contributions in the last year',
    since: (date) => `contributions since ${date}`,
    activeDays: 'active days',
    currentStreak: 'current streak',
    longestStreak: 'longest streak',
    bestDay: (date) => `best day · ${date}`,
    perActiveDay: 'per active day',
    busiestDay: 'busiest weekday',
    repositories: 'public repositories',
    days: (count) => `${count} ${count === 1 ? 'day' : 'days'}`,
    activityTitle: 'Daily activity',
    activityNote: 'Commits, pull requests, issues and reviews',
    less: 'less',
    more: 'more',
    languages: 'Languages in public repos',
    other: 'Other',
    loading: 'Loading GitHub stats…',
    error: 'GitHub stats are unavailable right now.',
    openProfile: 'Open GitHub profile',
    cell: (date, count) => `${date}: ${count} ${count === 1 ? 'contribution' : 'contributions'}`,
    summary: (active, total, sum) => `Active on ${active} of ${total} days, ${sum} contributions in total.`,
  },
  ru: {
    locale: 'ru-RU',
    yearTotal: 'контрибьютов за последний год',
    since: (date) => `контрибьютов с ${date}`,
    activeDays: 'активных дней',
    currentStreak: 'текущий стрик',
    longestStreak: 'самый длинный стрик',
    bestDay: (date) => `лучший день · ${date}`,
    perActiveDay: 'в среднем за активный день',
    busiestDay: 'самый активный день недели',
    repositories: 'публичных репозиториев',
    days: (count) => `${count} ${pluralDays(count)}`,
    activityTitle: 'Активность по дням',
    activityNote: 'Коммиты, пулл-реквесты, issues и ревью',
    less: 'меньше',
    more: 'больше',
    languages: 'Языки в публичных репозиториях',
    other: 'Другие',
    loading: 'Загружаю статистику GitHub…',
    error: 'Статистика GitHub сейчас недоступна.',
    openProfile: 'Открыть профиль GitHub',
    cell: (date, count) => `${date}: контрибьютов — ${count}`,
    summary: (active, total, sum) => `Активен ${active} из ${total} дней, всего контрибьютов: ${sum}.`,
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

// Всё, что говорит об активности, считаем из подневного календаря, который отдаёт Worker.
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

  const best = days.reduce((top, day) => (day.count > top.count ? day : top), days[0])

  const byWeekday = Array(7).fill(0)
  for (const day of days) byWeekday[parseDate(day.date).getUTCDay()] += day.count
  const busiestWeekday = byWeekday.indexOf(Math.max(...byWeekday))

  return { total, active, longest, current, best, busiestWeekday, perActiveDay: active ? Math.round(total / active) : 0 }
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

function GithubActivity({ username, apiBaseUrl, lang }) {
  const [state, setState] = useState({ status: 'loading' })
  const [hovered, setHovered] = useState(null)
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

  if (state.status === 'loading') return <p className="muted" aria-busy="true">{text.loading}</p>

  if (state.status === 'error') {
    return (
      <p className="gh-note">
        {text.error}{' '}
        <a href={profileUrl} target="_blank" rel="noopener noreferrer">{text.openProfile} <span aria-hidden="true">↗</span></a>
      </p>
    )
  }

  const { stats, languages = [], activity } = state.data
  const number = new Intl.NumberFormat(text.locale)
  const shortDate = new Intl.DateTimeFormat(text.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const monthName = new Intl.DateTimeFormat(text.locale, { month: 'short', timeZone: 'UTC' })
  const weekdayName = new Intl.DateTimeFormat(text.locale, { weekday: 'long', timeZone: 'UTC' })
  const weekdayShort = new Intl.DateTimeFormat(text.locale, { weekday: 'short', timeZone: 'UTC' })

  const days = (activity?.months || []).flatMap((month) => month.days)
  const summary = days.length > 0 ? summarize(days, activity.to) : null
  const weeks = days.length > 0 ? buildWeeks(days) : []
  const maxCount = summary ? summary.best.count : 0
  // 5 янв 2026 — понедельник: от него берём подписи дней недели в нужной локали.
  const weekdayLabels = [0, 2, 4].map((offset) => ({ row: offset, label: weekdayShort.format(new Date(Date.UTC(2026, 0, 5 + offset))) }))

  const topLanguages = languages.slice(0, TOP_LANGUAGE_COUNT)
  const otherShare = Math.max(0, 100 - topLanguages.reduce((sum, item) => sum + item.percentage, 0))

  const tiles = summary && [
    { value: number.format(summary.total), label: text.since(shortDate.format(parseDate(activity.from))) },
    { value: `${summary.active}/${days.length}`, label: text.activeDays },
    { value: text.days(summary.current), label: text.currentStreak },
    { value: text.days(summary.longest), label: text.longestStreak },
    { value: number.format(summary.best.count), label: text.bestDay(shortDate.format(parseDate(summary.best.date))) },
    { value: number.format(summary.perActiveDay), label: text.perActiveDay },
    { value: weekdayName.format(new Date(Date.UTC(2026, 0, 4 + summary.busiestWeekday))), label: text.busiestDay },
    { value: number.format(stats.repositories), label: text.repositories },
  ]

  return (
    <div className="gh">
      <p className="gh-hero">
        <b>{number.format(stats.contributionsLastYear)}</b>
        <span>{text.yearTotal}</span>
      </p>

      {tiles && (
        <ul className="gh-tiles">
          {tiles.map((tile) => <li key={tile.label}><b>{tile.value}</b><span>{tile.label}</span></li>)}
        </ul>
      )}

      {weeks.length > 0 && (
        <figure className="gh-activity" aria-label={text.activityTitle + '. ' + text.summary(summary.active, days.length, summary.total)}>
          <figcaption>
            <span>{text.activityTitle}</span>
            <span className="gh-hover" aria-live="polite">
              {hovered ? text.cell(shortDate.format(parseDate(hovered.date)), hovered.count) : text.activityNote}
            </span>
          </figcaption>
          <div className="gh-heatmap" aria-hidden="true" onMouseLeave={() => setHovered(null)}>
            <div className="gh-weekdays">
              {weekdayLabels.map(({ row, label }) => <span key={row} style={{ gridRow: row + 2 }}>{label}</span>)}
            </div>
            {weeks.map((week, weekIndex) => {
              const firstOfMonth = week.find((day) => day?.date.endsWith('-01'))
              const monthLabel = weekIndex === 0 ? week.find(Boolean) : firstOfMonth
              return (
                <div className="gh-week" key={weekIndex}>
                  <span className="gh-month">{monthLabel ? monthName.format(parseDate(monthLabel.date)) : ''}</span>
                  {week.map((day, dayIndex) => (
                    day
                      ? (
                        <span
                          key={day.date}
                          className={'gh-day l' + getLevel(day.count, maxCount) + (hovered?.date === day.date ? ' is-hovered' : '')}
                          onMouseEnter={() => setHovered(day)}
                        />
                      )
                      : <span key={'pad' + dayIndex} className="gh-day gh-pad" />
                  ))}
                </div>
              )
            })}
          </div>
          <div className="gh-legend" aria-hidden="true">
            <span>{text.less}</span>
            {LEVELS.map((level) => <i key={level} className={'gh-day l' + level} />)}
            <span>{text.more}</span>
          </div>
        </figure>
      )}

      {topLanguages.length > 0 && (
        <div className="gh-langs">
          <p className="gh-subtitle">{text.languages}</p>
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
        </div>
      )}

      <a className="gh-profile" href={profileUrl} target="_blank" rel="noopener noreferrer">github.com/{username} <span aria-hidden="true">↗</span></a>
    </div>
  )
}

export default GithubActivity
