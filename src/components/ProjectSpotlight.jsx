import { ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import SpotlightFrame from './SpotlightFrame'
import { getProjectDescription, getProjectStack } from '../utils/cvPresentation'
import { resolveAssetUrl } from '../utils/assetUrl'

export default function ProjectSpotlight({ projects, onOpen, className }) {
  return (
    <SpotlightFrame
      command="~/cv $ ls ./projects --spotlight"
      items={projects}
      className={className}
      getPreview={(project) => resolveAssetUrl(project?.thumbnail)}
      renderItem={(project) => (
        <motion.button
          type="button"
          layoutId={`project-${project.id || project.slug}`}
          onClick={(event) => onOpen(project, event)}
          className="spotlight-main"
          aria-label={`Открыть проект ${project.title}`}
        >
          <span className="spotlight-eyebrow">{project.status || project.period || 'PROJECT'}</span>
          <span className="spotlight-title">{project.title}</span>
          <span className="spotlight-description">
            {getProjectDescription(project) || 'Описание проекта пока не добавлено.'}
          </span>
          <span className="spotlight-stack">{getProjectStack(project)}</span>
        </motion.button>
      )}
      renderAction={(project) => (
        <button
          type="button"
          className="spotlight-action"
          onClick={(event) => onOpen(project, event)}
          aria-label={`Открыть проект ${project.title}`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      )}
    />
  )
}
