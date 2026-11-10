import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import JournalProvider from './JournalProvider.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JournalProvider>
      <App />
    </JournalProvider>
  </StrictMode>,
)
