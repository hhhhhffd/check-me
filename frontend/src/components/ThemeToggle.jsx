import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className="relative w-14 h-7 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent flex-shrink-0"
      style={{
        boxShadow: isDark
          ? '0 0 0 1px rgba(99,102,241,0.3), 0 2px 8px rgba(0,0,0,0.4)'
          : '0 0 0 1px rgba(251,191,36,0.4), 0 2px 8px rgba(251,191,36,0.2)',
      }}
    >
      {/* Dark track */}
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-300"
        style={{
          opacity: isDark ? 1 : 0,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        }}
      />
      {/* Light track */}
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          background: 'linear-gradient(135deg, #bae6fd 0%, #fde68a 100%)',
        }}
      />

      {/* Stars */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        <span className="absolute top-1.5 left-[18px] w-[3px] h-[3px] bg-white rounded-full" />
        <span className="absolute top-3 left-[26px] w-[2px] h-[2px] bg-white/60 rounded-full" />
        <span className="absolute bottom-1.5 left-[22px] w-[2px] h-[2px] bg-white/40 rounded-full" />
      </div>

      {/* Sun rays */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{ opacity: isDark ? 0 : 1 }}
      >
        <span className="absolute top-1 left-[6px] w-[2px] h-[2px] bg-amber-500/60 rounded-full" />
        <span className="absolute top-2.5 left-[3px] w-[2px] h-[2px] bg-amber-400/40 rounded-full" />
        <span className="absolute bottom-1.5 left-[5px] w-[2px] h-[2px] bg-amber-500/50 rounded-full" />
      </div>

      {/* Thumb */}
      <motion.div
        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow-md flex items-center justify-center z-10"
        animate={{ x: isDark ? 0 : 28 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%)'
            : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          boxShadow: isDark
            ? '0 1px 4px rgba(0,0,0,0.5)'
            : '0 1px 4px rgba(0,0,0,0.2)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 30 }}
              transition={{ duration: 0.15 }}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-900" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ opacity: 0, scale: 0.4, rotate: 30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: -30 }}
              transition={{ duration: 0.15 }}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  )
}
