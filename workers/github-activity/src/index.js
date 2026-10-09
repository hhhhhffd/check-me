const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
const API_PATH = '/api/v1/github'
const VIEWS_API_PATH = '/api/v1/views'
const VIEWS_KEY = 'views:total'
const CACHE_TTL_SECONDS = 60 * 60
// 12 месяцев: календарь вклада за год, GitHub отдаёт его одним запросом (диапазон ≤ 1 года).
const ACTIVITY_MONTH_COUNT = 12
const REPOSITORY_PAGE_SIZE = 100
const LANGUAGE_PAGE_SIZE = 100
const GITHUB_USERNAME_PATTERN = /^(?!.*--)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i

const REPOSITORY_FIELDS = `
  nodes {
    stargazerCount
    forkCount
    languages(first: ${LANGUAGE_PAGE_SIZE}, orderBy: { field: SIZE, direction: DESC }) {
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

const GITHUB_OVERVIEW_QUERY = `query GithubOverview(
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
      first: ${REPOSITORY_PAGE_SIZE}
      after: $cursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      isFork: false
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      ${REPOSITORY_FIELDS}
    }
  }
}`

const REPOSITORIES_QUERY = `query GithubRepositories($login: String!, $cursor: String) {
  user(login: $login) {
    repositories(
      first: ${REPOSITORY_PAGE_SIZE}
      after: $cursor
      ownerAffiliations: OWNER
      privacy: PUBLIC
      isFork: false
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      ${REPOSITORY_FIELDS}
    }
  }
}`

function getAllowedOrigin(request, environment) {
  const origin = request.headers.get('Origin')
  if (!origin) return null

  const allowedOrigins = (environment.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return allowedOrigins.includes(origin) ? origin : undefined
}

function createCorsHeaders(origin) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  })

  if (origin) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

function createJsonResponse(body, status, origin, options = {}) {
  const headers = createCorsHeaders(origin)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set(
    'Cache-Control',
    options.cacheControl
      || `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS}`,
  )

  return new Response(JSON.stringify(body), { status, headers })
}

function addCorsHeaders(response, origin) {
  const headers = new Headers(response.headers)
  for (const [name, value] of createCorsHeaders(origin)) {
    headers.set(name, value)
  }

  return new Response(response.body, { status: response.status, headers })
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function getDateRange(now = new Date()) {
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()
  const activityFromDate = new Date(Date.UTC(currentYear, currentMonth - (ACTIVITY_MONTH_COUNT - 1), 1))
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

  for (let index = 0; index < ACTIVITY_MONTH_COUNT; index += 1) {
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
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'portfolio-github-overview-worker',
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

    const data = await githubGraphql(REPOSITORIES_QUERY, { login: username, cursor }, token)
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

function createOverviewPayload(username, user, repositories, dateRange) {
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

async function fetchGithubOverview(username, token) {
  const dateRange = getDateRange()
  const data = await githubGraphql(GITHUB_OVERVIEW_QUERY, {
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
  return createOverviewPayload(username, user, repositories, dateRange)
}

async function getCachedStats(requestUrl, username, token, executionContext) {
  const cacheKey = new Request(`${requestUrl.origin}${API_PATH}?username=${encodeURIComponent(username)}`)
  const cache = caches.default
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) return cachedResponse

  const payload = await fetchGithubOverview(username, token)
  const response = createJsonResponse(payload, 200)
  const cacheWrite = cache.put(cacheKey, response.clone())
  if (executionContext?.waitUntil) {
    executionContext.waitUntil(cacheWrite)
  } else {
    await cacheWrite
  }
  return response
}

async function getViewCount(environment, shouldIncrement) {
  if (!environment.PORTFOLIO_VIEWS) {
    throw new Error('PORTFOLIO_VIEWS KV binding is not configured.')
  }

  const storedValue = await environment.PORTFOLIO_VIEWS.get(VIEWS_KEY)
  const parsedValue = Number.parseInt(storedValue || '0', 10)
  const currentValue = Number.isSafeInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0

  if (!shouldIncrement) return currentValue

  const nextValue = currentValue + 1
  await environment.PORTFOLIO_VIEWS.put(VIEWS_KEY, String(nextValue))
  return nextValue
}

function isSupportedPath(pathname) {
  return pathname === '/'
    || pathname === API_PATH
    || pathname === `${API_PATH}/`
    || pathname === VIEWS_API_PATH
    || pathname === `${VIEWS_API_PATH}/`
}

export default {
  async fetch(request, environment, executionContext) {
    const requestUrl = new URL(request.url)
    const origin = getAllowedOrigin(request, environment)
    const hasOrigin = request.headers.has('Origin')

    if (hasOrigin && !origin) {
      return createJsonResponse({ error: 'Origin is not allowed.' }, 403)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: createCorsHeaders(origin) })
    }

    if (!isSupportedPath(requestUrl.pathname)) {
      return createJsonResponse({ error: 'Not found.' }, 404, origin)
    }

    if (request.method !== 'GET') {
      return createJsonResponse({ error: 'Method not allowed.' }, 405, origin)
    }

    if (requestUrl.pathname === VIEWS_API_PATH || requestUrl.pathname === `${VIEWS_API_PATH}/`) {
      try {
        const shouldIncrement = requestUrl.searchParams.get('increment') !== '0'
        const views = await getViewCount(environment, shouldIncrement)
        return createJsonResponse(
          { views },
          200,
          origin,
          { cacheControl: 'no-store' },
        )
      } catch (error) {
        console.error('Could not load portfolio view count.', error)
        return createJsonResponse(
          { error: 'View counter is temporarily unavailable.' },
          500,
          origin,
          { cacheControl: 'no-store' },
        )
      }
    }

    if (!environment.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN is not configured.')
      return createJsonResponse({ error: 'Service is not configured.' }, 500, origin)
    }

    const username = environment.GITHUB_USERNAME?.trim()
    if (!username || !GITHUB_USERNAME_PATTERN.test(username)) {
      console.error('GITHUB_USERNAME is missing or invalid.')
      return createJsonResponse({ error: 'Service is not configured.' }, 500, origin)
    }

    try {
      const response = await getCachedStats(requestUrl, username, environment.GITHUB_TOKEN, executionContext)
      return addCorsHeaders(response, origin)
    } catch (error) {
      console.error('Could not load GitHub overview.', error)
      return createJsonResponse({ error: 'GitHub activity is temporarily unavailable.' }, 502, origin)
    }
  },
}
