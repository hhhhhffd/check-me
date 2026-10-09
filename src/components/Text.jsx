// Цифры-метрики (237, 83K, 1,000+, 0.474) выделяются моноширинным шрифтом.
// Числа внутри идентификаторов (AES-256, v3, B1) и коды вроде HTTP 500 не трогаем.
const METRIC_PATTERN = /(?<![\w.-])(?<!HTTP )\d+(?:[.,]\d+)*(?:K|\+)?/g

export function WithMetrics({ text }) {
  const parts = []
  let lastIndex = 0
  for (const match of text.matchAll(METRIC_PATTERN)) {
    parts.push(text.slice(lastIndex, match.index))
    parts.push(<b className="metric" key={match.index}>{match[0]}</b>)
    lastIndex = match.index + match[0].length
  }
  parts.push(text.slice(lastIndex))
  return parts
}

export function ExternalLink({ href, children, className }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children} <span aria-hidden="true">↗</span>
    </a>
  )
}
