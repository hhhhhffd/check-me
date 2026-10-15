import { useEffect, useRef, useState } from 'react'
import { getWorkerApiUrl } from '../utils/apiUrl'
import { ScrambleText } from './Text'
import { EyeIcon, FileIcon, GithubIcon, LinkedinIcon, MailIcon, TelegramIcon, TrophyIcon } from './Icons'

const VIEWS_API_PATH = '/api/v1/views'
const VIEWS_SESSION_KEY = 'portfolio:view-counted'
const LINK_ICONS = { GitHub: GithubIcon, Telegram: TelegramIcon, LinkedIn: LinkedinIcon }
const MAX_TILT_DEG = 5

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
  const views = useViewCount(profile.githubActivityApiUrl)
  const initials = (profile.name?.en || profile.name || '').split(/\s+/).map((word) => word[0]).join('').slice(0, 2)

  // Карточка слегка наклоняется к курсору. На тач-экранах наклон не нужен — палец его не «ведёт».
  function handlePointerMove(event) {
    if (event.pointerType !== 'mouse') return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    cardRef.current.style.setProperty('--tilt-x', (-y * MAX_TILT_DEG * 2).toFixed(2) + 'deg')
    cardRef.current.style.setProperty('--tilt-y', (x * MAX_TILT_DEG * 2).toFixed(2) + 'deg')
  }

  function handlePointerLeave() {
    cardRef.current.style.setProperty('--tilt-x', '0deg')
    cardRef.current.style.setProperty('--tilt-y', '0deg')
  }

  const links = [
    ...(profile.links || []).map((link) => ({ label: link.label, href: link.url, Icon: LINK_ICONS[link.label], external: true })),
    profile.email && { label: profile.email, href: 'mailto:' + profile.email, Icon: MailIcon },
  ].filter((link) => link && link.Icon)

  return (
    <article className="card profile-card" ref={cardRef} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <div className="lang-switch" role="group" aria-label={ui.language}>
        {langs.map((item) => (
          <button type="button" key={item} aria-pressed={lang === item} onClick={() => onLangChange(item)}>{item.toUpperCase()}</button>
        ))}
      </div>

      {profile.avatar
        ? <img className="avatar" src={avatarSrc} alt="" width="120" height="120" />
        : <span className="avatar avatar-initials" aria-hidden="true">{initials}</span>}
      <h1 className="profile-name"><ScrambleText text={t(profile.name)} active={active} /></h1>
      <p className="profile-headline">{t(profile.headline) || profile.title}</p>
      {profile.badge && <p className="profile-badge"><TrophyIcon size={15} /> {t(profile.badge)}</p>}
      {profile.status
        ? <p className="profile-status"><i aria-hidden="true" />{t(profile.status)} · {profile.timezone}</p>
        : <p className="profile-status">{t(profile.location)} · {profile.timezone}</p>}

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
        {cvHref && (
          <li>
            <a className="profile-cv" href={cvHref} download title={ui.downloadCv}>
              <FileIcon size={20} /> CV
            </a>
          </li>
        )}
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
