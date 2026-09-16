import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useEditMode } from '../../context/EditModeContext'

const ROTULO = {
  idle: 'Tudo salvo',
  dirty: 'Alteracoes nao salvas',
  saving: 'Salvando...',
  saved: 'Salvo',
  error: 'Erro ao salvar',
}

/**
 * Barra flutuante que aparece so para quem esta logado. Fora do modo de
 * edicao ela e um botao discreto; ligada, mostra o que mudou e o que salvar.
 */
export default function EditToolbar() {
  const { canEdit, isEditing, toggle, saveStatus, pendingCount, pendingEntries, saveNow, discard } = useEditMode()
  const [listaAberta, setListaAberta] = useState(false)
  const { pathname } = useLocation()

  // Dentro do painel a edicao ja acontece nos campos, entao a barra do inline
  // so atrapalharia.
  if (!canEdit || pathname.startsWith('/gestao')) return null

  if (!isEditing) {
    return (
      <button className="edit-fab" type="button" onClick={toggle}>
        Editar o site
        <kbd>E</kbd>
      </button>
    )
  }

  return (
    <div className="edit-bar">
      <div className="edit-bar__main">
        <span className={`edit-bar__dot is-${saveStatus}`} aria-hidden="true" />
        <strong>Modo de edicao</strong>
        <span className="edit-bar__status">{ROTULO[saveStatus]}</span>
      </div>

      {pendingCount > 0 && (
        <button
          className="edit-bar__count"
          type="button"
          onClick={() => setListaAberta((v) => !v)}
          aria-expanded={listaAberta}
        >
          {pendingCount} {pendingCount === 1 ? 'alteracao' : 'alteracoes'}
        </button>
      )}

      <div className="edit-bar__actions">
        {pendingCount > 0 && (
          <button className="edit-bar__btn" type="button" onClick={discard}>
            Descartar
          </button>
        )}
        <button
          className="edit-bar__btn edit-bar__btn--primary"
          type="button"
          onClick={saveNow}
          disabled={pendingCount === 0 || saveStatus === 'saving'}
        >
          Salvar
          <kbd>Ctrl S</kbd>
        </button>
        <Link className="edit-bar__btn" to="/gestao">
          Painel
        </Link>
        <button className="edit-bar__btn" type="button" onClick={toggle} title="Sair do modo de edicao">
          Sair
        </button>
      </div>

      {listaAberta && pendingCount > 0 && (
        <ul className="edit-bar__list">
          {pendingEntries.map((e) => (
            <li key={e.path}>{e.label}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
