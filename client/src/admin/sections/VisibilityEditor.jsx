import { useEffect, useState } from 'react'
import { useSiteData } from '../../context/SiteDataContext'
import { SECTION_LABELS } from '../schema'

/**
 * Liga, desliga e reordena as secoes da home.
 * A ordem daqui e a ordem real de renderizacao no site.
 */
export default function VisibilityEditor() {
  const { data, updateSection, syncing } = useSiteData()
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(data.visibility)))
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(data.visibility)))
  }, [])

  const order = draft.order || []

  const toggle = (key) => {
    setDraft((d) => ({ ...d, [key]: !d[key] }))
    setDirty(true)
    setSaved(false)
  }

  const move = (i, dir) => {
    const next = [...order]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setDraft((d) => ({ ...d, order: next }))
    setDirty(true)
    setSaved(false)
  }

  const save = () => {
    updateSection('visibility', draft)
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>Secoes do site</h1>
          <p className="a-hint">
            Desligue o que ainda nao tem conteudo e arraste a ordem das secoes. O topo e o rodape
            ficam sempre no lugar.
          </p>
        </div>
        <div className="a-editor__actions">
          <button className="a-btn a-btn--primary" onClick={save} disabled={!dirty || syncing}>
            {syncing ? 'Salvando...' : saved ? 'Salvo' : 'Salvar alteracoes'}
          </button>
        </div>
      </header>

      <div className="a-editor__body a-painel">
        <ul className="a-vis">
          {order.map((key, i) => (
            <li className={`a-vis__row ${draft[key] === false ? 'is-off' : ''}`} key={key}>
              <span className="a-vis__pos">{String(i + 1).padStart(2, '0')}</span>
              <span className="a-vis__name">{SECTION_LABELS[key] || key}</span>
              <div className="a-rowactions">
                <button type="button" onClick={() => move(i, -1)} title="Subir">&uarr;</button>
                <button type="button" onClick={() => move(i, 1)} title="Descer">&darr;</button>
              </div>
              <label className="a-toggle a-toggle--bare">
                <input type="checkbox" checked={draft[key] !== false} onChange={() => toggle(key)} />
                <span className="a-toggle__track"><span className="a-toggle__dot" /></span>
                <span>{draft[key] === false ? 'Oculta' : 'Visivel'}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
