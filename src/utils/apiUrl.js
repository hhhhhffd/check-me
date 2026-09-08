export function getWorkerApiUrl(baseUrl, apiPath) {
  if (!baseUrl || !apiPath) return ''

  try {
    const url = new URL(
      baseUrl,
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
