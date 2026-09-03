import { useRef, useState } from 'react'
import { uploadMedia } from '../../data/api'

/**
 * Renderiza um campo a partir da definicao do schema.
 * `value` e o valor atual, `onChange` recebe o novo valor.
 */
export default function Field({ def, value, onChange }) {
  const id = `f-${def.key}-${Math.random().toString(36).slice(2, 7)}`

  if (def.type === 'toggle') {
    return (
      <label className="a-toggle">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span className="a-toggle__track"><span className="a-toggle__dot" /></span>
        <span>{def.label}</span>
      </label>
    )
  }

  return (
    <div className="a-field">
      <label htmlFor={id}>{def.label}</label>

      {def.type === 'textarea' && (
        <textarea id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={4} />
      )}

      {(def.type === 'text' || def.type === 'url' || def.type === 'number') && (
        <input
          id={id}
          type={def.type === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(def.type === 'number' ? Number(e.target.value) : e.target.value)}
        />
      )}

      {def.type === 'select' && (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {(def.type === 'image' || def.type === 'video') && (
        <MediaField kind={def.type} value={value} onChange={onChange} />
      )}

      {def.type === 'stringlist' && (
        <StringList value={value} onChange={onChange} multiline={def.multiline} />
      )}

      {def.hint && <p className="a-hint">{def.hint}</p>}
    </div>
  )
}

function MediaField({ kind, value, onChange }) {
  const inputRef = useRef(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setProgress(0)
    try {
      const url = await uploadMedia(file, setProgress)
      onChange(url)
    } catch (err) {
      setError(err.message || 'Falha no envio')
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const isEmbed = kind === 'video' && value && !value.startsWith('/uploads')

  return (
    <div className="a-media">
      <div className="a-media__preview">
        {!value && <span className="a-media__empty">Nenhum arquivo</span>}
        {value && kind === 'image' && <img src={value} alt="" />}
        {value && kind === 'video' && !isEmbed && <video src={value} controls preload="metadata" />}
        {isEmbed && <span className="a-media__empty">Link externo</span>}
      </div>

      <div className="a-media__side">
        <input
          type="text"
          value={value ?? ''}
          placeholder={kind === 'video' ? 'Cole um link ou envie um arquivo' : 'Cole uma URL ou envie um arquivo'}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="a-media__actions">
          <button type="button" className="a-btn a-btn--sm" onClick={() => inputRef.current?.click()}>
            {progress !== null ? `Enviando ${progress}%` : 'Enviar arquivo'}
          </button>
          {value && (
            <button type="button" className="a-btn a-btn--sm a-btn--danger" onClick={() => onChange('')}>
              Remover
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={kind === 'image' ? 'image/*' : 'video/mp4,video/webm,video/quicktime'}
          onChange={handleFile}
        />
        {error && <p className="a-hint a-hint--error">{error}</p>}
      </div>
    </div>
  )
}

function StringList({ value, onChange, multiline }) {
  const items = Array.isArray(value) ? value : []

  const setItem = (i, v) => onChange(items.map((it, k) => (k === i ? v : it)))
  const remove = (i) => onChange(items.filter((_, k) => k !== i))
  const add = () => onChange([...items, ''])
  const move = (i, dir) => {
    const next = [...items]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="a-stringlist">
      {items.map((it, i) => (
        <div className="a-stringlist__row" key={i}>
          {multiline ? (
            <textarea value={it} rows={3} onChange={(e) => setItem(i, e.target.value)} />
          ) : (
            <input type="text" value={it} onChange={(e) => setItem(i, e.target.value)} />
          )}
          <div className="a-rowactions">
            <button type="button" onClick={() => move(i, -1)} title="Subir">&uarr;</button>
            <button type="button" onClick={() => move(i, 1)} title="Descer">&darr;</button>
            <button type="button" className="is-danger" onClick={() => remove(i)} title="Remover">&times;</button>
          </div>
        </div>
      ))}
      <button type="button" className="a-btn a-btn--sm" onClick={add}>
        Adicionar item
      </button>
    </div>
  )
}
