import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSiteData } from '../context/SiteDataContext'
import { SIDEBAR } from '../admin/schema'
import SectionEditor from '../admin/SectionEditor'
import PreviewPane from '../admin/ui/PreviewPane'
import VisibilityEditor from '../admin/sections/VisibilityEditor'
import LeadsPanel from '../admin/sections/LeadsPanel'
import AccountPanel from '../admin/sections/AccountPanel'
import '../styles/admin.css'

const CUSTOM = {
  visibility: VisibilityEditor,
  leads: LeadsPanel,
  conta: AccountPanel,
}

// Secoes que tem editor gerado pelo schema, e portanto aceitam o clique
// vindo da previa. As de tela propria (leads, conta) ficam de fora.
const SECOES_COM_EDITOR = new Set(SIDEBAR.filter((i) => !i.custom).map((i) => i.key))

export default function AdminPanel() {
  const [active, setActive] = useState('hero')
  const [menuOpen, setMenuOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [draft, setDraft] = useState(null)
  const [focusPath, setFocusPath] = useState(null)
  const { logout } = useAuth()
  const { syncing } = useSiteData()

  const Custom = CUSTOM[active]

  // O rascunho da secao em edicao alimenta a previa, sem passar pelo banco.
  const onDraftChange = useCallback((secao, valor) => {
    setDraft({ [secao]: valor })
  }, [])

  // Clique num texto da previa: abre a secao certa e rola ate o campo.
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data
      if (d?.src !== 'cms-preview' || d.type !== 'focus' || !d.path) return
      const secao = String(d.path).split('.')[0]
      if (SECOES_COM_EDITOR.has(secao)) setActive(secao)
      setFocusPath(null)
      requestAnimationFrame(() => setFocusPath(d.path))
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  return (
    <div className="a-shell">
      <aside className={`a-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="a-sidebar__top">
          <span className="a-sidebar__brand">Painel</span>
          <Link className="a-sidebar__view" to="/" target="_blank">Ver o site</Link>
        </div>

        <nav className="a-sidebar__nav">
          {SIDEBAR.map((item) => (
            <button
              key={item.key}
              className={`a-sidebar__item ${active === item.key ? 'is-active' : ''}`}
              onClick={() => { setActive(item.key); setMenuOpen(false) }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="a-btn a-sidebar__logout" onClick={logout}>Sair</button>
      </aside>

      <button className="a-menutoggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu do painel">
        {menuOpen ? 'Fechar' : 'Menu'}
      </button>

      <div className={`a-work ${previewOpen && !Custom ? 'has-preview' : ''}`}>
        <main className="a-main">
          {syncing && <div className="a-syncing">Sincronizando...</div>}
          {Custom ? (
            <Custom />
          ) : (
            <SectionEditor sectionKey={active} onDraftChange={onDraftChange} focusPath={focusPath} />
          )}
        </main>

        {!Custom && previewOpen && <PreviewPane overrides={draft} />}
      </div>

      {!Custom && (
        <button
          className="a-previewtoggle"
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-pressed={previewOpen}
        >
          {previewOpen ? 'Ocultar prévia' : 'Ver prévia'}
        </button>
      )}
    </div>
  )
}
