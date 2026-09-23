import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import MusicExperience from '../components/MusicExperience'
import ProjectDialog from '../components/ProjectDialog'
import { useCvData } from '../context/CvDataContext'
import { resolveAssetUrl } from '../utils/assetUrl'
import { sortByDateDesc } from '../utils/cvPresentation'
import { setMetaTag } from '../utils/setMetaTag'
import './home.css'

const SHORT_STACK = ['Python', 'TypeScript', 'FastAPI', 'React', 'PostgreSQL']

function getCurrentTime() {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function Home() {
  const { data: cv } = useCvData()
  const [selectedProject, setSelectedProject] = useState(null)
  const [currentTime, setCurrentTime] = useState(getCurrentTime)
  const lastFocusedElement = useRef(null)
  const profile = cv.profile
  const handle = profile.handle || profile.name
  const profileImage = resolveAssetUrl(profile.image)
  const email = profile.email?.replace(/^mailto:/, '')
  const projects = useMemo(
    () => sortByDateDesc(cv.projects).filter((project) => Boolean(project.title)).slice(0, 4),
    [cv.projects],
  )
  const availableSkills = cv.skillGroups?.flatMap((group) => group.skills || []) || []
  const shortStack = SHORT_STACK.filter((skill) => availableSkills.includes(skill))
  const socialLinks = [
    { label: 'github', href: profile.github },
    { label: 'telegram', href: profile.telegram },
    { label: 'linkedin', href: profile.linkedin },
    { label: 'email', href: email ? 'mailto:' + email : '' },
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
    const baseTitle = cv.meta?.siteTitle || (profile.name ? profile.name + ' — Портфолио' : 'Портфолио разработчика')
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
      <section className="bio-terminal" aria-label="Профиль в терминале">
        <header className="bio-terminal-bar">
          <div className="bio-window-dots" aria-hidden="true"><i /><i /><i /></div>
          <span className="bio-window-title">{handle}@devbox <span>~/portfolio</span></span>
          <time className="bio-window-time">{profile.location?.timezone || 'LOCAL'} · {currentTime}</time>
        </header>

        <div className="bio-terminal-body">
          <section className="bio-command-block" aria-labelledby="bio-name">
            <p className="bio-command"><span>$</span> whoami</p>
            <div className="bio-identity">
              <span className="bio-monogram" aria-hidden="true">{handle.slice(0, 1).toUpperCase()}.</span>
              <div>
                <h1 id="bio-name">{profile.name}</h1>
                <p><span className="bio-handle">@{handle}</span> <span className="bio-separator">/</span> {profile.title}</p>
              </div>
            </div>
          </section>

          <section className="bio-command-block" aria-label="Обо мне">
            <p className="bio-command"><span>$</span> cat bio.txt</p>
            <p className="bio-output bio-description">{profile.bio}</p>
          </section>

          {projects.length > 0 && (
            <section className="bio-command-block" id="projects" aria-label="Проекты">
              <p className="bio-command"><span>$</span> ls projects/ <span className="bio-command-count">{String(projects.length).padStart(2, '0')} items</span></p>
              <div className="bio-project-list">
                {projects.map((project, index) => (
                  <button
                    type="button"
                    className="bio-project"
                    key={project.id || project.slug}
                    onClick={(event) => openProject(project, event)}
                    aria-label={'Открыть проект ' + project.title}
                  >
                    <span className="bio-project-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="bio-project-title">{project.title}</span>
                    <span className="bio-project-category">{project.status || 'PROJECT'}</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {shortStack.length > 0 && (
            <section className="bio-command-block" aria-label="Основной стек">
              <p className="bio-command"><span>$</span> stack --short</p>
              <p className="bio-output bio-stack">{shortStack.join('  ·  ')}</p>
            </section>
          )}

          {socialLinks.length > 0 && (
            <section className="bio-command-block" aria-label="Ссылки">
              <p className="bio-command"><span>$</span> open links</p>
              <div className="bio-links">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                  >
                    [ {link.label} <ArrowUpRight size={13} aria-hidden="true" /> ]
                  </a>
                ))}
              </div>
            </section>
          )}

          <div className="bio-terminal-end">
            <span className="bio-command"><span>$</span> <span className="bio-cursor" aria-hidden="true" /></span>
            <span className="bio-status"><i aria-hidden="true" />{profile.workPreference?.status || 'building'}{profile.location?.city && <> · {profile.location.city}</>}</span>
          </div>
        </div>

        {cv.music?.src && <footer className="bio-terminal-footer"><MusicExperience music={cv.music} /></footer>}
      </section>
      <p className="bio-outside-note">{handle} <span>/</span> personal terminal</p>
      <ProjectDialog project={selectedProject} onClose={closeProject} />
    </main>
  )
}

export default Home
