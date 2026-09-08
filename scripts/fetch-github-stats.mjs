import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseJsonc } from '../src/data/loadCvData.js'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryDirectory = resolve(scriptDirectory, '..')
const cvFilePath = resolve(repositoryDirectory, 'public/cv.jsonc')
const outputFilePath = resolve(repositoryDirectory, 'public/github-stats.json')
const githubApiUrl = 'https://api.github.com/graphql'
const activityMonthCount = 3
const repositoryPageSize = 100
const languagePageSize = 100

const repositoryFields = `
  nodes {
    stargazerCount
    forkCount
    languages(first: ${languagePageSize}, orderBy: { field: SIZE, direction: DESC }) {
      edges {
        size
        node {
          name
          color
        }
      }
    }
  }
  pageInfo {
    hasNextPage
    endCursor
  }
  totalCount
`

const overviewQuery = `query GithubOverview(
  $login: String!
  $activityFrom: DateTime!
  $activityTo: DateTime!
  $yearFrom: DateTime!
  $yearTo: DateTime!
  $cursor: String
) {
  user(login: $login) {
    avatarUrl
    url
    followers {
      totalCount
    }
    activity: contributionsCollection(from: $activityFrom, to: $activityTo) {
      contributionCalendar {
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
    year: contributionsCollection(from: $yearFrom, to: $yearTo) {
      contributionCalendar {
        totalContributions
      }
    }
    repositories(
      first: ${repositoryPageSize}
      after: $cursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      isFork: false
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      ${repositoryFields}
    }
  }
}`

const repositoriesQuery = `query GithubRepositories($login: String!, $cursor: String) {
  user(login: $login) {
    repositories(
      first: ${repositoryPageSize}
      after: $cursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      isFork: false
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      ${repositoryFields}
    }
  }
}`

function getGitHubUsername(githubUrl) {
  if (!githubUrl) {
    throw new Error('profile.github must contain a public GitHub profile URL.')
  }

  const url = new URL(githubUrl)
  const username = url.pathname.split('/').filter(Boolean).at(-1)
  if (!username) {
    throw new Error('profile.github must contain a GitHub username.')
  }

  return username
}

async function loadProfile() {
  const source = await readFile(cvFilePath, 'utf8')
  const cv = parseJsonc(source)
  return cv.profile
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function getDateRange(now = new Date()) {
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()
  const activityFromDate = new Date(Date.UTC(currentYear, currentMonth - (activityMonthCount - 1), 1))
  const yearFromDate = new Date(now)
  yearFromDate.setUTCFullYear(currentYear - 1)

  return {
    activityFrom: activityFromDate.toISOString(),
    activityTo: now.toISOString(),
    activityFromDate: toDateOnly(activityFromDate),
    activityToDate: toDateOnly(now),
    yearFrom: yearFromDate.toISOString(),
    yearTo: now.toISOString(),
  }
}

function getMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function buildActivityMonths(calendar, fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00Z`)
  const to = new Date(`${toDate}T00:00:00Z`)
  const months = []

  for (let index = 0; index < activityMonthCount; index += 1) {
    const monthDate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1))
    months.push({
      year: monthDate.getUTCFullYear(),
      month: monthDate.getUTCMonth() + 1,
      days: [],
    })
  }

  const monthsByKey = new Map(months.map((month) => [getMonthKey(month.year, month.month), month]))
  const days = calendar?.weeks?.flatMap((week) => week.contributionDays || []) || []

  for (const day of days) {
    if (!day?.date || day.date < fromDate || day.date > toDate) continue

    const dayDate = new Date(`${day.date}T00:00:00Z`)
    if (Number.isNaN(dayDate.getTime()) || dayDate < from || dayDate > to) continue

    const month = monthsByKey.get(getMonthKey(dayDate.getUTCFullYear(), dayDate.getUTCMonth() + 1))
    if (!month) continue

    month.days.push({
      date: day.date,
      count: Number(day.contributionCount) || 0,
    })
  }

  return months.map((month) => ({
    ...month,
    days: month.days.sort((first, second) => first.date.localeCompare(second.date)),
  }))
}

async function githubGraphql(query, variables, token) {
  const response = await fetch(githubApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'portfolio-github-stats-updater',
    },
    body: JSON.stringify({ query, variables }),
  })

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(`GitHub GraphQL returned an invalid response (HTTP ${response.status}).`)
  }

  if (!response.ok) {
    throw new Error(`GitHub GraphQL returned HTTP ${response.status}.`)
  }

  if (result.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${result.errors.map((error) => error.message).join('; ')}`)
  }

  return result.data
}

