import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseJsonc } from '../src/data/loadCvData.js'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryDirectory = resolve(scriptDirectory, '..')
const cvFilePath = resolve(repositoryDirectory, 'public/cv.jsonc')
const outputFilePath = resolve(repositoryDirectory, 'public/github-stats.json')
const githubApiUrl = 'https://api.github.com/graphql'

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

async function fetchContributionCalendar(username, token) {
  const response = await fetch(githubApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'portfolio-github-stats-updater',
    },
    body: JSON.stringify({
      query: `query ContributionCalendar($login: String!) {
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
      }`,
      variables: { login: username },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub GraphQL returned HTTP ${response.status}.`)
  }

  const result = await response.json()
  if (result.errors?.length > 0) {
    throw new Error(`GitHub GraphQL error: ${result.errors.map((error) => error.message).join('; ')}`)
  }

  const calendar = result.data?.user?.contributionsCollection?.contributionCalendar
  if (!calendar) {
    throw new Error(`GitHub did not return a contribution calendar for ${username}.`)
  }

  return calendar
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to fetch the contribution calendar.')
  }

  const profile = await loadProfile()
  const username = getGitHubUsername(profile.github)
  const calendar = await fetchContributionCalendar(username, token)
  const stats = {
    username,
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) => week.contributionDays),
    updatedAt: new Date().toISOString(),
  }

  await mkdir(dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, `${JSON.stringify(stats, null, 2)}\n`, 'utf8')
  console.info(`Updated GitHub contribution data for ${username}.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
