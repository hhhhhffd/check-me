import { createContext, useContext, useEffect, useState } from 'react'
import { loadCvData } from '../data/loadCvData'

const CvDataContext = createContext(null)

export function CvDataProvider({ children }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let active = true

    loadCvData()
      .then((nextState) => {
        if (active) setState(nextState)
      })
      .catch((error) => {
        if (active) setState({ status: 'invalid', error: error.message })
      })

    return () => {
      active = false
    }
  }, [])

  return <CvDataContext.Provider value={state}>{children}</CvDataContext.Provider>
}

export function useCvData() {
  const value = useContext(CvDataContext)
  if (!value) {
    throw new Error('useCvData должен использоваться внутри CvDataProvider.')
  }
  return value
}
