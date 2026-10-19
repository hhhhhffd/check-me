import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { loadCvData } from './data/loadCvData'
import { useAudio } from './useAudio'
import { prefersReducedMotion } from './utils/motion'
import ParticleWave from './components/ParticleWave'
import ProfileCard from './components/ProfileCard'
import MusicPlayer from './components/MusicPlayer'
import GithubActivity, { GithubPreview, useGithubData } from './components/GithubActivity'
import Gallery from './components/Gallery'
import Modal from './components/Modal'
import { CountUp, ExternalLink, WithMetrics } from './components/Text'
import { BriefcaseIcon, CapIcon, FolderIcon, GithubIcon, GlobeIcon, LayersIcon, TrophyIcon, UserIcon } from './components/Icons'

const LANGS = ['en', 'ru']
const LANG_STORAGE_KEY = 'portfolio:lang'

const UI = {
  en: {
    enter: 'click to enter',
    enterSilent: 'enter without sound',
    language: 'Language',
    downloadCv: 'Download CV (PDF)',
    views: 'profile views',
    player: 'Music player',
    play: 'Play music',
    pause: 'Pause music',
    mute: 'Mute',
    unmute: 'Unmute',
    seek: 'Track position',
    playbackError: 'The track failed to play. Press play to try again.',
    volume: 'Volume',
    sectionsNav: 'CV sections',
    private: 'Private',
    details: 'Details',
    back: 'Back to projects',
    close: 'Close',
    projectsLabel: 'projects',
    awardsLabel: 'awards',
    aboutHint: 'Summary',
    role: 'My role',
    architecture: 'How it works',
    skillsHint: 'Pick a skill to see the projects that use it.',
    usedIn: 'Used in',
    sections: { about: 'About', projects: 'Projects', experience: 'Experience', awards: 'Awards', skills: 'Skills', github: 'GitHub', education: 'Education', languages: 'Languages' },
    loadError: 'The site content failed to load.',
  },
  ru: {
    enter: 'нажми, чтобы войти',
    enterSilent: 'войти без звука',
    language: 'Язык',
    downloadCv: 'Скачать резюме (PDF)',
    views: 'просмотров профиля',
    player: 'Музыкальный плеер',
    play: 'Включить музыку',
    pause: 'Поставить на паузу',
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    seek: 'Позиция трека',
    playbackError: 'Трек не воспроизвёлся. Нажми play, чтобы попробовать ещё раз.',
    volume: 'Громкость',
    sectionsNav: 'Разделы резюме',
    private: 'Закрытый',
    details: 'Подробнее',
    back: 'Назад к проектам',
    close: 'Закрыть',
    projectsLabel: 'проектов',
    awardsLabel: 'награды',
    aboutHint: 'Коротко',
    role: 'Моя роль',
    architecture: 'Как устроено',
    skillsHint: 'Нажми на навык, чтобы увидеть проекты, где он используется.',
    usedIn: 'Используется в',
    sections: { about: 'Обо мне', projects: 'Проекты', experience: 'Опыт', awards: 'Награды', skills: 'Стек', github: 'GitHub', education: 'Образование', languages: 'Языки' },
    loadError: 'Не удалось загрузить содержимое сайта.',
  },
}

function getInitialLang() {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (LANGS.includes(saved)) return saved
  } catch (error) {
    console.warn('Не удалось прочитать язык из localStorage:', error)
  }
  return 'en'
}

function pick(value, lang) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value[lang] ?? value.en
  return value
}

function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}

function formatMonth(value, lang) {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
}

function formatPeriod(start, end, lang) {
  const from = formatMonth(start, lang)
  return end ? from + ' – ' + formatMonth(end, lang) : from
}

function Bullets({ items }) {
  if (!items?.length) return null
  return (
    <ul className="bullets">
      {items.map((bullet) => <li key={bullet}><WithMetrics text={bullet} /></li>)}
    </ul>
  )
}

function ProjectBadges({ project, t, ui }) {
  if (!project.award && !project.private && !project.context) return null
  return (
    <div className="badges">
      {project.award && <span className="badge badge-award">{t(project.award)}</span>}
      {project.private && <span className="badge">{ui.private}</span>}
      {project.context && <span className="badge">{project.context}</span>}
    </div>
  )
}

const SECTION_IDS = ['about', 'projects', 'experience', 'awards', 'skills', 'github', 'education', 'languages']

