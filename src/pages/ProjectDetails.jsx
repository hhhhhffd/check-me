import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MonitorPlay } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ThemeToggle from '../components/ThemeToggle'
import ImageCarousel from '../components/ImageCarousel'
import { GithubIcon } from '../components/icons'
import { useCvData } from '../context/CvDataContext'
import { resolveAssetUrl } from '../utils/assetUrl'
import { setMetaTag } from '../utils/setMetaTag'

function ProjectDetails() {
  const { slug } = useParams()
  const { data: cv } = useCvData()
  const [copyStatus, setCopyStatus] = useState(null)
  const project = useMemo(
    () => cv.projects.find((item) => item.slug === slug),
    [cv.projects, slug],
  )
  const projectThumbnail = resolveAssetUrl(project?.thumbnail)
  const projectImages = useMemo(
    () => [project?.thumbnail, ...(project?.gallery || [])]
      .filter(Boolean)
      .map((image) => resolveAssetUrl(image)),
    [project],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.lang = 'ru'

    if (!project) {
      document.title = 'Проект не найден'
      return
    }

    const title = `${project.title} — Проект`
    const description = (project.content || 'Подробности проекта в портфолио.')
      .replace(/[#*_`>\-\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180)

    document.title = title
    setMetaTag('meta[name="description"]', 'content', description)
    setMetaTag('meta[property="og:title"]', 'content', title)
    setMetaTag('meta[property="og:description"]', 'content', description)
    setMetaTag('meta[property="og:type"]', 'content', 'article')
    if (projectThumbnail) setMetaTag('meta[property="og:image"]', 'content', projectThumbnail)
    setMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image')
    setMetaTag('meta[name="twitter:title"]', 'content', title)
    setMetaTag('meta[name="twitter:description"]', 'content', description)
    if (projectThumbnail) setMetaTag('meta[name="twitter:image"]', 'content', projectThumbnail)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', window.location.origin + window.location.pathname)
  }, [project, projectThumbnail])

  const handleCopyProjectLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyStatus('Ссылка скопирована')
    } catch {
      setCopyStatus('Не удалось скопировать')
    } finally {
      setTimeout(() => setCopyStatus(null), 1800)
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0f] flex flex-col items-center justify-center p-4 font-sans transition-colors duration-500">
        <div className="glass-panel px-8 py-8 rounded-2xl max-w-md text-center shadow-xl mb-6">
          <div className="text-red-500 text-2xl font-bold mb-4">Упс!</div>
          <p className="text-gray-700 dark:text-white/70 text-lg">Проект не найден</p>
        </div>
        <Link to="/" className="glass-button px-6 py-3 rounded-full flex items-center gap-2 font-medium">
          <ArrowLeft className="w-5 h-5" />
          Вернуться на главную
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-sans transition-colors duration-500 bg-gray-50 dark:bg-[#0a0a0f]">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none transition-colors duration-500" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[120px] pointer-events-none transition-colors duration-500" />

      <AnimatePresence>
        {copyStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-6 z-50 glass-panel px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 dark:text-white"
          >
            {copyStatus}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex items-center justify-between"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 dark:text-white/50 dark:hover:text-indigo-400 transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            Назад к проектам
          </Link>
          <ThemeToggle />
        </motion.div>

        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
            {project.title}
          </h1>

          {(project.tech_stack?.length > 0 || project.tags?.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-8">
              {project.tech_stack?.map((tech, i) => (
                <span key={`tech-${i}`} className="glass-button px-4 py-1.5 rounded-full text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  {tech}
                </span>
              ))}
              {project.tags?.map((tag, i) => (
                <span key={`tag-${i}`} className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-200/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="glass-button px-6 py-3 rounded-xl flex items-center gap-2 font-medium hover:scale-105 transition-transform dark:text-white">
                <GithubIcon className="w-5 h-5" />
                Репозиторий
              </a>
            )}
            {project.presentation_url && (
              <a href={project.presentation_url} target="_blank" rel="noopener noreferrer" className="glass-button px-6 py-3 rounded-xl flex items-center gap-2 font-medium text-purple-600 dark:text-purple-300 hover:scale-105 transition-transform">
                <MonitorPlay className="w-5 h-5" />
                Смотреть проект
              </a>
            )}
            {project.youtube_pitch_url && (
              <a href={project.youtube_pitch_url} target="_blank" rel="noopener noreferrer" className="glass-button px-6 py-3 rounded-xl flex items-center gap-2 font-medium text-red-600 dark:text-red-400 hover:scale-105 transition-transform">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                YouTube Питч
              </a>
            )}
            <button
              type="button"
              onClick={handleCopyProjectLink}
              className="glass-button px-6 py-3 rounded-xl flex items-center gap-2 font-medium hover:scale-105 transition-transform"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              Копировать ссылку
            </button>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-3xl mb-16 shadow-2xl relative h-[400px] md:h-[600px] p-4 md:p-8 flex flex-col"
        >
          <ImageCarousel
            images={projectImages}
            alt={project.title}
            imageClassName="w-full h-full object-contain"
          />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-8 md:p-12 rounded-3xl mb-16 prose prose-lg dark:prose-invert prose-indigo max-w-none text-gray-800 dark:text-white/80 leading-relaxed"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {project.content}
          </ReactMarkdown>
        </motion.section>

        <div className="mt-32 pt-10 border-t border-gray-200 dark:border-white/5 flex flex-col items-center justify-center text-center">
          <Link to="/" className="glass-button px-8 py-3 rounded-full flex items-center gap-2 font-medium mb-8 hover:scale-105 transition-transform">
            <ArrowLeft className="w-5 h-5" />
            Все проекты
          </Link>
        </div>

        <footer className="pb-6 pt-0 flex justify-end px-6">
          <p className="text-gray-500 dark:text-white/50 text-sm font-medium">
            hhhhhffd &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
        <Link to="/" className="glass-button w-full px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-medium">
          <ArrowLeft className="w-5 h-5" />
          Назад к проектам
        </Link>
      </div>
    </div>
  )
}

export default ProjectDetails
