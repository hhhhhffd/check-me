import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GithubOverview from '../components/GithubOverview'
import ProjectDialog from '../components/ProjectDialog'
import ProfileCard from '../components/ProfileCard'
import StackCard from '../components/StackCard'
import AboutCard from '../components/AboutCard'
import ProjectSpotlight from '../components/ProjectSpotlight'
import AchievementSpotlight from '../components/AchievementSpotlight'
import ThemeToggle from '../components/ThemeToggle'
import { useCvData } from '../context/CvDataContext'
import { resolveAssetUrl } from '../utils/assetUrl'
import { sortByDateDesc } from '../utils/cvPresentation'
import { setMetaTag } from '../utils/setMetaTag'

const MAX_VISIBLE_ITEMS = 4

function getCurrentTime() {
  return new Intl.DateTimeFormat('ru-RU', {
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
  const profileImage = resolveAssetUrl(profile.image)
  const projects = useMemo(
    () => sortByDateDesc(cv.projects)
      .filter((project) => Boolean(project.title))
      .slice(0, MAX_VISIBLE_ITEMS),
    [cv.projects],
  )
  const achievements = useMemo(
    () => sortByDateDesc(cv.achievements)
      .filter((achievement) => Boolean(achievement.title))
      .slice(0, MAX_VISIBLE_ITEMS),
    [cv.achievements],
  )

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

  const shortAbout = cv.about || profile.headline || profile.bio
  const handle = profile.handle || profile.name

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="portfolio-header mb-5">
          <div className="portfolio-breadcrumb text-xs">
            <span className="font-mono">{handle}@web:~$</span>
            <span className="portfolio-status"><i aria-hidden="true" /> online</span>
          </div>
          <div className="portfolio-header-tools">
            <span className="portfolio-time">{profile.location?.timezone || 'local'} · {currentTime}</span>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4">
          <ProfileCard profile={profile} />
          <StackCard groups={cv.skillGroups} />
          <AboutCard profile={profile} about={shortAbout} languages={cv.languages} cv={cv} />

          {projects.length > 0 && (
            <ProjectSpotlight
              projects={projects}
              onOpen={openProject}
              className={`md:col-span-1 ${achievements.length > 0 ? 'lg:col-span-3' : 'lg:col-span-6'}`}
            />
          )}

          {achievements.length > 0 && (
            <AchievementSpotlight
              achievements={achievements}
              className={`md:col-span-1 ${projects.length > 0 ? 'lg:col-span-3' : 'lg:col-span-6'}`}
            />
          )}

          <GithubOverview
            githubUrl={profile.github}
            githubActivityApiUrl={profile.githubActivityApiUrl}
          />
        </div>

        <footer className="portfolio-footer mt-5 px-1 text-xs">
          <span>source: public/cv.jsonc</span>
          <span>{handle} © {new Date().getFullYear()}</span>
        </footer>
      </div>

      <ProjectDialog project={selectedProject} onClose={closeProject} />
    </main>
  )
}

export default Home
