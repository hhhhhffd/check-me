import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import TerminalCard from './TerminalCard'
import { cn } from '../utils/classNames'

const ROTATION_INTERVAL = 6500

function getItemKey(item, index) {
  return item?.id || item?.slug || item?.title || index
}

export default function SpotlightFrame({
  command,
  items,
  className,
  spotlightClassName,
  getPreview,
  renderItem,
  renderAction,
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => (
    typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ))

  const safeItems = Array.isArray(items) ? items : []

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(safeItems.length - 1, 0)))
  }, [safeItems.length])

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mediaQuery) return undefined

    const handleChange = (event) => setPrefersReducedMotion(event.matches)
    mediaQuery.addEventListener?.('change', handleChange)
    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }, [])

  useEffect(() => {
    if (safeItems.length < 2 || isPaused || prefersReducedMotion) return undefined

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % safeItems.length)
    }, ROTATION_INTERVAL)

    return () => window.clearInterval(interval)
  }, [isPaused, prefersReducedMotion, safeItems.length])

  if (safeItems.length === 0) return null

  const currentItem = safeItems[currentIndex]
  const preview = getPreview?.(currentItem)
  const pause = () => setIsPaused(true)
  const resume = () => setIsPaused(false)
  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) resume()
  }
  const move = (direction) => {
    setCurrentIndex((index) => (index + direction + safeItems.length) % safeItems.length)
    resume()
  }

  return (
    <TerminalCard command={command} className={className}>
      <div
        className={cn('spotlight-card', spotlightClassName)}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={handleBlur}
      >
        {preview && (
          <div className="spotlight-preview" aria-hidden="true">
            <img
              key={preview}
              src={preview}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.hidden = true
              }}
            />
          </div>
        )}

        <div className="spotlight-content" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={getItemKey(currentItem, currentIndex)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              {renderItem(currentItem, currentIndex)}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="spotlight-footer">
          <span className="spotlight-pagination" aria-label={`Элемент ${currentIndex + 1} из ${safeItems.length}`}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(safeItems.length).padStart(2, '0')}
          </span>

          <div className="spotlight-actions">
            {safeItems.length > 1 && (
              <div className="spotlight-controls" aria-label="Переключение элементов">
                <button type="button" className="spotlight-control" onClick={() => move(-1)} aria-label="Предыдущий элемент">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="spotlight-control" onClick={() => move(1)} aria-label="Следующий элемент">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {renderAction?.(currentItem, currentIndex)}
          </div>
        </div>
      </div>
    </TerminalCard>
  )
}