function appendRepositories(target, connection) {
  for (const repository of connection?.nodes || []) {
    if (repository) target.push(repository)
  }
}

async function fetchRepositories(username, token, initialConnection) {
  const repositories = []
  let connection = initialConnection
  appendRepositories(repositories, connection)

  while (connection?.pageInfo?.hasNextPage) {
    const cursor = connection.pageInfo.endCursor
    if (!cursor) throw new Error('GitHub returned an invalid repository pagination cursor.')

    const data = await githubGraphql(repositoriesQuery, { login: username, cursor }, token)
    connection = data.user?.repositories
    if (!connection) throw new Error('GitHub did not return a repository page.')
    appendRepositories(repositories, connection)
  }

  return {
    repositories,
    totalCount: Number(initialConnection?.totalCount) || repositories.length,
  }
}

function aggregateLanguages(repositories) {
  const languageMap = new Map()

  for (const repository of repositories) {
    for (const edge of repository.languages?.edges || []) {
      const name = edge.node?.name
      const bytes = Number(edge.size) || 0
      if (!name || bytes <= 0) continue

      const current = languageMap.get(name) || { name, bytes: 0, color: edge.node.color || null }
      current.bytes += bytes
      if (!current.color && edge.node.color) current.color = edge.node.color
      languageMap.set(name, current)
    }
  }

  const languages = [...languageMap.values()].sort((first, second) => {
    if (second.bytes !== first.bytes) return second.bytes - first.bytes
    return first.name.localeCompare(second.name)
  })
  const totalBytes = languages.reduce((total, language) => total + language.bytes, 0)

  return languages.map((language) => ({
    ...language,
    percentage: totalBytes ? Number(((language.bytes / totalBytes) * 100).toFixed(1)) : 0,
  }))
}

function createStats(username, user, repositories, dateRange) {
  const repositoryStats = repositories.repositories
  const stars = repositoryStats.reduce((total, repository) => total + (Number(repository.stargazerCount) || 0), 0)
  const forks = repositoryStats.reduce((total, repository) => total + (Number(repository.forkCount) || 0), 0)
  const activityCalendar = user.activity?.contributionCalendar
  const yearCalendar = user.year?.contributionCalendar

  if (!activityCalendar || !yearCalendar) {
    throw new Error('GitHub did not return contribution calendars.')
  }

  return {
    profile: {
      username,
      avatarUrl: user.avatarUrl,
      url: user.url,
      followers: Number(user.followers?.totalCount) || 0,
    },
    stats: {
      repositories: repositories.totalCount,
      stars,
      forks,
      contributionsLastYear: Number(yearCalendar.totalContributions) || 0,
    },
    languages: aggregateLanguages(repositoryStats),
    activity: {
      from: dateRange.activityFromDate,
      to: dateRange.activityToDate,
      months: buildActivityMonths(activityCalendar, dateRange.activityFromDate, dateRange.activityToDate),
    },
    updatedAt: new Date().toISOString(),
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to fetch GitHub statistics.')
  }

  const profile = await loadProfile()
  const username = getGitHubUsername(profile.github)
  const dateRange = getDateRange()
  const data = await githubGraphql(overviewQuery, {
    login: username,
    activityFrom: dateRange.activityFrom,
    activityTo: dateRange.activityTo,
    yearFrom: dateRange.yearFrom,
    yearTo: dateRange.yearTo,
    cursor: null,
  }, token)
  const user = data.user
  if (!user) throw new Error(`GitHub user ${username} was not found.`)

  const repositories = await fetchRepositories(username, token, user.repositories)
  const stats = createStats(username, user, repositories, dateRange)

  await mkdir(dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, `${JSON.stringify(stats, null, 2)}\n`, 'utf8')
  console.info(`Updated GitHub statistics for ${username}.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
