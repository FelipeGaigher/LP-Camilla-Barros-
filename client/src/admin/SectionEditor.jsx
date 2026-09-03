import { useEffect, useState } from 'react'
import Field from './ui/Fields'
import { SCHEMA } from './schema'
import { useSiteData } from '../context/SiteDataContext'

function clone(v) {
  return JSON.parse(JSON.stringify(v ?? null))
}

/**
 * Editor generico: monta a tela a partir do SCHEMA e mantem um rascunho
 * local. So grava no banco quando a pessoa clica em Salvar.
 */
export default function SectionEditor({ sectionKey }) {
  const { data, updateSection, resetSection, undoSection, undoAvailable, syncing } = useSiteData()
  const schema = SCHEMA[sectionKey]
  const [draft, setDraft] = useState(() => clone(data[sectionKey]))
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(clone(data[sectionKey]))
    setDirty(false)
    setSaved(false)
  }, [sectionKey])

  if (!schema) return <p>Secao sem editor configurado.</p>

  const setField = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setDirty(true)
    setSaved(false)
  }

  const save = () => {
    updateSection(sectionKey, draft)
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const discard = () => {
    setDraft(clone(data[sectionKey]))
    setDirty(false)
  }

  const restoreDefault = () => {
    if (!confirm('Isso apaga o conteudo desta secao e volta ao texto original. Continuar?')) return
    resetSection(sectionKey)
    setTimeout(() => setDraft(clone(data[sectionKey])), 300)
    setDirty(false)
  }

  return (
    <div className="a-editor">
      <header className="a-editor__head">
        <div>
          <h1>{schema.label}</h1>
          {schema.hint && <p className="a-hint">{schema.hint}</p>}
        </div>
        <div className="a-editor__actions">
          {undoAvailable?.[sectionKey] && (
            <button className="a-btn" onClick={() => undoSection(sectionKey)}>
              Desfazer ultima gravacao
            </button>
          )}
          <button className="a-btn" onClick={restoreDefault}>Restaurar padrao</button>
          {dirty && <button className="a-btn" onClick={discard}>Descartar</button>}
          <button className="a-btn a-btn--primary" onClick={save} disabled={!dirty || syncing}>
            {syncing ? 'Salvando...' : saved ? 'Salvo' : 'Salvar alteracoes'}
          </button>
        </div>
      </header>

      <div className="a-editor__body">
        {schema.fields.map((def) => (
          <FieldNode
            key={def.key}
            def={def}
            value={draft?.[def.key]}
            onChange={(v) => setField(def.key, v)}
          />
        ))}
      </div>

      <footer className="a-editor__foot">
        <button className="a-btn a-btn--primary" onClick={save} disabled={!dirty || syncing}>
          {syncing ? 'Salvando...' : saved ? 'Salvo' : 'Salvar alteracoes'}
        </button>
        {dirty && <span className="a-hint">Voce tem alteracoes nao salvas.</span>}
      </footer>
    </div>
  )
}

/** Resolve os tipos compostos (group e list) e delega o resto ao Field. */
function FieldNode({ def, value, onChange }) {
  if (def.type === 'group') {
    return (
      <fieldset className="a-group">
        <legend>{def.label}</legend>
        {def.fields.map((sub) => (
          <FieldNode
            key={sub.key}
            def={sub}
            value={value?.[sub.key]}
            onChange={(v) => onChange({ ...(value || {}), [sub.key]: v })}
          />
        ))}
      </fieldset>
    )
  }

  if (def.type === 'list') {
    const items = Array.isArray(value) ? value : []
    const emptyItem = Object.fromEntries(
      def.item.map((f) => [f.key, f.type === 'stringlist' ? [] : f.type === 'toggle' ? false : ''])
    )

    const setItem = (i, v) => onChange(items.map((it, k) => (k === i ? v : it)))
    const remove = (i) => {
      if (!confirm('Remover este item?')) return
      onChange(items.filter((_, k) => k !== i))
    }
    const move = (i, dir) => {
      const next = [...items]
      const j = i + dir
      if (j < 0 || j >= next.length) return
      ;[next[i], next[j]] = [next[j], next[i]]
      onChange(next)
    }

    return (
      <div className="a-list">
        <div className="a-list__head">
          <h2>{def.label}</h2>
          <button type="button" className="a-btn a-btn--sm" onClick={() => onChange([...items, emptyItem])}>
            Adicionar
          </button>
        </div>
        {def.hint && <p className="a-hint">{def.hint}</p>}

        {items.length === 0 && <p className="a-hint">Nenhum item ainda.</p>}

        {items.map((item, i) => (
          <div className="a-card" key={i}>
            <div className="a-card__head">
              <strong>
                {item?.title || item?.q || item?.label || item?.name || item?.day || item?.alt || `Item ${i + 1}`}
              </strong>
              <div className="a-rowactions">
                <button type="button" onClick={() => move(i, -1)} title="Subir">&uarr;</button>
                <button type="button" onClick={() => move(i, 1)} title="Descer">&darr;</button>
                <button type="button" className="is-danger" onClick={() => remove(i)} title="Remover">&times;</button>
              </div>
            </div>
            <div className="a-card__body">
              {def.item.map((sub) => (
                <FieldNode
                  key={sub.key}
                  def={sub}
                  value={item?.[sub.key]}
                  onChange={(v) => setItem(i, { ...(item || {}), [sub.key]: v })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <Field def={def} value={value} onChange={onChange} />
}
