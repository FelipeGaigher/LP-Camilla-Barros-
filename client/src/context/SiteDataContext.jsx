import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { defaults, SECTION_KEYS } from '../data/defaults'
import { loadAll, saveAll, saveSection as cacheSave, clearSection as cacheClear } from '../data/storage'
import { fetchAllSections, saveSection as apiSave, resetSection as apiReset } from '../data/api'

// Exportado para o preview do painel poder sobrepor os dados sem salvar.
export const SiteDataContext = createContext(null)

// Suba este numero sempre que a estrutura do defaults mudar de forma
// incompativel: o cache local do visitante e descartado automaticamente.
const DATA_VERSION = 2
const VERSION_KEY = 'camilla_data_version'

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

function isStaleVersion() {
  try {
    return parseInt(localStorage.getItem(VERSION_KEY) || '0', 10) < DATA_VERSION
  } catch {
    return false
  }
}

function markVersionCurrent() {
  try {
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION))
  } catch {}
}

/**
 * Preenche chaves que existem no defaults mas ainda nao no banco.
 * Evita que uma secao nova quebre o site antes do proximo seed.
 */
function withDefaults(partial) {
  const state = {}
  for (const key of SECTION_KEYS) {
    state[key] = partial?.[key] ?? clone(defaults[key])
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

export function SiteDataProvider({ children }) {
  const [data, setData] = useState(() => {
    if (isStaleVersion()) {
      saveAll({})
      markVersionCurrent()
      return withDefaults({})
    }
    return withDefaults(loadAll())
  })
  const [ready, setReady] = useState(false)
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
    refreshFromApi()
  }, [refreshFromApi])

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
