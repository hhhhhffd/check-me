import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, ExternalLink, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { GithubIcon } from './icons'

function ProjectDialog({ project, onClose }) {
  const closeButtonRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!project) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = dialogRef.current?.querySelectorAll('a[href], button:not([disabled])')
      if (!focusableElements?.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [project, onClose])

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#0d0b14]/85 p-4 backdrop-blur-sm md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.article
            ref={dialogRef}
            layoutId={`project-${project.id || project.slug}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            className="terminal-dialog mx-auto my-4 max-w-4xl p-6 md:my-10 md:p-10"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="terminal-prompt mb-3">~/system $ cat ./projects/{project.slug || project.id}</p>
                <h2 id="project-dialog-title" className="text-3xl font-semibold tracking-tight text-[#ede9f5] md:text-5xl">
                  {project.title}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Закрыть проект"
                onClick={onClose}
                className="terminal-icon-button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(project.tech_stack?.length > 0 || project.tags?.length > 0) && (
              <div className="mt-6 flex flex-wrap gap-2">
                {project.tech_stack?.map((tech) => (
                  <span key={tech} className="terminal-tag">{tech}</span>
                ))}
                {project.tags?.map((tag) => (
                  <span key={tag} className="terminal-tag terminal-tag-muted">#{tag}</span>
                ))}
              </div>
            )}

            <div className="terminal-prose mt-10">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {project.content || project['content-on-card'] || 'Описание проекта пока не добавлено.'}
              </ReactMarkdown>
            </div>

            {project.responsibilities?.length > 0 && (
              <section className="mt-10">
                <p className="terminal-prompt mb-4">~/system $ cat ./contribution.md</p>
                <ul className="terminal-list">
                  {project.responsibilities.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            )}

            {project.outcomes?.length > 0 && (
              <section className="mt-8">
                <p className="terminal-prompt mb-4">~/system $ cat ./outcomes.md</p>
                <ul className="terminal-list">
                  {project.outcomes.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            )}

            <div className="mt-10 flex flex-wrap gap-3">
              {project.github_url && (
                <a className="terminal-button" href={project.github_url} target="_blank" rel="noopener noreferrer">
                  <GithubIcon className="h-4 w-4" />
                  GitHub
                </a>
              )}
              {project.presentation_url && (
                <a className="terminal-button" href={project.presentation_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Открыть проект
                </a>
              )}
              {project.slug && (
                <Link className="terminal-button terminal-button-muted" to={`/project/${project.slug}`}>
                  <ArrowUpRight className="h-4 w-4" />
                  Отдельная страница
                </Link>
              )}
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ProjectDialog
