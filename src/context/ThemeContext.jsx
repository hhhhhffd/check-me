import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

function getInitialDark() {
  try {
    return localStorage.getItem('theme') !== 'light'
  } catch {
    return true
  }
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