// Адрес модалки живёт в hash: #projects, #projects/ratscan. Так на проект можно дать прямую ссылку.
function parseRoute(hash) {
  const [section, slug] = hash.replace(/^#/, '').split('/')
  return SECTION_IDS.includes(section) ? { section, slug: section === 'projects' ? slug || null : null } : { section: null, slug: null }
}

function routeHash(route) {
  return route.section ? '#' + route.section + (route.slug ? '/' + route.slug : '') : ''
}

// Навык считается подтверждённым проектом, если встречается в его стеке или английском описании.
// Короткие названия (Go, SQL) сравниваем с учётом регистра, чтобы не цеплять обычные слова.
function findProjectsUsing(skill, projects) {
  const names = skill.replace(/\(.*?\)/g, '').split('/').map((part) => part.trim().replace(/\s\d+$/, '')).filter(Boolean)
  return projects.filter((project) => {
    const text = [project.stack?.join(' '), pick(project.summary, 'en'), ...(pick(project.bullets, 'en') || []), pick(project.proof, 'en')].join(' ')
    return names.some((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp('(^|[^\\w-])' + escaped + '(?!\\w)', name.length <= 3 ? '' : 'i').test(text)
    })
  })
}

// Плитка «перетекает» в модалку и обратно: у плитки и панели модалки по очереди одно и то же
// view-transition-name, промежуточные кадры браузер строит сам. Без поддержки API — обычная смена.
function morph(tileId, opening, update) {
  const tile = document.querySelector(`[data-tile="${tileId}"]`)
  if (!document.startViewTransition || prefersReducedMotion() || !tile) {
    update()
    return
  }
  const root = document.documentElement
  // has-morphed отключает «всплытие» панели: дальше её появление анимирует переход.
  root.classList.add('is-morphing', 'has-morphed')
  if (opening) tile.style.viewTransitionName = 'morph'
  const transition = document.startViewTransition(() => {
    tile.style.viewTransitionName = opening ? '' : 'morph'
    flushSync(update)
  })
  transition.finished.finally(() => {
    root.classList.remove('is-morphing')
    tile.style.viewTransitionName = ''
  })
}

// Подсветка рамок следует за курсором по всей сетке, поэтому соседние карточки тоже «ловят» свет.
function moveSpotlight(event) {
  for (const card of event.currentTarget.querySelectorAll('.card')) {
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', event.clientX - rect.left + 'px')
    card.style.setProperty('--my', event.clientY - rect.top + 'px')
  }
}

function App() {
  const [cv, setCv] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [lang, setLang] = useState(getInitialLang)
  const [entered, setEntered] = useState(false)
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  const [skill, setSkill] = useState(null)
  const track = useMemo(() => (cv?.music ? { ...cv.music, src: assetUrl(cv.music.src) } : null), [cv])
  const audio = useAudio(track)
  const github = useGithubData(cv?.profile.githubActivityApiUrl, Boolean(cv?.profile.githubUsername))

  useEffect(() => {
    loadCvData()
      .then(setCv)
      .catch((error) => {
        console.error(error)
        setLoadError(error.message)
      })
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    if (!cv) return
    document.title = pick(cv.meta?.siteTitle, lang) || pick(cv.profile.name, lang)
    document.querySelector('meta[name="description"]')?.setAttribute('content', pick(cv.meta?.siteDescription, lang) || '')
  }, [cv, lang])

  function chooseLang(nextLang) {
    setLang(nextLang)
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang)
    } catch (error) {
      console.warn('Не удалось сохранить язык в localStorage:', error)
    }
  }

  function enter(withSound) {
    setEntered(true)
    if (withSound) audio.play()
  }

  function changeRoute(next) {
    const update = () => {
      setSkill(null)
      setRoute(next)
    }
    if (!route.section && next.section) morph(next.section, true, update)
    else if (route.section && !next.section) morph(route.section, false, update)
    else update()
  }

  useEffect(() => {
    const onPopState = () => changeRoute(parseRoute(window.location.hash))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  })

  // Открытие модалки добавляет запись в историю — кнопка «назад» в браузере её закрывает.
  // Переходы внутри модалки (список → проект) заменяют запись, а не плодят новые.
  function openRoute(path) {
    const next = parseRoute('#' + path)
    if (route.section) window.history.replaceState(window.history.state, '', routeHash(next))
    else window.history.pushState({ modal: true }, '', routeHash(next))
    changeRoute(next)
  }

  function closeModal() {
    if (!route.section) return
    if (window.history.state?.modal) {
      window.history.back()
      return
    }
    // Модалку открыли по прямой ссылке — возвращаться некуда, просто убираем hash.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    changeRoute({ section: null, slug: null })
  }

  const ui = UI[lang]
  const t = (value) => pick(value, lang)

  if (loadError) {
    return (
      <main className="state">
        <p>{ui.loadError}</p>
        <code>{loadError}</code>
      </main>
    )
  }

  if (!cv) return <main className="state" aria-busy="true" />

  const { profile } = cv
  const cvHref = assetUrl(profile.cvPdf)
  const section = route.section
  const project = section === 'projects' && route.slug ? cv.projects.find((item) => item.slug === route.slug) || null : null

  // Порядок плиток — порядок на телефоне. На десктопе места задаёт grid-template-areas в CSS.
  const tiles = [
    profile.githubUsername && {
      id: 'github',
      Icon: GithubIcon,
      hint: '@' + profile.githubUsername,
      preview: <GithubPreview state={github} lang={lang} active={entered} />,
    },
    cv.projects.length > 0 && {
      id: 'projects',
      Icon: FolderIcon,
      stat: cv.projects.length,
      caption: ui.projectsLabel,
      hint: cv.projects.slice(0, 3).map((item) => item.title).join(' · '),
    },
    cv.awards.length > 0 && {
      id: 'awards',
      Icon: TrophyIcon,
      stat: cv.awards.length,
      caption: ui.awardsLabel,
      hint: t(cv.awards[0].place) + ' · ' + cv.awards[0].event,
    },
    cv.experience.length > 0 && { id: 'experience', Icon: BriefcaseIcon, caption: t(cv.experience[0].role), hint: cv.experience[0].company },
    cv.skillGroups.length > 0 && { id: 'skills', Icon: LayersIcon, hint: profile.languages?.slice(0, 3).join(' · ') },
    { id: 'about', Icon: UserIcon, hint: ui.aboutHint },
    cv.education.length > 0 && { id: 'education', Icon: CapIcon, hint: cv.education[0].start.slice(0, 4) + ' – ' + (cv.education[0].end || '').slice(0, 4) },
    cv.languages.length > 0 && { id: 'languages', Icon: GlobeIcon, hint: cv.languages.map((item) => item.code || t(item.name)).join(' · ') },
  ].filter(Boolean)

  function renderSection() {
    switch (section) {
      case 'about':
        return (
          <>
            <p className="lead">{t(profile.summary)}</p>
            {profile.highlights?.length > 0 && (
              <ul className="highlights">
                {profile.highlights.map((item) => (
                  <li key={t(item.label)}>
                    {item.link
                      ? <button type="button" onClick={() => openRoute(item.link)}><b><CountUp text={t(item.value)} /></b><span>{t(item.label)} <span aria-hidden="true">→</span></span></button>
                      : <><b><CountUp text={t(item.value)} /></b><span>{t(item.label)}</span></>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )

      case 'projects':
        return (
          <ul className="project-list">
            {cv.projects.map((item) => (
              <li key={item.slug}>
                <button type="button" className="project-card" onClick={() => openRoute('projects/' + item.slug)}>
                  <span className="project-card-head">
                    <strong>{item.title}</strong>
                    <span className="project-card-arrow" aria-hidden="true">→</span>
                  </span>
                  {item.subtitle && <span className="muted">{t(item.subtitle)}</span>}
                  <ProjectBadges project={item} t={t} ui={ui} />
                  <span className="project-card-summary">{t(item.summary)}</span>
                  {item.stack?.length > 0 && <span className="mono-faint">{item.stack.join(' · ')}</span>}
                </button>
              </li>
            ))}
          </ul>
        )

      case 'experience':
        return cv.experience.map((job) => (
          <article className="entry" key={job.company + job.start}>
            <p className="mono-faint">{formatPeriod(job.start, job.end, lang)}</p>
            <h3>{t(job.role)} <span className="muted">· {job.company}</span></h3>
            {job.summary && <p className="muted">{t(job.summary)}</p>}
            <Bullets items={t(job.bullets)} />
          </article>
        ))

      case 'awards':
        return (
          <ul className="awards">
            {cv.awards.map((award) => (
              <li key={award.event}>
                <span className="award-place">{t(award.place)}</span>
                <div>
                  <h3>{award.event}</h3>
                  <p className="muted">{award.organizer} · {formatMonth(award.date, lang)}</p>
                  <p>{t(award.note)}</p>
                </div>
              </li>
            ))}
          </ul>
        )

      case 'skills': {
        const usedIn = skill ? findProjectsUsing(skill, cv.projects) : []
        return (
          <>
            <div className="skill-usage" aria-live="polite">
              {skill
                ? (
                  <>
                    <span>{ui.usedIn} <b>{skill}</b>:</span>
                    {usedIn.map((item) => (
                      <button type="button" className="badge badge-link" key={item.slug} onClick={() => openRoute('projects/' + item.slug)}>{item.title} →</button>
                    ))}
                  </>
                )
                : <span className="muted">{ui.skillsHint}</span>}
            </div>
            <dl className="skills">
              {cv.skillGroups.map((group) => (
                <div key={t(group.name)}>
                  <dt>{t(group.name)}</dt>
                  <dd>
                    {group.skills.map((name) => (
                      findProjectsUsing(name, cv.projects).length > 0
                        ? <button type="button" className="chip chip-button" key={name} aria-pressed={skill === name} onClick={() => setSkill(skill === name ? null : name)}>{name}</button>
                        : <span className="chip" key={name}>{name}</span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )
      }

      case 'github':
        return <GithubActivity username={profile.githubUsername} state={github} lang={lang} />

      case 'education':
        return cv.education.map((item) => (
          <article className="entry" key={item.start}>
            <p className="mono-faint">{formatPeriod(item.start, item.end, lang)}</p>
            <h3>{t(item.school)}</h3>
            <p className="muted">{t(item.degree)}</p>
          </article>
        ))

      case 'languages':
        return (
          <dl className="spoken">
            {cv.languages.map((item) => (
              <div key={t(item.name)}><dt>{t(item.name)}</dt><dd>{t(item.level)}</dd></div>
            ))}
          </dl>
        )

      default:
        return null
    }
  }

  function renderProject() {
    return (
      <>
        {project.subtitle && <p className="muted">{t(project.subtitle)}</p>}
        <ProjectBadges project={project} t={t} ui={ui} />
        <p className="lead">{t(project.summary)}</p>
        {project.role && <p className="project-role"><span>{ui.role}</span>{t(project.role)}</p>}
        <Bullets items={t(project.bullets)} />
        {project.proof && <p className="proof"><span aria-hidden="true">✓</span> {t(project.proof)}</p>}
        {project.architecture?.length > 0 && (
          <div className="arch">
            <p className="mono-faint">{ui.architecture}</p>
            <ol className="arch-flow">
              {project.architecture.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
        )}
        {project.gallery?.length > 0 && <Gallery images={project.gallery.map(assetUrl)} title={project.title} lang={lang} />}
        <footer className="project-foot">
          {project.stack?.length > 0 && <p className="mono-faint">{project.stack.join(' · ')}</p>}
          {project.links?.length > 0 && (
            <p className="project-links">
              {project.links.map((link) => <ExternalLink key={link.url} href={link.url}>{t(link.label)}</ExternalLink>)}
            </p>
          )}
        </footer>
      </>
    )
  }

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <ParticleWave levelRef={audio.levelRef} />

      {!entered && (
        <div className="gate">
          <button type="button" className="gate-enter" onClick={() => enter(true)}>
            {ui.enter}<span className="gate-dots" aria-hidden="true">...</span>
          </button>
          <button type="button" className="gate-silent" onClick={() => enter(false)}>{ui.enterSilent}</button>
        </div>
      )}

      <main className={'site' + (entered ? ' is-entered' : '')} inert={entered ? undefined : ''} onPointerMove={moveSpotlight}>
        <ProfileCard
          profile={profile}
          lang={lang}
          langs={LANGS}
          t={t}
          ui={ui}
          active={entered}
          onLangChange={chooseLang}
          cvHref={cvHref}
          avatarSrc={assetUrl(profile.avatar)}
        />
        {audio.track && <MusicPlayer audio={audio} ui={ui} />}

        <nav className="tiles" aria-label={ui.sectionsNav}>
          {tiles.map(({ id, Icon, hint, stat, caption, preview }) => (
            <button type="button" key={id} className={'card tile tile-' + id} data-tile={id} onClick={() => openRoute(id)}>
              <span className="tile-head">
                <Icon size={18} />
                <span className="tile-name">{ui.sections[id]}</span>
                <span className="tile-arrow" aria-hidden="true">↗</span>
              </span>
              {preview}
              {stat !== undefined && <span className="tile-stat"><CountUp text={stat} active={entered} /></span>}
              {caption && <span className="tile-caption">{caption}</span>}
              {hint && <span className="tile-hint">{hint}</span>}
            </button>
          ))}
        </nav>
      </main>

      <Modal
        open={entered && section !== null}
        title={project ? project.title : section && ui.sections[section]}
        eyebrow={project ? ui.sections.projects : null}
        onBack={project ? () => openRoute('projects') : null}
        onClose={closeModal}
        ui={ui}
      >
        {project ? renderProject() : renderSection()}
      </Modal>
    </>
  )
}

export default App
