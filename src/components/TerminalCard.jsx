import { cn } from '../utils/classNames'

export function TerminalPrompt({ children, className }) {
  return <p className={cn('terminal-prompt', className)}>{children}</p>
}

export default function TerminalCard({ command, children, className, staticCard = false, ...props }) {
  return (
    <section
      className={cn('terminal-card', staticCard && 'terminal-card-static', className)}
      {...props}
    >
      {command && <TerminalPrompt>{command}</TerminalPrompt>}
      {children}
    </section>
  )
}
