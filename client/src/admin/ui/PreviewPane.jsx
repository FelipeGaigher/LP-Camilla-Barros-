import { useState } from 'react'
import IframePortal from './IframePortal'
import PreviewProvider from '../../context/PreviewContext'
import HomePage from '../../pages/HomePage'

const LARGURAS = [
  { key: 'desktop', label: 'Computador', width: '100%' },
  { key: 'tablet', label: 'Tablet', width: '820px' },
  { key: 'mobile', label: 'Celular', width: '390px' },
]

/**
 * Previa do site ao lado do editor. Renderiza a home de verdade, com o
 * rascunho que esta sendo editado, dentro de um iframe: assim as media queries
 * respondem a largura escolhida e da para conferir o celular sem sair daqui.
 */
export default function PreviewPane({ overrides }) {
  const [tamanho, setTamanho] = useState('desktop')
  const atual = LARGURAS.find((l) => l.key === tamanho) || LARGURAS[0]

  return (
    <aside className="a-preview">
      <header className="a-preview__bar">
        <span className="a-preview__title">Prévia</span>
        <div className="a-preview__sizes">
          {LARGURAS.map((l) => (
            <button
              key={l.key}
              type="button"
              className={`a-preview__size ${tamanho === l.key ? 'is-active' : ''}`}
              onClick={() => setTamanho(l.key)}
              aria-pressed={tamanho === l.key}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="a-preview__hint">Clique num texto para abrir o campo</span>
      </header>

      <div className="a-preview__stage">
        <div className="a-preview__frame" style={{ width: atual.width, maxWidth: '100%' }}>
          <IframePortal>
            <PreviewProvider overrides={overrides}>
              <HomePage />
            </PreviewProvider>
          </IframePortal>
        </div>
      </div>
    </aside>
  )
}
