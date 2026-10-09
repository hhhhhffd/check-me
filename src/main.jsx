import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Раньше у каждого проекта была страница /project/<slug>; теперь все проекты на главной.
if (/\/project\/[^/]+\/?$/.test(window.location.pathname)) {
  window.history.replaceState(null, '', import.meta.env.BASE_URL + '#projects')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
