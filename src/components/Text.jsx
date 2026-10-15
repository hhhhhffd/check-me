import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../utils/motion'

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

const SCRAMBLE_MS = 900
const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>/'

// Текст «расшифровывается» слева направо. Скринридер сразу получает настоящий текст.
export function ScrambleText({ text, active = true }) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setDisplay(text)
      return undefined
    }
    const startedAt = performance.now()
    let frame = 0

    function tick(now) {
      const revealed = Math.floor(((now - startedAt) / SCRAMBLE_MS) * text.length)
      if (revealed >= text.length) {
        setDisplay(text)
        return
      }
      setDisplay(Array.from(text, (char, index) => (index < revealed || char === ' '
        ? char
        : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)])).join(''))
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [text, active])

  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">{display}</span>
    </>
  )
}

const COUNT_UP_MS = 1200
// Первое целое число в строке вместе с разделителями разрядов: «1,000+», «1 995», «6».
const COUNT_PATTERN = /^(\D*?)(\d{1,3}(?:[,\s\u00a0\u202f]\d{3})+|\d+)(.*)$/s

// Число в строке докручивается от нуля; префикс, суффикс и разделитель разрядов сохраняются.
export function CountUp({ text, active = true }) {
  const value = String(text)
  const match = value.match(COUNT_PATTERN)
  const target = match ? Number(match[2].replace(/\D/g, '')) : 0
  const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 1 : 0))

  useEffect(() => {
    if (!active || !match || prefersReducedMotion()) {
      setProgress(active || !match ? 1 : 0)
      return undefined
    }
    const startedAt = performance.now()
    let frame = 0

    function tick(now) {
      const next = Math.min(1, (now - startedAt) / COUNT_UP_MS)
      setProgress(next)
      if (next < 1) frame = window.requestAnimationFrame(tick)
    }

    setProgress(0)
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [active, value]) // target и match выводятся из value

  if (!match) return value
  const separator = match[2].match(/\D/)?.[0] || ''
  const current = Math.round(target * (1 - (1 - progress) ** 3))
  const digits = String(current).replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  return <span className="count-up">{match[1] + digits + match[3]}</span>
}
