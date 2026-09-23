export function getWorkerApiUrl(baseUrl, apiPath) {
  if (!apiPath) return ''

  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname.replace(/^www\./, '') : ''
    const isLocal = !hostname || hostname === 'localhost' || hostname === '127.0.0.1'
    const resolvedBaseUrl = isLocal ? baseUrl : `https://github-api.${hostname}`
    if (!resolvedBaseUrl) return ''

    const url = new URL(
      resolvedBaseUrl,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    )
    url.pathname = apiPath
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}
