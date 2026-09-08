const ACHIEVEMENT_TITLE_PATTERN = /^\s*(?:(\d+)\s*(?:место|place|st|nd|rd|th)|победитель|winner)\s*[—–:-]\s*(.+)$/i

export function stripMarkdown(text) {
  if (!text) return ''

  return String(text)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_]{1,3}([^*_\n]+)[*_]{1,3}/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getProjectDescription(project) {
  return stripMarkdown(
    project?.['content-on-card'] || project?.description || project?.content || '',
  )
}

export function getProjectStack(project, limit = 3) {
  return project?.tech_stack?.slice(0, limit).join(' · ')
    || project?.tags?.slice(0, limit).join(' · ')
    || 'Подробнее'
}

export function sortByDateDesc(items) {
  return [...(Array.isArray(items) ? items : [])].sort((first, second) => {
    const firstTime = Date.parse(first?.date || '') || 0
    const secondTime = Date.parse(second?.date || '') || 0
    return secondTime - firstTime
  })
}

function getAchievementPlaceLabel(place, title) {
  const value = String(place || '')
  const number = value.match(/\d+/)?.[0] || title.match(/^(\d+)\s*(?:место|place|st|nd|rd|th)/i)?.[1]

  if (number) return `${number} PLACE`
  if (/победител|winner/i.test(value) || /победител|winner/i.test(title)) return 'WINNER'
  return value ? value.toUpperCase() : 'ACHIEVEMENT'
}

export function getAchievementMeta(achievement) {
  const rawTitle = String(achievement?.title || '').trim()
  const titleMatch = rawTitle.match(ACHIEVEMENT_TITLE_PATTERN)
  const place = String(achievement?.place || titleMatch?.[1] || '').trim()
  const rawEvent = String(achievement?.event || titleMatch?.[2] || rawTitle).trim()
  const year = String(achievement?.date || '').slice(0, 4)
    || rawEvent.match(/\b(?:19|20)\d{2}\b/)?.[0]
    || ''
  const event = rawEvent.replace(/\s*[—–-]?\s*\b(?:19|20)\d{2}\b\s*$/, '').trim()
  const placeNumber = place.match(/\d+/)?.[0] || rawTitle.match(/^(\d+)\s*(?:место|place|st|nd|rd|th)/i)?.[1] || ''

  return {
    place,
    placeNumber,
    placeLabel: getAchievementPlaceLabel(place, rawTitle),
    event: event || rawTitle,
    year,
  }
}

export function placeBadgeClass(place) {
  if (!place) return ''
  const value = String(place).toLowerCase()

  if (value.includes('1') || value.includes('победит') || value.includes('winner')) {
    return 'bg-amber-400/20 border-amber-400/50 text-amber-500 dark:text-amber-300'
  }
  if (value.includes('2')) {
    return 'bg-gray-300/20 border-gray-400/50 text-gray-500 dark:text-gray-300'
  }
  if (value.includes('3') || value.includes('призёр') || value.includes('призер')) {
    return 'bg-orange-400/20 border-orange-400/50 text-orange-500 dark:text-orange-300'
  }
  return 'bg-indigo-400/20 border-indigo-400/50 text-indigo-600 dark:text-indigo-300'
}

export function getAchievementDescription(achievement) {
  return stripMarkdown(
    achievement?.description
      || achievement?.['content-on-card']
      || achievement?.content
      || '',
  )
}

export function getAchievementLink(achievement) {
  return achievement?.url
    || achievement?.presentation_url
    || achievement?.github_url
    || achievement?.youtube_pitch_url
    || ''
}

export function getNowEntries(cv) {
  const source = cv?.now || cv?.profile?.now
  if (!source || typeof source !== 'object') return []

  return [
    ['BUILDING', source.building],
    ['LEARNING', source.learning],
    ['AVAILABLE', source.available],
  ]
    .map(([label, value]) => ({
      label,
      value: Array.isArray(value) ? value.filter(Boolean).join(' · ') : String(value || '').trim(),
    }))
    .filter((entry) => entry.value)
}
