import { useRef, useState } from 'react'
import { useEditMode } from '../../context/EditModeContext'
import { uploadMedia } from '../../data/api'

/**
 * Imagem trocavel no lugar onde ela aparece. No modo de edicao, a propria
 * foto vira o botao de upload: clicar abre o seletor de arquivo e a barra de
 * progresso aparece por cima.
 *
 *   <EditableImage path="sobre.image" alt={s.alt} placeholder="Retrato" />
 */
export default function EditableImage({
  path,
  alt = '',
  className,
  placeholder = 'Sem imagem',
  children,
  ...rest
}) {
  const { isEditing, getField, setField } = useEditMode()
  const inputRef = useRef(null)
  const [progresso, setProgresso] = useState(null)
  const [erro, setErro] = useState('')

  const src = getField(path)

  async function aoEscolher(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErro('')
    setProgresso(0)
    try {
      const url = await uploadMedia(arquivo, setProgresso)
      setField(path, url)
    } catch (err) {
      setErro(err.message || 'Falha no envio')
    } finally {
      setProgresso(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const conteudo = src ? (
    <img src={src} alt={alt} className={className} {...rest} />
  ) : (
    children ?? <div className="placeholder-box">{placeholder}</div>
  )

  if (!isEditing) {
    return (
      <span className="editable-img" data-cms-path={path || undefined}>
        {conteudo}
      </span>
    )
  }

  return (
    <span className="editable-img editable-img--on" data-cms-path={path || undefined}>
      {conteudo}

      <button
        type="button"
        className="editable-img__btn"
        onClick={() => inputRef.current?.click()}
        disabled={progresso !== null}
      >
        {progresso !== null ? `Enviando ${progresso}%` : src ? 'Trocar imagem' : 'Enviar imagem'}
      </button>

      {src && (
        <button type="button" className="editable-img__clear" onClick={() => setField(path, '')} title="Remover">
          &times;
        </button>
      )}

      <input ref={inputRef} type="file" hidden accept="image/*" onChange={aoEscolher} />
      {erro && <span className="editable-img__erro">{erro}</span>}
    </span>
  )
}
