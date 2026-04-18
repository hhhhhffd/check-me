import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'

const Home = lazy(() => import('./pages/Home'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))

function App() {
  return (
    <ThemeProvider>
      <Suspense>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/project/:slug" element={<ProjectDetails />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  )
}

export default App