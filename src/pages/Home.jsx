import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Download, Mail, MapPin } from 'lucide-react'
import GithubActivity from '../components/GithubActivity'
import ProjectDialog from '../components/ProjectDialog'
import { GithubIcon } from '../components/icons'
import { useCvData } from '../context/CvDataContext'
import { resolveAssetUrl } from '../utils/assetUrl'
import { setMetaTag } from '../utils/setMetaTag'

const MAX_VISIBLE_ITEMS = 3

const LINKEDIN_ICON = (
  <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0H5C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5ZM8 19H5V8h3v11ZM6.5 6.73A1.73 1.73 0 1 1 6.5 3a1.73 1.73 0 0 1 0 3.46ZM20 19h-3v-5.6c0-3.37-4-3.11-4 0V19h-3V8h3v1.77c1.4-2.59 7-2.78 7 2.48V19Z" />
  </svg>
)

const TELEGRAM_ICON = (
  <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21.4 4.6 18.2 20c-.24 1.08-.87 1.35-1.76.84l-4.86-3.58-2.34 2.25c-.26.26-.48.48-.98.48l.35-4.95 9-8.13c.39-.35-.09-.55-.61-.2L6.1 13.57l-4.69-1.47c-1.02-.32-1.04-1.02.21-1.51L20 3.5c.85-.32 1.6.2 1.4 1.1Z" />
  </svg>
)

function stripMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_]{1,3}([^*_\n]+)[*_]{1,3}/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
}

function getContactLinks(profile) {
  return [
    { href: profile.github, label: 'GitHub', icon: <GithubIcon className="h-4 w-4" /> },
    { href: profile.telegram, label: 'Telegram', icon: TELEGRAM_ICON },
    { href: profile.linkedin, label: 'LinkedIn', icon: LINKEDIN_ICON },
    { href: profile.email ? `mailto:${profile.email.replace(/^mailto:/, '')}` : '', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  ].filter((link) => Boolean(link.href))
}

function getProjectStack(project) {
  return project.tech_stack?.slice(0, 2).join(' · ') || project.tags?.slice(0, 2).join(' · ') || 'Подробнее'
}

function Home() {
  const { data: cv } = useCvData()
  const [selectedProject, setSelectedProject] = useState(null)
  const lastFocusedElement = useRef(null)
  const profile = cv.profile
  const profileImage = resolveAssetUrl(profile.image)
  const contactLinks = useMemo(() => getContactLinks(profile), [profile])
  const projects = useMemo(
    () => [...cv.projects]
      .filter((project) => Boolean(project.title))
      .sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0))
      .slice(0, MAX_VISIBLE_ITEMS),
    [cv.projects],
  )
  const achievements = useMemo(
    () => [...cv.achievements]
      .filter((achievement) => Boolean(achievement.title))
      .sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0))
      .slice(0, MAX_VISIBLE_ITEMS),
    [cv.achievements],
  )

  const closeProject = useCallback(() => {
    setSelectedProject(null)
    requestAnimationFrame(() => lastFocusedElement.current?.focus())
  }, [])

  const openProject = (project, event) => {
    lastFocusedElement.current = event.currentTarget
    setSelectedProject(project)
  }

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

  const shortAbout = profile.headline || cv.about || profile.bio
  const location = [profile.location?.city, profile.location?.country].filter(Boolean).join(', ')
  const availability = profile.workPreference?.status

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 text-xs text-[#8f88a8]">
          <span className="font-mono">~/portfolio</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4">
          <section className="terminal-card flex min-h-[360px] flex-col justify-between md:col-span-2 lg:col-span-6 lg:row-span-2">
            <div>
              <p className="terminal-prompt">~/cv $ whoami</p>
              <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#ede9f5] sm:text-6xl md:text-7xl">
                {profile.name}
              </h1>
              <p className="mt-5 text-lg text-[#b7aed0] md:text-xl">{profile.title}</p>
            </div>

            <div className="mt-10 space-y-5">
              {(availability || location) && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#8f88a8]">
                  {availability && <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#5eead4]" />{availability}</span>}
                  {location && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{location}</span>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {contactLinks.map((link) => (
                  <a key={link.label} href={link.href} target={link.label === 'Email' ? undefined : '_blank'} rel={link.label === 'Email' ? undefined : 'noopener noreferrer'} className="terminal-button">
                    {link.icon}
                    {link.label}
                  </a>
                ))}
                {profile.cvUrl && (
                  <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" className="terminal-button terminal-button-muted">
                    <Download className="h-4 w-4" />
                    Скачать CV
                  </a>
                )}
              </div>
            </div>
          </section>

          {cv.skillGroups.length > 0 && (
            <section className="terminal-card md:col-span-1 lg:col-span-3">
              <p className="terminal-prompt">~/cv $ env --stack</p>
              <div className="mt-5 space-y-3">
                {cv.skillGroups.slice(0, 3).map((group) => (
                  <div key={group.name}>
                    <p className="text-xs font-medium text-[#b8b1ca]">{group.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#8f88a8]">{group.skills.slice(0, 4).join(' · ')}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {shortAbout && (
            <section className="terminal-card md:col-span-1 lg:col-span-3">
              <p className="terminal-prompt">~/cv $ cat ./about.md</p>
              <p className="mt-5 text-sm leading-6 text-[#c7c1d4]">{shortAbout}</p>
            </section>
          )}

          {projects.length > 0 && (
            <section className={`terminal-card md:col-span-1 ${achievements.length > 0 ? 'lg:col-span-3' : 'lg:col-span-6'}`}>
              <p className="terminal-prompt">~/cv $ ls ./projects --top {MAX_VISIBLE_ITEMS}</p>
              <div>
                {projects.map((project, index) => (
                  <motion.button
                    key={project.id || project.slug || project.title}
                    type="button"
                    layoutId={`project-${project.id || project.slug}`}
                    onClick={(event) => openProject(project, event)}
                    className="terminal-row"
                  >
                    <span className="terminal-row-number">0{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{project.title}</span>
                      <span className="mt-1 block truncate text-xs text-[#8f88a8]">{getProjectStack(project)}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[#a78bfa]" />
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {achievements.length > 0 && (
            <section className={`terminal-card md:col-span-1 ${projects.length > 0 ? 'lg:col-span-3' : 'lg:col-span-6'}`}>
              <p className="terminal-prompt">~/cv $ cat ./achievements.log</p>
              <div>
                {achievements.map((achievement) => {
                  const achievementContent = (
                    <>
                      <span className="terminal-row-number">›</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{achievement.title}</span>
                        {achievement.description && <span className="mt-1 block truncate text-xs text-[#8f88a8]">{stripMarkdown(achievement.description)}</span>}
                      </span>
                      {achievement.url && <ArrowUpRight className="h-4 w-4 shrink-0 text-[#a78bfa]" />}
                    </>
                  )

                  return achievement.url ? (
                    <a key={achievement.id || achievement.title} className="terminal-row" href={achievement.url} target="_blank" rel="noopener noreferrer">
                      {achievementContent}
                    </a>
                  ) : (
                    <div key={achievement.id || achievement.title} className="terminal-row">
                      {achievementContent}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <GithubActivity githubUrl={profile.github} />
        </div>

        <footer className="mt-5 flex justify-end px-1 text-xs text-[#635c76]">
          {profile.name} © {new Date().getFullYear()}
        </footer>
      </div>

      <ProjectDialog project={selectedProject} onClose={closeProject} />
    </main>
  )
}

export default Home
