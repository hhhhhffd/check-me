import { useEffect, useState } from 'react'
import { loadCvData } from './data/loadCvData'
import { useAudio } from './useAudio'
import ProfileCard from './components/ProfileCard'
import MusicPlayer from './components/MusicPlayer'
import GithubActivity from './components/GithubActivity'
import Gallery from './components/Gallery'
import { ArrowDownIcon, PauseIcon, PlayIcon } from './components/Icons'

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
    scroll: 'CV below',
    sectionsNav: 'Sections',
    private: 'Private',
    nav: { about: 'About', projects: 'Projects', experience: 'Experience', skills: 'Skills', contact: 'Contact' },
    sections: { about: 'About', projects: 'Projects', experience: 'Experience', awards: 'Awards', skills: 'Skills', education: 'Education', languages: 'Languages', contact: 'Contact' },
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
    scroll: 'Резюме ниже',
    sectionsNav: 'Разделы',
    private: 'Закрытый',
    nav: { about: 'Обо мне', projects: 'Проекты', experience: 'Опыт', skills: 'Стек', contact: 'Контакты' },
    sections: { about: 'Обо мне', projects: 'Проекты', experience: 'Опыт', awards: 'Награды', skills: 'Стек', education: 'Образование', languages: 'Языки', contact: 'Контакты' },
    contactLead: 'Связаться со мной можно по почте или в Telegram.',
    phone: 'Телефон',
    loadError: 'Не удалось загрузить содержимое сайта.',
  },
}

// Цифры-метрики (237, 83K, 1,000+, 0.474) выделяются моноширинным шрифтом.
// Числа внутри идентификаторов (AES-256, v3, B1) и коды вроде HTTP 500 не трогаем.
const METRIC_PATTERN = /(?<![\w.-])(?<!HTTP )\d+(?:[.,]\d+)*(?:K|\+)?/g

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

function WithMetrics({ text }) {
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

function ExternalLink({ href, children, className }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children} <span aria-hidden="true">↗</span>
    </a>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="section" aria-labelledby={id + '-title'}>
      <h2 id={id + '-title'} className="section-title">{title}</h2>
      {children}
    </section>
  )
}

