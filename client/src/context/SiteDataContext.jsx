import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { defaults, SECTION_KEYS } from '../data/defaults'
import { loadAll, saveAll, saveSection as cacheSave, clearSection as cacheClear } from '../data/storage'
import { fetchAllSections, saveSection as apiSave, resetSection as apiReset } from '../data/api'

// Exportado para o preview do painel poder sobrepor os dados sem salvar.
export const SiteDataContext = createContext(null)

// Suba este numero sempre que a estrutura do defaults mudar de forma
// incompativel: o cache local do visitante e descartado automaticamente.
// 3: entrou contato.agendamento. Sem o bump, quem ja visitou o site fica com
// o JSON antigo em cache e o bloco de horario abre sem texto nenhum.
const DATA_VERSION = 3
const VERSION_KEY = 'camilla_data_version'

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

// No prerender de build nao existe navegador: localStorage, fetch de /api e
// efeitos nao rodam. Tudo que toca o browser precisa passar por aqui.
const isBrowser = typeof window !== 'undefined'

function isStaleVersion() {
  if (!isBrowser) return false
  try {
    return parseInt(localStorage.getItem(VERSION_KEY) || '0', 10) < DATA_VERSION
  } catch {
    return false
  }
}

function markVersionCurrent() {
  if (!isBrowser) return
  try {
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION))
  } catch {}
}

function ehObjetoSimples(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Completa o que veio do banco com o que existe no defaults, em profundidade.
 *
 * Precisa ser recursivo. Antes so preenchia SECAO ausente, e campo novo dentro
 * de uma secao ja existente nascia undefined: `seed.js` usa ON CONFLICT DO
 * NOTHING, entao a linha de `contato` gravada antes de o campo existir continua
 * la e vence. O sintoma e silencioso — o bloco novo aparece sem texto nenhum.
 *
 * Array nao e mesclado de proposito: uma lista que a Camilla reduziu a dois
 * itens receberia os outros dois de volta a cada carga.
 */
function completar(base, vindo) {
  if (vindo === undefined || vindo === null) return clone(base)
  if (!ehObjetoSimples(base) || !ehObjetoSimples(vindo)) return vindo

  const saida = { ...vindo }
  for (const k of Object.keys(base)) {
    saida[k] = completar(base[k], vindo[k])
  }
  return saida
}

/**
 * Preenche chaves que existem no defaults mas ainda nao no banco.
 * Evita que uma secao — ou um campo dentro dela — quebre o site antes do
 * proximo seed.
 */
function withDefaults(partial) {
  const state = {}
  for (const key of SECTION_KEYS) {
    state[key] = completar(defaults[key], partial?.[key])
  }
  // visibility precisa conter todas as secoes conhecidas
  const order = defaults.visibility.order
  const vis = { ...clone(defaults.visibility), ...(state.visibility || {}) }
  vis.order = Array.isArray(vis.order)
    ? [...vis.order.filter((k) => order.includes(k)), ...order.filter((k) => !vis.order.includes(k))]
    : [...order]
  state.visibility = vis
  return state
}

export function SiteDataProvider({ children, staticSections }) {
  // staticSections so existe no prerender de build: o conteudo ja vem do banco,
  // entao o estado nasce pronto. Sem isso o HTML estatico sairia com a tela de
  // carregamento congelada, que e justamente o que o crawler leria.
  const isStatic = !!staticSections

  const [data, setData] = useState(() => {
    if (isStatic) return withDefaults(staticSections)
    if (isStaleVersion()) {
      saveAll({})
      markVersionCurrent()
      return withDefaults({})
    }
    return withDefaults(loadAll())
  })
  const [ready, setReady] = useState(isStatic)
  const [syncing, setSyncing] = useState(false)
  const undoRef = useRef({})
  const [undoAvailable, setUndoAvailable] = useState({})

  const refreshFromApi = useCallback(async () => {
    const sections = await fetchAllSections({ bustCache: true })
    if (sections) {
      const merged = withDefaults({ ...loadAll(), ...sections })
      saveAll(merged)
      setData(merged)
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (isStatic) return
    refreshFromApi()
  }, [refreshFromApi, isStatic])

  const updateSection = useCallback(
    (section, sectionData, { skipUndo = false } = {}) => {
      setData((prev) => {
        if (!skipUndo) {
          undoRef.current[section] = clone(prev[section])
          setUndoAvailable((u) => ({ ...u, [section]: true }))
        }
        const next = { ...prev, [section]: sectionData }
        cacheSave(section, sectionData)
        setSyncing(true)
        apiSave(section, sectionData)
          .then((ok) => {
            if (!ok) console.warn(`Nao foi possivel salvar a secao "${section}" no servidor.`)
          })
          .finally(() => setSyncing(false))
        return next
      })
    },
    []
  )

  const undoSection = useCallback(
    (section) => {
      const prev = undoRef.current[section]
      if (!prev) return
      delete undoRef.current[section]
      setUndoAvailable((u) => ({ ...u, [section]: false }))
      updateSection(section, prev, { skipUndo: true })
    },
    [updateSection]
  )

  const resetSection = useCallback(
    (section) => {
      const defaultData = clone(defaults[section])
      setData((prev) => ({ ...prev, [section]: defaultData }))
      cacheClear(section)
      setSyncing(true)
      apiReset(section)
        .then(() => refreshFromApi())
        .finally(() => setSyncing(false))
    },
    [refreshFromApi]
  )

  return (
    <SiteDataContext.Provider
      value={{ data, ready, syncing, updateSection, resetSection, undoSection, undoAvailable, defaults, refreshFromApi }}
    >
      {children}
    </SiteDataContext.Provider>
  )
}

export function useSiteData() {
  const ctx = useContext(SiteDataContext)
  if (!ctx) throw new Error('useSiteData precisa estar dentro de <SiteDataProvider>')
  return ctx
}
