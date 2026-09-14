import { ArrowUpRight } from 'lucide-react'
import SpotlightFrame from './SpotlightFrame'
import {
  getAchievementDescription,
  getAchievementLink,
  getAchievementMeta,
} from '../utils/cvPresentation'
import { resolveAssetUrl } from '../utils/assetUrl'

function AchievementContent({ achievement, link }) {
  const meta = getAchievementMeta(achievement)
  const content = (
    <span className="spotlight-main spotlight-achievement-main">
      <span className="spotlight-place-number" aria-hidden="true">{meta.placeNumber || '—'}</span>
      <span className="spotlight-eyebrow">{meta.year || 'ACHIEVEMENT'}</span>
      <span className="spotlight-place-label">{meta.placeLabel}</span>
      <span className="spotlight-title">{meta.event}</span>
      <span className="spotlight-description">
        {getAchievementDescription(achievement) || 'Достижение пока не описано.'}
      </span>
    </span>
  )

  return link ? (
    <a className="spotlight-main-link" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Открыть достижение ${meta.event}`}>
      {content}
    </a>
  ) : content
}

export default function AchievementSpotlight({ achievements, className }) {
  return (
    <SpotlightFrame
      command="~/system $ cat ./achievements.log"
      items={achievements}
      className={className}
      spotlightClassName="spotlight-achievement"
      getPreview={(achievement) => resolveAssetUrl(achievement?.thumbnail || achievement?.image)}
      renderItem={(achievement) => (
        <AchievementContent achievement={achievement} link={getAchievementLink(achievement)} />
      )}
      renderAction={(achievement) => {
        const link = getAchievementLink(achievement)
        if (!link) return null

        return (
          <a
            className="spotlight-action"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Открыть достижение ${getAchievementMeta(achievement).event}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )
      }}
    />
  )
}
