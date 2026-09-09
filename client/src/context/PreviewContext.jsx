import { useMemo } from 'react'
import { SiteDataContext } from './SiteDataContext'
import { EditModeContext } from './EditModeContext'
import { useSiteData } from './SiteDataContext'
import { getAt } from '../lib/pathUtils'

/**
 * Envolve o preview com uma versao read-only dos dados.
 *
 * `overrides` sobrepoe secoes inteiras, que e como o painel mostra o rascunho
 * antes de salvar: o editor passa o que esta em edicao, o site renderiza com
 * esse conteudo, e nada e gravado.
 *
 * updateSection e companhia viram no-op e o modo de edicao fica desligado, para
 * o preview nunca escrever no banco por acidente.
 */
export default function PreviewProvider({ overrides, children }) {
  const real = useSiteData()

  const siteValue = useMemo(() => {
    const data = { ...(real?.data || {}) }
    if (overrides && typeof overrides === 'object') {
      for (const chave of Object.keys(overrides)) data[chave] = overrides[chave]
    }
    return {
      ...real,
      data,
      updateSection: () => {},
      resetSection: () => {},
      undoSection: () => {},
      refreshFromApi: () => {},
      syncing: false,
      ready: true,
    }
  }, [real, overrides])

  const editValue = useMemo(
    () => ({
      canEdit: false,
      isEditing: false,
      toggle: () => {},
      getField: (path) => getAt(siteValue.data, path),
      setField: () => {},
      saveStatus: 'idle',
      pendingCount: 0,
      pendingEntries: [],
      saveNow: () => {},
      discard: () => {},
    }),
    [siteValue.data]
  )

  return (
    <SiteDataContext.Provider value={siteValue}>
      <EditModeContext.Provider value={editValue}>{children}</EditModeContext.Provider>
    </SiteDataContext.Provider>
  )
}
