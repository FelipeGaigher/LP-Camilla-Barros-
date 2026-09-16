import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSiteData } from '../context/SiteDataContext'
import { SIDEBAR, ESPACOS, ESPACO_PADRAO, primeiroItem } from '../admin/schema'
import SectionEditor from '../admin/SectionEditor'
import PreviewPane from '../admin/ui/PreviewPane'
import VisibilityEditor from '../admin/sections/VisibilityEditor'
import AccountPanel from '../admin/sections/AccountPanel'
import AgendaPanel from '../admin/consultorio/AgendaPanel'
import FunilPanel from '../admin/consultorio/FunilPanel'
import PacientesPanel from '../admin/consultorio/PacientesPanel'
import HorariosPanel from '../admin/consultorio/HorariosPanel'
import '../styles/admin.css'
import '../styles/consultorio.css'

const CUSTOM = {
  agenda: AgendaPanel,
  funil: FunilPanel,
  pacientes: PacientesPanel,
  horarios: HorariosPanel,
  visibility: VisibilityEditor,
  conta: AccountPanel,
}

// Secoes com editor gerado pelo schema, e portanto capazes de receber o clique
// vindo da previa. As de tela propria ficam de fora.
const SECOES_COM_EDITOR = new Set(SIDEBAR.filter((i) => i.key && !i.custom).map((i) => i.key))

export default function AdminPanel() {
  const [espaco, setEspaco] = useState(ESPACO_PADRAO)
  const [active, setActive] = useState(() => primeiroItem(ESPACO_PADRAO))
  const [menuOpen, setMenuOpen] = useState(false)
  // Recolher fica gravado: quem trabalha o dia todo na agenda quer a tela
  // inteira, e ter que recolher a cada F5 viraria ruido diario.
  const [recolhida, setRecolhida] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('painel-sidebar') === 'recolhida'
  )
  const [previewOpen, setPreviewOpen] = useState(true)
  const [draft, setDraft] = useState(null)
  const [focusPath, setFocusPath] = useState(null)
  const { logout } = useAuth()
  const { syncing } = useSiteData()

  const Custom = CUSTOM[active]
  const itens = useMemo(() => SIDEBAR.filter((i) => i.espaco === espaco), [espaco])

  const trocarEspaco = useCallback((id) => {
    setEspaco(id)
    setActive(primeiroItem(id))
    setDraft(null)
    setMenuOpen(false)
  }, [])

  // O rascunho da secao em edicao alimenta a previa, sem passar pelo banco.
  const onDraftChange = useCallback((secao, valor) => {
    setDraft({ [secao]: valor })
  }, [])

  // Clique num texto da previa: abre a secao certa e rola ate o campo. Como a
  // previa so existe no espaco do site, trocar de espaco tambem esta implicito.
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data
      if (d?.src !== 'cms-preview' || d.type !== 'focus' || !d.path) return
      const secao = String(d.path).split('.')[0]
      if (!SECOES_COM_EDITOR.has(secao)) return
      setEspaco('site')
      setActive(secao)
      setFocusPath(null)
      requestAnimationFrame(() => setFocusPath(d.path))
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const recolher = useCallback((valor) => {
    setRecolhida(valor)
    try { localStorage.setItem('painel-sidebar', valor ? 'recolhida' : 'aberta') } catch { /* modo anonimo */ }
  }, [])

  return (
    <div className={`a-shell ${recolhida ? 'is-recolhida' : ''}`}>
      {/* Reabrir: so existe com a barra recolhida, encostado na borda. */}
      {recolhida && (
        <button
          type="button"
          className="a-reabrir"
          onClick={() => recolher(false)}
          aria-label="Mostrar o menu"
          title="Mostrar o menu"
        >
          &rsaquo;
        </button>
      )}

      <aside className={`a-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="a-sidebar__top">
          <div className="a-sidebar__titulo">
            <span className="a-sidebar__brand">Painel</span>
            <button
              type="button"
              className="a-recolher"
              onClick={() => recolher(true)}
              aria-label="Recolher o menu"
              title="Recolher o menu"
            >
              &lsaquo;
            </button>
          </div>
          <Link className="a-sidebar__view" to="/" target="_blank">Ver o site</Link>
        </div>

        <div className="a-espacos" role="tablist" aria-label="Area do painel">
          {ESPACOS.map((e) => (
            <button
              key={e.id}
              role="tab"
              aria-selected={espaco === e.id}
              className={`a-espacos__item ${espaco === e.id ? 'is-active' : ''}`}
              onClick={() => trocarEspaco(e.id)}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* So esta nav rola. Topo, seletor e "Sair" ficam parados. */}
        <nav className="a-sidebar__nav">
          {itens.map((item, i) =>
            item.grupo ? (
              <p className="a-sidebar__grupo" key={`g-${i}`}>{item.grupo}</p>
            ) : (
              <button
                key={item.key}
                className={`a-sidebar__item ${active === item.key ? 'is-active' : ''}`}
                onClick={() => { setActive(item.key); setMenuOpen(false) }}
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <button className="a-btn a-sidebar__logout" onClick={logout}>Sair</button>
      </aside>

      <button className="a-menutoggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu do painel">
        {menuOpen ? 'Fechar' : 'Menu'}
      </button>

      <div className={`a-work ${previewOpen && !Custom ? 'has-preview' : ''}`}>
        <main className={`a-main ${Custom ? 'a-main--wide' : ''}`}>
          {syncing && <div className="a-syncing">Sincronizando...</div>}
          {Custom ? (
            // onIr deixa uma tela mandar pra outra sem o painel virar roteado:
            // o contador de pedidos da agenda precisa levar ao funil.
            <Custom onIr={setActive} />
          ) : (
            // `key` obriga a remontar a cada troca de secao, e nao e cosmetico.
            // Sem ele o React reaproveita a instancia: o efeito que resincroniza
            // o rascunho apenas AGENDA o novo valor, enquanto o efeito que manda
            // pra previa roda na mesma passada com a sectionKey nova e o rascunho
            // velho. A previa recebia { footer: <dados do contato> }, e o primeiro
            // acesso aninhado derrubava a arvore inteira — tela branca no painel.
            <SectionEditor key={active} sectionKey={active} onDraftChange={onDraftChange} focusPath={focusPath} />
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
