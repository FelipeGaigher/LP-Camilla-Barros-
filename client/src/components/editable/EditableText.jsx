import { useEffect, useRef } from 'react'
import { useEditMode } from '../../context/EditModeContext'

/**
 * Texto editavel no lugar onde ele aparece.
 *
 *   <EditableText path="hero.title" as="h1" className="hero__title" />
 *   <EditableText path="tratamentos.items.0.summary" multiline />
 *
 * Fora do modo de edicao renderiza a tag normal, sem nenhum peso extra, e
 * carrega apenas o data-cms-path, que e o que o preview do painel usa para
 * saber qual campo focar quando alguem clica no texto.
 */
export default function EditableText({
  path,
  as: Tag = 'span',
  className,
  multiline = false,
  placeholder = 'Clique para editar',
  fallback = '',
  children,
  ...rest
}) {
  const { isEditing, getField, setField } = useEditMode()
  const ref = useRef(null)

  const bruto = getField(path) ?? fallback
  const texto = typeof bruto === 'string' && bruto.trim() === '' ? fallback : bruto

  // Mantem o conteudo em dia quando o valor muda por fora (desfazer, por
  // exemplo), sem atropelar quem esta digitando.
  useEffect(() => {
    if (!isEditing) return
    const el = ref.current
    if (!el || document.activeElement === el) return
    el.innerText = texto
  }, [texto, isEditing])

  if (!isEditing) {
    const conteudo = typeof children === 'function' ? children(texto) : (children ?? texto)
    return (
      <Tag className={className} data-cms-path={path || undefined} {...rest}>
        {conteudo}
      </Tag>
    )
  }

  const onBlur = () => {
    const novo = ref.current?.innerText ?? ''
    if (novo !== texto) setField(path, novo)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      ref.current?.blur()
    }
    if (e.key === 'Escape') {
      if (ref.current) ref.current.innerText = texto
      ref.current?.blur()
    }
  }

  return (
    <Tag
      ref={ref}
      className={`${className ?? ''} editable editable--text`.trim()}
      contentEditable
      suppressContentEditableWarning
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      data-cms-path={path || undefined}
      data-placeholder={placeholder}
      spellCheck={false}
      {...rest}
    >
      {texto}
    </Tag>
  )
}
