import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, FileText, Mail } from 'lucide-react'
import ProjectCard from '../components/ProjectCard'
import ThemeToggle from '../components/ThemeToggle'
import profile from '../data/profile.json'
import projectsData from '../data/projects.json'
import { resolveAssetUrl } from '../utils/assetUrl'

const PROJECTS_PER_PAGE = 6

const GithubIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
)

const LinkedinIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
  </svg>
)

const TelegramIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z" />
  </svg>
)

const InstagramIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6zm9.65 1.55a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.2A2.8 2.8 0 1 0 12 14.8 2.8 2.8 0 0 0 12 9.2z" />
  </svg>
)

const FacebookIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.023 4.388 11.014 10.125 11.927v-8.438H7.078V12.07h3.047V9.413c0-3.017 1.792-4.685 4.533-4.685 1.313 0 2.686.235 2.686.235v2.962h-1.514c-1.492 0-1.956.93-1.956 1.886v2.26h3.328l-.532 3.492h-2.796V24C19.612 23.087 24 18.096 24 12.073z" />
  </svg>
)

const YoutubeIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5v-7l6.2 3.5-6.2 3.5z" />
  </svg>
)

function Home() {
  const [visibleCount, setVisibleCount] = useState(PROJECTS_PER_PAGE)
  const [copyToast, setCopyToast] = useState({ visible: false, text: '' })
  const profileEmail = profile?.email || profile?.mail || ''
  const profileImage = resolveAssetUrl(profile?.image)
  const profileCvUrl = profile?.cv_url || profile?.cv || ''
  const projects = useMemo(
    () => [...projectsData].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [],
  )

  const contactLinks = [
    { key: 'github', href: profile?.github, label: 'GitHub', icon: GithubIcon },
    { key: 'linkedin', href: profile?.linkedin, label: 'LinkedIn', icon: LinkedinIcon },
    { key: 'telegram', href: profile?.telegram, label: 'Telegram', icon: TelegramIcon },
    {
      key: 'email',
      href: profileEmail,
      label: 'Email',
      icon: Mail,
      external: false,
    },
    { key: 'cv', href: profileCvUrl, label: 'CV', icon: FileText },
    { key: 'instagram', href: profile?.instagram, label: 'Instagram', icon: InstagramIcon },
    { key: 'facebook', href: profile?.facebook, label: 'Facebook', icon: FacebookIcon },
    { key: 'youtube', href: profile?.youtube, label: 'YouTube', icon: YoutubeIcon },
  ].filter((item) => Boolean(item.href))

  const visibleProjects = projects.slice(0, visibleCount)
  const hasMore = visibleCount < projects.length

  const setMetaTag = (selector, attribute, value) => {
    let element = document.head.querySelector(selector)
    if (!element) {
      element = document.createElement('meta')
      const attrName = selector.includes('property=') ? 'property' : 'name'
      const match = selector.match(/"(.*?)"/)
      if (match?.[1]) element.setAttribute(attrName, match[1])
      document.head.appendChild(element)
    }
    element.setAttribute(attribute, value)
  }

  const showCopyToast = (text) => {
    setCopyToast({ visible: true, text })
    setTimeout(() => setCopyToast({ visible: false, text: '' }), 1800)
  }

  const handleEmailCopy = async (event) => {
    event.preventDefault()
    const emailToCopy = profileEmail.replace(/^mailto:/, '').trim()
    if (!emailToCopy) return

    try {
      await navigator.clipboard.writeText(emailToCopy)
      showCopyToast('Скопировано')
    } catch {
      showCopyToast('Не удалось скопировать')
    }
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PROJECTS_PER_PAGE)
  }

  const scrollToProjects = () => {
    document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  useEffect(() => {
    document.documentElement.lang = 'ru'

    const baseTitle = profile?.name ? `${profile.name} — Портфолио` : 'Портфолио разработчика'
    const description = profile?.bio || 'Личный сайт-портфолио: проекты, стек и контакты.'

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
  }, [profileImage])

  return (
    <div className="min-h-screen relative overflow-hidden font-sans transition-colors duration-500">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/20 dark:bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none will-change-auto" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[80px] pointer-events-none will-change-auto" />

      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <AnimatePresence>
        {copyToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-6 z-50 glass-panel px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 dark:text-white"
          >
            {copyToast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
        <section className="min-h-screen flex flex-col justify-center items-center relative">
          <motion.header
            className="text-center w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="inline-block mb-8 relative group cursor-default">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500" />
              <div className="relative w-36 h-36 mx-auto bg-white dark:bg-[#1a1a2e] border-2 border-indigo-200 dark:border-indigo-500/30 rounded-full p-2 flex items-center justify-center shadow-xl">
                {profileImage ? (
                  <img src={profileImage} alt={profile.name} className="w-full h-full object-cover rounded-full shadow-inner" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-full flex items-center justify-center text-5xl font-bold text-indigo-600 dark:text-white tracking-tighter shadow-inner">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 tracking-tight mb-4 drop-shadow-sm">
              {profile.name}
            </motion.h1>

            <motion.p variants={itemVariants} className="text-2xl md:text-3xl text-indigo-600 dark:text-indigo-400/90 font-medium mb-8 tracking-wide">
              {profile.title}
            </motion.p>

            <motion.p variants={itemVariants} className="max-w-3xl mx-auto text-gray-600 dark:text-white/60 text-lg md:text-xl leading-relaxed mb-10">
              {profile.bio}
            </motion.p>

            <motion.div variants={itemVariants} className="flex justify-center flex-wrap gap-4 md:gap-6">
              {contactLinks.map(({ key, href, label, icon: Icon, external = true }) => (
                <a
                  key={key}
                  href={key === 'email' ? '#' : href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  onClick={key === 'email' ? handleEmailCopy : undefined}
                  className="glass-button px-6 py-3 rounded-xl flex items-center gap-3 font-medium hover:scale-105 transition-transform"
                >
                  <Icon className="w-6 h-6" />
                  {label}
                </a>
              ))}
            </motion.div>
          </motion.header>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-10 cursor-pointer text-gray-400 dark:text-white/50 hover:text-indigo-500 transition-colors"
            onClick={scrollToProjects}
          >
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
              <ChevronDown className="w-10 h-10" />
            </motion.div>
          </motion.div>
        </section>

        <section id="projects-section" className="py-20 min-h-screen">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">Мои проекты</h2>
            <div className="h-px bg-gradient-to-r from-indigo-300 dark:from-indigo-500/50 to-transparent flex-grow" />
          </div>

          {projects.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center shadow-xl">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Нет проектов</h3>
              <p className="text-gray-600 dark:text-white/60 text-lg max-w-md mx-auto">
                Добавьте проекты в <code>src/data/projects.json</code>.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                <AnimatePresence>
                  {visibleProjects.map((project, index) => (
                    <ProjectCard key={project.id || project.slug} project={project} index={index % 6} />
                  ))}
                </AnimatePresence>
              </div>

              {hasMore && (
                <div className="text-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="glass-button px-8 py-3 rounded-full font-semibold text-lg inline-flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                  >
                    Показать еще
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="pb-6 pt-0 flex justify-end px-6">
          <p className="text-gray-500 dark:text-white/50 text-sm font-medium">
            hhhhhffd &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  )
}

export default Home
