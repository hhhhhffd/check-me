import { useEffect, useRef, useState } from 'react'
import { getWorkerApiUrl } from '../utils/apiUrl'
import { EyeIcon, FileIcon, GithubIcon, LinkedinIcon, MailIcon, TelegramIcon } from './Icons'

const VIEWS_API_PATH = '/api/v1/views'
const VIEWS_SESSION_KEY = 'portfolio:view-counted'
const LINK_ICONS = { GitHub: GithubIcon, Telegram: TelegramIcon, LinkedIn: LinkedinIcon }
const TYPE_DELAY = 55
const ERASE_DELAY = 28
const HOLD_DELAY = 2200

function useTypewriter(lines, enabled) {
  const [text, setText] = useState(lines[0] || '')
  // Зависимость по содержимому, а не по ссылке: массив может пересоздаваться на каждом рендере.
  const linesKey = lines.join('\n')

  useEffect(() => {
    if (!enabled || lines.length === 0) {
      setText(lines[0] || '')
      return undefined
    }

    let lineIndex = 0
    let length = 0
    let erasing = false
    let timer

    function step() {
      const line = lines[lineIndex]
      if (!erasing && length < line.length) {
        length += 1
        timer = window.setTimeout(step, TYPE_DELAY)
      } else if (!erasing) {
        erasing = true
        timer = window.setTimeout(step, HOLD_DELAY)
      } else if (length > 0) {
        length -= 1
        timer = window.setTimeout(step, ERASE_DELAY)
      } else {
        erasing = false
        lineIndex = (lineIndex + 1) % lines.length
        timer = window.setTimeout(step, TYPE_DELAY * 4)
      }
      setText(lines[lineIndex].slice(0, length))
    }

    setText('')
    timer = window.setTimeout(step, 400)
    return () => window.clearTimeout(timer)
  }, [linesKey, enabled])

  return text
}

function useViewCount(apiBaseUrl) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    const endpoint = getWorkerApiUrl(apiBaseUrl, VIEWS_API_PATH)
    if (!endpoint) return undefined

    let counted = false
    try {
      counted = window.sessionStorage.getItem(VIEWS_SESSION_KEY) === '1'
      // Отмечаем до запроса, чтобы StrictMode в dev не засчитал просмотр дважды.
      if (!counted) window.sessionStorage.setItem(VIEWS_SESSION_KEY, '1')
    } catch (error) {
      console.warn('sessionStorage недоступен, просмотр может засчитаться повторно:', error)
    }

    const url = new URL(endpoint)
    if (counted) url.searchParams.set('increment', '0')
    const controller = new AbortController()

    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Views request failed: HTTP ' + response.status)
        return response.json()
      })
      .then((payload) => {
        const views = Number(payload.views)
        if (Number.isFinite(views) && views >= 0) setCount(Math.floor(views))
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error)
      })

    return () => controller.abort()
  }, [apiBaseUrl])

  return count
}

function ProfileCard({ profile, lang, t, ui, active, onLangChange, langs, cvHref, avatarSrc }) {
  const cardRef = useRef(null)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const taglines = t(profile.taglines) || [profile.title]
  const tagline = useTypewriter(taglines, active && !reducedMotion)
  const views = useViewCount(profile.githubActivityApiUrl)
  const initials = (profile.name?.en || profile.name || '').split(/\s+/).map((word) => word[0]).join('').slice(0, 2)

  // Блик на стекле следует за курсором.
  function handlePointerMove(event) {
    const rect = cardRef.current.getBoundingClientRect()
    cardRef.current.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width) * 100 + '%')
    cardRef.current.style.setProperty('--my', ((event.clientY - rect.top) / rect.height) * 100 + '%')
  }

  const links = [
    ...(profile.links || []).map((link) => ({ label: link.label, href: link.url, Icon: LINK_ICONS[link.label], external: true })),
    profile.email && { label: profile.email, href: 'mailto:' + profile.email, Icon: MailIcon },
    cvHref && { label: ui.downloadCv, href: cvHref, Icon: FileIcon, download: true },
  ].filter((link) => link && link.Icon)

  return (
    <article className="glass profile-card" ref={cardRef} onPointerMove={handlePointerMove}>
      <div className="lang-switch" role="group" aria-label={ui.language}>
        {langs.map((item) => (
          <button type="button" key={item} aria-pressed={lang === item} onClick={() => onLangChange(item)}>{item.toUpperCase()}</button>
        ))}
      </div>

      {profile.avatar
        ? <img className="avatar" src={avatarSrc} alt="" width="120" height="120" />
        : <span className="avatar avatar-initials" aria-hidden="true">{initials}</span>}
      <h1 className="profile-name">{t(profile.name)}</h1>
      <p className="profile-tagline" aria-label={taglines.join(', ')}>
        <span aria-hidden="true">{tagline}</span><i className="caret" aria-hidden="true" />
      </p>
      <p className="profile-location">{t(profile.location)} · {profile.timezone}</p>

      <ul className="profile-links">
        {links.map(({ label, href, Icon, external, download }) => (
          <li key={href}>
            <a
              href={href}
              title={label}
              aria-label={label}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              download={download || undefined}
            >
              <Icon size={28} />
            </a>
          </li>
        ))}
      </ul>

      {views !== null && (
        <p className="profile-views" title={ui.views}>
          <EyeIcon size={16} /> <span>{new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US').format(views)}</span>
          <span className="visually-hidden"> {ui.views}</span>
        </p>
      )}
    </article>
  )
}

export default ProfileCard
