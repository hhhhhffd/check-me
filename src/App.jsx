import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CvDataProvider } from './context/CvDataContext'
import CvDataState from './pages/CvDataState'

const Home = lazy(() => import('./pages/Home'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))

function App() {
  return (
    <ThemeProvider>
      <CvDataProvider>
        <CvDataState>
          <Suspense>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/project/:slug" element={<ProjectDetails />} />
            </Routes>
          </Suspense>
        </CvDataState>
      </CvDataProvider>
    </ThemeProvider>
  )
}

export default App
