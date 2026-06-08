import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { SimulationProvider } from './context/SimulationContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SimulationProvider>
      <App />
    </SimulationProvider>
  </StrictMode>,
)
