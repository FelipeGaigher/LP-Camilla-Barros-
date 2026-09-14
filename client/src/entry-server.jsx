// Entry SSR, usado apenas pelo prerender de build (scripts/prerender.js).
// Compilado por `vite build --ssr` para dist-ssr/entry-server.js.
//
// renderToStaticMarkup, nao renderToString: nao ha hidratacao. O HTML gerado
// serve ao crawler e a primeira pintura; no navegador o main.jsx monta por
// cima com createRoot e substitui tudo.

import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import App from './App'

export function render(url, sections) {
  return renderToStaticMarkup(
    <StaticRouter location={url}>
      <App staticSections={sections || {}} />
    </StaticRouter>
  )
}
