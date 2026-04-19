import { useMemo } from 'react'
import { motion } from 'framer-motion'
import ImageCarousel from './ImageCarousel'
import { resolveAssetUrl } from '../utils/assetUrl'

function placeBadgeClass(place) {
  if (!place) return null
  const p = place.toLowerCase()
  if (p.includes('1') || p.includes('победит') || p.includes('winner')) {
    return 'bg-amber-400/20 border-amber-400/50 text-amber-500 dark:text-amber-300'
  }
  if (p.includes('2')) {
    return 'bg-gray-300/20 border-gray-400/50 text-gray-500 dark:text-gray-300'
  }
  if (p.includes('3') || p.includes('призёр') || p.includes('призер')) {
    return 'bg-orange-400/20 border-orange-400/50 text-orange-500 dark:text-orange-300'
  }
  return 'bg-indigo-400/20 border-indigo-400/50 text-indigo-600 dark:text-indigo-300'
}

function AchievementCard({ achievement, index }) {
  const { title, event, place, description, tech_stack, tags, thumbnail, gallery, github_url, presentation_url, youtube_pitch_url } = achievement

  const allImages = useMemo(
    () => [thumbnail, ...(gallery || [])].filter(Boolean).map((img) => resolveAssetUrl(img)),
    [thumbnail, gallery],
  )

  const hasLinks = github_url || presentation_url || youtube_pitch_url

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card rounded-2xl overflow-hidden flex flex-col h-full"
    >
      {allImages.length > 0 && (
        <div className="relative shrink-0 block p-4 pb-0 h-[220px]">
          <ImageCarousel images={allImages} />
        </div>
      )}

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
            {title}
          </h2>
          {place && (
            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${placeBadgeClass(place)}`}>
              {place}
            </span>
          )}
        </div>

        {event && (
          <p className="text-sm font-medium text-indigo-500 dark:text-indigo-400 mb-3">
            {event}
          </p>
        )}

        {description && (
          <p className="text-gray-600 dark:text-white/60 text-sm leading-relaxed mb-4 flex-grow">
            {description}
          </p>
        )}

        {(tech_stack?.length > 0 || tags?.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tech_stack?.map((tech, i) => (
              <span key={`tech-${i}`} className="glass-button px-3 py-1 rounded-full text-xs font-medium">
                {tech}
              </span>
            ))}
            {tags?.map((tag, i) => (
              <span key={`tag-${i}`} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {hasLinks && (
          <div className="flex flex-col gap-3 mt-auto">
            {github_url && (
              <a
                href={github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-button w-full py-3 px-2 rounded-xl font-semibold text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            )}
            {presentation_url && (
              <a
                href={presentation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-button w-full py-3 px-2 rounded-xl font-semibold text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:text-purple-600 dark:hover:text-purple-200 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Презентация
              </a>
            )}
            {youtube_pitch_url && (
              <a
                href={youtube_pitch_url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-button w-full py-3 px-2 rounded-xl font-semibold text-xs md:text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
                YouTube Питч
              </a>
            )}
          </div>
        )}
      </div>
    </motion.article>
  )
}

export default AchievementCard
