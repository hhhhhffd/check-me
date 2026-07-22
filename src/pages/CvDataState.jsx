import { FileWarning, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCvData } from '../context/CvDataContext'

function CvDataState({ children }) {
  const cvState = useCvData()

  if (cvState.status === 'ready') return children

  if (cvState.status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-gray-700 dark:text-white/70">
        <LoaderCircle className="w-7 h-7 animate-spin mr-3" />
        Загружаю CV…
      </main>
    )
  }

  const isMissing = cvState.status === 'missing'
  const title = isMissing ? '404 — cv.jsonc не найден' : 'Не удалось прочитать cv.jsonc'
  const description = isMissing
    ? 'Создай public/cv.jsonc или скопируй в него содержимое public/cv.example.jsonc.'
    : cvState.error

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="glass-panel max-w-xl w-full rounded-3xl p-8 md:p-12 text-center">
        <FileWarning className="w-12 h-12 text-indigo-500 mx-auto mb-6" />
        <p className="text-sm uppercase tracking-[0.2em] text-indigo-500 mb-3">Конфигурация CV</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{title}</h1>
        <p className="text-gray-600 dark:text-white/65 leading-relaxed">{description}</p>
        <p className="mt-6 text-sm text-gray-500 dark:text-white/45">
          Пример: <code>public/cv.example.jsonc</code>
        </p>
        <Link to="/" className="inline-flex mt-8 glass-button px-5 py-3 rounded-xl font-medium">
          Попробовать снова
        </Link>
      </section>
    </main>
  )
}

export default CvDataState
