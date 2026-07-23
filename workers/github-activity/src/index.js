const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'
const CACHE_TTL_SECONDS = 60
const GITHUB_USERNAME_PATTERN = /^(?!.*--)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i

const CONTRIBUTION_CALENDAR_QUERY = `query ContributionCalendar($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
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

function createJsonResponse(body, status, origin) {
  const headers = createCorsHeaders(origin)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`)

  return new Response(JSON.stringify(body), { status, headers })
}

function addCorsHeaders(response, origin) {
  const headers = new Headers(response.headers)
  for (const [name, value] of createCorsHeaders(origin)) {
    headers.set(name, value)
  }

  return new Response(response.body, { status: response.status, headers })
}

function getUsername(requestUrl) {
  const username = requestUrl.searchParams.get('username')?.trim()
  if (!username || !GITHUB_USERNAME_PATTERN.test(username)) return null

  return username
}

async function fetchContributionCalendar(username, token) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'portfolio-github-activity-worker',
    },
    body: JSON.stringify({
      query: CONTRIBUTION_CALENDAR_QUERY,
      variables: { login: username },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub GraphQL returned HTTP ${response.status}.`)
  }

  const result = await response.json()
  const calendar = result.data?.user?.contributionsCollection?.contributionCalendar
  if (result.errors?.length || !calendar) {
    throw new Error('GitHub did not return a contribution calendar.')
  }

  return calendar
}

async function getCachedStats(requestUrl, username, token, executionContext) {
  const cacheKey = new Request(`${requestUrl.origin}${requestUrl.pathname}?username=${encodeURIComponent(username)}`)
  const cache = caches.default
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) return cachedResponse

  const calendar = await fetchContributionCalendar(username, token)
  const response = createJsonResponse({
    username,
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) => week.contributionDays),
    updatedAt: new Date().toISOString(),
  }, 200)

  executionContext.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

export default {
  async fetch(request, environment, executionContext) {
    const origin = getAllowedOrigin(request, environment)
    const hasOrigin = request.headers.has('Origin')

    if (hasOrigin && !origin) {
      return createJsonResponse({ error: 'Origin is not allowed.' }, 403)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: createCorsHeaders(origin) })
    }

    if (request.method !== 'GET') {
      return createJsonResponse({ error: 'Method not allowed.' }, 405, origin)
    }

    if (!environment.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN is not configured.')
      return createJsonResponse({ error: 'Service is not configured.' }, 500, origin)
    }

    const requestUrl = new URL(request.url)
    const username = getUsername(requestUrl)
    if (!username) {
      return createJsonResponse({ error: 'A valid GitHub username is required.' }, 400, origin)
    }

    try {
      const response = await getCachedStats(requestUrl, username, environment.GITHUB_TOKEN, executionContext)
      return addCorsHeaders(response, origin)
    } catch (error) {
      console.error('Could not load GitHub contribution calendar.', error)
      return createJsonResponse({ error: 'GitHub activity is temporarily unavailable.' }, 502, origin)
    }
  },
}
