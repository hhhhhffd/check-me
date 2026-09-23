import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import GithubOverview from '../components/GithubOverview'
import MusicExperience from '../components/MusicExperience'
import { useCvData } from '../context/CvDataContext'
import { resolveAssetUrl } from '../utils/assetUrl'
import { getProjectDescription, sortByDateDesc } from '../utils/cvPresentation'
import { setMetaTag } from '../utils/setMetaTag'
import './home.css'

const SHORT_STACK = ['Python', 'TypeScript', 'FastAPI', 'React', 'PostgreSQL']
const THEMES = ['ghost', 'phosphor', 'amber']
const SECTIONS = [
  { command: 'whoami', label: 'Обо мне' },
  { command: 'work', label: 'Работы' },
  { command: 'github', label: 'GitHub' },
  { command: 'stack', label: 'Стек' },
  { command: 'links', label: 'Контакты' },
]
const COMMANDS = [
  { command: 'help', description: 'show available commands' },
  { command: 'whoami', description: 'back to profile' },
  { command: 'work', description: 'selected projects' },
  { command: 'github', description: 'activity and statistics' },
  { command: 'stack', description: 'tools I work with' },
  { command: 'links', description: 'find me elsewhere' },
  { command: 'clear', description: 'clear the screen' },
  { command: 'theme', description: 'change terminal theme' },
]

function getCurrentTime() {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem('portfolio:terminal-theme')
    return THEMES.includes(savedTheme) ? savedTheme : 'ghost'
  } catch (error) {
    console.warn('Не удалось прочитать тему терминала:', error)
    return 'ghost'
  }
}

