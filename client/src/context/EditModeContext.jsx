import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useSiteData } from './SiteDataContext'
import { applyPatches, getAt, groupBySection } from '../lib/pathUtils'
import { labelForPath } from '../lib/pathLabels'

export const EditModeContext = createContext(null)

/**
 * Edicao inline: com a Camilla logada, ela navega o proprio site e edita o
 * texto no lugar onde ele aparece, em vez de procurar o campo num painel.
 *
 * As alteracoes ficam num buffer (`pending`) ate ela mandar salvar. So no
 * salvar os patches sao agrupados por secao e gravados de uma vez, o que evita
 * uma requisicao por tecla digitada.
 *
 * Desligavel por variavel de ambiente: com VITE_ENABLE_INLINE_CMS=false o
 * inline some e sobra o painel em /admin.
 */
const INLINE_ATIVO = import.meta.env.VITE_ENABLE_INLINE_CMS !== 'false'

export function EditModeProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const { data, updateSection } = useSiteData()

  // Comeca sempre desligado: recarregar a pagina sai do modo de edicao.
  const [isEditing, setIsEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | dirty | saving | saved | error
  const [pending, setPending] = useState({})

  const saveNowRef = useRef(null)
  const pendingCount = Object.keys(pending).length
  const pendingEntries = Object.keys(pending).map((path) => ({ path, label: labelForPath(path) }))

  // Deslogou, sai do modo de edicao.
  useEffect(() => {
    if (!isAuthenticated) setIsEditing(false)
  }, [isAuthenticated])

  // A classe no body liga as affordances visuais (contorno, cursor).
  useEffect(() => {
    const ativo = isAuthenticated && isEditing
    document.body.classList.toggle('editmode-active', ativo)
    return () => document.body.classList.remove('editmode-active')
  }, [isAuthenticated, isEditing])

  const toggle = useCallback(() => setIsEditing((v) => !v), [])

  // Atalhos: E liga/desliga, Ctrl+S salva.
  useEffect(() => {
    if (!isAuthenticated) return
    const onKey = (e) => {
      const noCampo = e.target?.closest?.('input, textarea, [contenteditable="true"]')
      const salvar = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
      const alternar = e.key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && !noCampo

      if (salvar && isEditing) {
        e.preventDefault()
        document.activeElement?.blur?.()
        setTimeout(() => saveNowRef.current?.(), 0)
        return
      }
      if (alternar) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isAuthenticated, toggle, isEditing])

  // Avisa antes de fechar a aba com alteracao nao salva.
  useEffect(() => {
    if (pendingCount === 0) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [pendingCount])

  const saveNow = useCallback(() => {
    const chaves = Object.keys(pending)
    if (chaves.length === 0) {
      setSaveStatus('idle')
      return
    }
    const snapshot = pending
    setPending({})
    setSaveStatus('saving')
    try {
      const porSecao = groupBySection(snapshot)
      Object.entries(porSecao).forEach(([secao, patches]) => {
        const base = data[secao] ?? {}
        updateSection(secao, applyPatches(base, patches))
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2500)
    } catch (err) {
      console.error('Falha ao salvar edicao inline:', err)
      setPending(snapshot)
      setSaveStatus('error')
    }
  }, [data, updateSection, pending])

  useEffect(() => {
    saveNowRef.current = saveNow
  }, [saveNow])

  const discard = useCallback(() => {
    setPending({})
    setSaveStatus('idle')
  }, [])

  /** Valor corrente do campo: o do buffer se houver, senao o gravado. */
  const getField = useCallback(
    (path) => {
      const emEdicao = pending[path]
      return emEdicao === undefined ? getAt(data, path) : emEdicao
    },
    [data, pending]
  )

  const setField = useCallback((path, value) => {
    setPending((prev) => {
      if (prev[path] === value) return prev
      return { ...prev, [path]: value }
    })
    setSaveStatus('dirty')
  }, [])

  const value = {
    canEdit: INLINE_ATIVO && isAuthenticated,
    isEditing: INLINE_ATIVO && isAuthenticated && isEditing,
    toggle,
    getField,
    setField,
    saveStatus,
    pendingCount,
    pendingEntries,
    saveNow,
    discard,
  }

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}

/** Fora do provider (ou com o inline desligado) devolve um modo inerte. */
const INERTE = {
  canEdit: false,
  isEditing: false,
  toggle: () => {},
  getField: () => undefined,
  setField: () => {},
  saveStatus: 'idle',
  pendingCount: 0,
  pendingEntries: [],
  saveNow: () => {},
  discard: () => {},
}

export function useEditMode() {
  return useContext(EditModeContext) ?? INERTE
}
