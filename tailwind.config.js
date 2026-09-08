/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        terminal: {
          canvas: '#0d0b14',
          surface: 'rgba(23, 19, 31, 0.88)',
          elevated: '#1a1624',
          border: '#2a2340',
          borderStrong: '#3b3157',
          text: '#ede9f5',
          muted: '#8f88a8',
          cyan: '#5eead4',
          violet: '#8b5cf6',
        },
        glass: {
          100: 'rgba(255, 255, 255, 0.05)',
          200: 'rgba(255, 255, 255, 0.1)',
          300: 'rgba(255, 255, 255, 0.15)',
          400: 'rgba(255, 255, 255, 0.2)',
        },
        dark: {
          bg: '#0a0a0f',
          surface: '#12121a',
          card: '#1a1a2e',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        card: '1.25rem',
        'card-lg': '1.5rem',
      },
      borderRadius: {
        terminal: '8px',
        panel: '6px',
      },
      boxShadow: {
        terminal: '0 16px 45px rgba(0, 0, 0, 0.22)',
        'terminal-hover': '0 18px 48px rgba(0, 0, 0, 0.28), inset 0 0 24px rgba(139, 92, 246, 0.035)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