function App() {
  const [cv, setCv] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [lang, setLang] = useState(getInitialLang)
  const [entered, setEntered] = useState(false)
  const [docked, setDocked] = useState(false)
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

  // Док-панель появляется, когда главная карточка ушла за экран.
  useEffect(() => {
    if (!entered) return undefined
    const hero = document.getElementById('top')
    if (!hero) return undefined
    const observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting), { threshold: 0.15 })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [entered])

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
  const navItems = [
    'about',
    cv.projects.length > 0 && 'projects',
    cv.experience.length > 0 && 'experience',
    cv.skillGroups.length > 0 && 'skills',
    'contact',
  ].filter(Boolean)

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <i className="blob blob-a" /><i className="blob blob-b" /><i className="blob blob-c" /><i className="blob blob-d" />
      </div>

      {!entered && (
        <div className="gate">
          <button type="button" className="gate-enter" onClick={() => enter(true)}>
            {ui.enter}<span className="gate-dots" aria-hidden="true">...</span>
          </button>
          <button type="button" className="gate-silent" onClick={() => enter(false)}>{ui.enterSilent}</button>
        </div>
      )}

      <div className={'site' + (entered ? ' is-entered' : '')} inert={entered ? undefined : ''}>
        <header id="top" className="hero">
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
          <a className="hero-scroll" href="#about"><ArrowDownIcon size={16} /> {ui.scroll}</a>
        </header>

        <main className="content">
          <Section id="about" title={ui.sections.about}>
            <div className="glass card">
              <p className="about-summary">{t(profile.summary)}</p>
              {profile.highlights?.length > 0 && (
                <ul className="highlights">
                  {profile.highlights.map((item) => (
                    <li key={t(item.label)}><b>{t(item.value)}</b><span>{t(item.label)}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          {cv.projects.length > 0 && (
            <Section id="projects" title={ui.sections.projects}>
              {cv.projects.map((project) => (
                <article id={project.slug} className="glass card project" key={project.slug}>
                  <header className="project-head">
                    <h3>{project.title}</h3>
                    {project.subtitle && <p className="project-subtitle">{t(project.subtitle)}</p>}
                    <div className="project-badges">
                      {project.award && <span className="badge badge-award">{t(project.award)}</span>}
                      {project.private && <span className="badge">{ui.private}</span>}
                      {project.context && <span className="badge">{project.context}</span>}
                    </div>
                  </header>
                  <p className="project-summary">{t(project.summary)}</p>
                  {t(project.bullets)?.length > 0 && (
                    <ul className="bullets">
                      {t(project.bullets).map((bullet) => <li key={bullet}><WithMetrics text={bullet} /></li>)}
                    </ul>
                  )}
                  {project.proof && <p className="proof"><span aria-hidden="true">✓</span> {t(project.proof)}</p>}
                  {project.gallery?.length > 0 && <Gallery images={project.gallery.map(assetUrl)} title={project.title} lang={lang} />}
                  <footer className="project-foot">
                    {project.stack?.length > 0 && <p className="project-stack">{project.stack.join(' · ')}</p>}
                    {project.links?.length > 0 && (
                      <p className="project-links">
                        {project.links.map((link) => <ExternalLink key={link.url} href={link.url}>{t(link.label)}</ExternalLink>)}
                      </p>
                    )}
                  </footer>
                </article>
              ))}
            </Section>
          )}

          {profile.githubUsername && (
            <Section id="github" title="GitHub">
              <div className="glass card">
                <GithubActivity username={profile.githubUsername} apiBaseUrl={profile.githubActivityApiUrl} lang={lang} />
              </div>
            </Section>
          )}

          {cv.experience.length > 0 && (
            <Section id="experience" title={ui.sections.experience}>
              {cv.experience.map((job) => (
                <article className="glass card" key={job.company + job.start}>
                  <p className="card-date">{formatPeriod(job.start, job.end, lang)}</p>
                  <h3 className="card-title">{t(job.role)} <span>· {job.company}</span></h3>
                  {job.summary && <p className="card-note">{t(job.summary)}</p>}
                  {t(job.bullets)?.length > 0 && (
                    <ul className="bullets">
                      {t(job.bullets).map((bullet) => <li key={bullet}><WithMetrics text={bullet} /></li>)}
                    </ul>
                  )}
                </article>
              ))}
            </Section>
          )}

          {cv.awards.length > 0 && (
            <Section id="awards" title={ui.sections.awards}>
              <ul className="glass card awards">
                {cv.awards.map((award) => (
                  <li key={award.event}>
                    <span className="award-place">{t(award.place)}</span>
                    <div>
                      <h3 className="card-title">{award.event}</h3>
                      <p className="card-note">{award.organizer} · {formatMonth(award.date, lang)} — {t(award.note)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {cv.skillGroups.length > 0 && (
            <Section id="skills" title={ui.sections.skills}>
              <div className="glass card">
                <dl className="skills">
                  {cv.skillGroups.map((group) => (
                    <div key={t(group.name)}>
                      <dt>{t(group.name)}</dt>
                      <dd>{group.skills.map((skill) => <span className="chip" key={skill}>{skill}</span>)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Section>
          )}

          {(cv.education.length > 0 || cv.languages.length > 0) && (
            <div className="split">
              {cv.education.length > 0 && (
                <Section id="education" title={ui.sections.education}>
                  {cv.education.map((item) => (
                    <div className="glass card" key={item.start}>
                      <p className="card-date">{formatPeriod(item.start, item.end, lang)}</p>
                      <h3 className="card-title">{t(item.school)}</h3>
                      <p className="card-note">{t(item.degree)}</p>
                    </div>
                  ))}
                </Section>
              )}
              {cv.languages.length > 0 && (
                <Section id="languages" title={ui.sections.languages}>
                  <dl className="glass card spoken">
                    {cv.languages.map((item) => (
                      <div key={t(item.name)}><dt>{t(item.name)}</dt><dd>{t(item.level)}</dd></div>
                    ))}
                  </dl>
                </Section>
              )}
            </div>
          )}

          <Section id="contact" title={ui.sections.contact}>
            <div className="glass card contact">
              <p className="card-note">{ui.contactLead}</p>
              {profile.email && <a className="contact-email" href={'mailto:' + profile.email}>{profile.email}</a>}
              <ul className="contact-list">
                {profile.links?.map((link) => (
                  <li key={link.url}><span>{link.label}</span><ExternalLink href={link.url}>{link.handle}</ExternalLink></li>
                ))}
                {profile.phone && <li><span>{ui.phone}</span><a href={'tel:' + profile.phone.replace(/\s/g, '')}>{profile.phone}</a></li>}
                {cvHref && <li><span>PDF</span><a href={cvHref} download>{ui.downloadCv}</a></li>}
              </ul>
            </div>
          </Section>
        </main>

        <nav className={'glass dock' + (docked ? ' is-visible' : '')} aria-label={ui.sectionsNav}>
          {navItems.map((id) => <a key={id} href={'#' + id} className={'dock-' + id}>{ui.nav[id]}</a>)}
          {cv.music?.src && (
            <button type="button" className="dock-music" onClick={audio.toggle} aria-label={audio.playing ? ui.pause : ui.play}>
              {audio.playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
          )}
        </nav>
      </div>
    </>
  )
}

export default App
