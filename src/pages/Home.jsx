import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, ChevronDown, Mail, MapPin, Send } from 'lucide-react'
import GithubOverview from '../components/GithubOverview'
import ProjectDialog from '../components/ProjectDialog'
import { GithubIcon } from '../components/icons'
import { useCvData } from '../context/CvDataContext'
import { resolveAssetUrl } from '../utils/assetUrl'
import { getNowEntries, getProjectDescription, sortByDateDesc } from '../utils/cvPresentation'
import { setMetaTag } from '../utils/setMetaTag'
import './home.css'

const MAX_VISIBLE_ITEMS = 4

function getCurrentTime() {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

function Home() {
  const { data: cv } = useCvData()
  const [selectedProject, setSelectedProject] = useState(null)
  const [currentTime, setCurrentTime] = useState(getCurrentTime)
  const lastFocusedElement = useRef(null)
  const profile = cv.profile
  const handle = profile.handle || profile.name
  const profileImage = resolveAssetUrl(profile.image)
  const location = [profile.location?.city, profile.location?.country].filter(Boolean).join(', ')
  const email = profile.email?.replace(/^mailto:/, '')
  const contactUrl = profile.telegram || (email ? `mailto:${email}` : profile.github)
  const projects = useMemo(
    () => sortByDateDesc(cv.projects).filter((project) => Boolean(project.title)).slice(0, MAX_VISIBLE_ITEMS),
    [cv.projects],
  )
  const nowEntries = getNowEntries(cv)
  const socialLinks = [
    { label: 'GitHub', href: profile.github, icon: <GithubIcon className="h-5 w-5" /> },
    { label: 'Telegram', href: profile.telegram, icon: <Send size={19} /> },
    { label: 'LinkedIn', href: profile.linkedin, icon: <span className="bio-linkedin-mark">in</span> },
    { label: 'Email', href: email ? `mailto:${email}` : '', icon: <Mail size={19} /> },
  ].filter((link) => link.href)

  const closeProject = useCallback(() => {
    setSelectedProject(null)
    requestAnimationFrame(() => lastFocusedElement.current?.focus())
  }, [])

  const openProject = useCallback((project, event) => {
    lastFocusedElement.current = event.currentTarget
    setSelectedProject(project)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(getCurrentTime()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    document.documentElement.lang = cv.meta?.locale || 'ru'
    const baseTitle = cv.meta?.siteTitle || (profile.name ? `${profile.name} — Портфолио` : 'Портфолио разработчика')
    const description = cv.meta?.siteDescription || profile.bio || 'Личный сайт-портфолио: проекты, стек и контакты.'

    document.title = baseTitle
    setMetaTag('meta[name="description"]', 'content', description)
    setMetaTag('meta[property="og:title"]', 'content', baseTitle)
    setMetaTag('meta[property="og:description"]', 'content', description)
    setMetaTag('meta[property="og:type"]', 'content', 'website')
    if (profileImage) setMetaTag('meta[property="og:image"]', 'content', profileImage)
    setMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image')
    setMetaTag('meta[name="twitter:title"]', 'content', baseTitle)
    setMetaTag('meta[name="twitter:description"]', 'content', description)
    if (profileImage) setMetaTag('meta[name="twitter:image"]', 'content', profileImage)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', window.location.origin + window.location.pathname)
  }, [cv.meta, profile, profileImage])

  return (
    <main className="bio-page" id="top">
      <div className="bio-backdrop" aria-hidden="true" />
      <header className="bio-topbar">
        <a href="#top" className="bio-wordmark" aria-label="Наверх">
          {handle.slice(0, 1).toLowerCase()}<span>.</span>
        </a>
        <span className="bio-topbar-label">PERSONAL SPACE <span>/</span> {new Date().getFullYear()}</span>
        <a href="#projects" className="bio-topbar-link">PROJECTS <ArrowDown size={14} /></a>
      </header>

      <div className="bio-intro">
        <section className="bio-profile" aria-labelledby="bio-name">
          <div className="bio-profile-top">
            <span>{handle.toUpperCase()} / ONLINE</span>
            <span>{profile.location?.timezone || 'LOCAL'} · {currentTime}</span>
          </div>
          <div className="bio-avatar">
            {profileImage
              ? <img src={profileImage} alt={profile.name} />
              : <span aria-hidden="true">{handle.slice(0, 1).toUpperCase()}</span>}
            <span className="bio-avatar-status" aria-label="Online" />
          </div>
          <p className="bio-real-name">{profile.name}</p>
          <h1 id="bio-name">{handle}<span>.</span></h1>
          <p className="bio-role">{profile.title}{profile.headline && <> <span>✦</span> {profile.headline}</>}</p>
          <p className="bio-description">{profile.bio}</p>
          <div className="bio-presence">
            <span className="bio-presence-dot" />
            {profile.workPreference?.status || 'building'}
            {location && <span className="bio-presence-place"><MapPin size={13} /> {location}</span>}
          </div>
          <div className="bio-socials" aria-label="Ссылки на профили">
            {socialLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                aria-label={link.label}
                title={link.label}
              >
                {link.icon}
              </a>
            ))}
          </div>
          <div className="bio-profile-actions">
            {contactUrl && (
              <a
                href={contactUrl}
                target={contactUrl.startsWith('mailto:') ? undefined : '_blank'}
                rel={contactUrl.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                className="bio-main-link"
              >
                Написать мне <ArrowUpRight size={18} />
              </a>
            )}
            <a href="#projects" className="bio-quiet-link">Мои проекты <ArrowDown size={17} /></a>
          </div>
          <div className="bio-profile-bottom">
            <span>BUILDING THINGS THAT WORK</span><span>01 / 03</span>
          </div>
        </section>
        <a className="bio-scroll-cue" href="#projects">
          <span>SCROLL TO EXPLORE</span><ChevronDown size={17} />
        </a>
      </div>

      <div className="bio-content">
        {projects.length > 0 && (
          <section className="bio-section" id="projects" aria-labelledby="projects-heading">
            <div className="bio-section-heading">
              <div>
                <p className="bio-eyebrow">01 / SELECTED WORK</p>
                <h2 id="projects-heading">То, что я <em>построил.</em></h2>
              </div>
              <p>Продукты, в которых идея стала работающей системой.</p>
            </div>
            <div className="bio-project-list">
              {projects.map((project, index) => (
                <button
                  type="button"
                  className="bio-project"
                  key={project.id || project.slug}
                  onClick={(event) => openProject(project, event)}
                  aria-label={`Открыть проект ${project.title}`}
                >
                  <span className="bio-project-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="bio-project-image">
                    {project.thumbnail && <img src={resolveAssetUrl(project.thumbnail)} alt="" loading="lazy" />}
                  </span>
                  <span className="bio-project-body">
                    <span className="bio-project-category">{project.status || 'PROJECT'}</span>
                    <strong>{project.title}</strong>
                    <span className="bio-project-description">{getProjectDescription(project)}</span>
                    <span className="bio-project-stack">{project.tech_stack?.slice(0, 3).join(' · ')}</span>
                  </span>
                  <span className="bio-project-arrow"><ArrowUpRight size={20} /></span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="bio-section bio-about" id="about" aria-labelledby="about-heading">
          <div className="bio-about-copy">
            <p className="bio-eyebrow">02 / ABOUT</p>
            <h2 id="about-heading">Чуть больше,<br /><em>чем bio.</em></h2>
            <p>{cv.about || profile.headline || profile.bio}</p>
          </div>
          <div className="bio-about-details">
            <p className="bio-details-title">/ CURRENT SETUP</p>
            {cv.skillGroups?.map((group) => (
              <div className="bio-skill-row" key={group.name}>
                <span>{group.name}</span><span>{group.skills?.join(' · ')}</span>
              </div>
            ))}
            {nowEntries.length > 0 && (
              <div className="bio-now">
                <span>RIGHT NOW</span>
                {nowEntries.map((entry) => (
                  <p key={entry.label}><strong>{entry.label}</strong>{entry.value}</p>
                ))}
              </div>
            )}
          </div>
        </section>

        {profile.github && (
          <section className="bio-section bio-github" aria-labelledby="github-heading">
            <div className="bio-section-heading">
              <div>
                <p className="bio-eyebrow">03 / ACTIVITY</p>
                <h2 id="github-heading">Следы <em>в коде.</em></h2>
              </div>
            </div>
            <GithubOverview githubUrl={profile.github} githubActivityApiUrl={profile.githubActivityApiUrl} />
          </section>
        )}

        <footer className="bio-footer" id="contact">
          <p className="bio-eyebrow">GOT AN IDEA?</p>
          <h2>Давай сделаем<br /><em>что-то крутое.</em></h2>
          {contactUrl && (
            <a
              className="bio-footer-contact"
              href={contactUrl}
              target={contactUrl.startsWith('mailto:') ? undefined : '_blank'}
              rel={contactUrl.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
            >
              Связаться <ArrowUpRight size={24} />
            </a>
          )}
          <div className="bio-footer-bottom">
            <span>© {new Date().getFullYear()} {handle}</span>
            <div>
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                >
                  {link.label}
                </a>
              ))}
              {(profile.cvUrl || profile.cv_url) && (
                <a href={profile.cvUrl || profile.cv_url} target="_blank" rel="noopener noreferrer">CV</a>
              )}
            </div>
            <a href="#top">Наверх ↑</a>
          </div>
        </footer>
      </div>
      <ProjectDialog project={selectedProject} onClose={closeProject} />
    </main>
  )
}

export default Home
