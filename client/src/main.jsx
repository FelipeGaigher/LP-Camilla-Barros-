import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// createRoot, nao hydrateRoot: o HTML do prerender existe pro crawler e pra
// primeira pintura. O React monta por cima e substitui — assim nao ha risco de
// mismatch entre o snapshot do build e o conteudo atual do banco.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
