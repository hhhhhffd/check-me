import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getProjectDescription } from '../utils/cvPresentation'

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

    const previousOverflow = document.body.style.overflow
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [project, onClose])

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="bio-project-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.article
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            className="bio-project-dialog"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
          >
            <div className="bio-project-dialog-bar">
              <span><b>$</b> open projects/{project.slug || project.id}</span>
              <button ref={closeButtonRef} type="button" aria-label="Закрыть проект" onClick={onClose}>
                <X size={17} />
              </button>
            </div>
            <div className="bio-project-dialog-body">
              <p className="bio-project-dialog-label">{project.status || 'PROJECT'}</p>
              <h2 id="project-dialog-title">{project.title}</h2>
              <p className="bio-project-dialog-description">{getProjectDescription(project)}</p>
              {project.tech_stack?.length > 0 && (
                <div className="bio-project-dialog-stack">
                  <span>STACK</span>
                  <p>{project.tech_stack.join('  ·  ')}</p>
                </div>
              )}
              <div className="bio-project-dialog-links">
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer">[ github <ArrowUpRight size={14} /> ]</a>
                )}
                {project.presentation_url && (
                  <a href={project.presentation_url} target="_blank" rel="noopener noreferrer">[ demo <ArrowUpRight size={14} /> ]</a>
                )}
                {project.youtube_pitch_url && (
                  <a href={project.youtube_pitch_url} target="_blank" rel="noopener noreferrer">[ video <ArrowUpRight size={14} /> ]</a>
                )}
                {project.slug && <Link to={'/project/' + project.slug}>[ подробнее <ArrowUpRight size={14} /> ]</Link>}
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ProjectDialog
