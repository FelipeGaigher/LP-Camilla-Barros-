import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSiteData } from '../context/SiteDataContext'
import { SIDEBAR } from '../admin/schema'
import SectionEditor from '../admin/SectionEditor'
import VisibilityEditor from '../admin/sections/VisibilityEditor'
import LeadsPanel from '../admin/sections/LeadsPanel'
import AccountPanel from '../admin/sections/AccountPanel'
import '../styles/admin.css'

const CUSTOM = {
  visibility: VisibilityEditor,
  leads: LeadsPanel,
  conta: AccountPanel,
}

export default function AdminPanel() {
  const [active, setActive] = useState('hero')
  const [menuOpen, setMenuOpen] = useState(false)
  const { logout } = useAuth()
  const { syncing } = useSiteData()

  const Custom = CUSTOM[active]

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

      <main className="a-main">
        {syncing && <div className="a-syncing">Sincronizando...</div>}
        {Custom ? <Custom /> : <SectionEditor sectionKey={active} />}
      </main>
    </div>
  )
}
