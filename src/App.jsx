import { useEffect, useState } from 'react'
import { loadCvData } from './data/loadCvData'
import { useAudio } from './useAudio'
import ProfileCard from './components/ProfileCard'
import MusicPlayer from './components/MusicPlayer'
import GithubActivity from './components/GithubActivity'
import Gallery from './components/Gallery'
import Modal from './components/Modal'
import { ExternalLink, WithMetrics } from './components/Text'
import { BriefcaseIcon, CapIcon, FolderIcon, GithubIcon, LayersIcon, MailIcon, TrophyIcon, UserIcon } from './components/Icons'

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
    sectionsNav: 'CV sections',
    private: 'Private',
    details: 'Details',
    back: 'Back to projects',
    close: 'Close',
    projectsCount: (count) => `${count} projects`,
    sections: { about: 'About', projects: 'Projects', experience: 'Experience', awards: 'Awards', skills: 'Skills', github: 'GitHub', education: 'Education', contact: 'Contact' },
    languages: 'Languages',
    contactLead: 'Reach me by email or Telegram.',
    phone: 'Phone',
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
    sectionsNav: 'Разделы резюме',
    private: 'Закрытый',
    details: 'Подробнее',
    back: 'Назад к проектам',
    close: 'Закрыть',
    projectsCount: (count) => `${count} проектов`,
    sections: { about: 'Обо мне', projects: 'Проекты', experience: 'Опыт', awards: 'Награды', skills: 'Стек', github: 'GitHub', education: 'Образование', contact: 'Контакты' },
    languages: 'Языки',
    contactLead: 'Связаться со мной можно по почте или в Telegram.',
    phone: 'Телефон',
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

function App() {
  const [cv, setCv] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [lang, setLang] = useState(getInitialLang)
  const [entered, setEntered] = useState(false)
  const [section, setSection] = useState(null)
  const [project, setProject] = useState(null)
  const audio = useAudio(cv?.music?.src ? assetUrl(cv.music.src) : '')

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

  function closeModal() {
    setSection(null)
    setProject(null)
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

  const tiles = [
    { id: 'about', Icon: UserIcon, hint: profile.title },
    cv.projects.length > 0 && { id: 'projects', Icon: FolderIcon, hint: ui.projectsCount(cv.projects.length) },
    cv.experience.length > 0 && { id: 'experience', Icon: BriefcaseIcon, hint: cv.experience[0].company },
    cv.awards.length > 0 && { id: 'awards', Icon: TrophyIcon, hint: t(cv.awards[0].place) + ' · ' + cv.awards[0].event.split(',')[0] },
    cv.skillGroups.length > 0 && { id: 'skills', Icon: LayersIcon, hint: profile.languages?.join(' · ') },
    profile.githubUsername && { id: 'github', Icon: GithubIcon, hint: '@' + profile.githubUsername },
    (cv.education.length > 0 || cv.languages.length > 0) && { id: 'education', Icon: CapIcon, hint: cv.languages.map((item) => t(item.name)).join(' · ') },
    { id: 'contact', Icon: MailIcon, hint: profile.email },
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
                  <li key={t(item.label)}><b>{t(item.value)}</b><span>{t(item.label)}</span></li>
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
                <button type="button" className="project-card" onClick={() => setProject(item)}>
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

      case 'skills':
        return (
          <dl className="skills">
            {cv.skillGroups.map((group) => (
              <div key={t(group.name)}>
                <dt>{t(group.name)}</dt>
                <dd>{group.skills.map((skill) => <span className="chip" key={skill}>{skill}</span>)}</dd>
              </div>
            ))}
          </dl>
        )

      case 'github':
        return <GithubActivity username={profile.githubUsername} apiBaseUrl={profile.githubActivityApiUrl} lang={lang} />

      case 'education':
        return (
          <>
            {cv.education.map((item) => (
              <article className="entry" key={item.start}>
                <p className="mono-faint">{formatPeriod(item.start, item.end, lang)}</p>
                <h3>{t(item.school)}</h3>
                <p className="muted">{t(item.degree)}</p>
              </article>
            ))}
            {cv.languages.length > 0 && (
              <>
                <h3 className="subheading">{ui.languages}</h3>
                <dl className="spoken">
                  {cv.languages.map((item) => (
                    <div key={t(item.name)}><dt>{t(item.name)}</dt><dd>{t(item.level)}</dd></div>
                  ))}
                </dl>
              </>
            )}
          </>
        )

      case 'contact':
        return (
          <>
            <p className="muted">{ui.contactLead}</p>
            {profile.email && <a className="contact-email" href={'mailto:' + profile.email}>{profile.email}</a>}
            <ul className="contact-list">
              {profile.links?.map((link) => (
                <li key={link.url}><span>{link.label}</span><ExternalLink href={link.url}>{link.handle}</ExternalLink></li>
              ))}
              {profile.phone && <li><span>{ui.phone}</span><a href={'tel:' + profile.phone.replace(/\s/g, '')}>{profile.phone}</a></li>}
              {cvHref && <li><span>PDF</span><a href={cvHref} download>{ui.downloadCv}</a></li>}
            </ul>
          </>
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
        <Bullets items={t(project.bullets)} />
        {project.proof && <p className="proof"><span aria-hidden="true">✓</span> {t(project.proof)}</p>}
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

      {!entered && (
        <div className="gate">
          <button type="button" className="gate-enter" onClick={() => enter(true)}>
            {ui.enter}<span className="gate-dots" aria-hidden="true">...</span>
          </button>
          <button type="button" className="gate-silent" onClick={() => enter(false)}>{ui.enterSilent}</button>
        </div>
      )}

      <main className={'site' + (entered ? ' is-entered' : '')} inert={entered ? undefined : ''}>
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
        {cv.music?.src && <MusicPlayer music={cv.music} audio={audio} ui={ui} />}

        <nav className="tiles" aria-label={ui.sectionsNav}>
          {tiles.map(({ id, Icon, hint }) => (
            <button type="button" key={id} className="tile" onClick={() => setSection(id)}>
              <Icon size={22} />
              <span className="tile-name">{ui.sections[id]}</span>
              {hint && <span className="tile-hint">{hint}</span>}
            </button>
          ))}
        </nav>
      </main>

      <Modal
        open={section !== null}
        title={project ? project.title : section && ui.sections[section]}
        eyebrow={project ? ui.sections.projects : null}
        onBack={project ? () => setProject(null) : null}
        onClose={closeModal}
        ui={ui}
      >
        {project ? renderProject() : renderSection()}
      </Modal>
    </>
  )
}

export default App