function Home() {
  const { data: cv } = useCvData()
  const profile = cv.profile
  const handle = profile.handle || profile.name
  const profileImage = resolveAssetUrl(profile.image)
  const email = profile.email?.replace(/^mailto:/, '')
  const projects = useMemo(
    () => sortByDateDesc(cv.projects).filter((project) => Boolean(project.title)).slice(0, 4),
    [cv.projects],
  )
  const availableSkills = cv.skillGroups?.flatMap((group) => group.skills || []) || []
  const shortStack = SHORT_STACK.filter((skill) => availableSkills.includes(skill))
  const socialLinks = [
    { label: 'github', href: profile.github },
    { label: 'telegram', href: profile.telegram },
    { label: 'linkedin', href: profile.linkedin },
    { label: 'email', href: email ? 'mailto:' + email : '' },
  ].filter((link) => link.href)

  const [screen, setScreen] = useState('home')
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [lastCommand, setLastCommand] = useState('')
  const [message, setMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(getCurrentTime)
  const [theme, setTheme] = useState(getInitialTheme)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [paletteIndex, setPaletteIndex] = useState(0)
  const paletteInputRef = useRef(null)
  const paletteTriggerRef = useRef(null)
  const bodyRef = useRef(null)
  const musicRef = useRef(null)

  const selectedProject = projects[selectedProjectIndex]
  const projectImages = selectedProject
    ? [...new Set([selectedProject.thumbnail, ...(selectedProject.gallery || [])].filter(Boolean))]
    : []
  const path = screen === 'project'
    ? '~/work/' + (selectedProject?.slug || selectedProject?.id || '')
    : screen === 'home' || screen === 'clear' ? '~' : '~/' + screen
  const paletteItems = [
    ...COMMANDS,
    { command: 'neofetch', description: 'system profile' },
    { command: 'music play', description: 'play background track' },
    { command: 'music pause', description: 'pause background track' },
    ...(profile.github ? [{ command: 'github profile', description: 'open GitHub profile' }] : []),
  ].filter((item) => (item.command + ' ' + item.description).toLowerCase().includes(paletteQuery.toLowerCase()))

  function showScreen(nextScreen) {
    setScreen(nextScreen)
  }

  function openProject(index) {
    setSelectedProjectIndex(index)
    setImageIndex(0)
    showScreen('project')
  }

  function chooseTheme(nextTheme) {
    if (!THEMES.includes(nextTheme)) return
    setTheme(nextTheme)
    try {
      window.localStorage.setItem('portfolio:terminal-theme', nextTheme)
    } catch (error) {
      console.warn('Не удалось сохранить тему терминала:', error)
    }
    showScreen('theme')
  }

  function runCommand(rawCommand) {
    const command = rawCommand.trim().replace(/\s+/g, ' ').toLowerCase()
    if (!command) return

    setLastCommand(command)
    setMessage('')
    setPaletteOpen(false)

    if (command === 'help') showScreen('help')
    else if (['whoami', 'home', '~'].includes(command)) showScreen('home')
    else if (['work', 'projects', 'ls work/', 'ls projects/'].includes(command)) showScreen('work')
    else if (['github', 'github --stats'].includes(command)) showScreen('github')
    else if (['stack', 'stack --short'].includes(command)) showScreen('stack')
    else if (['links', 'open links'].includes(command)) showScreen('links')
    else if (command === 'theme') showScreen('theme')
    else if (THEMES.some((item) => command === 'theme ' + item)) chooseTheme(command.slice(6))
    else if (command === 'neofetch') showScreen('neofetch')
    else if (command === 'clear') showScreen('clear')
    else if (command === 'music play') musicRef.current?.play()
    else if (command === 'music pause') musicRef.current?.pause()
    else if (command === 'music next') {
      musicRef.current?.restart()
      setMessage('В плейлисте один трек. Воспроизведение начато сначала.')
      showScreen('message')
    } else if (command === 'github profile' && profile.github) {
      window.open(profile.github, '_blank', 'noopener,noreferrer')
    } else if (/^open (?:projects\/|work\/)?0?[1-9]$/.test(command)) {
      const index = Number(command.match(/(\d+)$/)?.[1]) - 1
      if (projects[index]) openProject(index)
      else {
        setMessage('Проект не найден. Введите work, чтобы увидеть список.')
        showScreen('message')
      }
    } else if (command === 'sudo hire ' + handle.toLowerCase()) {
      setMessage('permission granted. Написать мне можно через links.')
      showScreen('message')
    } else if (command === 'rm -rf /') {
      setMessage('nice try.')
      showScreen('message')
    } else if (command === 'exit') {
      setMessage('there is no escape.')
      showScreen('message')
    } else {
      setMessage('command not found: ' + command)
      showScreen('message')
    }
  }

  function handlePaletteKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setPaletteIndex((index) => Math.min(index + 1, paletteItems.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPaletteIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const command = paletteItems[paletteIndex]?.command || paletteQuery.trim()
      if (command) runCommand(command)
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(getCurrentTime()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    document.documentElement.lang = cv.meta?.locale || 'ru'
    const baseTitle = cv.meta?.siteTitle || (profile.name ? profile.name + ' — Портфолио' : 'Портфолио разработчика')
    const description = cv.meta?.siteDescription || profile.bio || 'Личный сайт-портфолио: проекты, стек и контакты.'

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
  }, [cv.meta, profile, profileImage])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [screen, selectedProjectIndex])

  useEffect(() => {
    if (paletteOpen) paletteInputRef.current?.focus()
  }, [paletteOpen])

  useEffect(() => {
    function handleGlobalKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        setPaletteQuery('')
        setPaletteIndex(0)
        return
      }
      if (event.key !== 'Escape') return
      if (paletteOpen) {
        setPaletteOpen(false)
        paletteTriggerRef.current?.focus()
      } else if (screen === 'project') showScreen('work')
      else if (screen !== 'home') showScreen('home')
    }
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [paletteOpen, screen])

  useEffect(() => {
    function handleWorkKeys(event) {
      if (paletteOpen || screen !== 'work' || projects.length === 0 || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea')) return
      if (event.key === 'j' || event.key === 'k') {
        event.preventDefault()
        setSelectedProjectIndex((index) => (index + (event.key === 'j' ? 1 : -1) + projects.length) % projects.length)
      } else if (event.key === 'Enter' && event.target === document.body) {
        event.preventDefault()
        openProject(selectedProjectIndex)
      }
    }
    document.addEventListener('keydown', handleWorkKeys)
    return () => document.removeEventListener('keydown', handleWorkKeys)
  }, [paletteOpen, projects.length, screen, selectedProjectIndex])

  return (
    <main className="bio-page" data-theme={theme}>
      <div className="bio-backdrop" aria-hidden="true" />
      <section className="bio-terminal" aria-label="Персональный терминал">
        <header className="bio-terminal-bar">
          <div className="bio-window-dots" aria-hidden="true"><i /><i /><i /></div>
          <span className="bio-window-title">{handle}@devbox <span>{path}</span></span>
          <time className="bio-window-time">{profile.location?.timezone || 'LOCAL'} · {currentTime}</time>
        </header>
        <nav className="bio-section-nav" aria-label="Разделы сайта">
          {SECTIONS.map((item) => (
            <button
              type="button"
              key={item.command}
              className={(screen === item.command || (screen === 'home' && item.command === 'whoami') || (screen === 'project' && item.command === 'work')) ? 'is-active' : ''}
              onClick={() => runCommand(item.command)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="bio-section-more"
            ref={paletteTriggerRef}
            onClick={() => { setPaletteOpen(true); setPaletteQuery(''); setPaletteIndex(0) }}
            aria-label="Открыть команды и настройки"
          >
            Команды <span>⌘K</span>
          </button>
        </nav>

        <div className="bio-terminal-body" ref={bodyRef} aria-live="polite">
          {screen === 'home' && (
            <div className="bio-home">
              <section className="bio-home-intro" aria-labelledby="bio-name">
                <p className="bio-home-eyebrow"><span className="bio-live-dot" /> PERSONAL SYSTEM <span>/ 001</span></p>
                <div className="bio-home-heading">
                  <span className="bio-home-mark" aria-hidden="true">{handle.slice(0, 1).toUpperCase()}</span>
                  <h1 id="bio-name">{handle}<span>.</span></h1>
                </div>
                <p className="bio-home-byline">{profile.name} <span>↗</span> {profile.title}</p>
                <p className="bio-home-bio">{profile.bio}</p>
                <div className="bio-home-actions">
                  <button type="button" className="bio-home-primary" onClick={() => runCommand('work')}>Смотреть работы <ArrowUpRight size={17} /></button>
                  <button type="button" className="bio-home-secondary" onClick={() => runCommand('github')}>GitHub / stats <ArrowUpRight size={16} /></button>
                </div>
                <p className="bio-home-location"><span className="bio-live-dot" /> {profile.workPreference?.status || 'building'} <span>/</span> {profile.location?.city || 'online'}</p>
              </section>

              <section className="bio-home-work" aria-label="Избранные проекты">
                <div className="bio-home-work-heading"><span><i>❯</i> ls work/</span><span>{String(projects.length).padStart(2, '0')} entries</span></div>
                <div className="bio-home-work-list">
                  {projects.map((project, index) => (
                    <button type="button" className="bio-project" key={project.id || project.slug} onClick={() => openProject(index)}>
                      <span className="bio-project-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="bio-project-copy"><strong>{project.title}</strong><small>{project.status || 'PROJECT'}</small></span>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                  ))}
                </div>
                <div className="bio-home-work-foot"><span>Выбери проект</span><button type="button" onClick={() => runCommand('help')}>Команды ↗</button></div>
              </section>
            </div>
          )}

          {screen === 'work' && (
            <section className="bio-screen">
              <p className="bio-command"><span>$</span> work</p>
              <h2>Работы<span className="bio-heading-dot">.</span></h2>
              <p className="bio-screen-subtitle">Выбери проект, чтобы посмотреть детали.</p>
              <div className="bio-work-list">
                {projects.map((project, index) => (
                  <button
                    type="button"
                    key={project.id || project.slug}
                    className={'bio-work-item' + (selectedProjectIndex === index ? ' is-selected' : '')}
                    onMouseEnter={() => setSelectedProjectIndex(index)}
                    onClick={() => openProject(index)}
                    aria-current={selectedProjectIndex === index ? 'true' : undefined}
                  >
                    <span className="bio-work-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="bio-work-copy"><strong>{project.title}</strong><small>{getProjectDescription(project)}</small></span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {screen === 'project' && selectedProject && (
            <section className="bio-screen">
              <button type="button" className="bio-back-button" onClick={() => showScreen('work')}><ArrowLeft size={15} /> Все работы</button>
              <p className="bio-command"><span>$</span> open work/{selectedProject.slug || selectedProject.id}</p>
              <div className="bio-project-screen">
                <div className="bio-project-screen-copy">
                  <p className="bio-project-dialog-label">{selectedProject.status || 'PROJECT'}</p>
                  <h2>{selectedProject.title}</h2>
                  <p className="bio-project-summary">{getProjectDescription(selectedProject)}</p>
                  {selectedProject.tech_stack?.length > 0 && <div className="bio-project-facts"><span>stack</span><p>{selectedProject.tech_stack.join(' · ')}</p></div>}
                  <div className="bio-project-screen-links">
                    {selectedProject.github_url && <a href={selectedProject.github_url} target="_blank" rel="noopener noreferrer">[ github <ArrowUpRight size={13} /> ]</a>}
                    {selectedProject.presentation_url && <a href={selectedProject.presentation_url} target="_blank" rel="noopener noreferrer">[ live <ArrowUpRight size={13} /> ]</a>}
                    {selectedProject.slug && <Link to={'/project/' + selectedProject.slug}>[ Подробнее <ArrowUpRight size={13} /> ]</Link>}
                  </div>
                </div>
                {projectImages.length > 0 && (
                  <div className="bio-project-preview">
                    <img src={resolveAssetUrl(projectImages[imageIndex])} alt={'Скриншот проекта ' + selectedProject.title} />
                    {projectImages.length > 1 && (
                      <div className="bio-preview-controls">
                        <button type="button" aria-label="Предыдущий скриншот" onClick={() => setImageIndex((index) => (index - 1 + projectImages.length) % projectImages.length)}><ArrowLeft size={14} /></button>
                        <span>{imageIndex + 1} / {projectImages.length}</span>
                        <button type="button" aria-label="Следующий скриншот" onClick={() => setImageIndex((index) => (index + 1) % projectImages.length)}><ArrowRight size={14} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {screen === 'github' && (
            <div className="bio-github-screen">
              <GithubOverview githubUrl={profile.github} githubActivityApiUrl={profile.githubActivityApiUrl} />
            </div>
          )}

          {screen === 'stack' && (
            <section className="bio-screen">
              <p className="bio-command"><span>$</span> stack</p>
              <h2>Мой стек<span className="bio-heading-dot">.</span></h2>
              <div className="bio-stack-groups">
                {cv.skillGroups?.map((group) => (
                  <div className="bio-stack-group" key={group.name}><span>{group.name}</span><p>{group.skills?.join(' · ')}</p></div>
                ))}
              </div>
            </section>
          )}

          {screen === 'links' && (
            <section className="bio-screen">
              <p className="bio-command"><span>$</span> links</p>
              <h2>Контакты<span className="bio-heading-dot">.</span></h2>
              <div className="bio-link-list">
                {socialLinks.map((link) => (
                  <a key={link.label} href={link.href} target={link.href.startsWith('mailto:') ? undefined : '_blank'} rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}>
                    <span>{link.label}</span><span>{link.href.replace(/^https?:\/\//, '').replace(/^mailto:/, '')}</span><ArrowUpRight size={16} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {screen === 'help' && (
            <section className="bio-screen">
              <p className="bio-command"><span>$</span> help</p>
              <h2>Команды<span className="bio-heading-dot">.</span></h2>
              <div className="bio-help-table">
                <div className="bio-help-head"><span>COMMAND</span><span>DESCRIPTION</span></div>
                {COMMANDS.map((item) => (
                  <button type="button" key={item.command} onClick={() => runCommand(item.command)}>
                    <span>{item.command}</span><span>{item.description}</span>
                  </button>
                ))}
              </div>
              <p className="bio-screen-subtitle">Also: neofetch · music play / pause / next · open work/02</p>
            </section>
          )}

          {screen === 'theme' && (
            <section className="bio-screen">
              <p className="bio-command"><span>$</span> theme</p>
              <h2>Оформление<span className="bio-heading-dot">.</span></h2>
              <div className="bio-theme-list">
                {THEMES.map((item) => (
                  <button type="button" key={item} className={theme === item ? 'is-active' : ''} onClick={() => chooseTheme(item)}>
                    <i className={'bio-theme-swatch bio-theme-' + item} aria-hidden="true" />
                    <span>{item}</span><small>{theme === item ? 'active' : 'select'}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {screen === 'neofetch' && (
            <section className="bio-screen">
              <p className="bio-command"><span>$</span> neofetch</p>
              <div className="bio-neofetch">
                <span className="bio-neofetch-mark">{handle.slice(0, 1).toUpperCase()}.</span>
                <dl>
                  <dt>user</dt><dd>{handle}@devbox</dd>
                  <dt>name</dt><dd>{profile.name}</dd>
                  <dt>role</dt><dd>{profile.title}</dd>
                  <dt>location</dt><dd>{profile.location?.country || '—'}</dd>
                  <dt>focus</dt><dd>{profile.headline || '—'}</dd>
                  <dt>stack</dt><dd>{shortStack.join(' / ')}</dd>
                  <dt>status</dt><dd>{profile.workPreference?.status || 'building'}</dd>
                  <dt>projects</dt><dd>{String(projects.length).padStart(2, '0')}</dd>
                </dl>
              </div>
            </section>
          )}

          {screen === 'message' && (
            <section className="bio-screen"><p className="bio-command"><span>$</span> {lastCommand}</p><p className="bio-output">{message}</p><button type="button" className="bio-back-button" onClick={() => runCommand('help')}>[ help ]</button></section>
          )}
        </div>

        {paletteOpen && (
          <div className="bio-palette-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) { setPaletteOpen(false); paletteTriggerRef.current?.focus() } }}>
            <div className="bio-palette" role="dialog" aria-modal="true" aria-label="Командная палитра">
              <input
                ref={paletteInputRef}
                value={paletteQuery}
                onChange={(event) => { setPaletteQuery(event.target.value); setPaletteIndex(0) }}
                onKeyDown={handlePaletteKeyDown}
                aria-label="Поиск команды"
                placeholder="Поиск раздела или команда..."
              />
              <div className="bio-palette-list">
                {paletteItems.map((item, index) => (
                  <button type="button" key={item.command} className={paletteIndex === index ? 'is-selected' : ''} onMouseEnter={() => setPaletteIndex(index)} onClick={() => runCommand(item.command)}>
                    <span>{item.command}</span><small>{item.description}</small>
                  </button>
                ))}
                {paletteItems.length === 0 && <p>Команда не найдена</p>}
              </div>
            </div>
          </div>
        )}
      </section>
      {cv.music?.src && <MusicExperience ref={musicRef} music={cv.music} />}
    </main>
  )
}

export default Home
