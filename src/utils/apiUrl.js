export function getWorkerApiUrl(baseUrl, apiPath) {
  if (!apiPath) return ''

  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname.replace(/^www\./, '') : ''
    // Dev-сервер, открытый по localhost или по IP в локальной сети, ходит на адрес из cv.jsonc.
    const isLocal = !hostname || hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
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
