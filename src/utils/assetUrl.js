const EXTERNAL_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i

export function resolveAssetUrl(value) {
  if (typeof value !== 'string' || !value) return value

  if (
    EXTERNAL_URL_PATTERN.test(value) ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  if (!value.startsWith('/')) return value

  return `${import.meta.env.BASE_URL}${value.slice(1)}`
}
