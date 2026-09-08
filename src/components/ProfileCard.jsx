import { motion } from 'framer-motion'
import { Download, Mail, MapPin } from 'lucide-react'
import TerminalCard from './TerminalCard'
import { GithubIcon } from './icons'

const LINKEDIN_ICON = (
  <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0H5C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5ZM8 19H5V8h3v11ZM6.5 6.73A1.73 1.73 0 1 1 6.5 3a1.73 1.73 0 0 1 0 3.46ZM20 19h-3v-5.6c0-3.37-4-3.11-4 0V19h-3V8h3v1.77c1.4-2.59 7-2.78 7 2.48V19Z" />
  </svg>
)

const TELEGRAM_ICON = (
  <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21.4 4.6 18.2 20c-.24 1.08-.87 1.35-1.76.84l-4.86-3.58-2.34 2.25c-.26.26-.48.48-.98.48l.35-4.95 9-8.13c.39-.35-.09-.55-.61-.2L6.1 13.57l-4.69-1.47c-1.02-.32-1.04-1.02.21-1.51L20 3.5c.85-.32 1.6.2 1.4 1.1Z" />
  </svg>
)

function getContactLinks(profile) {
  const email = profile.email?.replace(/^mailto:/, '')

  return [
    { href: profile.github, label: 'GitHub', icon: <GithubIcon className="h-4 w-4" /> },
    { href: profile.telegram, label: 'Telegram', icon: TELEGRAM_ICON },
    { href: profile.linkedin, label: 'LinkedIn', icon: LINKEDIN_ICON },
    { href: email ? `mailto:${email}` : '', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  ].filter((link) => Boolean(link.href))
}

export default function ProfileCard({ profile }) {
  const contactLinks = getContactLinks(profile)
  const location = [profile.location?.city, profile.location?.country].filter(Boolean).join(', ')
  const availability = profile.workPreference?.status
  const cvUrl = profile.cvUrl || profile.cv_url

  return (
    <TerminalCard staticCard className="flex min-h-[360px] flex-col justify-between md:col-span-2 lg:col-span-6 lg:row-span-2">
      <div>
        <p className="terminal-prompt">~/cv $ whoami</p>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="mt-8 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-[#ede9f5] sm:text-6xl md:text-7xl"
        >
          {profile.name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
          className="mt-5 text-lg text-[#b7aed0] md:text-xl"
        >
          {profile.title}
        </motion.p>
      </div>

      <div className="mt-10 space-y-5">
        {(availability || location) && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#8f88a8]">
            {availability && (
              <span className="inline-flex items-center gap-2">
                <span className="availability-dot h-2 w-2 rounded-full bg-[#5eead4]" />
                {availability}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {contactLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.label === 'Email' ? undefined : '_blank'}
              rel={link.label === 'Email' ? undefined : 'noopener noreferrer'}
              className="terminal-button"
            >
              {link.icon}
              {link.label}
            </a>
          ))}
          {cvUrl && (
            <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="terminal-button terminal-button-muted">
              <Download className="h-4 w-4" />
              Скачать CV
            </a>
          )}
        </div>
      </div>
    </TerminalCard>
  )
}
